<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Contract;
use App\Models\Plan;
use App\Models\UserBalance;
use Carbon\Carbon;

class CreditCalculationService
{
    /**
     * Calcula informações de crédito para mudança de plano
     */
    public function calculateCreditInfo(Contract $contract, Plan $selectedPlan, float $databaseCredits): array
    {
        $proratedDiscount = $this->calculateProratedDiscount($contract);
        $totalAvailableCredits = $databaseCredits + $proratedDiscount;
        $selectedPrice = (float) $selectedPlan->price;
        $finalPrice = max(0, $selectedPrice - $totalAvailableCredits);
        $discount = min($selectedPrice, $totalAvailableCredits);

        return [
            'database_credits' => $databaseCredits,
            'prorated_discount' => $proratedDiscount,
            'prorated_old' => (float) $contract->plan->price,
            'prorated_new' => $selectedPrice,
            'available_credits' => $totalAvailableCredits,
            'final_price' => $finalPrice,
            'discount' => $discount,
        ];
    }

    /**
     * Calcula desconto proporcional baseado na data de início do contrato
     */
    private function calculateProratedDiscount(Contract $contract): float
    {
        if (!$contract->start_date || !$contract->plan) {
            return 0.0;
        }

        $now = Carbon::now('America/Sao_Paulo');
        $startDate = Carbon::parse($contract->start_date)->setTimezone('America/Sao_Paulo');
        $daysDiff = $now->diffInDays($startDate);

        if ($daysDiff === 0) {
            return (float) $contract->plan->price;
        } elseif ($daysDiff < 30) {
            return ((float) $contract->plan->price / 30) * (30 - $daysDiff);
        } else {
            return 0.0;
        }
    }

    /**
     * Obtém o saldo total de créditos disponível para um usuário
     */
    public function getUserCreditsBalance(int $userId): float
    {
        return UserBalance::getTotalBalanceForUser($userId);
    }

    /**
     * Calcula informações de crédito para um contrato específico com um plano selecionado
     */
    public function calculateForContractAndPlan(int $contractId, int $selectedPlanId): array
    {
        $contract = Contract::with('plan')->findOrFail($contractId);
        $selectedPlan = Plan::findOrFail($selectedPlanId);
        $userCredits = $this->getUserCreditsBalance($contract->user_id);

        return $this->calculateCreditInfo($contract, $selectedPlan, $userCredits);
    }
}
