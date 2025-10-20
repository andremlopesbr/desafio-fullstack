<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ContractServiceInterface;
use App\Contracts\BalanceServiceInterface;
use App\DTOs\ContractCreateDTO;
use App\Models\Contract;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\UserBalance;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class ContractService implements ContractServiceInterface
{
    public function __construct(
        private BalanceServiceInterface $balanceService
    ) {}

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
        Log::info("🔄 [CHANGE_PLAN] Iniciando troca de plano", ['contract_id' => $contractId, 'new_plan_id' => $newPlanId]);

        $contract = Contract::with('plan')->findOrFail($contractId);
        $newPlan = Plan::findOrFail($newPlanId);
        $oldPlan = $contract->plan;
        $userId = $contract->user_id;
        $now = Carbon::now();

        Log::info("📋 [CHANGE_PLAN] Dados iniciais", [
            'contract_id' => $contract->id,
            'old_plan_id' => $oldPlan->id,
            'old_plan_price' => $oldPlan->price,
            'new_plan_id' => $newPlan->id,
            'new_plan_price' => $newPlan->price,
            'contract_start_date' => $contract->start_date,
            'contract_end_date' => $contract->end_date,
            'current_date' => $now->toDateString(),
            'is_same_day' => $contract->start_date->isSameDay($now)
        ]);

        if ($contract->status === 'cancelled') {
            // Retornar dados do último contrato ativo do usuário
            $activeContract = Contract::where('user_id', $userId)
                ->where('status', 'active')
                ->with('plan')
                ->first();

            if ($activeContract) {
                return [
                    'old_contract' => $contract,
                    'new_contract' => $activeContract,
                    'payment' => null,
                    'balance_info' => [
                        'previous_balance' => $this->balanceService->getUserBalance($userId),
                        'credits_used' => 0,
                        'credits_generated' => 0,
                        'new_balance' => $this->balanceService->getUserBalance($userId),
                    ],
                    'additional_balance' => 0,
                    'final_amount' => 0,
                    'applied_balance' => 0,
                    'prorated_old' => 0,
                    'prorated_new' => $activeContract->plan->price,
                ];
            }

            throw new \Exception('Contrato já foi cancelado e não há contrato ativo disponível');
        }

        $totalDaysInCycle = 30;
        $startDate = $contract->start_date;
        $isSameDayChange = $startDate->isSameDay($now);

        Log::info("📅 [CHANGE_PLAN] Cálculo proporcional", [
            'start_date' => $startDate->toDateString(),
            'current_date' => $now->toDateString(),
            'is_same_day' => $isSameDayChange,
            'total_days_cycle' => $totalDaysInCycle
        ]);

        if ($isSameDayChange) {
            $proratedOldCredit = $oldPlan->price; // 100% de crédito no mesmo dia
            $daysUsed = 0;
            $daysRemaining = $totalDaysInCycle;
            Log::info("⚡ [CHANGE_PLAN] Cenário MESMO DIA - crédito 100%", [
                'prorated_old_credit' => $proratedOldCredit,
                'days_used' => $daysUsed,
                'days_remaining' => $daysRemaining
            ]);
        } else {
            $daysUsed = $startDate->diffInDays($now);
            if ($daysUsed > $totalDaysInCycle) {
                $daysUsed = $totalDaysInCycle;
            }
            $daysRemaining = $totalDaysInCycle - $daysUsed;
            $proratedOldCredit = $oldPlan->price * ($daysRemaining / $totalDaysInCycle);

            Log::info("📊 [CHANGE_PLAN] Cenário DIAS USADOS", [
                'days_used' => $daysUsed,
                'days_remaining' => $daysRemaining,
                'prorated_old_credit' => $proratedOldCredit,
                'calculation' => "{$oldPlan->price} * ({$daysRemaining} / {$totalDaysInCycle})"
            ]);
        }


        $proratedNew = $newPlan->price;
        $userBalance = $this->balanceService->getUserBalance($userId);

        $amount = 0;
        $creditGenerated = 0;
        $appliedCredits = 0;
        $discountApplied = 0;

        if ($proratedOldCredit >= $newPlan->price) { // Downgrade ou mesmo valor com crédito
            $discountApplied = $newPlan->price;
            $creditGenerated = $proratedOldCredit - $newPlan->price;
            $amount = 0;

            if ($creditGenerated > 0) {
                $description = "Crédito gerado por downgrade do plano {$oldPlan->description} para {$newPlan->description}";

                // Verificar se já existe crédito recente com mesmo valor (últimas 24h)
                $recentDuplicateCredit = UserBalance::where('user_id', $userId)
                    ->where('amount', $creditGenerated)
                    ->where('description', $description)
                    ->where('created_at', '>=', now()->subDay())
                    ->exists();

                if (!$recentDuplicateCredit) {
                    $this->balanceService->addBalance($userId, $creditGenerated, $description);
                }
            }
        } else { // Upgrade
            $remainingToPay = $newPlan->price - $proratedOldCredit;
            $appliedCredits = min($remainingToPay, $userBalance);
            $discountApplied = $proratedOldCredit + $appliedCredits;
            $amount = $newPlan->price - $discountApplied;

            Log::info("🔼 [CHANGE_PLAN] Cenário de Upgrade", [
                'prorated_old_credit' => $proratedOldCredit,
                'new_plan_price' => $newPlan->price,
                'user_balance' => $userBalance,
                'remaining_to_pay' => $remainingToPay,
                'applied_credits' => $appliedCredits,
                'discount_applied' => $discountApplied,
                'final_amount' => $amount
            ]);

            // Debug adicional para cenários específicos
            if ($amount > 0 && $userBalance > 0) {
                Log::info("💰 [CHANGE_PLAN] Upgrade com saldo parcial", [
                    'saldo_utilizado' => $appliedCredits,
                    'valor_restante' => $amount,
                    'saldo_remanescente' => $userBalance - $appliedCredits
                ]);
            }
        }

        // Desativar contrato antigo
        $contract->update(['status' => 'cancelled']);

        // Consumir créditos do saldo se aplicável
        if ($appliedCredits > 0) {
            $this->balanceService->consumeBalance($userId, $appliedCredits);
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
        $paymentData = [
            'contract_id' => $newContract->id,
            'amount' => $amount,
            'payment_date' => $now,
            'status' => 'paid', // Simulação de PIX sempre paga
            'prorated_old' => $proratedOldCredit,
            'prorated_new' => $proratedNew,
            'applied_credits' => $appliedCredits,
            'discount_applied' => $discountApplied,
            'credits_generated' => $creditGenerated,
        ];

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
                'new_balance' => $this->balanceService->getUserBalance($userId),
            ],
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
     * Renovar contrato expirado automaticamente
     */
    public function renewExpiredContract(int $contractId): Contract
    {
        Log::info("🔄 [ContractService] Iniciando renovação automática de contrato", [
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

        Log::info("✅ [ContractService] Contrato renovado com sucesso", [
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
            // Usar sempre 30 dias conforme exemplo do README
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

                // Garantir que dias utilizados + dias restantes = dias totais
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

        Log::info("Ciclo mensal calculado", [
            'contract_id' => $contract->id,
            'cycle_start' => $cycleStart->toDateString(),
            'cycle_end' => $cycleEnd->toDateString(),
            'total_days' => $totalDays,
            'days_used' => $daysUsed,
            'days_remaining' => $daysRemaining
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
     * Aplicar saldo do usuário ao pagamento
     */
    public function applyBalanceToPayment(int $userId, float $paymentAmount): array
    {
        $userBalance = $this->balanceService->getUserBalance($userId);
        $appliedBalance = min($userBalance, $paymentAmount);
        $remainingAmount = $paymentAmount - $appliedBalance;

        // Se aplicou saldo, consumir do saldo do usuário
        if ($appliedBalance > 0) {
            $this->balanceService->consumeBalance($userId, $appliedBalance);
        }

        return [
            'applied_balance' => $appliedBalance,
            'remaining_amount' => $remainingAmount,
            'new_balance' => $this->balanceService->getUserBalance($userId)
        ];
    }

    /**
     * Obter saldo do usuário
     */
    public function getUserBalance(int $userId): float
    {
        return $this->balanceService->getUserBalance($userId);
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
