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

        // Criar contrato
        $contract = Contract::create([
            'user_id' => $dto->user_id,
            'plan_id' => $dto->plan_id,
            'start_date' => $dto->start_date ?? Carbon::now(),
            'end_date' => $dto->end_date,
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
        if ($daysRemaining === 30) {
            // Se contratado hoje, desconto é 100%
            $proratedOld = $oldPlan->price;
            $proratedNew = $newPlan->price;
        } else {
            $proratedOld = (int) floor($oldPlan->price * ($daysRemaining / 30));
            $proratedNew = (int) floor($newPlan->price * ($daysRemaining / 30));
        }

        $userBalance = $this->getUserBalance($userId);

        $valorAPagar = 0;
        $creditoAdicional = 0;

        // Calcula valor a pagar: Valor Novo - Desconto Pro-Rata - Crédito Saldo
        $grossAmount = (int)$newPlan->price; // valor do novo plano já em centavos
        $valorAPagar = max(0, $grossAmount - $proratedOld - $userBalance);

        // Para downgrade, se o valor calculado for negativo, significa crédito adicional
        if ($valorAPagar === 0 && $grossAmount < $proratedOld + $userBalance) {
            // DOWNGRADE: adiciona crédito excedente
            $creditoAdicional = (int)(($proratedOld + $userBalance) - $grossAmount);
            Log::info("Troca de plano (Downgrade)", [
                'prorated_new' => $proratedNew,
                'prorated_old' => $proratedOld,
                'gross_amount' => $grossAmount,
                'user_balance' => $userBalance,
                'credito_adicional' => $creditoAdicional,
                'valor_a_pagar' => $valorAPagar
            ]);
        } else {
            // UPGRADE ou valor a pagar positivo
            Log::info("Troca de plano (Upgrade)", [
                'prorated_new' => $proratedNew,
                'prorated_old' => $proratedOld,
                'gross_amount' => $grossAmount,
                'user_balance' => $userBalance,
                'valor_a_pagar_before_credit' => $grossAmount - $proratedOld,
                'valor_a_pagar' => $valorAPagar
            ]);
        }

        // Aplicar créditos automaticamente se houver cobrança
        $appliedCredits = 0;
        $remainingAmount = $valorAPagar;
        if ($valorAPagar > 0) {
            $creditResult = $this->applyCreditsToPayment($userId, $valorAPagar);
            $appliedCredits = $creditResult['applied_credits'];
            $remainingAmount = $creditResult['remaining_amount'];
        }

        // Desativar todos os contratos ativos do usuário (apenas um plano ativo por vez)
        Contract::where('user_id', $userId)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        // Adicionar crédito adicional no downgrade
        if ($creditoAdicional > 0) {
            $description = "Crédito excedente por downgrade do plano {$oldPlan->description} para {$newPlan->description}";
            $this->addBalance($userId, $creditoAdicional, $description);
        }

        // Criar novo contrato com end_date
        $newContract = Contract::create([
            'user_id' => $userId,
            'plan_id' => $newPlanId,
            'start_date' => $now,
            'end_date' => $now->copy()->addDays(30), // Assumir 30 dias
            'status' => 'active',
        ]);

        // Criar pagamento com o valor final após abatimento
        $finalAmount = $remainingAmount;
        if ($finalAmount >= 0) {
            Payment::create([
                'contract_id' => $newContract->id,
                'amount' => (int) round($finalAmount),
                'payment_date' => $now,
                'status' => $finalAmount > 0 ? 'pending' : 'paid',
                'discount_applied' => $proratedOld + $appliedCredits,
                'prorated_old' => $proratedOld,
                'prorated_new' => $proratedNew,
                'applied_credits' => $appliedCredits,
            ]);
        }

        return [
            'contract' => $newContract,
            'prorated_old' => $proratedOld,
            'prorated_new' => $proratedNew,
            'gross_amount' => $grossAmount,
            'user_balance_before' => $userBalance,
            'applied_credits' => $appliedCredits,
            'credito_adicional' => $creditoAdicional,
            'final_amount' => $finalAmount,
            'total_discount_applied' => $proratedOld + $appliedCredits, // desconto pro-rata + créditos aplicados
            // Compatibility keys
            'credits_available' => $userBalance,
            'discount_applied' => $proratedOld + $appliedCredits,
            'remaining_credit' => $creditoAdicional,
        ];
    }

    public function listContractsForUser(int $userId): Collection
    {
        return Contract::with('plan')->where('user_id', $userId)->get();
    }

    /**
     * Obter saldo disponível para um usuário (compatibilidade)
     */
    public function getUserCredits(int $userId): int
    {
        return $this->getUserBalance($userId);
    }

    /**
     * Obter saldo disponível para um usuário
     */
    public function getUserBalance(int $userId): int
    {
        return UserBalance::getTotalBalanceForUser($userId);
    }

    /**
     * Aplicar créditos em um pagamento
     */
    public function applyCreditsToPayment(int $userId, int $paymentAmount): array
    {
        $availableCredits = $this->getUserBalance($userId);
        $appliedCredits = min($availableCredits, $paymentAmount);
        $remainingAmount = $paymentAmount - $appliedCredits;

        // Consumir créditos utilizados
        if ($appliedCredits > 0) {
            $this->consumeCredits($userId, $appliedCredits);
        }

        return [
            'applied_credits' => $appliedCredits,
            'remaining_amount' => $remainingAmount,
            'total_credits_used' => $appliedCredits,
        ];
    }

    /**
     * Consumir créditos de um usuário (usando FIFO - primeiro criado)
     */
    private function consumeCredits(int $userId, int $amountToConsume): void
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
                'amount' => $consumedAmount / 100, // converter centavos para reais
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
        // Assumir período de 30 dias a partir da data de início
        $endDate = $contract->start_date->copy()->addDays(30);

        if ($now->greaterThanOrEqualTo($endDate)) {
            return 0;
        }

        return $now->diffInDays($endDate);
    }

    /**
     * Adiciona um valor ao saldo do usuário e registra a transação.
     */
    public function addBalance(int $userId, int $amount, string $description): void
    {
        if ($amount <= 0) {
            return;
        }

        // Adicionar o valor ao saldo do usuário
        UserBalance::create([
            'user_id' => $userId,
            'amount' => $amount, // O valor já deve estar em centavos
            'description' => $description,
        ]);

        // Registrar a transação de crédito
        UserBalanceTransaction::create([
            'user_id' => $userId,
            'amount' => $amount / 100, // Armazenar em valor monetário (reais)
            'type' => 'credit',
            'description' => $description,
            'metadata' => [
                'source' => 'manual_addition' // ou outra fonte, se aplicável
            ],
        ]);
    }
}
