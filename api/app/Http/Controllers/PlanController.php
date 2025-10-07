<?php

namespace App\Http\Controllers;

use App\Contracts\PlanServiceInterface;

class PlanController extends Controller
{
    public function __construct(
        private PlanServiceInterface $planService
    ) {}

    /**
      * Display a listing of the plans.
      *
      * @return \Illuminate\Http\Response
      */
    public function index()
    {
        return $this->planService->listPlans();
    }
}
