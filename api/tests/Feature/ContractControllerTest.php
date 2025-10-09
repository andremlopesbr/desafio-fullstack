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
            'start_date' => '2025-10-08',
            'end_date' => '2025-11-08',
            'status' => 'active',
        ];

        $response = $this->postJson('/api/contracts', $data);

        $response->assertStatus(201)
                 ->assertJsonStructure(['id', 'user_id', 'plan_id', 'start_date', 'end_date', 'status']);
    }

    public function test_create_contract_error_missing_fields()
    {
        $user = User::factory()->create();


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
        $oldPlan = Plan::factory()->create(['price' => 100.00]); // 100.00 em reais
        $newPlan = Plan::factory()->create(['price' => 150.00]); // 150.00 em reais

        // Contrato ativo com data de 10 dias atrás
        $contract = Contract::factory()->create([
            'user_id' => $user->id,
            'plan_id' => $oldPlan->id,
            'start_date' => now()->subDays(10),
            'end_date' => now()->addDays(20), // 20 dias restantes
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
        // Com a lógica corrigida para upgrade: Valor Total = Valor Novo - Desconto Pro-Rata - Saldo
        // Dias decorridos: 10, dias restantes: 20 (mês de 30 dias)
        // Desconto Pro-Rata = (100.00 / 30) * 20 = 66.67 reais
        // Valor final = 150.00 - 66.67 = 83.33 reais
        $expectedAmount = round(150.00 - (100.00 / 30) * 20, 2); // 83.33
        $this->assertEqualsWithDelta(83.33, $payment->amount, 0.01);

        // Resetar data de teste
        \Carbon\Carbon::setTestNow();
    }

    public function test_payment_renews_expired_contract_correctly()
    {
        // Fixar data para teste (após expiração do contrato)
        $testDate = \Carbon\Carbon::create(2023, 2, 15); // 15 de fevereiro de 2023
        \Carbon\Carbon::setTestNow($testDate);

        $user = User::factory()->create();
        $plan = Plan::factory()->create(['price' => 100.00]);

        // Criar contrato que expira em 1 de fevereiro de 2023
        $contract = Contract::factory()->create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'start_date' => '2023-01-01',
            'end_date' => '2023-02-01', // Expira em 1 de fevereiro
            'status' => 'active',
        ]);

        // Processar pagamento para o contrato expirado
        $paymentData = [
            'contract_id' => $contract->id,
            'amount' => 100.00,
            'payment_date' => '2023-02-15',
        ];

        $response = $this->postJson('/api/payments', $paymentData);

        $response->assertStatus(201);

        // Verificar que o contrato original ainda existe mas pode estar inativo
        $originalContract = Contract::find($contract->id);
        $this->assertNotNull($originalContract);

        // Verificar que foi criado um novo contrato renovado
        $renewedContracts = Contract::where('user_id', $user->id)
            ->where('id', '!=', $contract->id)
            ->where('status', 'active')
            ->get();

        $this->assertCount(1, $renewedContracts, 'Deve haver exatamente um contrato renovado ativo');

        $renewedContract = $renewedContracts->first();

        // Verificar datas da renovação
        $this->assertEquals('2023-02-01', $renewedContract->start_date->toDateString(),
            'Novo contrato deve começar na data de expiração do anterior (01/02/2023)');
        $this->assertEquals('2023-03-01', $renewedContract->end_date->toDateString(),
            'Novo contrato deve terminar 1 mês após a data de expiração (01/03/2023)');

        // Verificar que o pagamento foi criado para o novo contrato
        $payments = DB::table('payments')->where('contract_id', $renewedContract->id)->get();
        $this->assertCount(1, $payments, 'Deve haver um pagamento para o contrato renovado');

        // Resetar data de teste
        \Carbon\Carbon::setTestNow();
    }
}
