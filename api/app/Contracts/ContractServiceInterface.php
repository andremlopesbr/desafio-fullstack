<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\ContractCreateDTO;
use App\Models\Contract;
use Illuminate\Database\Eloquent\Collection;

interface ContractServiceInterface
{
    public function createContract(ContractCreateDTO $dto): Contract;
    public function changePlan(int $contractId, int $newPlanId): array;
    public function listContractsForUser(int $userId): Collection;
    public function getUserCredits(int $userId): int;
    public function getUserBalance(int $userId): int;
    public function applyCreditsToPayment(int $userId, int $paymentAmount): array;
    public function addBalance(int $userId, int $amount, string $description): void;
}
