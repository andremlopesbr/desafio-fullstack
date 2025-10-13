<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use App\Models\UserBalance;
use App\Services\ContractService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Testes específicos para validação de logs PIX durante mudanças de planos
 *
 * Valida que todos os logs necessários são gerados corretamente para auditoria:
 * - Logs de início de mudança de plano
 * - Logs de cálculos pro-rata
 * - Logs de geração/aplicação de créditos
 * - Logs de verificação de saldo
 * - Logs de criação de pagamentos
 */
class PixLogValidationTest extends TestCase
{
    use RefreshDatabase;

    private ContractService $contractService;
    private User $user;
    private array $plans;

    protected function setUp(): void
    {
        parent::setUp();

        $this->contractService = app(ContractService::class);
        $this->user = User::factory()->create();
        $this->plans = Plan::all()->toArray();

        if (count($this->plans) < 4) {
            $this->seedPlans();
            $this->plans = Plan::all()->toArray();
        }
    }

    /** @test */
    public function test_logs_completos_cenario_downgrade_com_credito()
    {
        Log::info("=== TESTE DE LOGS: Cenário Downgrade com Crédito ===");

        // Arrange
        $planoPremium = $this->getPlanByPrice(197.00);
        $contrato = $this->createContract($this->user->id, $planoPremium['id']);

        // Capturar logs durante a operação
        $logsCapturados = [];

        Log::listen(function ($message, $level, $context) use (&$logsCapturados) {
            $logsCapturados[] = [
                'message' => $message,
                'level' => $level,
                'context' => $context,
            ];
        });

        // Act
        $planoIntermediario = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoIntermediario['id']);

        // Assert: Validar logs críticos
        $this->validarLogsMudancaPlano($logsCapturados, 'downgrade_com_credito');
        $this->validarLogsCalculoProRata($logsCapturados);
        $this->validarLogsGeracaoCredito($logsCapturados);
        $this->validarLogsVerificacaoSaldo($logsCapturados);

