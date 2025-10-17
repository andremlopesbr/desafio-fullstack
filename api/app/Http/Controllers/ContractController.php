<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\ContractServiceInterface;
use App\DTOs\ContractCreateDTO;
use App\Http\Requests\StoreContractRequest;
use App\Http\Requests\ChangePlanContractRequest;
use App\Http\Requests\ListContractsRequest;
use App\Http\Resources\ContractResource;
use App\Services\CreditCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ContractController extends Controller
{
    public function __construct(
        private ContractServiceInterface $contractService
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
