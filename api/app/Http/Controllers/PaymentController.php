<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\PaymentDTO;
use App\Domain\Enums\PaymentStatus;
use App\Domain\ValueObjects\Money;
use App\Contracts\PaymentServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentServiceInterface $paymentService
    ) {}

    public function process(Request $request): JsonResponse
    {
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

        $amountInCents = is_float($validated['amount']) ? (int)($validated['amount'] * 100) : (int)$validated['amount'];
        $status = $validated['status'];

        $dto = new PaymentDTO(
            contract_id: (int) $validated['contract_id'],
            amount: new Money($amountInCents),
            payment_date: Carbon::parse($validated['payment_date']),
            status: $status ? PaymentStatus::from($status) : PaymentStatus::PENDING,
            discount_applied: isset($validated['discount_applied']) ? (int) $validated['discount_applied'] : null,
            prorated_old: isset($validated['prorated_old']) ? (int) $validated['prorated_old'] : null,
            prorated_new: isset($validated['prorated_new']) ? (int) $validated['prorated_new'] : null,
            applied_credits: isset($validated['applied_credits']) ? (int) $validated['applied_credits'] : null,
        );

        $payment = $this->paymentService->processPayment($dto);

        return response()->json($payment, 201);
    }

    public function listForUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer',
        ]);

        $userId = (int) $validated['user_id'];

        $payments = $this->paymentService->listPaymentsForUser($userId);

        return response()->json($payments);
    }
}
