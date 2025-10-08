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
}
