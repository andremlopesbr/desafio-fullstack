<?php

namespace App\Http\Controllers;

use App\Contracts\ContractServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BalanceController extends Controller
{
    protected $contractService;

    public function __construct(ContractServiceInterface $contractService)
    {
        $this->contractService = $contractService;
    }

    /**
     * Add balance to a user's account.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $this->contractService->addBalance(
            $validated['user_id'],
            (int) ($validated['amount'] * 100), // Store as cents
            $validated['description']
        );

        return response()->json(['message' => 'Balance added successfully.']);
    }
}
