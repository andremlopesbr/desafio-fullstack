<?php

declare(strict_types=1);

namespace App\Contracts;

interface PaymentMaintenanceServiceInterface
{
    public function processRecurringPayment(int $contractId): array;
    public function processDailyMaintenance(): array;
}
