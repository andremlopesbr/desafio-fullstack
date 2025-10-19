<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Contract;

interface ContractMaintenanceServiceInterface
{
    public function renew(int $contractId): Contract;
    public function processRecurring(int $contractId): array;
    public function processDailyMaintenance(): array;
}