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

        // Calcular crédito proporcional com base nos dias restantes do plano antigo
        $daysRemaining = $this->calculateDaysRemaining($contract, Carbon::now());
        $oldPlanDailyPrice = $oldPlan->price / 30; // Assumindo 30 dias no mês
        $proportionalCredit = (int) round($daysRemaining * $oldPlanDailyPrice);

        // Desativar contrato antigo
        $contract->update(['status' => 'cancelled']);

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
                'amount' => (int) round($finalAmount), // Armazenar em centavos
                'payment_date' => Carbon::now(),
                'status' => $finalAmount > 0 ? 'pending' : 'paid',
            ]);
        }

        return [
            'contract' => $newContract,
            'credits_available' => $proportionalCredit,
            'discount_applied' => $proportionalCredit,
            'final_amount' => $finalAmount,
            'remaining_credit' => $creditAddedToBalance,
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
