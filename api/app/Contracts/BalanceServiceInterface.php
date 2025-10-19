<?php

declare(strict_types=1);

namespace App\Contracts;

interface BalanceServiceInterface
{
    public function getUserBalance(int $userId): float;
    public function applyBalanceToPayment(int $userId, float $paymentAmount): array;
    public function addBalance(int $userId, float $amount, string $description): void;
    public function consumeBalance(int $userId, float $amount): void;
}
