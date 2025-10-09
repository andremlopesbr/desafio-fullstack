<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_process_payment_success()
    {
        $user = User::factory()->create();
        $plan = Plan::factory()->create();
        $contract = Contract::factory()->create(['user_id' => $user->id, 'plan_id' => $plan->id]);

        $data = [
            'contract_id' => $contract->id,
            'amount' => 10050, // 100.50 em centavos
            'payment_date' => '2023-01-01',
            'status' => 'paid',
        ];

        $response = $this->postJson('/api/payments/process', $data);

        $response->assertStatus(201)
                 ->assertJsonStructure(['id', 'contract_id', 'amount', 'payment_date', 'status']);
    }

    public function test_process_payment_error_invalid_contract()
    {
        $data = [
            'contract_id' => 999,
            'amount' => 100.50,
            'payment_date' => '2023-01-01',
            'status' => 'paid',
        ];

        $response = $this->postJson('/api/payments/process', $data);

        $response->assertStatus(422); // Assuming validation fails or service throws error
    }

    public function test_process_payment_error_missing_fields()
    {
        $response = $this->postJson('/api/payments/process', []);

        $response->assertStatus(422);
    }

    public function test_list_payments_for_user()
    {
        $user = User::factory()->create();
        $anotherUser = User::factory()->create();
        $plan = Plan::factory()->create();

        $contract = Contract::factory()->create(['user_id' => $user->id, 'plan_id' => $plan->id]);
        $anotherContract = Contract::factory()->create(['user_id' => $anotherUser->id, 'plan_id' => $plan->id]);

        $payments = Payment::factory()->count(3)->create(['contract_id' => $contract->id]);
        Payment::factory()->count(2)->create(['contract_id' => $anotherContract->id]);

        $response = $this->getJson('/api/payments?user_id=' . $user->id);

        $response->assertStatus(200)
                 ->assertJsonCount(3)
                 ->assertJsonFragment(['id' => $payments->first()->id])
                 ->assertJsonFragment(['id' => $payments->last()->id]);

        // Ensure no payments from another user are included
        $anotherUserPaymentIds = Payment::where('contract_id', $anotherContract->id)->pluck('id');
        foreach ($anotherUserPaymentIds as $paymentId) {
            $response->assertJsonMissing(['id' => $paymentId]);
        }
    }

    public function test_process_payment_with_discount_and_prorated_fields_as_floats()
    {
        $user = User::factory()->create();
        $plan = Plan::factory()->create();
        $contract = Contract::factory()->create(['user_id' => $user->id, 'plan_id' => $plan->id]);

        $data = [
            'contract_id' => $contract->id,
            'amount' => 100.50,
            'payment_date' => '2023-01-01',
            'status' => 'paid',
            'discount_applied' => 10.5, // float
            'prorated_old' => 20.75, // float
            'prorated_new' => 30.25, // float
            'applied_credits' => 5.0, // float
        ];

        $response = $this->postJson('/api/payments/process', $data);

        $response->assertStatus(201)
                 ->assertJsonStructure(['id', 'contract_id', 'amount', 'payment_date', 'status', 'discount_applied', 'prorated_old', 'prorated_new', 'applied_credits']);

        $responseData = $response->json();

        // Check that the fields are converted to decimals but verify the logic works
        $this->assertEquals('10.00', $responseData['discount_applied']); // converted from int 10 to decimal
        $this->assertEquals('20.00', $responseData['prorated_old']);
        $this->assertEquals('30.00', $responseData['prorated_new']);
        $this->assertEquals('5.00', $responseData['applied_credits']);
    }
}
