<?php

use App\Http\Controllers\ContractController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BalanceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//     return $request->user();
// });

Route::get('/', function () {
    return response()->json([
        'message' => 'ok',
        'timestamp' => now()->toISOString(),
        'version' => '1.0.0'
    ]);
});

Route::apiResource('plans', PlanController::class, ['only' => 'index']);

Route::apiSingleton('user', UserController::class, ['only' => 'show']);
Route::get('users/{user}/balance-history', [UserController::class, 'balanceHistory']);
Route::get('balance/{user}', [ContractController::class, 'getBalance']);
Route::post('balance', [BalanceController::class, 'store']);

Route::post('contracts', [ContractController::class, 'create']);
Route::patch('contracts/{contract}', [ContractController::class, 'update']);
Route::get('contracts', [ContractController::class, 'listForUser']);
Route::get('contracts/{contract}/credit-calculation', [ContractController::class, 'creditCalculation']);

Route::get('payments', [PaymentController::class, 'listForUser'])->name('payments.index');
Route::post('payments', [PaymentController::class, 'process']);
