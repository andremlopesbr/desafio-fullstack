<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;
use App\Contracts\ContractServiceInterface;
use App\Contracts\PaymentServiceInterface;
use App\Contracts\PlanServiceInterface;
use App\Contracts\UserServiceInterface;
use App\Services\ContractService;
use App\Services\PaymentService;
use App\Services\PlanService;
use App\Services\UserService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        Sanctum::ignoreMigrations();
        $this->app->bind(ContractServiceInterface::class, ContractService::class);
        $this->app->bind(PaymentServiceInterface::class, PaymentService::class);
        $this->app->bind(PlanServiceInterface::class, PlanService::class);
        $this->app->bind(UserServiceInterface::class, UserService::class);
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        //
    }
}
