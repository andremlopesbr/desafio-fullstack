<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Domain\ValueObjects\Money;
use App\Domain\Enums\PaymentStatus;
use Carbon\Carbon;

class PaymentDTO
{
    public function __construct(
        public int $contract_id,
        public Money $amount,
        public Carbon $payment_date,
        public PaymentStatus $status,
    ) {}
}
