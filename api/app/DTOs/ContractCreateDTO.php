<?php

declare(strict_types=1);

namespace App\DTOs;

use Carbon\Carbon;

class ContractCreateDTO
{
    public function __construct(
        public int $user_id,
        public int $plan_id,
        public ?Carbon $start_date,
        public ?Carbon $end_date,
        public ?string $status,
    ) {}
}
