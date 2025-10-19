<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\PaymentMaintenanceServiceInterface;
use App\Contracts\BalanceServiceInterface;
use App\Models\Contract;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PaymentMaintenanceService implements PaymentMaintenanceServiceInterface
{
    public function __construct(
        private BalanceServiceInterface $balanceService
    ) {}

    /**
     * Processar cobrança recorrente automática
     */
    public function processRecurringPayment(int $contractId): array
    {
        Log::info("💰 [PaymentMaintenanceService] Processando cobrança recorrente", [
            'contract_id' => $contractId
        ]);

        $contract = Contract::with('plan')->findOrFail($contractId);
        $userId = $contract->user_id;
        $planPrice = (float) $contract->plan->price;

        // Obter saldo disponível do usuário
        $userBalance = $this->balanceService->getUserBalance($userId);
        $now = Carbon::now();

        // Calcular ciclo mensal atual para determinar se é cobrança proporcional
        $cycleInfo = $this->calculateMonthlyCycle($contract, $now);

        $valorAPagar = 0.0;
        $appliedBalance = 0.0;
        $isProportionalBilling = false;

        // Verificar se é dia de cobrança proporcional (início do ciclo)
        $isCycleStart = $now->isSameDay($cycleInfo['cycle_start']);

        if ($isCycleStart) {
            // Cobrança proporcional no início do ciclo mensal
            $proportionalAmount = $planPrice * ($cycleInfo['days_remaining'] / $cycleInfo['total_days']);
            $isProportionalBilling = true;
            $valorAPagar = $proportionalAmount;

            Log::info("📊 [PaymentMaintenanceService] Cobrança proporcional aplicada", [
                'contract_id' => $contractId,
                'proportional_amount' => $proportionalAmount,
                'days_remaining' => $cycleInfo['days_remaining'],
                'total_days' => $cycleInfo['total_days']
            ]);
        } else {
            // Cobrança normal mensal (fim do ciclo)
            $valorAPagar = $planPrice;
        }

        // Aplicar saldo disponível se houver cobrança
        if ($valorAPagar > 0) {
            $balanceResult = $this->balanceService->applyBalanceToPayment($userId, $valorAPagar);
            $appliedBalance = $balanceResult['applied_balance'];
            $valorAPagar = $balanceResult['remaining_amount'];
        }

        // Registrar pagamento da recorrência apenas se houver valor a pagar
        $payment = null;
        if ($valorAPagar > 0) {
            $payment = Payment::create([
                'contract_id' => $contractId,
                'amount' => $valorAPagar,
                'payment_date' => $now,
                'status' => 'paid',
                'applied_credits' => $appliedBalance,
                'discount_applied' => $appliedBalance,
                'prorated_old' => $isProportionalBilling ? $planPrice - $valorAPagar : 0,
                'prorated_new' => $isProportionalBilling ? $valorAPagar : $planPrice,
            ]);

            Log::info("💳 [PaymentMaintenanceService] Pagamento recorrente registrado", [
                'payment_id' => $payment->id,
                'amount' => $valorAPagar,
                'is_proportional' => $isProportionalBilling
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
     * Executar manutenção diária (renovações e cobranças)
     */
    public function processDailyMaintenance(): array
    {
        Log::info("🔧 [PaymentMaintenanceService] Iniciando manutenção diária");

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

            Log::info("📋 [PaymentMaintenanceService] Contratos expirados encontrados", [
                'count' => $expiredContracts->count()
            ]);

            foreach ($expiredContracts as $contract) {
                try {
                    $this->renewContract($contract->id);
                    $results['contracts_renewed']++;
                } catch (\Exception $e) {
                    $results['errors'][] = "Erro renovando contrato {$contract->id}: " . $e->getMessage();
                    Log::error("❌ [PaymentMaintenanceService] Erro ao renovar contrato", [
                        'contract_id' => $contract->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // 2. Processar cobranças recorrentes (contratos ativos que chegaram na data de cobrança)
            $contractsDue = Contract::where('end_date', '=', Carbon::now()->addDays(1))
                ->where('status', 'active')
                ->get();

            Log::info("💳 [PaymentMaintenanceService] Contratos com cobrança pendente encontrados", [
                'count' => $contractsDue->count()
            ]);

            foreach ($contractsDue as $contract) {
                try {
                    $this->processRecurringPayment($contract->id);
                    $results['recurring_payments_processed']++;
                } catch (\Exception $e) {
                    $results['errors'][] = "Erro processando recorrência contrato {$contract->id}: " . $e->getMessage();
                    Log::error("❌ [PaymentMaintenanceService] Erro ao processar cobrança recorrente", [
                        'contract_id' => $contract->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

        } catch (\Exception $e) {
            $errorMessage = "Erro geral na manutenção diária: " . $e->getMessage();
            $results['errors'][] = $errorMessage;
            Log::error("💥 [PaymentMaintenanceService] Erro geral na manutenção diária", [
                'error' => $e->getMessage()
            ]);
        }

        Log::info("✅ [PaymentMaintenanceService] Manutenção diária concluída", $results);
        return $results;
    }

    /**
     * Renovar contrato expirado automaticamente
     */
    private function renewContract(int $contractId): Contract
    {
        Log::info("🔄 [PaymentMaintenanceService] Iniciando renovação automática de contrato", [
            'contract_id' => $contractId
        ]);

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

        Log::info("✅ [PaymentMaintenanceService] Contrato renovado com sucesso", [
            'old_contract_id' => $contract->id,
            'new_contract_id' => $newContract->id,
            'new_start_date' => $newStartDate->toDateString(),
            'new_end_date' => $newEndDate->toDateString()
        ]);

        return $newContract;
    }

    /**
     * Calcular ciclo mensal baseado na data de início do contrato
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
            $cycleStart = $startDate;
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

                // Garantir que dias utilizados + dias restantes = dias totais
                if ($daysUsed + $daysRemaining !== $totalDays) {
                    $daysRemaining = $totalDays - $daysUsed;
                    if ($daysRemaining < 0) {
                        $daysRemaining = 0;
                        $daysUsed = $totalDays;
                    }
                }
            }
        }

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

        return [
            'start_date' => $startDate,
            'end_date' => $endDate
        ];
    }
}
