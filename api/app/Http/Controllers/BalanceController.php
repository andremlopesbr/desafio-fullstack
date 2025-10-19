<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\BalanceServiceInterface;
use App\Http\Requests\StoreBalanceRequest;

class BalanceController extends Controller
{
    public function __construct(
        private BalanceServiceInterface $balanceService
    ) {}

    /**
     * Add balance to a user's account.
     */
    public function store(StoreBalanceRequest $request)
    {
        $validated = $request->validated();

        $this->balanceService->addBalance(
            $validated['user_id'],
            $validated['amount'], // Store as reais
            $validated['description']
        );

        return response()->json(['message' => 'Balance added successfully.']);
    }
}
