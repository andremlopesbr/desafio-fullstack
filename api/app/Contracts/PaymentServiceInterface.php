<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\PaymentDTO;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Collection;

interface PaymentServiceInterface
{
    public function processPayment(PaymentDTO $dto): Payment;
    public function listPaymentsForUser(int $userId): Collection;
}
