<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;
use App\Contracts\ContractServiceInterface;
use App\Contracts\PaymentServiceInterface;
use App\Contracts\PixPaymentServiceInterface;
use App\Contracts\PlanServiceInterface;
use App\Contracts\UserServiceInterface;
use App\Contracts\ContractWithPaymentServiceInterface;
use App\Contracts\CreditCalculationServiceInterface;
use App\Contracts\BalanceServiceInterface;
use App\Services\ContractService;
use App\Services\PaymentService;
use App\Services\PixPaymentService;
use App\Services\PlanService;
use App\Services\UserService;
use App\Services\ContractWithPaymentService;
use App\Services\CreditCalculationService;
use App\Services\BalanceService;

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
        $this->app->bind(PixPaymentServiceInterface::class, PixPaymentService::class);
        $this->app->bind(PlanServiceInterface::class, PlanService::class);
        $this->app->bind(UserServiceInterface::class, UserService::class);
        $this->app->bind(ContractWithPaymentServiceInterface::class, ContractWithPaymentService::class);
        $this->app->bind(CreditCalculationServiceInterface::class, CreditCalculationService::class);
        $this->app->bind(BalanceServiceInterface::class, BalanceService::class);
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
