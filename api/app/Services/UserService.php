<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\UserServiceInterface;
use App\Models\User;
use App\Models\UserBalance;
use App\Models\UserBalanceTransaction;
use Illuminate\Database\Eloquent\Collection;

class UserService implements UserServiceInterface
{
    public function getUserById(int $id): User
    {
        return User::findOrFail($id);
    }

    public function getUserBalanceHistory(int $userId): Collection
    {
        return UserBalanceTransaction::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getUserBalance(int $userId): int
    {
        return UserBalance::getTotalBalanceForUser($userId);
    }
}