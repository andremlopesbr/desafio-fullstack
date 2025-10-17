<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\ContractServiceInterface;
use App\Contracts\PaymentServiceInterface;
use App\DTOs\ContractCreateDTO;
use App\DTOs\PaymentDTO;
use App\Domain\Enums\PaymentStatus;
use App\Domain\ValueObjects\Money;
use App\Http\Requests\StoreContractRequest;
use App\Http\Requests\ChangePlanContractRequest;
use App\Http\Requests\ListContractsRequest;
use App\Http\Resources\ContractResource;
use App\Http\Resources\PaymentResource;
use App\Services\CreditCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;

class ContractController extends Controller
{
    public function __construct(
        private ContractServiceInterface $contractService,
        private PaymentServiceInterface $paymentService
    ) {}

    public function create(StoreContractRequest $request)
    {
        $validated = $request->validated();

        $dto = new ContractCreateDTO(
            user_id: (int) $validated['user_id'],
            plan_id: (int) $validated['plan_id'],
            start_date: ($validated['start_date'] ?? null) ? Carbon::parse($validated['start_date']) : null,
            end_date: ($validated['end_date'] ?? null) ? Carbon::parse($validated['end_date']) : null,
            status: $validated['status'] ?? null,
        );

        $contract = $this->contractService->createContract($dto);

        return new ContractResource($contract);
    }

    /**
     * Criar contrato com pagamento integrado (para primeira compra)
     */
    public function createWithPayment(Request $request)
    {
        try {
            Log::info('🔄 [DEBUG] Iniciando criação de contrato com pagamento integrado', [
                'user_id' => $request->input('user_id'),
                'plan_id' => $request->input('plan_id'),
                'amount' => $request->input('amount')
            ]);

            $validated = $request->validate([
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
            ]);

            // 1. Criar contrato
            $dto = new ContractCreateDTO(
                user_id: (int) $validated['user_id'],
                plan_id: (int) $validated['plan_id'],
                start_date: ($validated['start_date'] ?? null) ? Carbon::parse($validated['start_date']) : null,
                end_date: ($validated['end_date'] ?? null) ? Carbon::parse($validated['end_date']) : null,
                status: 'active', // Status deve ser sempre 'active' para novos contratos
            );

            $contract = $this->contractService->createContract($dto);

            Log::info('✅ [DEBUG] Contrato criado com sucesso', [
                'contract_id' => $contract->id,
                'user_id' => $contract->user_id,
                'plan_id' => $contract->plan_id
            ]);

            // 2. Criar pagamento se o valor for maior que zero
            $payment = null;
            if ($validated['amount'] > 0) {
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

                $payment = $this->paymentService->processPayment($paymentDto);

                Log::info('💳 [DEBUG] Pagamento criado com sucesso', [
                    'payment_id' => $payment->id,
                    'contract_id' => $payment->contract_id,
                    'amount' => $payment->amount,
                    'status' => $payment->status
                ]);
            }

            return response()->json([
                'contract' => new ContractResource($contract),
                'payment' => $payment ? new PaymentResource($payment) : null,
                'message' => 'Contrato e pagamento criados com sucesso',
                'is_first_purchase' => true
            ]);
        } catch (ValidationException $e) {
            Log::warning('❌ [DEBUG] Erro de validação na criação com pagamento', [
                'errors' => $e->errors(),
                'data' => $request->all()
            ]);

            return response()->json([
                'error' => 'Dados inválidos',
                'details' => $e->errors()
            ], 422);
        } catch (Exception $e) {
            Log::error('💥 [DEBUG] Erro interno na criação com pagamento', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'error' => 'Erro interno do servidor',
                'message' => config('app.debug') ? $e->getMessage() : 'Ocorreu um erro inesperado'
            ], 500);
        }
    }

    public function changePlan(ChangePlanContractRequest $request, int $contractId): JsonResponse
    {
        $validated = $request->validated();

        $newPlanId = $validated['new_plan_id'];

        $result = $this->contractService->changePlan($contractId, $newPlanId);

        // Adicionar mensagem de crédito quando houver valor a creditar
        if (($result['remaining_credit'] ?? 0) > 0) {
            $result['credit_message'] = sprintf(
                'Valor final: R$ 0,00 (à creditar: R$ %.2f)',
                $result['remaining_credit']
            );
        }

        return response()->json($result);
    }

    /**
     * Calcular informações de crédito para mudança de plano
     */
    public function creditCalculation(Request $request, int $contractId): JsonResponse
    {
        try {
            $selectedPlanId = (int) $request->query('plan_id');

            if (!$selectedPlanId) {
                return response()->json([
                    'error' => 'Parâmetro plan_id é obrigatório'
                ], 400);
            }

            $creditCalculationService = app(CreditCalculationService::class);
            $result = $creditCalculationService->calculateForContractAndPlan($contractId, $selectedPlanId);

            return response()->json($result);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Contrato ou plano não encontrado'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro interno do servidor',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function listForUser(ListContractsRequest $request)
    {
        $validated = $request->validated();

        $userId = (int) $validated['user_id'];
        $status = $validated['status'] ?? null;

        $contracts = $this->contractService->listContractsForUser($userId, $status);

        return ContractResource::collection($contracts);
    }

    /**
     * Renovar contrato expirado automaticamente
     */
    public function renew(Request $request, int $contractId): JsonResponse
    {
        try {
            $newContract = $this->contractService->renewExpiredContract($contractId);

            return response()->json([
                'message' => 'Contrato renovado com sucesso',
                'contract' => $newContract,
                'auto_renew' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao renovar contrato',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Processar cobrança recorrente automática
     */
    public function processRecurring(Request $request, int $contractId): JsonResponse
    {
        try {
            $result = $this->contractService->processRecurringPayment($contractId);

            return response()->json([
                'message' => 'Cobrança recorrente processada',
                'payment' => $result['payment'],
                'valor_a_pagar' => $result['valor_a_pagar'],
                'applied_balance' => $result['applied_balance'],
                'contract' => $result['contract']
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao processar cobrança recorrente',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Executar manutenção diária (renovações e cobranças)
     */
    public function processDailyMaintenance(Request $request): JsonResponse
    {
        try {
            $results = $this->contractService->processDailyMaintenance();

            return response()->json([
                'message' => 'Manutenção diária executada',
                'results' => $results
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro na manutenção diária',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
