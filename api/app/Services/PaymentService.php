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
use Illuminate\Support\Facades\Log;

class PaymentService implements PaymentServiceInterface
{
    public function __construct(
        private ContractServiceInterface $contractService
    ) {}

    public function processPayment(PaymentDTO $dto): Payment
    {
        Log::info('🔍 [DEBUG] PaymentService::processPayment - DADOS RECEBIDOS', [
            'contract_id' => $dto->contract_id,
            'amount' => $dto->amount->getAmount(),
            'payment_date' => $dto->payment_date->toDateString(),
            'status' => $dto->status?->value ?? 'null',
            'discount_applied' => $dto->discount_applied,
            'prorated_old' => $dto->prorated_old,
            'prorated_new' => $dto->prorated_new,
            'applied_credits' => $dto->applied_credits
        ]);

        // Validar se o contrato existe
        $contract = Contract::with('plan')->findOrFail($dto->contract_id);

        Log::info('🔍 [DEBUG] PaymentService::processPayment - CONTRATO ENCONTRADO', [
            'contract_id' => $contract->id,
            'contract_start_date' => $contract->start_date?->toDateString(),
            'contract_end_date' => $contract->end_date?->toDateString(),
            'contract_status' => $contract->status,
            'plan_id' => $contract->plan_id,
            'user_id' => $contract->user_id,
            'payment_amount' => $dto->amount->getAmount(),
            'payment_date' => $dto->payment_date->toDateString(),
            'current_date' => now()->toDateString()
        ]);

        // Verificar se o contrato expirou e precisa renovar
        $isExpired = $contract->end_date && now()->greaterThan($contract->end_date);
        Log::info('🔍 [DEBUG] Verificação de expiração do contrato', [
            'contract_id' => $contract->id,
            'is_expired' => $isExpired,
            'end_date' => $contract->end_date?->toDateString(),
            'current_date' => now()->toDateString(),
            'status' => $contract->status,
            'contract_start_date' => $contract->start_date?->toDateString()
        ]);

        $proratedOldCredit = 0;
        $proratedNew = $contract->plan->price;

        if ($isExpired) {
            Log::info('🔄 [DEBUG] Contrato expirado, iniciando processo de renovação', [
                'old_contract_id' => $contract->id,
                'old_start_date' => $contract->start_date?->toDateString(),
                'old_end_date' => $contract->end_date?->toDateString(),
                'plan_price' => $contract->plan->price
            ]);

            $oldContractId = $contract->id;
            $contract = $this->renewExpiredContract($contract);

            // Calcular crédito proporcional do plano antigo para renovação
            // Usar a mesma lógica do changePlan para calcular pro-rata
            $totalDaysInCycle = 30; // Fixo conforme exemplo do README
            $startDate = $contract->start_date;
            $daysUsed = $startDate->diffInDays(now());

            if ($daysUsed > $totalDaysInCycle) {
                $daysUsed = $totalDaysInCycle;
            }

            $daysRemaining = $totalDaysInCycle - $daysUsed;

            // Crédito proporcional = Valor do plano antigo × (dias restantes ÷ dias totais do ciclo)
            $proratedOldCredit = $contract->plan->price * ($daysRemaining / $totalDaysInCycle);

            Log::info('🔄 [DEBUG] Renovação concluída', [
                'old_contract_id' => $oldContractId,
                'new_contract_id' => $contract->id,
                'prorated_old_credit' => $proratedOldCredit,
                'plan_price' => $contract->plan->price,
                'days_used' => $daysUsed,
                'days_remaining' => $daysRemaining,
                'calculation' => "{$contract->plan->price} * ({$daysRemaining} / {$totalDaysInCycle}) = {$proratedOldCredit}"
            ]);
        } else {
            Log::info('✅ [DEBUG] Contrato não expirado, processando pagamento normalmente', [
                'contract_id' => $contract->id,
                'contract_status' => $contract->status,
                'is_first_payment' => $contract->payments()->count() === 0,
                'payment_status' => $dto->status?->value ?? 'null'
            ]);

            // Garantia adicional: primeiro pagamento sempre deve ser processado com sucesso
            if ($contract->payments()->count() === 0 && $dto->status === PaymentStatus::PENDING) {
                Log::info('🚀 [DEBUG] Primeiro pagamento com status PENDING - aplicando correção automática', [
                    'contract_id' => $contract->id,
                    'original_status' => $dto->status->value,
                    'correction' => 'Convertendo PENDING para PAID para primeiro pagamento'
                ]);
            }
        }

        // Aplicar saldo disponível se houver
        $originalAmount = $dto->amount->getAmount(); // em reais

        Log::info('💰 [DEBUG] Aplicação de saldo - DADOS INICIAIS', [
            'original_amount' => $originalAmount,
            'user_id' => $contract->user_id,
            'is_expired' => $isExpired,
            'prorated_old_credit' => $proratedOldCredit,
            'user_balance_before' => $this->contractService->getUserBalance($contract->user_id)
        ]);

        // Para renovação de contrato expirado, usar o valor proporcional calculado
        $paymentAmount = $originalAmount;
        if ($isExpired && $proratedOldCredit > 0) {
            // Se foi uma renovação, usar o valor proporcional do plano antigo
            $paymentAmount = $proratedOldCredit;
            Log::info('🔄 [DEBUG] Pagamento de renovação usando valor proporcional', [
                'original_amount' => $originalAmount,
                'prorated_old_credit' => $proratedOldCredit,
                'payment_amount' => $paymentAmount,
                'calculation' => "prorated_old_credit ({$proratedOldCredit}) usado como payment_amount"
            ]);
        }

        $balanceResult = $this->contractService->applyBalanceToPayment(
            $contract->user_id,
            $paymentAmount
        );

        $finalAmount = $balanceResult['remaining_amount'];

        Log::info('💳 [DEBUG] Resultado da aplicação de saldo', [
            'payment_amount' => $paymentAmount,
            'applied_balance' => $balanceResult['applied_balance'],
            'remaining_amount' => $balanceResult['remaining_amount'],
            'user_balance_after' => $this->contractService->getUserBalance($contract->user_id)
        ]);

        // Os pagamentos via PIX simulados são considerados pagos
        // Conforme especificação do README
        // Garantir que pagamentos com status "pending" sejam tratados corretamente
        $processedStatus = PaymentStatus::PAID;

        Log::info('🔄 [DEBUG] Definindo status do pagamento', [
            'original_status' => $dto->status?->value ?? 'null',
            'processed_status' => $processedStatus->value,
            'contract_id' => $contract->id,
            'is_first_payment' => $contract->payments()->count() === 0,
            'reason' => 'PIX simulado sempre resulta em PAID conforme especificação'
        ]);

        Log::info('� [DEBUG] Criando pagamento com dados finais', [
            'contract_id' => $contract->id,
            'final_amount' => $finalAmount,
            'payment_date' => $dto->payment_date->toDateString(),
            'status' => $processedStatus->value,
            'discount_applied' => $dto->discount_applied ?? $proratedOldCredit,
            'prorated_old' => $dto->prorated_old ?? $proratedOldCredit,
            'prorated_new' => $dto->prorated_new ?? $proratedNew,
            'applied_credits' => $dto->applied_credits ?? $balanceResult['applied_balance']
        ]);

        // Criar pagamento com o valor final (após aplicação de créditos)
        $payment = Payment::create([
            'contract_id' => $contract->id,
            'amount' => $finalAmount, // Em reais
            'payment_date' => $dto->payment_date,
            'status' => $processedStatus->value,
            'discount_applied' => $dto->discount_applied ?? $proratedOldCredit,
            'prorated_old' => $dto->prorated_old ?? $proratedOldCredit,
            'prorated_new' => $dto->prorated_new ?? $proratedNew,
            'applied_credits' => $dto->applied_credits ?? $balanceResult['applied_balance'],
        ]);

        Log::info('✅ [DEBUG] Pagamento criado com sucesso', [
            'payment_id' => $payment->id,
            'contract_id' => $payment->contract_id,
            'amount' => $payment->amount,
            'status' => $payment->status,
            'payment_date' => $payment->payment_date->toDateString()
        ]);

        return $payment;
    }


