<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ContractServiceInterface;
use App\Contracts\PaymentServiceInterface;
use App\DTOs\ContractCreateDTO;
use App\DTOs\PaymentDTO;
use App\Domain\Enums\PaymentStatus;
use App\Domain\ValueObjects\Money;
use App\Models\Contract;
use App\Models\Payment;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ContractWithPaymentService implements \App\Contracts\ContractWithPaymentServiceInterface
{
    public function __construct(
        private ContractServiceInterface $contractService,
        private PaymentServiceInterface $paymentService,
        private CreditCalculationService $creditCalculationService
    ) {}

    /**
     * Criar contrato com pagamento integrado (para primeira compra)
     */
    public function createWithPayment(array $data): array
    {
        try {
            Log::info('🔄 [ContractWithPaymentService] Iniciando criação de contrato com pagamento integrado', [
                'user_id' => $data['user_id'],
                'plan_id' => $data['plan_id'],
                'amount' => $data['amount']
            ]);

            // Validar dados de entrada
            $validated = $this->validateInputData($data);

            // 1. Criar contrato
            $contract = $this->createContract($validated);

            Log::info('✅ [ContractWithPaymentService] Contrato criado com sucesso', [
                'contract_id' => $contract->id,
                'user_id' => $contract->user_id,
                'plan_id' => $contract->plan_id
            ]);

            // 2. Criar pagamento
            $payment = null;
            if ($validated['amount'] > 0) {
                $payment = $this->createPayment($contract, $validated);

                Log::info('💳 [ContractWithPaymentService] Pagamento criado com sucesso', [
                    'payment_id' => $payment->id,
                    'contract_id' => $payment->contract_id,
                    'amount' => $payment->amount,
                    'status' => $payment->status
                ]);
            }

            return [
                'contract' => $contract,
                'payment' => $payment,
                'message' => 'Contrato e pagamento criados com sucesso',
                'is_first_purchase' => true
            ];

        } catch (ValidationException $e) {
            Log::warning('❌ [ContractWithPaymentService] Erro de validação na criação com pagamento', [
                'errors' => $e->errors(),
                'data' => $data
            ]);

            throw $e;
        } catch (Exception $e) {
            Log::error('💥 [ContractWithPaymentService] Erro interno na criação com pagamento', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            throw $e;
        }
    }

    /**
     * Validar dados de entrada
     */
    private function validateInputData(array $data): array
    {
        $rules = [
            'user_id' => 'required|integer',
            'plan_id' => 'required|integer',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'status' => 'nullable|string',
            'discount_applied' => 'nullable|numeric',
            'prorated_old' => 'nullable|numeric',
            'prorated_new' => 'nullable|numeric',
            'applied_credits' => 'nullable|numeric',
        ];

        $validator = validator($data, $rules);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }

    /**
     * Criar contrato usando o ContractService
     */
    private function createContract(array $validated): Contract
    {
        $dto = new ContractCreateDTO(
            user_id: (int) $validated['user_id'],
            plan_id: (int) $validated['plan_id'],
            start_date: ($validated['start_date'] ?? null) ? Carbon::parse($validated['start_date']) : null,
            end_date: ($validated['end_date'] ?? null) ? Carbon::parse($validated['end_date']) : null,
            status: 'active'
        );

        return $this->contractService->createContract($dto);
    }

    /**
     * Criar pagamento usando o PaymentService
     */
    private function createPayment(Contract $contract, array $validated): Payment
    {
        $paymentDto = new PaymentDTO(
            contract_id: $contract->id,
            amount: new Money($validated['amount']),
            payment_date: Carbon::parse($validated['payment_date']),
            status: isset($validated['status']) ? PaymentStatus::from($validated['status']) : PaymentStatus::PAID,
            discount_applied: $validated['discount_applied'] ?? 0,
            prorated_old: $validated['prorated_old'] ?? 0,
            prorated_new: $validated['prorated_new'] ?? 0,
            applied_credits: $validated['applied_credits'] ?? 0,
        );

        return $this->paymentService->processPayment($paymentDto);
    }
}
