<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $plans = [
            [
                'description' => 'Individual',
                'numberOfClients' => 1,
                'price' => 990, // 9.90 em centavos
                'gigabytesStorage' => 1,
            ],
            [
                'description' => 'Até 10 vistorias / clientes ativos',
                'numberOfClients' => 10,
                'price' => 8700, // 87.00 em centavos
                'gigabytesStorage' => 10,
            ],
            [
                'description' => 'Até 25 vistorias / clientes ativos',
                'numberOfClients' => 25,
                'price' => 19700, // 197.00 em centavos
                'gigabytesStorage' => 25,
            ],
            [
                'description' => 'Até 50 vistorias / clientes ativos',
                'numberOfClients' => 50,
                'price' => 34700, // 347.00 em centavos
                'gigabytesStorage' => 50,
            ],
            [
                'description' => 'Até 100 vistorias / clientes ativos',
                'numberOfClients' => 100,
                'price' => 49700, // 497.00 em centavos
                'gigabytesStorage' => 100,
            ],
            [
                'description' => 'Até 250 vistorias / clientes ativos',
                'numberOfClients' => 250,
                'price' => 79700, // 797.00 em centavos
                'gigabytesStorage' => 250,
            ]
        ];

        foreach ($plans as $plan) {
            Plan::create($plan);
        }
    }
}
