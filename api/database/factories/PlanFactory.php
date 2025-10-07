<?php

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Plan>
 */
class PlanFactory extends Factory
{
    protected $model = Plan::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'description' => fake()->sentence(),
            'numberOfClients' => fake()->numberBetween(1, 100),
            'gigabytesStorage' => fake()->numberBetween(1, 1000),
            'price' => fake()->randomFloat(2, 10, 1000),
            'active' => true,
        ];
    }
}
