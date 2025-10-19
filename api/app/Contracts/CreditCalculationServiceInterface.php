<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Contract;
use App\Models\Plan;

interface CreditCalculationServiceInterface
{
    public function calculateCreditInfo(Contract $contract, Plan $selectedPlan, float $databaseCredits): array;
    public function getUserCreditsBalance(int $userId): float;
    public function calculateForContractAndPlan(int $contractId, int $selectedPlanId): array;
}