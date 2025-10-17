<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\PlanServiceInterface;
use App\Http\Resources\PlanResource;

class PlanController extends Controller
{
    public function __construct(
        private PlanServiceInterface $planService
    ) {}

    /**
     * Display a listing of the plans.
     */
    public function index()
    {
        $plans = $this->planService->listPlans();

        return PlanResource::collection($plans);
    }
}
