<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\ContractServiceInterface;
use App\Contracts\PaymentServiceInterface;
use App\Contracts\ContractWithPaymentServiceInterface;
use App\Contracts\CreditCalculationServiceInterface;
use App\Contracts\BalanceServiceInterface;
use App\DTOs\ContractCreateDTO;
use App\Http\Requests\StoreContractRequest;
use App\Http\Requests\ChangePlanContractRequest;
use App\Http\Requests\ListContractsRequest;
use App\Http\Resources\ContractResource;
use App\Http\Resources\PaymentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Exception;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ContractController extends Controller
{
    public function __construct(
        private ContractServiceInterface $contractService,
        private PaymentServiceInterface $paymentService,
        private ContractWithPaymentServiceInterface $contractWithPaymentService,
        private CreditCalculationServiceInterface $creditCalculationService
    ) {}

    public function create(Request $request)
    {
        try {
            // Verifica se há dados de pagamento na requisição
            $hasPaymentData = $request->has(['amount', 'payment_date']) ||
                              ($request->has('amount') && $request->amount > 0);

            if ($hasPaymentData) {
                // Se tem dados de pagamento, usa a lógica de criação com pagamento
                Log::info('🔄 [ContractController] Detectado dados de pagamento, usando createWithPayment', [
                    'user_id' => $request->input('user_id'),
                    'plan_id' => $request->input('plan_id'),
                    'amount' => $request->input('amount')
                ]);

                return $this->createWithPayment($request);
            }

            // Caso normal: criação sem pagamento
            $validated = $request->validate([
                'user_id' => 'required|integer|exists:users,id',
                'plan_id' => 'required|integer|exists:plans,id',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
                'status' => 'nullable|string'
            ]);

            $dto = new ContractCreateDTO(
                user_id: (int) $validated['user_id'],
                plan_id: (int) $validated['plan_id'],
                start_date: ($validated['start_date'] ?? null) ? Carbon::parse($validated['start_date']) : null,
                end_date: ($validated['end_date'] ?? null) ? Carbon::parse($validated['end_date']) : null,
                status: $validated['status'] ?? null,
            );

            $contract = $this->contractService->createContract($dto);

            return ContractResource::make($contract);

        } catch (ValidationException $e) {
            Log::warning('❌ [ContractController] Erro de validação na criação de contrato', [
                'errors' => $e->errors(),
                'data' => $request->all()
            ]);

            return response()->json([
                'error' => 'Dados inválidos',
                'details' => $e->errors()
            ], 422);
        } catch (Exception $e) {
            Log::error('💥 [ContractController] Erro interno na criação de contrato', [
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

    /**
     * Criar contrato com pagamento integrado (para primeira compra)
     */
    public function createWithPayment(Request $request)
    {
        try {
            Log::info('🔄 [ContractController] Iniciando criação de contrato com pagamento integrado', [
                'user_id' => $request->input('user_id'),
                'plan_id' => $request->input('plan_id'),
                'amount' => $request->input('amount')
            ]);

            $result = $this->contractWithPaymentService->createWithPayment($request->all());

            return response()->json([
                'contract' => ContractResource::make($result['contract']),
                'payment' => $result['payment'] ? PaymentResource::make($result['payment']) : null,
                'message' => $result['message'],
                'is_first_purchase' => $result['is_first_purchase']
            ]);
        } catch (ValidationException $e) {
            Log::warning('❌ [ContractController] Erro de validação na criação com pagamento', [
                'errors' => $e->errors(),
                'data' => $request->all()
            ]);

            return response()->json([
                'error' => 'Dados inválidos',
                'details' => $e->errors()
            ], 422);
        } catch (Exception $e) {
            Log::error('💥 [ContractController] Erro interno na criação com pagamento', [
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

    public function changePlan($request, int $contractId): JsonResponse
    {
        // Aceita tanto ChangePlanContractRequest quanto Request comum
        if ($request instanceof ChangePlanContractRequest) {
            $validated = $request->validated();
        } else {
            $validated = $request->validate([
                'new_plan_id' => 'required|integer|exists:plans,id'
            ]);
        }

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
     * Atualizar contrato (método genérico que detecta o tipo de operação)
     */
    public function update(Request $request, int $contractId): JsonResponse
    {
        try {
            Log::info('🔄 [ContractController] Iniciando atualização de contrato', [
                'contract_id' => $contractId,
                'request_data' => $request->all()
            ]);

            // Detecta se é mudança de plano baseado nos dados enviados
            if ($request->has('new_plan_id')) {
                Log::info('🔄 [ContractController] Detectada mudança de plano, redirecionando para changePlan');

                // Valida os dados como se fosse uma requisição de mudança de plano
                $validated = $request->validate([
                    'new_plan_id' => 'required|integer|exists:plans,id'
                ]);

                // Usa o método changePlan existente internamente
                $request->merge($validated);
                return $this->changePlan($request, $contractId);
            }

            // Outras atualizações podem ser adicionadas aqui no futuro
            return response()->json([
                'error' => 'Operação não suportada',
                'message' => 'Tipo de atualização não reconhecido'
            ], 400);

        } catch (ValidationException $e) {
            Log::warning('❌ [ContractController] Erro de validação na atualização de contrato', [
                'contract_id' => $contractId,
                'errors' => $e->errors(),
                'data' => $request->all()
            ]);

            return response()->json([
                'error' => 'Dados inválidos',
                'details' => $e->errors()
            ], 422);
        } catch (Exception $e) {
            Log::error('💥 [ContractController] Erro interno na atualização de contrato', [
                'contract_id' => $contractId,
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

            $result = $this->creditCalculationService->calculateForContractAndPlan($contractId, $selectedPlanId);

            return response()->json($result);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Contrato ou plano não encontrado'
            ], 404);
        } catch (Exception $e) {
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
     * Obter saldo do usuário
     */
    public function getBalance(int $userId): JsonResponse
    {
        $balanceService = app(BalanceServiceInterface::class);
        $balance = $balanceService->getUserBalance($userId);

        return response()->json([
            'total_balance' => $balance
        ]);
    }

}
