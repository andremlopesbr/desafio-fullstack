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
    public function listContractsForUser(int $userId, ?string $status = null): Collection;
    public function renewExpiredContract(int $contractId): Contract;
    public function applyBalanceToPayment(int $userId, float $paymentAmount): array;
    public function getUserBalance(int $userId): float;
}
