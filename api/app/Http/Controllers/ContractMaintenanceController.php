<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Contracts\ContractMaintenanceServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class ContractMaintenanceController extends Controller
{
    public function __construct(
        private ContractMaintenanceServiceInterface $contractMaintenanceService
    ) {}

    /**
     * Renovar contrato expirado automaticamente
     */
    public function renew(Request $request, int $contractId): JsonResponse
    {
        try {
            Log::info('🔄 [ContractMaintenanceController] Solicitação de renovação de contrato', [
                'contract_id' => $contractId,
                'user_id' => $request->user()?->id
            ]);

            $newContract = $this->contractMaintenanceService->renew($contractId);

            return response()->json([
                'message' => 'Contrato renovado com sucesso',
                'contract' => $newContract,
                'auto_renew' => true
            ]);
        } catch (Exception $e) {
            Log::error('❌ [ContractMaintenanceController] Erro ao renovar contrato', [
                'contract_id' => $contractId,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

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
            Log::info('💰 [ContractMaintenanceController] Solicitação de processamento de cobrança recorrente', [
                'contract_id' => $contractId,
                'user_id' => $request->user()?->id
            ]);

            $result = $this->contractMaintenanceService->processRecurring($contractId);

            return response()->json([
                'message' => 'Cobrança recorrente processada',
                'payment' => $result['payment'],
                'valor_a_pagar' => $result['valor_a_pagar'],
                'applied_balance' => $result['applied_balance'],
                'contract' => $result['contract'],
                'is_proportional_billing' => $result['is_proportional_billing']
            ]);
        } catch (Exception $e) {
            Log::error('❌ [ContractMaintenanceController] Erro ao processar cobrança recorrente', [
                'contract_id' => $contractId,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

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
            Log::info('🔧 [ContractMaintenanceController] Solicitação de manutenção diária', [
                'user_id' => $request->user()?->id
            ]);

            $results = $this->contractMaintenanceService->processDailyMaintenance();

            return response()->json([
                'message' => 'Manutenção diária executada',
                'results' => $results
            ]);
        } catch (Exception $e) {
            Log::error('❌ [ContractMaintenanceController] Erro na manutenção diária', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'error' => 'Erro na manutenção diária',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
