<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\UserServiceInterface;
use App\Http\Resources\UserResource;
use App\Http\Resources\BalanceTransactionResource;
use App\Models\User;

class UserController extends Controller
{
    public function __construct(
        private UserServiceInterface $userService
    ) {}

    /**
     * Display the resource.
     */
    public function show()
    {
        // Usuário Demo
        $user = $this->userService->getUserById(1);

        return UserResource::make($user);
    }

    /**
     * Get user balance transaction history
     */
    public function balanceHistory(User $user)
    {
        $transactions = $this->userService->getUserBalanceHistory($user->id);

        return BalanceTransactionResource::collection($transactions);
    }

    /**
     * Get user balance
     */
    public function balance(User $user)
    {
        $totalBalance = $this->userService->getUserBalance($user->id);

        return response()->json([
            'total_balance' => $totalBalance
        ], 200, [], JSON_NUMERIC_CHECK);
    }
}
