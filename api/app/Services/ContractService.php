<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ContractServiceInterface;
use App\DTOs\ContractCreateDTO;
use App\Models\Contract;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\UserBalance;
use App\Models\UserBalanceTransaction;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class ContractService implements ContractServiceInterface
{
    public function createContract(ContractCreateDTO $dto): Contract
    {
        // Validar se o plano existe
        $plan = Plan::findOrFail($dto->plan_id);

        // Desativar contratos ativos anteriores do usuário (apenas um plano ativo por vez)
        Contract::where('user_id', $dto->user_id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        $startDate = $dto->start_date ?? Carbon::now();
        $endDate = $dto->end_date;

        // Se end_date não foi fornecido, calcular baseado no ciclo mensal (mesmo dia do mês seguinte)
        if (!$endDate) {
            $nextMonth = $startDate->copy()->addMonth();
            $endDate = $nextMonth->startOfMonth()->addDays($startDate->day - 1);
            // Se o dia do mês não existir no próximo mês, usar o último dia do mês
            if ($endDate->month !== $nextMonth->month) {
                $endDate = $nextMonth->endOfMonth();
            }
            Log::info("End date calculado para novo contrato", [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'day_of_month' => $startDate->day,
                'next_month' => $nextMonth->toDateString(),
                'days_added' => $startDate->day - 1
            ]);
        }

        // Criar contrato
        $contract = Contract::create([
            'user_id' => $dto->user_id,
            'plan_id' => $dto->plan_id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => $dto->status ?? 'active',
        ]);

        return $contract;
    }

    public function changePlan(int $contractId, int $newPlanId): array
    {
        Log::info("Iniciando troca de plano", ['contract_id' => $contractId, 'new_plan_id' => $newPlanId]);

        $contract = Contract::with('plan')->findOrFail($contractId);
        $newPlan = Plan::findOrFail($newPlanId);
        $oldPlan = $contract->plan;
        $userId = $contract->user_id;
        $now = Carbon::now();

        // Calcular dias restantes e valores pro-rata
        $daysRemaining = $this->calculateDaysRemaining($contract, $now);
        Log::info("Dias restantes calculados", ['days_remaining' => $daysRemaining]);

        // Assumir ciclo de 30 dias para cálculos pro-rata
        $totalDaysInCycle = 30;
        $daysUsed = $totalDaysInCycle - $daysRemaining;

        Log::info("Cálculo do ciclo", [
            'total_days_in_cycle' => $totalDaysInCycle,
            'days_used' => $daysUsed,
            'days_remaining' => $daysRemaining
        ]);

        if ($daysRemaining === $totalDaysInCycle) {
            // Se contratado hoje, desconto é 100% (plano antigo não foi usado)
            $proratedOld = 0;
            $proratedNew = $newPlan->price;
            Log::info("Dia 1 do ciclo - desconto total do plano antigo", [
                'prorated_old' => $proratedOld,
                'prorated_new' => $proratedNew
            ]);
        } else {
            // Cálculo pro-rata baseado nos dias restantes
            $proratedOld = $oldPlan->price * ($daysRemaining / $totalDaysInCycle);
            $proratedNew = $newPlan->price * ($daysRemaining / $totalDaysInCycle);
            Log::info("Cálculo pro-rata padrão", [
                'prorated_old' => $proratedOld,
                'prorated_new' => $proratedNew,
                'old_price_per_day' => $oldPlan->price / $totalDaysInCycle,
                'new_price_per_day' => $newPlan->price / $totalDaysInCycle
            ]);
        }

        Log::info("Valores pro-rata calculados", [
            'prorated_old' => $proratedOld,
            'prorated_new' => $proratedNew,
            'old_plan_price' => $oldPlan->price,
            'new_plan_price' => $newPlan->price
        ]);

        $userBalance = $this->getUserBalance($userId);
        Log::info("Saldo do usuário", ['user_balance' => $userBalance]);

        $valorAPagar = 0;
        $additionalBalance = 0;
        $appliedBalance = 0;

        // Determinar se é upgrade ou downgrade baseado nos preços
        $isDowngrade = $newPlan->price < $oldPlan->price;
        $isUpgrade = $newPlan->price > $oldPlan->price;
        $isSamePrice = $newPlan->price == $oldPlan->price;

        Log::info("Tipo de troca determinado", [
            'is_downgrade' => $isDowngrade,
            'is_upgrade' => $isUpgrade,
            'is_same_price' => $isSamePrice,
            'old_price' => $oldPlan->price,
            'new_price' => $newPlan->price
        ]);

        // Calcular valor a pagar e créditos gerados
        $grossAmount = $newPlan->price; // valor do novo plano em reais
        $additionalBalance = 0;

        if ($isUpgrade || $isSamePrice) {
            // Upgrade ou mesmo preço: cobra diferença considerando pro-rata
            $valorAPagar = max(0, $grossAmount - $proratedOld - $userBalance);
            Log::info("Cálculo para upgrade/mesmo preço", [
                'gross_amount' => $grossAmount,
                'prorated_old' => $proratedOld,
                'user_balance' => $userBalance,
                'valor_a_pagar' => $valorAPagar,
                'formula' => "max(0, {$grossAmount} - {$proratedOld} - {$userBalance})"
            ]);
        } else {
            // Downgrade: comparar pro-rata do antigo com valor do novo
            if ($proratedOld > $grossAmount) {
                // Gera crédito: diferença entre pro-rata antigo e valor novo
                $additionalBalance = $proratedOld - $grossAmount;
                $valorAPagar = 0;
                Log::info("Downgrade gera crédito", [
                    'prorated_old' => $proratedOld,
                    'gross_amount' => $grossAmount,
                    'additional_balance' => $additionalBalance,
                    'valor_a_pagar' => $valorAPagar
                ]);
            } else {
                // Mesmo com downgrade, pode haver cobrança se pro-rata não cobrir
                $valorAPagar = max(0, $grossAmount - $proratedOld - $userBalance);
                Log::info("Downgrade com possível cobrança", [
                    'prorated_old' => $proratedOld,
                    'gross_amount' => $grossAmount,
                    'user_balance' => $userBalance,
                    'valor_a_pagar' => $valorAPagar
                ]);
            }
        }

        // Lógica final de processamento
        Log::info("Resumo da troca de plano", [
            'type' => $isDowngrade ? 'downgrade' : ($isUpgrade ? 'upgrade' : 'same_price'),
            'prorated_old' => $proratedOld,
            'prorated_new' => $proratedNew,
            'gross_amount' => $grossAmount,
            'user_balance' => $userBalance,
            'valor_a_pagar' => $valorAPagar,
            'additional_balance' => $additionalBalance
        ]);

        // Aplicar saldo automaticamente se houver cobrança
        $appliedBalance = 0;
        $remainingAmount = $valorAPagar;
        Log::info("Antes de aplicar saldo", [
            'valor_a_pagar' => $valorAPagar,
            'user_balance' => $userBalance
        ]);

        if ($valorAPagar > 0) {
            $balanceResult = $this->applyBalanceToPayment($userId, $valorAPagar);
            $appliedBalance = $balanceResult['applied_balance'];
            $remainingAmount = $balanceResult['remaining_amount'];
            Log::info("Saldo aplicado ao pagamento", [
                'applied_balance' => $appliedBalance,
                'remaining_amount' => $remainingAmount
            ]);
        } else {
            Log::info("Nenhum saldo aplicado, valor a pagar é 0 ou negativo");
        }

        // Desativar todos os contratos ativos do usuário (apenas um plano ativo por vez)
        Contract::where('user_id', $userId)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        // Adicionar saldo adicional no downgrade
        if ($additionalBalance > 0) {
            $description = "Saldo excedente por downgrade do plano {$oldPlan->description} para {$newPlan->description}";
            Log::info("Adicionando saldo adicional", [
                'additional_balance' => $additionalBalance,
                'description' => $description
            ]);
            $this->addBalance($userId, $additionalBalance, $description);
        } else {
            Log::info("Nenhum saldo adicional a adicionar");
        }

        // Criar novo contrato com end_date no mesmo dia do mês seguinte
        $endDate = $now->copy()->addMonth()->startOfMonth()->addDays($now->day - 1);
        // Se o dia do mês não existir no próximo mês, usar o último dia do mês
        if ($endDate->month !== $now->copy()->addMonth()->month) {
            $endDate = $now->copy()->addMonth()->endOfMonth();
        }

        Log::info("Nova data de término calculada", [
            'start_date' => $now->toDateString(),
            'end_date' => $endDate->toDateString(),
            'day_of_month' => $now->day
        ]);

        $newContract = Contract::create([
            'user_id' => $userId,
            'plan_id' => $newPlanId,
            'start_date' => $now,
            'end_date' => $endDate,
            'status' => 'active',
        ]);
        Log::info("Novo contrato criado", ['new_contract_id' => $newContract->id]);

        // Criar pagamento com o valor final após abatimento
        $finalAmount = $remainingAmount;
        Log::info("Criando pagamento", [
            'final_amount' => $finalAmount,
            'remaining_amount' => $remainingAmount,
            'status' => $finalAmount > 0 ? 'pending' : 'paid',
            'discount_applied' => $proratedOld + $appliedBalance,
            'prorated_old' => $proratedOld,
            'prorated_new' => $proratedNew,
            'applied_credits' => $appliedBalance
        ]);

        if ($finalAmount >= 0) {
            Payment::create([
                'contract_id' => $newContract->id,
                'amount' => $finalAmount,
                'payment_date' => $now,
                'status' => $finalAmount > 0 ? 'pending' : 'paid',
                'discount_applied' => $proratedOld + $appliedBalance,
                'prorated_old' => $proratedOld,
                'prorated_new' => $proratedNew,
                'applied_credits' => $appliedBalance,
            ]);
        }

        return [
            'contract' => $newContract,
            'prorated_old' => $proratedOld,
            'prorated_new' => $proratedNew,
            'gross_amount' => $grossAmount,
            'user_balance_before' => $userBalance,
            'applied_balance' => $appliedBalance,
            'additional_balance' => $additionalBalance,
            'final_amount' => $finalAmount,
            'total_discount_applied' => $proratedOld + $appliedBalance, // desconto pro-rata + saldo aplicado
            // Compatibility keys
            'credits_available' => $userBalance,
            'balance_available' => $userBalance,
            'discount_applied' => $proratedOld + $appliedBalance,
            'remaining_credit' => $additionalBalance,
            'remaining_balance' => $additionalBalance,
        ];
    }

    public function listContractsForUser(int $userId, ?string $status = null): Collection
    {
        $query = Contract::with('plan')->where('user_id', $userId);

        if ($status) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    /**
     * Obter saldo disponível para um usuário
     */
    public function getUserBalance(int $userId): float
    {
        return UserBalance::getTotalBalanceForUser($userId);
    }

    /**
     * Aplicar saldo em um pagamento
     */
    public function applyBalanceToPayment(int $userId, float $paymentAmount): array
    {
        $availableBalance = $this->getUserBalance($userId);
        $appliedBalance = min($availableBalance, $paymentAmount);
        $remainingAmount = $paymentAmount - $appliedBalance;

        // Consumir saldo utilizado
        if ($appliedBalance > 0) {
            $this->consumeBalance($userId, $appliedBalance);
        }

        return [
            'applied_balance' => $appliedBalance,
            'remaining_amount' => $remainingAmount,
            'total_balance_used' => $appliedBalance,
        ];
    }

    /**
     * Consumir saldo de um usuário (usando FIFO - primeiro criado)
     */
    private function consumeBalance(int $userId, float $amountToConsume): void
    {
        $credits = UserBalance::forUser($userId)
            ->orderBy('created_at', 'asc')
            ->get();

        $remainingToConsume = $amountToConsume;

        foreach ($credits as $credit) {
            if ($remainingToConsume <= 0) break;

            if ($credit->amount <= $remainingToConsume) {
                // Consumir crédito completo
                $consumedAmount = $credit->amount;
                $remainingToConsume -= $credit->amount;
                $credit->delete();
            } else {
                // Consumir parte do crédito
                $consumedAmount = $remainingToConsume;
                $credit->amount -= $remainingToConsume;
                $credit->save();
                $remainingToConsume = 0;
            }

            // Logar transação de débito
            UserBalanceTransaction::create([
                'user_id' => $userId,
                'amount' => $consumedAmount, // em reais
                'type' => 'debit',
                'description' => 'Crédito utilizado em pagamento',
                'metadata' => [
                    'user_balance_id' => $credit->id,
                    'consumed_amount' => $consumedAmount,
                ],
            ]);
        }
    }

    /**
     * Calcular dias restantes do contrato atual
     */
    private function calculateDaysRemaining(Contract $contract, Carbon $now): int
    {
        // Usar end_date do contrato se existir, senão assumir 30 dias a partir da data de início
        $endDate = $contract->end_date ?? $contract->start_date->copy()->addDays(30);

        Log::info("Calculando dias restantes", [
            'contract_id' => $contract->id,
            'start_date' => $contract->start_date->toDateString(),
            'end_date' => $endDate->toDateString(),
            'now' => $now->toDateString(),
            'has_explicit_end_date' => !is_null($contract->end_date)
        ]);

        if ($now->greaterThanOrEqualTo($endDate)) {
            Log::info("Contrato já expirado, dias restantes = 0");
            return 0;
        }

        $daysRemaining = $now->diffInDays($endDate);
        Log::info("Dias restantes calculados", ['days_remaining' => $daysRemaining]);

        return $daysRemaining;
    }

    /**
     * Adiciona um valor ao saldo do usuário e registra a transação.
     */
    public function addBalance(int $userId, float $amount, string $description): void
    {
        if ($amount <= 0) {
            return;
        }

        // Adicionar o valor ao saldo do usuário
        UserBalance::create([
            'user_id' => $userId,
            'amount' => $amount, // O valor em reais
            'description' => $description,
        ]);

        // Registrar a transação de crédito
        UserBalanceTransaction::create([
            'user_id' => $userId,
            'amount' => $amount, // Armazenar em reais
            'type' => 'credit',
            'description' => $description,
            'metadata' => [
                'source' => 'manual_addition' // ou outra fonte, se aplicável
            ],
        ]);
    }
}
