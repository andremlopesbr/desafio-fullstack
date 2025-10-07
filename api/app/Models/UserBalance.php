<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\UserBalanceTransaction;

class UserBalance extends Model
{
    use HasFactory;

    protected $table = 'user_balances';

    protected $fillable = [
        'user_id',
        'amount',
        'description',
    ];

    protected $casts = [
        'amount' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope para saldos de um usuário específico
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Calcular o total de saldo disponível para um usuário
     */
    public static function getTotalBalanceForUser(int $userId): int
    {
        return UserBalanceTransaction::where('user_id', $userId)->sum('amount');
    }
}
