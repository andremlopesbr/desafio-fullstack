<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\PaymentDTO;
use App\Models\Payment;
use App\Models\Contract;
use App\Domain\Enums\PaymentStatus;
use App\Contracts\ContractServiceInterface;
use App\Contracts\PixPaymentServiceInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Exception;

class PixPaymentService implements PixPaymentServiceInterface
{
    public function __construct(
        private ContractServiceInterface $contractService
    ) {}

    public function processPayment(PaymentDTO $dto): Payment
    {
        Log::info('🔄 [PIX] PaymentService::processPayment - Processando pagamento padrão', [
            'contract_id' => $dto->contract_id,
            'amount' => $dto->amount->getAmount(),
            'payment_date' => $dto->payment_date->toDateString(),
            'status' => $dto->status?->value ?? 'null'
        ]);

        return $this->processPixPayment($dto);
    }

    public function processPixPayment(PaymentDTO $dto): Payment
    {
        try {
            Log::info('🔄 [PIX] Iniciando processamento de pagamento PIX', [
                'contract_id' => $dto->contract_id,
                'amount' => $dto->amount->getAmount(),
                'payment_date' => $dto->payment_date->toDateString()
            ]);

            // Aplicar regras específicas de negócio PIX
            $processedDto = $this->applyPixBusinessRules($dto);

            // Validar se o contrato existe
            $contract = Contract::with('plan')->findOrFail($processedDto->contract_id);

            Log::info('🔍 [PIX] Contrato encontrado para processamento', [
                'contract_id' => $contract->id,
                'user_id' => $contract->user_id,
                'plan_price' => $contract->plan->price,
                'payment_amount' => $processedDto->amount->getAmount()
            ]);

            // Verificar se o contrato expirou e precisa renovar
            $isExpired = $contract->end_date && now()->greaterThan($contract->end_date);

            if ($isExpired) {
                Log::info('🔄 [PIX] Contrato expirado, iniciando processo de renovação', [
                    'old_contract_id' => $contract->id,
                    'old_end_date' => $contract->end_date?->toDateString()
                ]);

                $oldContractId = $contract->id;
                $contract = $this->renewExpiredContract($contract);

                Log::info('✅ [PIX] Renovação concluída', [
                    'old_contract_id' => $oldContractId,
                    'new_contract_id' => $contract->id
                ]);
            }

            // Aplicar saldo disponível se houver
            $balanceResult = $this->contractService->applyBalanceToPayment(
                $contract->user_id,
                $processedDto->amount->getAmount()
            );

            Log::info('💰 [PIX] Saldo aplicado ao pagamento', [
                'original_amount' => $processedDto->amount->getAmount(),
                'applied_balance' => $balanceResult['applied_balance'],
                'remaining_amount' => $balanceResult['remaining_amount']
            ]);

            // Criar pagamento PIX sempre com status PAID
            $payment = Payment::create([
                'contract_id' => $contract->id,
                'amount' => $balanceResult['remaining_amount'],
                'payment_date' => $processedDto->payment_date,
                'status' => PaymentStatus::PAID->value,
                'discount_applied' => $processedDto->discount_applied,
                'prorated_old' => $processedDto->prorated_old,
                'prorated_new' => $processedDto->prorated_new,
                'applied_credits' => $balanceResult['applied_balance'],
            ]);

            Log::info('✅ [PIX] Pagamento PIX criado com sucesso', [
                'payment_id' => $payment->id,
                'contract_id' => $payment->contract_id,
                'amount' => $payment->amount,
                'status' => $payment->status,
                'applied_credits' => $payment->applied_credits
            ]);

            return $payment;

        } catch (Exception $e) {
            Log::error('❌ [PIX] Erro no processamento de pagamento PIX', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'contract_id' => $dto->contract_id ?? null
            ]);

            throw $e;
        }
    }

    public function isPixEligible(PaymentDTO $dto): bool
    {
        // PIX simulado sempre é elegível conforme especificação
        return true;
    }

    public function applyPixBusinessRules(PaymentDTO $dto): PaymentDTO
    {
        Log::info('🔄 [PIX] Aplicando regras de negócio PIX', [
            'original_status' => $dto->status?->value ?? 'null',
            'reason' => 'PIX simulado sempre resulta em sucesso conforme especificação'
        ]);

        // Regra principal: pagamentos PIX sempre têm status PAID
        $pixDto = new PaymentDTO(
            contract_id: $dto->contract_id,
            amount: $dto->amount,
            payment_date: $dto->payment_date,
            status: PaymentStatus::PAID, // PIX sempre resulta em sucesso
            discount_applied: $dto->discount_applied,
            prorated_old: $dto->prorated_old,
            prorated_new: $dto->prorated_new,
            applied_credits: $dto->applied_credits
        );

        return $pixDto;
    }

    public function listPaymentsForUser(int $userId): Collection
    {
        return Payment::with('contract.plan')
            ->whereHas('contract', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->get();
    }

    /**
     * Renovar contrato expirado criando um novo contrato baseado no ciclo mensal
     */
    private function renewExpiredContract(Contract $expiredContract): Contract
    {
        Log::info('🔄 [PIX] Iniciando renovação de contrato expirado', [
            'expired_contract_id' => $expiredContract->id,
            'plan_id' => $expiredContract->plan_id,
            'user_id' => $expiredContract->user_id
        ]);

        // Novo contrato começa na data de expiração do anterior e dura 1 mês
        $expirationDate = $expiredContract->end_date;
        $newStartDate = $expirationDate->copy();
        $newEndDate = $expirationDate->copy()->addMonth();

        Log::info('📅 [PIX] Datas calculadas para renovação', [
            'new_start_date' => $newStartDate->toDateString(),
            'new_end_date' => $newEndDate->toDateString()
        ]);

        $dto = new \App\DTOs\ContractCreateDTO(
            user_id: $expiredContract->user_id,
            plan_id: $expiredContract->plan_id,
            start_date: $newStartDate,
            end_date: $newEndDate,
            status: 'active'
        );

        $newContract = $this->contractService->createContract($dto);

        Log::info('✅ [PIX] Novo contrato criado na renovação', [
            'new_contract_id' => $newContract->id,
            'new_start_date' => $newContract->start_date->toDateString(),
            'new_end_date' => $newContract->end_date->toDateString()
        ]);

        return $newContract;
    }
}
