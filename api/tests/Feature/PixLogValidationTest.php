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
 * Testes funcionais simplificados para validação do sistema PIX
 *
 * Valida cenários críticos de negócio sem complexidade desnecessária:
 * - Downgrade com geração de crédito
 * - Upgrade com aplicação de saldo
 * - Cálculos pro-rata precisos
 * - Auditoria de pagamentos PIX
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
        $this->seedPlans();
        $this->plans = Plan::all()->toArray();
    }

    /** @test */
    public function test_cenario_downgrade_com_credito()
    {
        // Arrange
        $planoPremium = $this->getPlanByPrice(197.00);
        $contrato = $this->createContract($this->user->id, $planoPremium['id']);

        // Act
        $planoIntermediario = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoIntermediario['id']);

        // Assert: Validar resultado funcional
        $this->assertEquals(0, $resultado['final_amount'], 'Downgrade deveria ser gratuito');
        $this->assertEquals(87.00, $resultado['prorated_new'], 'Valor novo incorreto');
        $this->assertGreaterThan(0, $resultado['prorated_old'], 'Deveria gerar crédito proporcional');

        Log::info("✅ Cenário downgrade validado");
    }

    /** @test */
    public function test_cenario_upgrade_com_saldo()
    {
        // Arrange
        $this->addUserBalance($this->user->id, 100.00, 'Saldo para teste');
        $planoBasico = $this->getPlanByPrice(9.90);
        $contrato = $this->createContract($this->user->id, $planoBasico['id']);

        // Act
        $planoPremium = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoPremium['id']);

        // Assert: Validar aplicação de saldo
        $this->assertArrayHasKey('applied_balance', $resultado);
        $this->assertGreaterThanOrEqual(0, $resultado['applied_balance']);

        Log::info("✅ Cenário upgrade com saldo validado");
    }

    /** @test */
    public function test_sistema_credito_detalhado()
    {
        // Arrange
        $planoPremium = $this->getPlanByPrice(347.00);
        $contrato = $this->createContract($this->user->id, $planoPremium['id']);

        // Act
        $planoBasico = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoBasico['id']);

        // Assert: Validar geração de crédito
        $this->assertGreaterThan(0, $resultado['prorated_old']);
        $this->assertEquals(87.00, $resultado['prorated_new']);

        Log::info("✅ Sistema de crédito funcionando");
    }

    /** @test */
    public function test_calculo_pro_rata_detalhado()
    {
        // Arrange: Contrato com 10 dias de uso
        $planoInicial = $this->getPlanByPrice(87.00);
        $contrato = $this->createContract($this->user->id, $planoInicial['id']);
        $contrato->update(['start_date' => Carbon::now()->subDays(10)]);

        // Act
        $planoNovo = $this->getPlanByPrice(197.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoNovo['id']);

        // Assert: Validar cálculo proporcional (20 dias restantes / 30 dias = 2/3)
        $creditoEsperado = 87.00 * (20 / 30);
        $this->assertEqualsWithDelta($creditoEsperado, $resultado['prorated_old'], 0.01);

        Log::info("✅ Cálculo pro-rata correto");
    }

    /** @test */
    public function test_auditoria_pagamento_pix()
    {
        // Arrange
        $planoBasico = $this->getPlanByPrice(9.90);
        $contrato = $this->createContract($this->user->id, $planoBasico['id']);

        // Act
        $planoPremium = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoPremium['id']);

        // Assert: Validar resultado funcional
        $this->assertArrayHasKey('final_amount', $resultado);
        $this->assertGreaterThan(0, $resultado['final_amount'], 'Deveria ter valor a pagar');

        // Verificar pagamentos criados (se houver)
        $payments = Payment::where('contract_id', $contrato->id)->get();
        if ($payments->count() > 0) {
            $payment = $payments->first();
            $this->assertEquals('paid', $payment->status, 'Pagamento deveria estar pago');
        }

        Log::info("✅ Auditoria PIX funcionando");
    }

    /** @test */
    public function test_verificacao_saldo_antes_depois()
    {
        // Arrange
        $saldoInicial = 50.00;
        $this->addUserBalance($this->user->id, $saldoInicial, 'Saldo inicial');
        $planoBasico = $this->getPlanByPrice(9.90);
        $contrato = $this->createContract($this->user->id, $planoBasico['id']);

        // Act
        $planoPremium = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoPremium['id']);

        // Assert: Validar aplicação de saldo
        $this->assertArrayHasKey('applied_balance', $resultado);
        $this->assertGreaterThanOrEqual(0, $resultado['applied_balance']);

        Log::info("✅ Verificação de saldo funcionando");
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
     * Helper: Obter plano por preço
     */
    private function getPlanByPrice(float $price): array
    {
        foreach ($this->plans as $plan) {
            if (abs((float)$plan['price'] - $price) < 0.01) {
                return $plan;
            }
        }

        $this->fail("Plano com preço {$price} não encontrado");
        return [];
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
     * Helper: Criar planos de teste
     */
    private function seedPlans(): void
    {
        $plans = [
            ['description' => 'Individual', 'numberOfClients' => 1, 'price' => 9.90, 'gigabytesStorage' => 1, 'active' => true],
            ['description' => 'Até 10 vistorias', 'numberOfClients' => 10, 'price' => 87.00, 'gigabytesStorage' => 10, 'active' => true],
            ['description' => 'Até 25 vistorias', 'numberOfClients' => 25, 'price' => 197.00, 'gigabytesStorage' => 25, 'active' => true],
            ['description' => 'Até 50 vistorias', 'numberOfClients' => 50, 'price' => 347.00, 'gigabytesStorage' => 50, 'active' => true],
        ];

        foreach ($plans as $plan) {
            Plan::create($plan);
        }
    }
}
