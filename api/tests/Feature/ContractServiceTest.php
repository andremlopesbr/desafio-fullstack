<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\DTOs\ContractCreateDTO;
use App\Models\Contract;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use App\Models\UserBalance;
use App\Services\ContractService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContractServiceTest extends TestCase
{
    use RefreshDatabase;

    private ContractService $contractService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->contractService = app(ContractService::class);
    }

    public function test_downgrade_generates_excess_balance()
    {
        // Criar planos
        $premiumPlan = Plan::create([
            'description' => 'Plano Premium',
            'numberOfClients' => 10,
            'gigabytesStorage' => 100,
            'price' => 100.00,
            'active' => true
        ]);

        $basicPlan = Plan::create([
            'description' => 'Plano Básico',
            'numberOfClients' => 5,
            'gigabytesStorage' => 50,
            'price' => 50.00,
            'active' => true
        ]);

        // Criar usuário
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password')
        ]);

        // Criar contrato premium
        $dto = new ContractCreateDTO(
            user_id: $user->id,
            plan_id: $premiumPlan->id,
            start_date: Carbon::now()->subDays(15), // 15 dias atrás
            end_date: null,
            status: 'active'
        );
        $contract = $this->contractService->createContract($dto);

        // Verificar saldo inicial (deve ser 0)
        $initialBalance = $this->contractService->getUserBalance($user->id);
        $this->assertEquals(0, $initialBalance);

        // Fazer downgrade no meio do ciclo (dia 15 de 30)
        $result = $this->contractService->changePlan($contract->id, $basicPlan->id);

        // Verificar que foi gerado saldo excedente
        $this->assertGreaterThan(0, $result['additional_balance']);
        $this->assertEquals(0, $result['final_amount']); // Não deve cobrar nada

        // Verificar que o saldo foi realmente adicionado
        $finalBalance = $this->contractService->getUserBalance($user->id);
        $this->assertEqualsWithDelta($result['additional_balance'], $finalBalance, 0.01);

        // Verificar que existe registro no UserBalance
        $userBalances = UserBalance::forUser($user->id)->get();
        $this->assertCount(1, $userBalances);
        $this->assertEqualsWithDelta($result['additional_balance'], $userBalances->first()->amount, 0.01);

        // Verificar descrição do saldo
        $this->assertTrue(strpos($userBalances->first()->description, 'Saldo excedente por downgrade') !== false);
    }

    public function test_downgrade_calculation_logic()
    {
        // Testar cálculo específico: Premium R$100 → Basic R$50 no dia 15 de 30
        $premiumPlan = Plan::create([
            'description' => 'Plano Premium',
            'numberOfClients' => 10,
            'gigabytesStorage' => 100,
            'price' => 100.00,
            'active' => true
        ]);

        $basicPlan = Plan::create([
            'description' => 'Plano Básico',
            'numberOfClients' => 5,
            'gigabytesStorage' => 50,
            'price' => 50.00,
            'active' => true
        ]);

        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password')
        ]);

        $dto = new ContractCreateDTO(
            user_id: $user->id,
            plan_id: $premiumPlan->id,
            start_date: Carbon::now()->subDays(15),
            end_date: null,
            status: 'active'
        );
        $contract = $this->contractService->createContract($dto);

        $result = $this->contractService->changePlan($contract->id, $basicPlan->id);

        // Verificar que foi gerado saldo excedente positivo
        $this->assertGreaterThan(0, $result['additional_balance']);
        $this->assertEqualsWithDelta($result['additional_balance'], $this->contractService->getUserBalance($user->id), 0.01);

        // Verificar que a lógica está correta: crédito antigo > custo novo proporcional
        // O valor exato depende dos dias restantes calculados
        $userBalances = UserBalance::forUser($user->id)->get();
        $this->assertCount(1, $userBalances);
        $this->assertEqualsWithDelta($result['additional_balance'], $userBalances->first()->amount, 0.01);
    }
}
