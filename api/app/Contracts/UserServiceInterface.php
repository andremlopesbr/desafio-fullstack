<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface UserServiceInterface
{
    public function getUserById(int $id): User;
    public function getUserBalanceHistory(int $userId): Collection;
    public function getUserBalance(int $userId): float;
}
