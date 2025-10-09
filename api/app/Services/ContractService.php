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

        // Calcular ciclo mensal baseado na especificação do README
        // Sempre usar ciclo de 30 dias conforme exemplo: 01/09 → 15/09 = 14 dias utilizados
        $totalDaysInCycle = 30; // Fixo conforme exemplo do README

        // Calcular dias utilizados baseado na diferença entre start_date e now
        $startDate = $contract->start_date;
        $daysUsed = $startDate->diffInDays($now);

        // Garantir que não exceda os dias totais do ciclo
        if ($daysUsed > $totalDaysInCycle) {
            $daysUsed = $totalDaysInCycle;
        }

        $daysRemaining = $totalDaysInCycle - $daysUsed;

        Log::info("Ciclo mensal calculado (ESPECIFICAÇÃO README)", [
            'start_date' => $startDate->toDateString(),
            'current_date' => $now->toDateString(),
            'days_used' => $daysUsed,
            'days_remaining' => $daysRemaining,
            'total_days' => $totalDaysInCycle,
            'specification_compliant' => 'Ciclo fixo de 30 dias conforme exemplo do README'
        ]);

        // Calcular crédito proporcional do plano antigo baseado nos dias utilizados
        // Crédito = Valor do plano antigo * (dias restantes / dias totais do ciclo)
        // Fórmula EXATA do exemplo: Crédito proporcional = Valor plano antigo × (dias restantes ÷ 30)
        $proratedOldCredit = $oldPlan->price * ($daysRemaining / $totalDaysInCycle);

        Log::info("Cálculo detalhado do crédito proporcional (README)", [
            'old_plan_price' => $oldPlan->price,
            'days_used' => $daysUsed,
            'days_remaining' => $daysRemaining,
            'total_days_in_cycle' => $totalDaysInCycle,
            'prorated_old_credit' => $proratedOldCredit,
            'calculation' => "{$oldPlan->price} × ({$daysRemaining} ÷ {$totalDaysInCycle}) = {$proratedOldCredit}",
            'r' => $daysUsed === 14 && $daysRemaining === 16 ? 'CORRESPONDE AO EXEMPLO' : 'DIFERENTE DO EXEMPLO',
            'readme_example' => '01/09 → 15/09 = 14 dias utilizados, 16 restantes, crédito = R$50 de R$100'
        ]);

        // Novo plano sempre cobra valor cheio (não proporcional)
        $proratedNew = $newPlan->price;

        Log::info("Cálculo de pro-rata conforme especificação", [
            'old_plan_price' => $oldPlan->price,
            'new_plan_price' => $newPlan->price,
            'prorated_old_credit' => $proratedOldCredit,
            'prorated_new' => $proratedNew,
            'days_used' => $daysUsed,
            'days_remaining' => $daysRemaining,
            'total_days' => $totalDaysInCycle,
            'formula' => 'Crédito proporcional = Plano Antigo × (dias restantes ÷ dias totais)'
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

        // Lógica EXATA baseada na especificação do README
        // Exemplo: Plano R$100 → R$200 no dia 15 = R$150 (200-50)
        if ($isDowngrade) {
            // Downgrade: Crédito proporcional antigo - Valor cheio novo
            $planDifference = $proratedOldCredit - $newPlan->price;

            if ($planDifference > 0) {
                // Crédito proporcional > Valor novo = gera saldo excedente
                $additionalBalance = $planDifference;
                $valorAPagar = 0;

                Log::info("Downgrade com crédito excedente", [
                    'prorated_old_credit' => $proratedOldCredit,
                    'new_plan_price' => $newPlan->price,
                    'plan_difference' => $planDifference,
                    'additional_balance' => $additionalBalance,
                    'valor_a_pagar' => $valorAPagar,
                    'explanation' => 'Crédito proporcional antigo > Valor novo = gera saldo excedente'
                ]);
            } else {
                // Crédito proporcional <= Valor novo = cobra diferença
                $valorAPagar = abs($planDifference);
                $additionalBalance = 0;

                Log::info("Downgrade com cobrança adicional", [
                    'prorated_old_credit' => $proratedOldCredit,
                    'new_plan_price' => $newPlan->price,
                    'plan_difference' => $planDifference,
                    'valor_a_pagar' => $valorAPagar,
                    'additional_balance' => $additionalBalance,
                    'explanation' => 'Crédito proporcional antigo <= Valor novo = cobra diferença'
                ]);
            }
        } elseif ($isUpgrade) {
            // Upgrade: Valor cheio novo - Crédito proporcional antigo
            $valorAPagar = $newPlan->price - $proratedOldCredit;
            $additionalBalance = 0;

            Log::info("Upgrade - cobrar diferença", [
                'new_plan_price' => $newPlan->price,
                'prorated_old_credit' => $proratedOldCredit,
                'valor_a_pagar' => $valorAPagar,
                'explanation' => 'Upgrade: Valor cheio novo - Crédito proporcional antigo'
            ]);
        } else {
            // Mesmo preço - ajustar proporcionalmente
            $valorAPagar = $newPlan->price - $proratedOldCredit;
            $additionalBalance = 0;

            Log::info("Mesmo preço - ajuste proporcional", [
                'plan_price' => $newPlan->price,
                'prorated_old_credit' => $proratedOldCredit,
                'valor_a_pagar' => $valorAPagar,
                'explanation' => 'Mesmo preço: ajuste proporcional baseado no período utilizado'
            ]);
        }

        // Aplicar saldo disponível apenas se houver cobrança
        $remainingAmount = $valorAPagar;
        if ($valorAPagar > 0) {
            $balanceResult = $this->applyBalanceToPayment($userId, $valorAPagar);
            $appliedBalance = $balanceResult['applied_balance'];
            $remainingAmount = $balanceResult['remaining_amount'];

            Log::info("Saldo aplicado ao pagamento", [
                'valor_a_pagar_original' => $valorAPagar,
                'applied_balance' => $appliedBalance,
                'remaining_amount' => $remainingAmount,
                'user_balance_before' => $userBalance
            ]);
        }

        // Desativar todos os contratos ativos do usuário (apenas um plano ativo por vez)
        Contract::where('user_id', $userId)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        // Adicionar saldo adicional apenas no downgrade se houver excedente
        if ($additionalBalance > 0) {
            $description = "Saldo excedente por downgrade do plano {$oldPlan->description} para {$newPlan->description}";
            Log::info("Adicionando saldo adicional", [
                'additional_balance' => $additionalBalance,
                'description' => $description
            ]);
            $this->addBalance($userId, $additionalBalance, $description);
        }

        // Criar novo contrato com end_date no mesmo dia do mês seguinte
        $newCycle = $this->calculateNextMonthlyCycle($now);
        $newEndDate = $newCycle['end_date'];

        Log::info("Novo ciclo mensal calculado", [
            'start_date' => $now->toDateString(),
            'end_date' => $newEndDate->toDateString(),
            'day_of_month' => $now->day
        ]);

        $newContract = Contract::create([
            'user_id' => $userId,
            'plan_id' => $newPlanId,
            'start_date' => $now,
            'end_date' => $newEndDate,
            'status' => 'active',
        ]);

        Log::info("Novo contrato criado", [
            'new_contract_id' => $newContract->id,
            'plan_description' => $newPlan->description
        ]);

        // Criar pagamento apenas se houver valor a pagar após descontos
        $finalAmount = $remainingAmount;
        if ($finalAmount > 0) {
            Log::info("Criando pagamento", [
                'final_amount' => $finalAmount,
                'status' => 'paid', // PIX simulado sempre pago
                'discount_applied' => $proratedOldCredit + $appliedBalance,
                'prorated_old' => $proratedOldCredit,
                'prorated_new' => $proratedNew,
                'applied_credits' => $appliedBalance
            ]);

            Payment::create([
                'contract_id' => $newContract->id,
                'amount' => $finalAmount,
                'payment_date' => $now,
                'status' => 'paid',
                'discount_applied' => $proratedOldCredit + $appliedBalance,
                'prorated_old' => $proratedOldCredit,
                'prorated_new' => $proratedNew,
                'applied_credits' => $appliedBalance,
            ]);
        } else {
            Log::info("Nenhum pagamento necessário", [
                'final_amount' => $finalAmount,
                'reason' => 'Valor final <= 0 após descontos'
            ]);
        }

        return [
            'contract' => $newContract,
            'prorated_old' => $proratedOldCredit,
            'prorated_new' => $proratedNew,
            'new_plan_price' => $newPlan->price,
            'user_balance_before' => $userBalance,
            'applied_balance' => $appliedBalance,
            'additional_balance' => $additionalBalance,
            'final_amount' => $finalAmount,
            'total_discount_applied' => $proratedOldCredit + $appliedBalance,
            'credits_available' => $userBalance,
            'balance_available' => $userBalance,
            'discount_applied' => $proratedOldCredit + $appliedBalance,
            'remaining_credit' => $additionalBalance,
            'remaining_balance' => $additionalBalance,
            'cycle_info' => [
                'cycle_start' => $contract->start_date,
                'cycle_end' => $contract->start_date->copy()->addDays(30),
                'total_days' => $totalDaysInCycle,
                'days_used' => $daysUsed,
                'days_remaining' => $daysRemaining
            ],
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
