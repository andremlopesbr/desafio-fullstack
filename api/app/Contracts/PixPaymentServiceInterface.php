<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\PaymentDTO;
use App\Models\Payment;

interface PixPaymentServiceInterface extends PaymentServiceInterface
{
    /**
     * Processa pagamento PIX específico com regras diferenciadas
     */
    public function processPixPayment(PaymentDTO $dto): Payment;

    /**
     * Valida se o pagamento é elegível para processamento PIX
     */
    public function isPixEligible(PaymentDTO $dto): bool;

    /**
     * Aplica regras específicas de negócio para PIX
     */
    public function applyPixBusinessRules(PaymentDTO $dto): PaymentDTO;
}