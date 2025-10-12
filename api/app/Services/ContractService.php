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

        $totalDaysInCycle = 30;
        $startDate = $contract->start_date;
        $isSameDayChange = $startDate->isSameDay($now);

        if ($isSameDayChange) {
            $proratedOldCredit = $oldPlan->price; // 100% de crédito no mesmo dia
            $daysUsed = 0;
            $daysRemaining = $totalDaysInCycle;
        } else {
            $daysUsed = $startDate->diffInDays($now);
            if ($daysUsed > $totalDaysInCycle) {
                $daysUsed = $totalDaysInCycle;
            }
            $daysRemaining = $totalDaysInCycle - $daysUsed;
            $proratedOldCredit = $oldPlan->price * ($daysRemaining / $totalDaysInCycle);
        }

        Log::info("Cálculo de crédito pro-rata", [
            'is_same_day_change' => $isSameDayChange,
            'prorated_old_credit' => $proratedOldCredit
        ]);

        $proratedNew = $newPlan->price;
        $userBalance = $this->getUserBalance($userId);

        $amount = 0;
        $creditGenerated = 0;
        $appliedCredits = 0;
        $discountApplied = 0;

        if ($proratedOldCredit >= $newPlan->price) { // Downgrade ou mesmo valor com crédito
            $discountApplied = $newPlan->price;
            $creditGenerated = $proratedOldCredit - $newPlan->price;
            $amount = 0;

            Log::info("Cenário de Downgrade - ANTES", [
                'prorated_old_credit' => $proratedOldCredit,
                'new_plan_price' => $newPlan->price,
                'discount_applied' => $discountApplied,
                'credit_generated' => $creditGenerated,
                'amount' => $amount,
                'user_balance_before' => $userBalance,
                'is_credit_generated_positive' => $creditGenerated > 0,
                'comparison_exact' => $proratedOldCredit >= $newPlan->price,
                'difference' => $proratedOldCredit - $newPlan->price
            ]);

            // Adicionar crédito gerado ao saldo do usuário (Cenário 4 - DEBUG.md)
            if ($creditGenerated > 0) {
                $description = "Crédito gerado por downgrade do plano {$oldPlan->description} para {$newPlan->description}";
                Log::info("ADICIONANDO CRÉDITO AO SALDO", [
                    'user_id' => $userId,
                    'credit_amount' => $creditGenerated,
                    'description' => $description
                ]);
                $this->addBalance($userId, $creditGenerated, $description);

                Log::info("CRÉDITO ADICIONADO - VERIFICAÇÃO", [
                    'user_balance_after' => $this->getUserBalance($userId),
                    'expected_balance' => $userBalance + $creditGenerated
                ]);
            } else {
                Log::info("NENHUM CRÉDITO GERADO", [
                    'credit_generated' => $creditGenerated,
                    'reason' => 'Valor menor ou igual a zero'
                ]);
            }
        } else { // Upgrade
            $remainingToPay = $newPlan->price - $proratedOldCredit;
            $appliedCredits = min($remainingToPay, $userBalance);
            $discountApplied = $proratedOldCredit + $appliedCredits;
            $amount = $newPlan->price - $discountApplied;

            Log::info("Cenário de Upgrade", [
                'prorated_old_credit' => $proratedOldCredit,
                'new_plan_price' => $newPlan->price,
                'user_balance' => $userBalance,
                'applied_credits' => $appliedCredits,
                'discount_applied' => $discountApplied,
                'amount' => $amount
            ]);
        }

        // Desativar contrato antigo
        $contract->update(['status' => 'cancelled']);

        // REMOVIDO: Segunda chamada duplicada de addBalance já foi feita anteriormente (linha 127)
        Log::info("VERIFICAÇÃO FINAL - Cenário Downgrade", [
            'credit_generated' => $creditGenerated,
            'user_balance_current' => $this->getUserBalance($userId),
            'expected_balance' => $userBalance + $creditGenerated,
            'duplication_prevented' => true
        ]);

        // Consumir créditos do saldo se aplicável
        if ($appliedCredits > 0) {
            $this->consumeBalance($userId, $appliedCredits);
        }

        // Criar novo contrato
        $newCycle = $this->calculateNextMonthlyCycle($now);
        $newContract = Contract::create([
            'user_id' => $userId,
            'plan_id' => $newPlanId,
            'start_date' => $now,
            'end_date' => $newCycle['end_date'],
            'status' => 'active',
        ]);

        // Criar registro de pagamento para o histórico
        // Criar registro de pagamento para o histórico - Cenário 4 do DEBUG.md
        $paymentData = [
            'contract_id' => $newContract->id,
            'amount' => $amount,
            'payment_date' => $now,
            'status' => 'paid', // Simulação de PIX sempre paga
            'prorated_old' => $proratedOldCredit,
            'prorated_new' => $proratedNew,
            'applied_credits' => $appliedCredits,
            'discount_applied' => $discountApplied,
            'credits_generated' => $creditGenerated, // Campo novo para Cenário 4
        ];

        // Cenário 4: Downgrade - DEBUG.md Cenário 4
        if ($proratedOldCredit > $newPlan->price && $amount == 0) {
            Log::info("Cenário 4 - Downgrade com crédito gerado", [
                'prorated_old_credit' => $proratedOldCredit,
                'new_plan_price' => $newPlan->price,
                'credit_generated' => $creditGenerated,
                'discount_applied' => $discountApplied
            ]);
        }

        $payment = Payment::create($paymentData);

        Log::info("Registro de pagamento criado", ['payment_id' => $payment->id]);

        return [
            'old_contract' => $contract,
            'new_contract' => $newContract,
            'payment' => $payment,
            'balance_info' => [
                'previous_balance' => $userBalance,
                'credits_used' => $appliedCredits,
                'credits_generated' => $creditGenerated,
                'new_balance' => $this->getUserBalance($userId),
            ],
            // Campos de compatibilidade com testes existentes
            'additional_balance' => $creditGenerated, // Crédito gerado em downgrade
            'final_amount' => $amount, // Valor final a pagar
            'applied_balance' => $appliedCredits, // Créditos utilizados
            'prorated_old' => $proratedOldCredit, // Crédito proporcional
            'prorated_new' => $proratedNew, // Valor do plano novo
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
      * Renovar contrato expirado automaticamente
      */
    public function renewExpiredContract(int $contractId): Contract
    {
        Log::info("Iniciando renovação automática de contrato", ['contract_id' => $contractId]);

        $contract = Contract::with('plan')->findOrFail($contractId);

        if ($contract->status !== 'active') {
            throw new \Exception('Contrato não está ativo para renovação');
        }

        $now = Carbon::now();

        // Usar o método de cálculo de ciclo mensal para determinar as datas corretas
        if ($contract->end_date) {
            // Contrato com data de fim definida - renovar a partir dessa data
            $newStartDate = $contract->end_date->copy();
        } else {
            // Contrato sem data de fim - renovar a partir de hoje
            $newStartDate = $now;
        }

        // Calcular próximo ciclo mensal
        $newCycle = $this->calculateNextMonthlyCycle($newStartDate);
        $newEndDate = $newCycle['end_date'];

        Log::info("Datas calculadas para renovação automática", [
            'old_contract_id' => $contract->id,
            'old_end_date' => $contract->end_date?->toDateString(),
            'new_start_date' => $newStartDate->toDateString(),
            'new_end_date' => $newEndDate->toDateString(),
            'plan_description' => $contract->plan->description
        ]);

        // Desativar contrato atual
        $contract->update(['status' => 'completed']);

        // Criar novo contrato usando o ciclo mensal correto
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
            'plan_id' => $contract->plan_id,
            'plan_price' => $contract->plan->price,
            'renewal_type' => 'automatic_monthly_cycle'
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
        $now = Carbon::now();

        // Calcular ciclo mensal atual para determinar se é cobrança proporcional
        $cycleInfo = $this->calculateMonthlyCycle($contract, $now);

        Log::info("Ciclo mensal para cobrança recorrente", [
            'contract_id' => $contractId,
            'plan_price' => $planPrice,
            'cycle_start' => $cycleInfo['cycle_start']->toDateString(),
            'cycle_end' => $cycleInfo['cycle_end']->toDateString(),
            'days_used' => $cycleInfo['days_used'],
            'days_remaining' => $cycleInfo['days_remaining'],
            'total_days' => $cycleInfo['total_days']
        ]);

        $valorAPagar = 0;
        $appliedBalance = 0;
        $isProportionalBilling = false;

        // Verificar se é dia de cobrança proporcional (início do ciclo)
        $isCycleStart = $now->isSameDay($cycleInfo['cycle_start']);

        if ($isCycleStart) {
            // Cobrança proporcional no início do ciclo mensal
            // Valor proporcional = Preço do plano × (dias restantes ÷ dias totais do ciclo)
            $proportionalAmount = $planPrice * ($cycleInfo['days_remaining'] / $cycleInfo['total_days']);

            Log::info("Cobrança proporcional no início do ciclo", [
                'plan_price' => $planPrice,
                'proportional_amount' => $proportionalAmount,
                'days_remaining' => $cycleInfo['days_remaining'],
                'total_days' => $cycleInfo['total_days'],
                'calculation' => "Proporcional = {$planPrice} × ({$cycleInfo['days_remaining']} ÷ {$cycleInfo['total_days']})"
            ]);

            $isProportionalBilling = true;
            $valorAPagar = $proportionalAmount;
        } else {
            // Cobrança normal mensal (fim do ciclo)
            $valorAPagar = $planPrice;
            Log::info("Cobrança normal mensal", [
                'plan_price' => $planPrice,
                'billing_type' => 'full_month'
            ]);
        }

        // Aplicar saldo disponível se houver cobrança
        if ($valorAPagar > 0) {
            $balanceResult = $this->applyBalanceToPayment($userId, $valorAPagar);
            $appliedBalance = $balanceResult['applied_balance'];
            $remainingAmount = $balanceResult['remaining_amount'];

            Log::info("Saldo aplicado na cobrança recorrente", [
                'valor_a_pagar_original' => $valorAPagar,
                'applied_balance' => $appliedBalance,
                'remaining_amount' => $remainingAmount,
                'user_balance_before' => $userBalance,
                'is_proportional' => $isProportionalBilling
            ]);

            $valorAPagar = $remainingAmount;
        }

        // Registrar pagamento da recorrência apenas se houver valor a pagar
        $payment = null;
        if ($valorAPagar > 0) {
            $payment = Payment::create([
                'contract_id' => $contractId,
                'amount' => $valorAPagar,
                'payment_date' => $now,
                'status' => 'paid', // Todos os pagamentos PIX simulados são pagos conforme especificação
                'applied_credits' => $appliedBalance,
                'discount_applied' => $appliedBalance,
                'prorated_old' => $isProportionalBilling ? $planPrice - $valorAPagar : 0,
                'prorated_new' => $isProportionalBilling ? $valorAPagar : $planPrice,
            ]);

            Log::info("Pagamento recorrente registrado", [
                'payment_id' => $payment->id,
                'amount' => $valorAPagar,
                'is_proportional' => $isProportionalBilling
            ]);
        } else {
            Log::info("Cobrança recorrente totalmente coberta por saldo", [
                'applied_balance' => $appliedBalance,
                'no_payment_needed' => true
            ]);
        }

        return [
            'payment' => $payment,
            'valor_a_pagar' => $valorAPagar,
            'applied_balance' => $appliedBalance,
            'contract' => $contract,
            'is_proportional_billing' => $isProportionalBilling,
            'cycle_info' => $cycleInfo,
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
        Log::info("INICIANDO addBalance", [
            'user_id' => $userId,
            'amount' => $amount,
            'description' => $description,
            'amount_positive' => $amount > 0
        ]);

        if ($amount <= 0) {
            Log::info("addBalance ABORTADO - valor menor ou igual a zero", [
                'amount' => $amount
            ]);
            return;
        }

        // Verificar saldo antes de adicionar
        $balanceBefore = UserBalance::getTotalBalanceForUser($userId);

        // Adicionar o valor ao saldo do usuário
        Log::info("CRIANDO UserBalance", [
            'user_id' => $userId,
            'amount' => $amount,
            'description' => $description
        ]);

        UserBalance::create([
            'user_id' => $userId,
            'amount' => $amount, // O valor em reais
            'description' => $description,
        ]);

        // Verificar saldo após adicionar
        $balanceAfter = UserBalance::getTotalBalanceForUser($userId);

        // Registrar a transação de crédito
        Log::info("CRIANDO UserBalanceTransaction", [
            'user_id' => $userId,
            'amount' => $amount,
            'type' => 'credit',
            'description' => $description,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'difference' => $balanceAfter - $balanceBefore
        ]);

        UserBalanceTransaction::create([
            'user_id' => $userId,
            'amount' => $amount, // Armazenar em reais
            'type' => 'credit',
            'description' => $description,
            'metadata' => [
                'source' => 'plan_downgrade', // fonte específica para downgrade
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter
            ],
        ]);

        Log::info("addBalance CONCLUÍDO", [
            'user_id' => $userId,
            'amount_added' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter
        ]);
    }

    /**
     * Calcular ciclo mensal baseado na data de início do contrato
     * Implementação CORRIGIDA para seguir exatamente a especificação do README
     */
    private function calculateMonthlyCycle(Contract $contract, Carbon $currentDate): array
    {
        $startDate = $contract->start_date;
        $endDate = $contract->end_date;

        // Se o contrato tem end_date definido, usar esse ciclo
        if ($endDate) {
            $cycleStart = $startDate;
            $cycleEnd = $endDate;
            $totalDays = $startDate->diffInDays($endDate);

            // Se já passou da data de fim, considerar ciclo completo
            if ($currentDate->greaterThan($endDate)) {
                $daysUsed = $totalDays;
                $daysRemaining = 0;
            } else {
                $daysUsed = $startDate->diffInDays($currentDate);
                $daysRemaining = $currentDate->diffInDays($endDate);
            }
        } else {
            // Contrato sem end_date definido - assumir ciclo mensal padrão de 30 dias
            // Esta é a correção principal: usar sempre 30 dias conforme exemplo do README
            $cycleStart = $startDate;

            // Para seguir o exemplo do README, assumir sempre ciclo de 30 dias
            $totalDays = 30;

            // Calcular fim do ciclo baseado na data de início
            $cycleEnd = $startDate->copy()->addDays($totalDays);

            // Se já passou da data de fim do ciclo, considerar ciclo completo
            if ($currentDate->greaterThan($cycleEnd)) {
                $daysUsed = $totalDays;
                $daysRemaining = 0;
            } else {
                $daysUsed = $startDate->diffInDays($currentDate);
                $daysRemaining = $currentDate->diffInDays($cycleEnd);

                // Correção: garantir que dias utilizados + dias restantes = dias totais
                // Esta lógica garante que o cálculo seja consistente com o exemplo do README
                if ($daysUsed + $daysRemaining !== $totalDays) {
                    // Ajuste fino para casos extremos (mudanças de horário, anos bissextos, etc.)
                    $daysRemaining = $totalDays - $daysUsed;
                    if ($daysRemaining < 0) {
                        $daysRemaining = 0;
                        $daysUsed = $totalDays;
                    }
                }
            }
        }

        Log::info("Ciclo mensal calculado (CORRIGIDO)", [
            'contract_id' => $contract->id,
            'cycle_start' => $cycleStart->toDateString(),
            'cycle_end' => $cycleEnd->toDateString(),
            'total_days' => $totalDays,
            'days_used' => $daysUsed,
            'days_remaining' => $daysRemaining,
            'current_date' => $currentDate->toDateString(),
            'calculation_consistent' => ($daysUsed + $daysRemaining) === $totalDays,
            'specification_compliant' => 'Ciclo fixo de 30 dias conforme exemplo do README'
        ]);

        return [
            'cycle_start' => $cycleStart,
            'cycle_end' => $cycleEnd,
            'total_days' => $totalDays,
            'days_used' => $daysUsed,
            'days_remaining' => $daysRemaining
        ];
    }

    /**
     * Calcular próximo ciclo mensal baseado na data atual
     */
    private function calculateNextMonthlyCycle(Carbon $currentDate): array
    {
        // Próximo ciclo começa hoje e termina no mesmo dia do mês seguinte
        $startDate = $currentDate->copy();
        $nextMonth = $currentDate->copy()->addMonth();
        $endDate = $nextMonth->startOfMonth()->addDays($currentDate->day - 1);

        // Se o dia não existir no próximo mês, usar último dia do mês
        if ($endDate->month !== $nextMonth->month) {
            $endDate = $nextMonth->endOfMonth();
        }

        Log::info("Próximo ciclo mensal calculado", [
            'current_date' => $currentDate->toDateString(),
            'cycle_start' => $startDate->toDateString(),
            'cycle_end' => $endDate->toDateString(),
            'day_of_month' => $currentDate->day
        ]);

        return [
            'start_date' => $startDate,
            'end_date' => $endDate
        ];
    }

}
