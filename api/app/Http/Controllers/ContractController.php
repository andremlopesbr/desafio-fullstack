<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\ContractServiceInterface;
use App\DTOs\ContractCreateDTO;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ContractController extends Controller
{
    public function __construct(
        private ContractServiceInterface $contractService
    ) {}

    public function create(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'plan_id' => 'required|integer|exists:plans,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => 'nullable|string',
        ]);

        $dto = new ContractCreateDTO(
            user_id: (int) $validated['user_id'],
            plan_id: (int) $validated['plan_id'],
            start_date: ($validated['start_date'] ?? null) ? Carbon::parse($validated['start_date']) : null,
            end_date: ($validated['end_date'] ?? null) ? Carbon::parse($validated['end_date']) : null,
            status: $validated['status'] ?? null,
        );

        $contract = $this->contractService->createContract($dto);

        return response()->json($contract, 201);
    }

    public function changePlan(Request $request, int $contractId): JsonResponse
    {
        $validated = $request->validate([
            'new_plan_id' => 'required|integer|exists:plans,id',
        ]);

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

    public function listForUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer',
            'status' => 'nullable|string',
        ]);

        $userId = (int) $validated['user_id'];
        $status = $validated['status'] ?? null;

        $contracts = $this->contractService->listContractsForUser($userId, $status);

        return response()->json($contracts);
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
