<?php

namespace Database\Factories;

use App\Models\Contract;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'contract_id' => Contract::factory(),
            'amount' => fake()->randomFloat(2, 10, 1000),
            'payment_date' => fake()->date(),
            'status' => 'paid',
        ];
    }
}
