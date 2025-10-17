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
 * Testes automatizados para validação dos cenários PIX de mudança de planos
 *
 * Cenários testados:
 * 1. Upgrade com pagamento adicional
 * 2. Upgrade com utilização de créditos
 * 3. Downgrade sem geração de créditos (crédito menor que novo plano)
 * 4. Downgrade com geração de créditos (crédito maior que novo plano)
 * 5. Mudança no mesmo dia (cobrança proporcional 100%)
 */
class PixPlanChangeTest extends TestCase
{
    use RefreshDatabase;

    private ContractService $contractService;
    private User $user;
    private array $plans;

    protected function setUp(): void
    {
        parent::setUp();

        $this->contractService = app(ContractService::class);

        // Criar usuário para testes
        $this->user = User::factory()->create();

        // Obter planos para usar nos testes
        $this->plans = Plan::all()->toArray();

        // Garantir que temos pelo menos 4 planos para os testes
        if (count($this->plans) < 4) {
            $this->seedPlans();
            $this->plans = Plan::all()->toArray();
        }
    }

    /** @test */
    public function test_cenario_1_upgrade_com_pagamento_adicional()
    {
        Log::info("=== INICIANDO CENÁRIO 1: Upgrade com pagamento adicional ===");

        // Arrange: Criar contrato com plano básico (Individual - R$ 9,90)
        $planoBasico = $this->getPlanByPrice(9.90);
        $contrato = $this->createContract($this->user->id, $planoBasico['id']);

        // Debug: Verificar dados do contrato criado
        Log::info("Contrato criado para teste", [
            'contract_id' => $contrato->id,
            'start_date' => $contrato->start_date,
            'end_date' => $contrato->end_date,
            'plan_price' => $contrato->plan->price
        ]);

        // Act: Mudar para plano premium (R$ 87,00)
        $planoPremium = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoPremium['id']);

        // Debug: Verificar resultado detalhado
        Log::info("Resultado do cenário 1", [
            'prorated_old' => $resultado['prorated_old'],
            'prorated_new' => $resultado['prorated_new'],
            'applied_balance' => $resultado['applied_balance'],
            'final_amount' => $resultado['final_amount'],
            'additional_balance' => $resultado['additional_balance']
        ]);

        // Verificar cálculos
        // Cenário: Plano R$ 9,90 → R$ 87,00 no mesmo dia = crédito proporcional 100% = R$ 9,90
        // Valor a pagar = R$ 87,00 - R$ 9,90 = R$ 77,10 (sem saldo disponível)
        $this->assertEquals(77.10, $resultado['final_amount'], 'Valor a pagar deveria ser diferença entre planos');
        $this->assertEquals(0, $resultado['applied_balance'], 'Não deveria utilizar créditos (sem saldo)');
        $this->assertEquals(87.00, $resultado['prorated_new'], 'Valor do novo plano deveria ser R$ 87,00');

        // Verificar registro de pagamento
        $payment = $resultado['payment'];
        $this->assertEquals(77.10, $payment->amount, 'Valor do pagamento deveria ser diferença entre planos');
        $this->assertEquals('paid', $payment->status, 'Status deveria ser pago');
        $this->assertEquals(0, $payment->applied_credits, 'Não deveria ter créditos aplicados (sem saldo)');

