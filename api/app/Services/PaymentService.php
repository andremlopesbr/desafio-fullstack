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

        // CORREÇÃO: Todos os pagamentos PIX simulados são considerados pagos
        // Conforme especificação do README, pagamentos devem sempre ser marcados como paid
        $processedStatus = PaymentStatus::PAID;

        // Criar pagamento com o valor final (após aplicação de créditos)
        // TODOS os valores salvos em reais (não centavos)
        $payment = Payment::create([
            'contract_id' => $contract->id,
            'amount' => $finalAmount, // Em reais
            'payment_date' => $dto->payment_date,
            'status' => $processedStatus->value,
            'discount_applied' => $dto->discount_applied,
            'prorated_old' => $dto->prorated_old,
            'prorated_new' => $dto->prorated_new,
            'applied_credits' => $dto->applied_credits,
        ]);

        return $payment;
    }


    public function listPaymentsForUser(int $userId): Collection
    {
        return Payment::with('contract.plan')->whereHas('contract', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->get();
    }
}