    public function listPaymentsForUser(int $userId): Collection
    {
        return Payment::with('contract.plan')->whereHas('contract', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->get();
    }

    /**
     * Renovar contrato expirado criando um novo contrato baseado no ciclo mensal
     */
    private function renewExpiredContract(Contract $expiredContract): Contract
    {
        Log::info('Iniciando renovação de contrato expirado', [
            'expired_contract_id' => $expiredContract->id,
            'start_date' => $expiredContract->start_date?->toDateString(),
            'end_date' => $expiredContract->end_date?->toDateString(),
            'plan_id' => $expiredContract->plan_id,
            'user_id' => $expiredContract->user_id
        ]);

        // Novo contrato começa na data de expiração do anterior e dura 1 mês
        $expirationDate = $expiredContract->end_date;
        $newStartDate = $expirationDate->copy();
        $newEndDate = $expirationDate->copy()->addMonth();

        Log::info('Datas calculadas para renovação', [
            'new_start_date' => $newStartDate->toDateString(),
            'new_end_date' => $newEndDate->toDateString(),
            'expiration_date' => $expirationDate->toDateString()
        ]);

        $dto = new \App\DTOs\ContractCreateDTO(
            user_id: $expiredContract->user_id,
            plan_id: $expiredContract->plan_id,
            start_date: $newStartDate,
            end_date: $newEndDate,
            status: 'active'
        );

        $newContract = $this->contractService->createContract($dto);

        Log::info('Novo contrato criado na renovação', [
            'new_contract_id' => $newContract->id,
            'new_start_date' => $newContract->start_date->toDateString(),
            'new_end_date' => $newContract->end_date->toDateString()
        ]);

        return $newContract;
    }
}
