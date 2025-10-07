<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\PaymentDTO;
use App\Models\Payment;
use App\Models\Contract;
use App\Domain\Enums\PaymentStatus;
use App\Contracts\ContractServiceInterface;
use App\Contracts\PaymentServiceInterface;
use Illuminate\Database\Eloquent\Collection;

class PaymentService implements PaymentServiceInterface
{
    public function __construct(
        private ContractServiceInterface $contractService
    ) {}

    public function processPayment(PaymentDTO $dto): Payment
    {
        // Validar se o contrato existe
        $contract = Contract::findOrFail($dto->contract_id);

        // Aplicar créditos disponíveis se houver
        $originalAmount = $dto->amount->getAmount(); // em centavos
        $creditResult = $this->contractService->applyCreditsToPayment(
            $contract->user_id,
            $originalAmount
        );

        $finalAmount = $creditResult['remaining_amount'];

        // Se após aplicar créditos o valor for zero, o pagamento é considerado pago
        if ($finalAmount <= 0) {
            $processedStatus = PaymentStatus::PAID;
        } else {
            // Simular processamento de pagamento para o valor restante
            $dtoWithCredits = new PaymentDTO(
                contract_id: $dto->contract_id,
                amount: new \App\Domain\ValueObjects\Money($finalAmount), // valor em centavos
                payment_date: $dto->payment_date,
                status: PaymentStatus::PENDING
            );
            $processedStatus = $this->simulatePaymentProcessing($dtoWithCredits);
        }

        // Criar pagamento com o valor final (após aplicação de créditos)
        $payment = Payment::create([
            'contract_id' => $dto->contract_id,
            'amount' => $finalAmount, // Salvar em centavos
            'payment_date' => $dto->payment_date,
            'status' => $processedStatus->value,
        ]);

        return $payment;
    }

    private function simulatePaymentProcessing(PaymentDTO $dto): PaymentStatus
    {
        // Simulação simples: se o valor for > 100 reais, falha; senão, sucesso
        if ($dto->amount->getValueInReais() > 100.00) {
            return PaymentStatus::FAILED;
        }

        return PaymentStatus::PAID;
    }

    public function listPaymentsForUser(int $userId): Collection
    {
        return Payment::with('contract.plan')->whereHas('contract', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->get();
    }
}
