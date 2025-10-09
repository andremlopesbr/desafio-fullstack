<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\PaymentDTO;
use App\Domain\Enums\PaymentStatus;
use App\Domain\ValueObjects\Money;
use App\Contracts\PaymentServiceInterface;
use App\Exceptions\Handler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Exception;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentServiceInterface $paymentService
    ) {}

    public function process(Request $request): JsonResponse
    {
        try {
            Log::info('PaymentController::process chamado', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'data' => $request->all(),
            ]);

            $validated = $request->validate([
                'contract_id' => 'required|integer|exists:contracts,id',
                'amount' => 'required|numeric|min:0',
                'payment_date' => 'required|date',
                'status' => 'nullable|string',
                'discount_applied' => 'nullable|numeric|min:0',
                'prorated_old' => 'nullable|numeric|min:0',
                'prorated_new' => 'nullable|numeric|min:0',
                'applied_credits' => 'nullable|numeric|min:0',
            ]);

            $status = $validated['status'] ?? null;

            $dto = new PaymentDTO(
                contract_id: (int) $validated['contract_id'],
                amount: new Money($validated['amount']),
                payment_date: Carbon::parse($validated['payment_date']),
                status: $status ? PaymentStatus::from($status) : PaymentStatus::PENDING,
                discount_applied: isset($validated['discount_applied']) ? $validated['discount_applied'] : null,
                prorated_old: isset($validated['prorated_old']) ? $validated['prorated_old'] : null,
                prorated_new: isset($validated['prorated_new']) ? $validated['prorated_new'] : null,
                applied_credits: isset($validated['applied_credits']) ? $validated['applied_credits'] : null,
            );

            $payment = $this->paymentService->processPayment($dto);

            Log::info('Pagamento processado com sucesso', [
                'payment_id' => $payment->id,
                'contract_id' => $payment->contract_id,
                'amount' => $payment->amount,
                'status' => $payment->status
            ]);

            return response()->json($payment, 201);

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

    public function listForUser(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|integer',
            ]);

            $userId = (int) $validated['user_id'];

            Log::info('Listando pagamentos para usuário', [
                'user_id' => $userId,
                'request_ip' => $request->ip()
            ]);

            $payments = $this->paymentService->listPaymentsForUser($userId);

            return response()->json($payments);

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
