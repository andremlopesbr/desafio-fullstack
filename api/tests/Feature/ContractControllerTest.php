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
                     'new_contract' => ['id', 'user_id', 'plan_id', 'status'],
                     'payment' => ['id', 'amount', 'discount_applied'],
                     'balance_info' => ['previous_balance', 'credits_generated', 'new_balance']
                 ])
                 ->assertJson(['new_contract' => ['plan_id' => $newPlan->id]]);
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
        Contract::factory()->count(3)->create(['user_id' => $user->id]);

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
        $testDate = \Carbon\Carbon::create(2023, 1, 10);
        \Carbon\Carbon::setTestNow($testDate);

        $user = User::factory()->create();
        $oldPlan = Plan::factory()->create(['price' => 100.00]);
        $newPlan = Plan::factory()->create(['price' => 150.00]);

        $contract = Contract::factory()->create([
            'user_id' => $user->id,
            'plan_id' => $oldPlan->id,
            'start_date' => now()->subDays(10),
            'end_date' => now()->addDays(20),
            'status' => 'active'
        ]);

        $data = ['new_plan_id' => $newPlan->id];

        $response = $this->patchJson("/api/contracts/{$contract->id}/change-plan", $data);

        $response->assertStatus(200);

        $result = $response->json();
        $payment = $result['payment'];

        $expectedAmount = round(150.00 - (100.00 / 30) * 20, 2);
        $this->assertEqualsWithDelta($expectedAmount, $payment['amount'], 0.01);

        \Carbon\Carbon::setTestNow();
    }

    public function test_payment_renews_expired_contract_correctly()
    {
        $testDate = \Carbon\Carbon::create(2023, 2, 15);
        \Carbon\Carbon::setTestNow($testDate);

        $user = User::factory()->create();
        $plan = Plan::factory()->create(['price' => 100.00]);

        $contract = Contract::factory()->create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'start_date' => '2023-01-01',
            'end_date' => '2023-02-01',
            'status' => 'active',
        ]);

        $paymentData = [
            'contract_id' => $contract->id,
            'amount' => 100.00,
            'payment_date' => '2023-02-15',
        ];

        $response = $this->postJson('/api/payments', $paymentData);

        $response->assertStatus(201);

        $originalContract = Contract::find($contract->id);
        $this->assertNotNull($originalContract);

        $renewedContracts = Contract::where('user_id', $user->id)
            ->where('id', '!=', $contract->id)
            ->where('status', 'active')
            ->get();

        $this->assertCount(1, $renewedContracts, 'Deve haver exatamente um contrato renovado ativo');

        $renewedContract = $renewedContracts->first();

        $this->assertEquals('2023-02-01', $renewedContract->start_date->toDateString());
        $this->assertEquals('2023-03-01', $renewedContract->end_date->toDateString());

        $payments = DB::table('payments')->where('contract_id', $renewedContract->id)->get();
        $this->assertCount(1, $payments, 'Deve haver um pagamento para o contrato renovado');

        \Carbon\Carbon::setTestNow();
    }
}