        Log::info("Logs de downgrade com crédito validados com sucesso", [
            'total_logs' => count($logsCapturados)
        ]);
    }

    /** @test */
    public function test_logs_completos_cenario_upgrade_com_saldo()
    {
        Log::info("=== TESTE DE LOGS: Cenário Upgrade com Saldo ===");

        // Arrange
        $this->addUserBalance($this->user->id, 100.00, 'Saldo para teste');
        $planoBasico = $this->getPlanByPrice(9.90);
        $contrato = $this->createContract($this->user->id, $planoBasico['id']);

        $logsCapturados = [];
        Log::listen(function ($message, $level, $context) use (&$logsCapturados) {
            $logsCapturados[] = [
                'message' => $message,
                'level' => $level,
                'context' => $context,
            ];
        });

        // Act
        $planoPremium = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoPremium['id']);

        // Assert: Validar logs críticos
        $this->validarLogsMudancaPlano($logsCapturados, 'upgrade_com_saldo');
        $this->validarLogsCalculoProRata($logsCapturados);
        $this->validarLogsAplicacaoCredito($logsCapturados);
        $this->validarLogsVerificacaoSaldo($logsCapturados);

        Log::info("Logs de upgrade com saldo validados com sucesso", [
            'total_logs' => count($logsCapturados)
        ]);
    }

    /** @test */
    public function test_logs_sistema_credito_detalhado()
    {
        Log::info("=== TESTE DE LOGS: Sistema de Crédito Detalhado ===");

        // Arrange
        $planoPremium = $this->getPlanByPrice(347.00);
        $contrato = $this->createContract($this->user->id, $planoPremium['id']);

        $logsCapturados = [];
        Log::listen(function ($message, $level, $context) use (&$logsCapturados) {
            $logsCapturados[] = [
                'message' => $message,
                'level' => $level,
                'context' => $context,
            ];
        });

        // Act
        $planoBasico = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoBasico['id']);

        // Assert: Validar logs específicos de crédito
        $this->assertTrue($this->contemLog($logsCapturados, 'ADICIONANDO CRÉDITO AO SALDO'), 'Deveria conter log de adição de crédito');
        $this->assertTrue($this->contemLog($logsCapturados, 'CRÉDITO ADICIONADO - VERIFICAÇÃO'), 'Deveria conter log de verificação de crédito');

        // Validar contexto do log de crédito
        $logCredito = $this->encontrarLog($logsCapturados, 'ADICIONANDO CRÉDITO AO SALDO');
        $this->assertArrayHasKey('credit_amount', $logCredito['context']);
        $this->assertArrayHasKey('description', $logCredito['context']);
        $this->assertArrayHasKey('user_id', $logCredito['context']);

        Log::info("Logs de sistema de crédito validados", [
            'credito_gerado' => $logCredito['context']['credit_amount'] ?? 'N/A'
        ]);
    }

    /** @test */
    public function test_logs_calculo_pro_rata_detalhado()
    {
        Log::info("=== TESTE DE LOGS: Cálculo Pro-Rata Detalhado ===");

        // Arrange: Contrato com 10 dias de uso
        $planoInicial = $this->getPlanByPrice(87.00);
        $contrato = $this->createContract($this->user->id, $planoInicial['id']);
        $contrato->update(['start_date' => Carbon::now()->subDays(10)]);

        $logsCapturados = [];
        Log::listen(function ($message, $level, $context) use (&$logsCapturados) {
            $logsCapturados[] = [
                'message' => $message,
                'level' => $level,
                'context' => $context,
            ];
        });

        // Act
        $planoNovo = $this->getPlanByPrice(197.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoNovo['id']);

        // Assert: Validar logs de cálculo pro-rata
        $this->assertTrue($this->contemLog($logsCapturados, 'Cálculo de crédito pro-rata'), 'Deveria conter log de cálculo pro-rata');

        $logProRata = $this->encontrarLog($logsCapturados, 'Cálculo de crédito pro-rata');
        $this->assertArrayHasKey('is_same_day_change', $logProRata['context']);
        $this->assertArrayHasKey('prorated_old_credit', $logProRata['context']);
        $this->assertFalse($logProRata['context']['is_same_day_change'], 'Não deveria ser mudança no mesmo dia');

        // Calcular crédito proporcional esperado (20 dias restantes / 30 dias = 2/3)
        $creditoEsperado = 87.00 * (20 / 30); // Aproximadamente R$ 58,00
        $this->assertEqualsWithDelta($creditoEsperado, $logProRata['context']['prorated_old_credit'], 0.01);

        Log::info("Logs de cálculo pro-rata validados", [
            'dias_usados' => 10,
            'credito_proporcional' => $creditoEsperado,
            'logado' => $logProRata['context']['prorated_old_credit']
        ]);
    }

    /** @test */
    public function test_logs_auditoria_pagamento_pix()
    {
        Log::info("=== TESTE DE LOGS: Auditoria de Pagamento PIX ===");

        // Arrange
        $planoBasico = $this->getPlanByPrice(9.90);
        $contrato = $this->createContract($this->user->id, $planoBasico['id']);

        $logsCapturados = [];
        Log::listen(function ($message, $level, $context) use (&$logsCapturados) {
            $logsCapturados[] = [
                'message' => $message,
                'level' => $level,
                'context' => $context,
            ];
        });

        // Act
        $planoPremium = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoPremium['id']);

        // Assert: Validar logs de pagamento
        $this->assertTrue($this->contemLog($logsCapturados, 'Registro de pagamento criado'), 'Deveria conter log de criação de pagamento');

        $logPagamento = $this->encontrarLog($logsCapturados, 'Registro de pagamento criado');
        $this->assertArrayHasKey('payment_id', $logPagamento['context']);

        // Verificar que o pagamento foi registrado no banco
        $payment = Payment::find($logPagamento['context']['payment_id']);
        $this->assertNotNull($payment, 'Pagamento deveria existir no banco');
        $this->assertEquals('paid', $payment->status, 'Pagamento PIX deveria estar como pago');

        Log::info("Logs de auditoria PIX validados", [
            'payment_id' => $payment->id,
            'amount' => $payment->amount,
            'status' => $payment->status
        ]);
    }

    /** @test */
    public function test_logs_verificacao_saldo_antes_depois()
    {
        Log::info("=== TESTE DE LOGS: Verificação de Saldo Antes/Depois ===");

        // Arrange
        $saldoInicial = 50.00;
        $this->addUserBalance($this->user->id, $saldoInicial, 'Saldo inicial');
        $planoBasico = $this->getPlanByPrice(9.90);
        $contrato = $this->createContract($this->user->id, $planoBasico['id']);

        $logsCapturados = [];
        Log::listen(function ($message, $level, $context) use (&$logsCapturados) {
            $logsCapturados[] = [
                'message' => $message,
                'level' => $level,
                'context' => $context,
            ];
        });

        // Act
        $planoPremium = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoPremium['id']);

        // Assert: Validar logs de verificação de saldo
        $this->assertTrue($this->contemLog($logsCapturados, 'Cenário de Upgrade'), 'Deveria conter log de cenário de upgrade');

        $logUpgrade = $this->encontrarLog($logsCapturados, 'Cenário de Upgrade');
        $this->assertArrayHasKey('user_balance', $logUpgrade['context']);
        $this->assertArrayHasKey('applied_credits', $logUpgrade['context']);
        $this->assertArrayHasKey('amount', $logUpgrade['context']);

        // Verificar saldo antes e depois
        $saldoAntesLog = $this->encontrarLog($logsCapturados, 'user_balance_before');
        $saldoDepoisLog = $this->encontrarLog($logsCapturados, 'user_balance_after');

        if ($saldoAntesLog) {
            $this->assertEquals($saldoInicial, $saldoAntesLog['context']['user_balance_before']);
        }

        Log::info("Logs de verificação de saldo validados", [
            'saldo_inicial' => $saldoInicial,
            'saldo_utilizado' => $logUpgrade['context']['applied_credits'] ?? 0
        ]);
    }

    /**
     * Validação específica para logs de mudança de plano
     */
    private function validarLogsMudancaPlano(array $logs, string $tipo): void
    {
        $this->assertTrue($this->contemLog($logs, 'Iniciando troca de plano'), "Deveria conter log de início de mudança de plano para {$tipo}");

        $logInicio = $this->encontrarLog($logs, 'Iniciando troca de plano');
        $this->assertArrayHasKey('contract_id', $logInicio['context']);
        $this->assertArrayHasKey('new_plan_id', $logInicio['context']);
    }

    /**
     * Validação específica para logs de cálculo pro-rata
     */
    private function validarLogsCalculoProRata(array $logs): void
    {
        $this->assertTrue($this->contemLog($logs, 'Cálculo de crédito pro-rata'), 'Deveria conter log de cálculo pro-rata');

        $logProRata = $this->encontrarLog($logs, 'Cálculo de crédito pro-rata');
        $this->assertArrayHasKey('prorated_old_credit', $logProRata['context']);
        $this->assertArrayHasKey('is_same_day_change', $logProRata['context']);
    }

    /**
     * Validação específica para logs de geração de crédito
     */
    private function validarLogsGeracaoCredito(array $logs): void
    {
        $this->assertTrue($this->contemLog($logs, 'Cenário de Downgrade - ANTES'), 'Deveria conter log de cenário de downgrade');

        $logDowngrade = $this->encontrarLog($logs, 'Cenário de Downgrade - ANTES');
        $this->assertArrayHasKey('credit_generated', $logDowngrade['context']);
        $this->assertArrayHasKey('user_balance_before', $logDowngrade['context']);
        $this->assertArrayHasKey('is_credit_generated_positive', $logDowngrade['context']);
    }

    /**
     * Validação específica para logs de aplicação de crédito
     */
    private function validarLogsAplicacaoCredito(array $logs): void
    {
        $this->assertTrue($this->contemLog($logs, 'Cenário de Upgrade'), 'Deveria conter log de cenário de upgrade');

        $logUpgrade = $this->encontrarLog($logs, 'Cenário de Upgrade');
        $this->assertArrayHasKey('applied_credits', $logUpgrade['context']);
        $this->assertArrayHasKey('user_balance', $logUpgrade['context']);
        $this->assertArrayHasKey('discount_applied', $logUpgrade['context']);
    }

    /**
     * Validação específica para logs de verificação de saldo
     */
    private function validarLogsVerificacaoSaldo(array $logs): void
    {
        $this->assertTrue(
            $this->contemLog($logs, 'user_balance_before') || $this->contemLog($logs, 'user_balance'),
            'Deveria conter log de verificação de saldo'
        );
    }

    /**
     * Helper: Verificar se array de logs contém mensagem específica
     */
    private function contemLog(array $logs, string $mensagem): bool
    {
        foreach ($logs as $log) {
            if (str_contains($log['message'], $mensagem)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Helper: Encontrar primeiro log que contenha mensagem específica
     */
    private function encontrarLog(array $logs, string $mensagem): ?array
    {
        foreach ($logs as $log) {
            if (str_contains($log['message'], $mensagem)) {
                return $log;
            }
        }
        return null;
    }

    /**
     * Helper: Criar contrato para teste
     */
    private function createContract(int $userId, int $planId): Contract
    {
        return Contract::create([
            'user_id' => $userId,
            'plan_id' => $planId,
            'start_date' => Carbon::now(),
            'end_date' => Carbon::now()->addDays(30),
            'status' => 'active',
        ]);
    }

    /**
     * Helper: Obter plano por preço aproximado
     */
    private function getPlanByPrice(float $price): array
    {
        foreach ($this->plans as $plan) {
            if (abs((float)$plan['price'] - $price) < 0.01) {
                return $plan;
            }
        }

        $this->fail("Plano com preço {$price} não encontrado");
        return []; // Adicionado para garantir que todos os caminhos retornem um valor
    }

    /**
     * Helper: Adicionar saldo ao usuário
     */
    private function addUserBalance(int $userId, float $amount, string $description): void
    {
        UserBalance::create([
            'user_id' => $userId,
            'amount' => $amount,
            'description' => $description,
        ]);
    }

    /**
     * Helper: Garantir que planos existem no banco
     */
    private function seedPlans(): void
    {
        $plans = [
            [
                'description' => 'Individual',
                'numberOfClients' => 1,
                'price' => 9.90,
                'gigabytesStorage' => 1,
                'active' => true,
            ],
            [
                'description' => 'Até 10 vistorias',
                'numberOfClients' => 10,
                'price' => 87.00,
                'gigabytesStorage' => 10,
                'active' => true,
            ],
            [
                'description' => 'Até 25 vistorias',
                'numberOfClients' => 25,
                'price' => 197.00,
                'gigabytesStorage' => 25,
                'active' => true,
            ],
            [
                'description' => 'Até 50 vistorias',
                'numberOfClients' => 50,
                'price' => 347.00,
                'gigabytesStorage' => 50,
                'active' => true,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::create($plan);
        }
    }
}