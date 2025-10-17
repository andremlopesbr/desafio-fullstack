<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\PaymentDTO;
use App\Domain\Enums\PaymentStatus;
use App\Domain\ValueObjects\Money;
use App\Contracts\PaymentServiceInterface;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\ListPaymentsRequest;
use App\Http\Resources\PaymentResource;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Exception;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentServiceInterface $paymentService
    ) {}

    public function process(StorePaymentRequest $request)
    {
        try {
            Log::info('PaymentController::process chamado', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'data' => $request->all(),
            ]);

            $validated = $request->validated();

            $status = $validated['status'] ?? null;

            // Garantir que pagamentos com status "pending" sejam tratados adequadamente
            // PIX simulado sempre resulta em sucesso conforme especificação
            $paymentStatus = $status ? PaymentStatus::from($status) : PaymentStatus::PAID;

            Log::info('🔄 [DEBUG] PaymentController - Status do pagamento definido', [
                'original_status' => $status,
                'processed_status' => $paymentStatus->value,
                'reason' => 'PIX simulado sempre resulta em sucesso'
            ]);

            $dto = new PaymentDTO(
                contract_id: (int) $validated['contract_id'],
                amount: new Money($validated['amount']),
                payment_date: Carbon::parse($validated['payment_date']),
                status: $paymentStatus,
                discount_applied: isset($validated['discount_applied']) ? (float) $validated['discount_applied'] : null,
                prorated_old: isset($validated['prorated_old']) ? (float) $validated['prorated_old'] : null,
                prorated_new: isset($validated['prorated_new']) ? (float) $validated['prorated_new'] : null,
                applied_credits: isset($validated['applied_credits']) ? (float) $validated['applied_credits'] : null,
            );

            $payment = $this->paymentService->processPayment($dto);

            Log::info('Pagamento processado com sucesso', [
                'payment_id' => $payment->id,
                'contract_id' => $payment->contract_id,
                'amount' => $payment->amount,
                'status' => $payment->status
            ]);

            return new PaymentResource($payment);

        } catch (ValidationException $e) {
            Log::warning('Erro de validação no processamento de pagamento', [
                'errors' => $e->errors(),
                'data' => $request->all()
            ]);

            return response()->json([
                'error' => 'Dados de pagamento inválidos',
                'details' => $e->errors()
            ], 422);

        } catch (Exception $e) {
            Log::error('Erro interno no processamento de pagamento', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'data' => $request->all()
            ]);

            return response()->json([
                'error' => 'Erro interno do servidor',
                'message' => config('app.debug') ? $e->getMessage() : 'Ocorreu um erro inesperado'
            ], 500);
        }
    }

    public function listForUser(ListPaymentsRequest $request)
    {
        try {
            $validated = $request->validated();

            $userId = (int) $validated['user_id'];

            Log::info('Listando pagamentos para usuário', [
                'user_id' => $userId,
                'request_ip' => $request->ip()
            ]);

            $payments = $this->paymentService->listPaymentsForUser($userId);

            return PaymentResource::collection($payments);

        } catch (ValidationException $e) {
            Log::warning('Erro de validação na listagem de pagamentos', [
                'errors' => $e->errors(),
                'data' => $request->all()
            ]);

            return response()->json([
                'error' => 'Dados de requisição inválidos',
                'details' => $e->errors()
            ], 422);

        } catch (Exception $e) {
            Log::error('Erro interno na listagem de pagamentos', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'data' => $request->all()
            ]);

            return response()->json([
                'error' => 'Erro interno do servidor',
                'message' => config('app.debug') ? $e->getMessage() : 'Ocorreu um erro inesperado'
            ], 500);
        }
    }
}
