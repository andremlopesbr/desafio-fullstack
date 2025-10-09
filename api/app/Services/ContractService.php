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

        // Calcular crédito proporcional com base nos dias restantes do plano antigo
        $daysRemaining = $this->calculateDaysRemaining($contract, Carbon::now());
        $oldPlanDailyPrice = $oldPlan->price / 30; // Assumindo 30 dias no mês
        $proportionalCredit = (int) round($daysRemaining * $oldPlanDailyPrice);

        // Assumir ciclo de 30 dias para cálculos pro-rata
        $totalDaysInCycle = 30;
        $daysUsed = $totalDaysInCycle - $daysRemaining;

        Log::info("Cálculo do ciclo", [
            'total_days_in_cycle' => $totalDaysInCycle,
            'days_used' => $daysUsed,
            'days_remaining' => $daysRemaining
        ]);

        // CORREÇÃO: Plano novo sempre usa valor cheio (não proporcional)
        // pois representa o valor base para comparação com créditos disponíveis
        $proratedOld = $oldPlan->price * ($daysRemaining / $totalDaysInCycle);
        $proratedNew = $newPlan->price; // Sempre valor cheio do plano novo

        Log::info("Cálculo de pro-rata corrigido", [
            'prorated_old' => $proratedOld,
            'prorated_new' => $proratedNew,
            'old_plan_price' => $oldPlan->price,
            'new_plan_price' => $newPlan->price,
            'days_remaining' => $daysRemaining,
            'explanation' => 'Pro-rata antigo proporcional, plano novo sempre cheio'
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

        // Lógica EXATA baseada no padrão solicitado pelo usuário
        // Fórmula SIMPLIFICADA: Plano Novo - Plano Atual = Resultado
        // Se resultado <= 0: À creditar = Abs(resultado), Pagamento = 0
        // Se resultado > 0: Pagamento = resultado

        $newPlanPrice = $newPlan->price; // Valor do novo plano
        $oldPlanPrice = $oldPlan->price; // Valor do plano atual (não proporcional)

        $valorAPagar = 0;
        $additionalBalance = 0;

        // Cálculo simples: Plano Novo - Plano Atual
        $planDifference = $newPlanPrice - $oldPlanPrice;

        if ($planDifference <= 0) {
            // Downgrade - gera crédito
            $additionalBalance = abs($planDifference);
            $valorAPagar = 0;

            Log::info("Downgrade - gerando crédito", [
                'new_plan_price' => $newPlanPrice,
                'old_plan_price' => $oldPlanPrice,
                'plan_difference' => $planDifference,
                'additional_balance' => $additionalBalance,
                'valor_a_pagar' => $valorAPagar,
                'explanation' => 'Plano Novo <= Plano Atual = gera crédito'
            ]);
        } else {
            // Upgrade - cobrar diferença
            $valorAPagar = $planDifference;

            Log::info("Upgrade - cobrar diferença", [
                'new_plan_price' => $newPlanPrice,
                'old_plan_price' => $oldPlanPrice,
                'plan_difference' => $planDifference,
                'valor_a_pagar' => $valorAPagar,
                'explanation' => 'Plano Novo > Plano Atual = cobrar diferença'
            ]);
        }

        // Lógica final de processamento
        Log::info("Resumo da troca de plano", [
            'type' => $isDowngrade ? 'downgrade' : ($isUpgrade ? 'upgrade' : 'same_price'),
            'prorated_old' => $proratedOld,
            'prorated_new' => $proratedNew,
            'new_plan_price' => $newPlanPrice,
            'user_balance' => $userBalance,
            'valor_a_pagar' => $valorAPagar,
            'additional_balance' => $additionalBalance,
            'explanation' => $isDowngrade ?
                'Downgrade: compara crédito proporcional antigo vs custo proporcional novo' :
                'Upgrade: cobra valor cheio novo menos crédito proporcional antigo'
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

        // Criar novo contrato
        $newContract = Contract::create([
            'user_id' => $contract->user_id,
            'plan_id' => $newPlanId,
            'start_date' => Carbon::now(),
            'status' => 'active',
        ]);

        $finalAmount = 0;
        $creditAddedToBalance = 0;

        if ($newPlan->price > $oldPlan->price) { // UPGRADE
            $finalAmount = max(0, $newPlan->price - $proportionalCredit);
            Log::info("Troca de plano (Upgrade)", ['new_price' => $newPlan->price, 'credit' => $proportionalCredit, 'final_amount' => $finalAmount]);
        } else { // DOWNGRADE ou troca lateral
            // Adiciona o crédito proporcional ao saldo do usuário
            if ($proportionalCredit > 0) {
                $description = "Crédito por downgrade do plano {$oldPlan->description} para {$newPlan->description}";
                $this->addBalance($contract->user_id, $proportionalCredit, $description);
                $creditAddedToBalance = $proportionalCredit;
            }
            // Cobra o valor cheio do novo plano
            $finalAmount = $newPlan->price;
            Log::info("Troca de plano (Downgrade)", ['new_price' => $newPlan->price, 'credit_added' => $creditAddedToBalance, 'final_amount' => $finalAmount]);
        }

        // Criar pagamento com o valor final
        if ($finalAmount >= 0) {
            Payment::create([
                'contract_id' => $newContract->id,
                'amount' => $finalAmount,
                'payment_date' => $now,
                'status' => 'paid', // Todos os pagamentos PIX simulados são pagos conforme especificação
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
            'new_plan_price' => $newPlanPrice,
            'user_balance_before' => $userBalance,
            'applied_balance' => $appliedBalance,
            'additional_balance' => $additionalBalance,
            'final_amount' => $finalAmount,
            'remaining_credit' => $creditAddedToBalance,
        ];
    }

    public function listContractsForUser(int $userId, ?string $status = null): Collection
    {
        return Contract::with('plan')->where('user_id', $userId)->get();
    }

    /**
     * Obter saldo disponível para um usuário (compatibilidade)
     */
    public function getUserCredits(int $userId): int
    {
        return (int) $this->getUserBalance($userId);
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
                'amount' => $consumedAmount,
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
        // Assumir período de 30 dias a partir da data de início
        $endDate = $contract->start_date->copy()->addDays(30);

        if ($now->greaterThanOrEqualTo($endDate)) {
            return 0;
        }

        return $now->diffInDays($endDate);
    }

    /**
     * Renovar contrato expirado automaticamente
     */
    public function renewExpiredContract(int $contractId): Contract
    {
        Log::info("Iniciando renovação automática de contrato", ['contract_id' => $contractId]);

        $contract = Contract::with('plan')->findOrFail($contractId);

        if ($contract->status !== 'active') {
            throw new \Exception('Contrato não está ativo para renovação');
        }

        // Calcular nova data de fim (mesmo dia do mês seguinte)
        $now = Carbon::now();
        $nextMonth = $now->copy()->addMonth();
        $newStartDate = $contract->end_date ? $contract->end_date->copy() : $now;
        $newEndDate = $nextMonth->startOfMonth()->addDays($now->day - 1);

        // Se o dia do mês não existir no próximo mês, usar o último dia do mês
        if ($newEndDate->month !== $nextMonth->month) {
            $newEndDate = $nextMonth->endOfMonth();
        }

        Log::info("Datas calculadas para renovação automática", [
            'old_end_date' => $contract->end_date?->toDateString(),
            'new_start_date' => $newStartDate->toDateString(),
            'new_end_date' => $newEndDate->toDateString()
        ]);

        // Desativar contrato atual
        $contract->update(['status' => 'completed']);

        // Criar novo contrato
        $newContract = Contract::create([
            'user_id' => $contract->user_id,
            'plan_id' => $contract->plan_id,
            'start_date' => $newStartDate,
            'end_date' => $newEndDate,
            'status' => 'active',
        ]);

        Log::info("Contrato renovado automaticamente", [
            'old_contract_id' => $contract->id,
            'new_contract_id' => $newContract->id,
            'plan_price' => $contract->plan->price
        ]);

        return $newContract;
    }

    /**
     * Processar cobrança recorrente automática
     */
    public function processRecurringPayment(int $contractId): array
    {
        Log::info("Processando cobrança recorrente", ['contract_id' => $contractId]);

        $contract = Contract::with('plan')->findOrFail($contractId);
        $userId = $contract->user_id;
        $planPrice = $contract->plan->price;
        $userBalance = $this->getUserBalance($userId);

        $valorAPagar = 0;
        $appliedBalance = 0;

        if ($userBalance >= $planPrice) {
            // Saldo cobre totalmente - consumir saldo
            $appliedBalance = $planPrice;
            $valorAPagar = 0;

            Log::info("Cobrança totalmente coberta por saldo", [
                'plan_price' => $planPrice,
                'user_balance' => $userBalance,
                'applied_balance' => $appliedBalance,
                'valor_a_pagar' => $valorAPagar
            ]);

            // Consumir saldo
            $this->consumeBalance($userId, $appliedBalance);
        } else {
            // Saldo não cobre totalmente - cobrar diferença
            $valorAPagar = $planPrice - $userBalance;
            $appliedBalance = $userBalance;

            Log::info("Cobrança parcial - saldo insuficiente", [
                'plan_price' => $planPrice,
                'user_balance' => $userBalance,
                'applied_balance' => $appliedBalance,
                'valor_a_pagar' => $valorAPagar
            ]);

            if ($appliedBalance > 0) {
                $this->consumeBalance($userId, $appliedBalance);
            }
        }

        // Registrar pagamento da recorrência
        $payment = null;
        if ($valorAPagar >= 0) {
            $payment = Payment::create([
                'contract_id' => $contractId,
                'amount' => $valorAPagar,
                'payment_date' => Carbon::now(),
                'status' => 'paid', // Todos os pagamentos PIX simulados são pagos conforme especificação
                'applied_credits' => $appliedBalance,
            ]);
        }

        return [
            'payment' => $payment,
            'valor_a_pagar' => $valorAPagar,
            'applied_balance' => $appliedBalance,
            'contract' => $contract,
        ];
    }

    /**
     * Job diário para processar contratos expirados e cobranças recorrentes
     */
    public function processDailyMaintenance(): array
    {
        $results = [
            'contracts_renewed' => 0,
            'recurring_payments_processed' => 0,
            'errors' => []
        ];

        try {
            // 1. Renovar contratos expirados
            $expiredContracts = Contract::where('end_date', '<=', Carbon::now())
                ->where('status', 'active')
                ->get();

            foreach ($expiredContracts as $contract) {
                try {
                    $this->renewExpiredContract($contract->id);
                    $results['contracts_renewed']++;
                } catch (\Exception $e) {
                    $results['errors'][] = "Erro renovando contrato {$contract->id}: " . $e->getMessage();
                }
            }

            // 2. Processar cobranças recorrentes (contratos ativos que chegaram na data de cobrança)
            $contractsDue = Contract::where('end_date', '=', Carbon::now()->addDays(1))
                ->where('status', 'active')
                ->get();

            foreach ($contractsDue as $contract) {
                try {
                    $this->processRecurringPayment($contract->id);
                    $results['recurring_payments_processed']++;
                } catch (\Exception $e) {
                    $results['errors'][] = "Erro processando recorrência contrato {$contract->id}: " . $e->getMessage();
                }
            }
        } catch (\Exception $e) {
            $results['errors'][] = "Erro geral na manutenção diária: " . $e->getMessage();
        }

        Log::info("Manutenção diária processada", $results);
        return $results;
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
            'amount' => $amount,
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
