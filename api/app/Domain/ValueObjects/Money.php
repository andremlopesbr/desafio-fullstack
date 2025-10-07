<?php

declare(strict_types=1);

namespace App\Domain\ValueObjects;

use InvalidArgumentException;

final class Money
{
    private int $amount; // valor em centavos
    private string $currency;

    public function __construct(int $amount, string $currency = 'BRL')
    {
        if ($amount < 0) {
            throw new InvalidArgumentException('Valor não pode ser negativo');
        }

        if (!in_array($currency, ['BRL'], true)) {
            throw new InvalidArgumentException('Moeda suportada: BRL');
        }

        $this->amount = $amount;
        $this->currency = $currency;
    }

    public function getAmount(): int
    {
        return $this->amount;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getValueInReais(): float
    {
        return $this->amount / 100;
    }

    public function equals(Money $other): bool
    {
        return $this->amount === $other->amount && $this->currency === $other->currency;
    }

    public function add(Money $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException('Moedas devem ser iguais para somar');
        }

        return new self($this->amount + $other->amount, $this->currency);
    }

    public function subtract(Money $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException('Moedas devem ser iguais para subtrair');
        }

        if ($this->amount < $other->amount) {
            throw new InvalidArgumentException('Valor insuficiente para subtrair');
        }

        return new self($this->amount - $other->amount, $this->currency);
    }

    public function __toString(): string
    {
        return sprintf('%.2f %s', $this->getValueInReais(), $this->currency);
    }
}
