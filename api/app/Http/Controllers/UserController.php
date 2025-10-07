<?php

namespace App\Http\Controllers;

use App\Contracts\UserServiceInterface;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private UserServiceInterface $userService
    ) {}

    /**
     * Display the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function show()
    {
        // Usuário Demo
        return $this->userService->getUserById(1);
    }

    /**
     * Get user balance transaction history
     *
     * @param \App\Models\User $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function balanceHistory(\App\Models\User $user): \Illuminate\Http\JsonResponse
    {
        $transactions = $this->userService->getUserBalanceHistory($user->id);

        return response()->json($transactions);
    }

    /**
     * Get user balance
     */
    public function balance(\App\Models\User $user): \Illuminate\Http\JsonResponse
    {
        $totalBalance = $this->userService->getUserBalance($user->id);

        return response()->json([
            'total_balance' => $totalBalance
        ]);
    }
}
