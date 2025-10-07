<?php

declare(strict_types=1);

namespace App\Domain\ValueObjects;

use InvalidArgumentException;

final class Credit
{
    private int $value; // valor em unidades de crédito

    public function __construct(int $value)
    {
        if ($value < 0) {
            throw new InvalidArgumentException('Valor de crédito não pode ser negativo');
        }

        $this->value = $value;
    }

    public function getValue(): int
    {
        return $this->value;
    }

    public function equals(Credit $other): bool
    {
        return $this->value === $other->value;
    }

    public function add(Credit $other): self
    {
        return new self($this->value + $other->value);
    }

    public function subtract(Credit $other): self
    {
        if ($this->value < $other->value) {
            throw new InvalidArgumentException('Crédito insuficiente para subtrair');
        }

        return new self($this->value - $other->value);
    }

    public function __toString(): string
    {
        return sprintf('%d créditos', $this->value);
    }
}
