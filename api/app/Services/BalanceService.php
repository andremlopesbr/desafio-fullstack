<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\BalanceServiceInterface;
use App\Models\UserBalance;
use App\Models\UserBalanceTransaction;
use Illuminate\Support\Facades\Log;

class BalanceService implements BalanceServiceInterface
{
    /**
     * Obter saldo disponível para um usuário
     */
    public function getUserBalance(int $userId): float
    {
        return UserBalance::getTotalBalanceForUser($userId);
    }

    /**
     * Aplicar saldo em um pagamento
     */
    public function applyBalanceToPayment(int $userId, float $paymentAmount): array
    {
        Log::info('💰 [BalanceService] Aplicando saldo no pagamento', [
            'user_id' => $userId,
            'payment_amount' => $paymentAmount
        ]);

        $availableBalance = $this->getUserBalance($userId);
        $appliedBalance = min($availableBalance, $paymentAmount);
        $remainingAmount = $paymentAmount - $appliedBalance;

        Log::info('💰 [BalanceService] Saldo calculado', [
            'user_id' => $userId,
            'available_balance' => $availableBalance,
            'payment_amount' => $paymentAmount,
            'applied_balance' => $appliedBalance,
            'remaining_amount' => $remainingAmount
        ]);

        // Consumir saldo utilizado
        if ($appliedBalance > 0) {
            $this->consumeBalance($userId, $appliedBalance);
        }

        return [
            'applied_balance' => $appliedBalance,
            'remaining_amount' => $remainingAmount,
            'total_balance_used' => $appliedBalance,
        ];
    }

    /**
     * Adiciona um valor ao saldo do usuário e registra a transação.
     */
    public function addBalance(int $userId, float $amount, string $description): void
    {
        Log::info("Iniciando adição de saldo", [
            'user_id' => $userId,
            'amount' => $amount,
            'description' => $description
        ]);

        if ($amount <= 0) {
            return;
        }

        // Verificar saldo antes de adicionar
        $balanceBefore = UserBalance::getTotalBalanceForUser($userId);

        UserBalance::create([
            'user_id' => $userId,
            'amount' => $amount,
            'description' => $description,
        ]);

        // Verificar saldo após adicionar
        $balanceAfter = UserBalance::getTotalBalanceForUser($userId);

        UserBalanceTransaction::create([
            'user_id' => $userId,
            'amount' => $amount,
            'type' => 'credit',
            'description' => $description,
            'metadata' => [
                'source' => 'plan_downgrade',
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter
            ],
        ]);
    }

    /**
     * Consumir saldo de um usuário (usando FIFO - primeiro criado)
     */
    public function consumeBalance(int $userId, float $amountToConsume): void
    {
        $credits = UserBalance::forUser($userId)
            ->orderBy('created_at', 'asc')
            ->get();

        $remainingToConsume = $amountToConsume;

        foreach ($credits as $credit) {
            if ($remainingToConsume <= 0) break;

            if ($credit->amount <= $remainingToConsume) {
                // Consumir crédito completo
                $consumedAmount = $credit->amount;
                $remainingToConsume -= $credit->amount;
                $credit->delete();
            } else {
                // Consumir parte do crédito
                $consumedAmount = $remainingToConsume;
                $credit->amount -= $remainingToConsume;
                $credit->save();
                $remainingToConsume = 0;
            }

            // Logar transação de débito
            UserBalanceTransaction::create([
                'user_id' => $userId,
                'amount' => $consumedAmount,
                'type' => 'debit',
                'description' => 'Crédito utilizado em pagamento',
                'metadata' => [
                    'user_balance_id' => $credit->id,
                    'consumed_amount' => $consumedAmount,
                ],
            ]);
        }
    }
}