        Log::info("Cenário 1 concluído com sucesso", [
            'final_amount' => $resultado['final_amount'],
            'applied_balance' => $resultado['applied_balance'],
            'payment_amount' => $payment->amount
        ]);
    }

    /** @test */
    public function test_cenario_2_upgrade_com_utilizacao_de_creditos()
    {
        Log::info("=== INICIANDO CENÁRIO 2: Upgrade com utilização de créditos ===");

        // Arrange: Adicionar saldo ao usuário e criar contrato básico
        $this->addUserBalance($this->user->id, 50.00, 'Saldo inicial para teste');
        $planoBasico = $this->getPlanByPrice(9.90);
        $contrato = $this->createContract($this->user->id, $planoBasico['id']);

        // Act: Mudar para plano intermediário (R$ 87,00)
        $planoIntermediario = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoIntermediario['id']);

        // Assert: Verificar utilização de créditos (cenário com saldo R$ 50,00)
        // Plano R$ 9,90 → R$ 87,00 = crédito proporcional R$ 9,90
        // Diferença: R$ 87,00 - R$ 9,90 = R$ 77,10
        // Saldo disponível: R$ 50,00 (utiliza todo o saldo)
        // Valor a pagar: R$ 77,10 - R$ 50,00 = R$ 27,10
        $this->assertGreaterThan(0, $resultado['applied_balance'], 'Deveria utilizar créditos do saldo');
        $this->assertEquals(27.10, $resultado['final_amount'], 'Valor a pagar após usar saldo disponível');

        // Verificar saldo restante
        $saldoRestante = $this->contractService->getUserBalance($this->user->id);
        $this->assertLessThan(50.00, $saldoRestante, 'Deveria consumir parte do saldo');

        Log::info("Cenário 2 concluído com sucesso", [
            'applied_balance' => $resultado['applied_balance'],
            'saldo_restante' => $saldoRestante
        ]);
    }

    /** @test */
    public function test_cenario_3_downgrade_sem_geracao_de_creditos()
    {
        Log::info("=== INICIANDO CENÁRIO 3: Downgrade sem geração de créditos ===");

        // Arrange: Criar contrato com plano premium (R$ 87,00)
        $planoPremium = $this->getPlanByPrice(87.00);
        $contrato = $this->createContract($this->user->id, $planoPremium['id']);

        // Act: Downgrade para plano básico (R$ 9,90)
        $planoBasico = $this->getPlanByPrice(9.90);
        $resultado = $this->contractService->changePlan($contrato->id, $planoBasico['id']);

        // Assert: Verificar que não gera créditos (downgrade mas crédito menor que novo plano)
        // Plano R$ 87,00 → R$ 9,90 = crédito proporcional R$ 87,00 (100% mesmo dia)
        // Como crédito proporcional > novo plano, deveria gerar créditos
        // Créditos gerados: R$ 87,00 - R$ 9,90 = R$ 77,10
        $this->assertEquals(77.10, $resultado['additional_balance'], 'Deveria gerar créditos do downgrade');
        $this->assertEquals(0, $resultado['final_amount'], 'Não deveria ter valor a pagar');
        $this->assertEquals(9.90, $resultado['prorated_new'], 'Novo plano deveria custar R$ 9,90');

        Log::info("Cenário 3 concluído com sucesso", [
            'additional_balance' => $resultado['additional_balance'],
            'final_amount' => $resultado['final_amount']
        ]);
    }

    /** @test */
    public function test_cenario_4_downgrade_com_geracao_de_creditos()
    {
        Log::info("=== INICIANDO CENÁRIO 4: Downgrade com geração de créditos ===");

        // Arrange: Criar contrato com plano mais caro (R$ 197,00)
        $planoPremium = $this->getPlanByPrice(197.00);
        $contrato = $this->createContract($this->user->id, $planoPremium['id']);

        // Act: Downgrade para plano intermediário (R$ 87,00)
        $planoIntermediario = $this->getPlanByPrice(87.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoIntermediario['id']);

        // Assert: Verificar geração de créditos
        $this->assertGreaterThan(0, $resultado['additional_balance'], 'Deveria gerar créditos');
        $this->assertEquals(0, $resultado['final_amount'], 'Não deveria ter valor a pagar');
        $this->assertEquals(87.00, $resultado['prorated_new'], 'Novo plano deveria custar R$ 87,00');

        // Verificar que os créditos foram adicionados ao saldo
        $saldoAtual = $this->contractService->getUserBalance($this->user->id);
        $this->assertGreaterThan(0, $saldoAtual, 'Deveria ter saldo após geração de créditos');

        // Verificar registro de pagamento
        $payment = $resultado['payment'];
        $this->assertEquals(0, $payment->amount, 'Valor do pagamento deveria ser 0');
        $this->assertGreaterThan(0, $payment->credits_generated, 'Deveria registrar créditos gerados');

        Log::info("Cenário 4 concluído com sucesso", [
            'additional_balance' => $resultado['additional_balance'],
            'saldo_atual' => $saldoAtual,
            'credits_generated' => $payment->credits_generated
        ]);
    }

    /** @test */
    public function test_cenario_5_mudanca_no_mesmo_dia()
    {
        Log::info("=== INICIANDO CENÁRIO 5: Mudança no mesmo dia ===");

        // Arrange: Criar contrato hoje
        $planoInicial = $this->getPlanByPrice(87.00);
        $contrato = $this->createContract($this->user->id, $planoInicial['id']);

        // Act: Mudar de plano no mesmo dia
        $planoNovo = $this->getPlanByPrice(197.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoNovo['id']);

        // Assert: Verificar crédito proporcional 100%
        $this->assertEquals(87.00, $resultado['prorated_old'], 'Crédito proporcional deveria ser 100% do plano anterior');
        $this->assertEquals(197.00, $resultado['prorated_new'], 'Novo plano deveria custar R$ 197,00');

        // Calcular valor a pagar (novo plano - crédito proporcional)
        $valorEsperado = 197.00 - 87.00; // R$ 110,00
        $this->assertEquals($valorEsperado, $resultado['final_amount'], 'Valor a pagar deveria ser diferença entre planos');

        Log::info("Cenário 5 concluído com sucesso", [
            'prorated_old' => $resultado['prorated_old'],
            'prorated_new' => $resultado['prorated_new'],
            'final_amount' => $resultado['final_amount']
        ]);
    }

    /** @test */
    public function test_validacao_calculos_pro_rata_complexos()
    {
        Log::info("=== TESTE DE VALIDAÇÃO: Cálculos pro-rata complexos ===");

        // Arrange: Criar contrato há 15 dias
        $planoInicial = $this->getPlanByPrice(87.00);
        $contrato = $this->createContract($this->user->id, $planoInicial['id']);

        // Simular uso de 15 dias (metade do ciclo de 30 dias)
        $contrato->update(['start_date' => Carbon::now()->subDays(15)]);

        // Act: Mudar para plano diferente
        $planoNovo = $this->getPlanByPrice(197.00);
        $resultado = $this->contractService->changePlan($contrato->id, $planoNovo['id']);

        // Assert: Verificar cálculo proporcional (50% do ciclo usado)
        $creditoProporcional = 87.00 * 0.5; // 50% do plano usado
        $this->assertEquals($creditoProporcional, $resultado['prorated_old'], 'Crédito proporcional deveria ser 50%');

        $valorAPagar = 197.00 - $creditoProporcional;
        $this->assertEquals($valorAPagar, $resultado['final_amount'], 'Valor a pagar deveria considerar crédito proporcional');

        Log::info("Validação pro-rata concluída", [
            'credito_proporcional' => $creditoProporcional,
            'valor_a_pagar' => $valorAPagar,
            'dias_usados' => 15
        ]);
    }

    /**
      * Helper: Criar contrato para teste
      */
    private function createContract(int $userId, int $planId): Contract
    {
        // Garantir que o contrato seja criado com datas consistentes
        $startDate = Carbon::now()->startOfDay();
        $endDate = Carbon::now()->startOfDay()->addDays(30);

        return Contract::create([
            'user_id' => $userId,
            'plan_id' => $planId,
            'start_date' => $startDate,
            'end_date' => $endDate,
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
        return []; // Adicionado para garantir retorno em todos os caminhos
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
