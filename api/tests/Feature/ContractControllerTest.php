<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ContractControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_contract_success()
    {
        $user = User::factory()->create();
        $plan = Plan::factory()->create();

        $data = [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'start_date' => '2023-01-01',
            'end_date' => '2023-12-31',
            'status' => 'active',
        ];

        $response = $this->postJson('/api/contracts', $data);

        $response->assertStatus(201)
                 ->assertJsonStructure(['id', 'user_id', 'plan_id', 'start_date', 'end_date', 'status']);
    }

    public function test_create_contract_error_missing_fields()
    {
        $response = $this->postJson('/api/contracts', []);

        $response->assertStatus(422);
    }

    public function test_change_plan_success()
    {
        $user = User::factory()->create();
        $oldPlan = Plan::factory()->create();
        $newPlan = Plan::factory()->create();
        $contract = Contract::factory()->create(['user_id' => $user->id, 'plan_id' => $oldPlan->id]);

        $data = ['new_plan_id' => $newPlan->id];

        $response = $this->patchJson("/api/contracts/{$contract->id}/change-plan", $data);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'contract' => ['id', 'user_id', 'plan_id', 'status'],
                     'credits_available',
                     'discount_applied',
                     'final_amount',
                     'remaining_credit'
                 ])
                 ->assertJson(['contract' => ['plan_id' => $newPlan->id]]);
    }

    public function test_change_plan_error_contract_not_found()
    {
        $newPlan = Plan::factory()->create();

        $data = ['new_plan_id' => $newPlan->id];

        $response = $this->patchJson('/api/contracts/999/change-plan', $data);

        $response->assertStatus(404);
    }

    public function test_list_contracts_for_user_success()
    {
        $user = User::factory()->create();
        $plan = Plan::factory()->create();
        Contract::factory()->count(3)->create(['user_id' => $user->id, 'plan_id' => $plan->id]);

        $response = $this->getJson('/api/contracts?user_id=' . $user->id);

        $response->assertStatus(200)
                 ->assertJsonCount(3);
    }

    public function test_list_contracts_for_user_error_invalid_user()
    {
        $response = $this->getJson('/api/contracts?user_id=999');

        $response->assertStatus(200)
                  ->assertJsonCount(0);
    }

    public function test_change_plan_calculates_credits_correctly()
    {
        // Fixar data para teste determinístico (dia 10, 21 dias restantes no mês)
        $testDate = \Carbon\Carbon::create(2023, 1, 10);
        \Carbon\Carbon::setTestNow($testDate);

        $user = User::factory()->create();
        $oldPlan = Plan::factory()->create(['price' => 10000]); // 100.00 em centavos
        $newPlan = Plan::factory()->create(['price' => 15000]); // 150.00 em centavos

        // Contrato ativo com data de 10 dias atrás
        $contract = Contract::factory()->create([
            'user_id' => $user->id,
            'plan_id' => $oldPlan->id,
            'start_date' => now()->subDays(10),
            'status' => 'active'
        ]);

        $data = ['new_plan_id' => $newPlan->id];

        $response = $this->patchJson("/api/contracts/{$contract->id}/change-plan", $data);

        $response->assertStatus(200);

        // O método retorna informações completas da troca de plano
        $result = $response->json();
        $newContractData = $result['contract'];

        // Verifica se foi criado um pagamento com valor calculado para o NOVO contrato
        $payments = DB::table('payments')->where('contract_id', $newContractData['id'])->get();
        $this->assertCount(1, $payments);

        $payment = $payments->first();
        // Com a lógica corrigida para upgrade: Valor Total = Valor Novo - Desconto Pro-Rata - Crédito Saldo
        // Dias decorridos: 10, dias restantes: 20 (mês de 30 dias)
        // Desconto Pro-Rata = (10000 / 30) * 20 = 6666.67 centavos
        // Valor final = 15000 - 6666.67 = 8333.33 centavos
        $expectedProratedOld = (int)floor((10000 / 30) * 20); // 6666
        $expectedAmount = (int)round(15000 - $expectedProratedOld); // 8334
        $this->assertEquals(8334, $payment->amount);

        // Resetar data de teste
        \Carbon\Carbon::setTestNow();
    }
}
