<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Contract;
use App\Models\Payment;

interface ContractWithPaymentServiceInterface
{
    /**
     * Criar contrato com pagamento integrado (para primeira compra)
     */
    public function createWithPayment(array $data): array;
}
