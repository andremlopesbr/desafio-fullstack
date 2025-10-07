<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\PlanServiceInterface;
use App\Models\Plan;
use Illuminate\Database\Eloquent\Collection;

class PlanService implements PlanServiceInterface
{
    public function listPlans(): Collection
    {
        return Plan::all();
    }
}