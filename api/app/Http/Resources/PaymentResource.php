<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray($request): array
    {
        $data = [
            'id' => $this->id,
            'contract_id' => $this->contract_id,
            'amount' => $this->amount,
            'payment_date' => $this->payment_date?->format('Y-m-d'),
            'status' => $this->status,
            'discount_applied' => $this->discount_applied,
            'prorated_old' => $this->prorated_old,
            'prorated_new' => $this->prorated_new,
            'applied_credits' => $this->applied_credits,
            'credits_generated' => $this->credits_generated,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            'contract' => $this->whenLoaded('contract'),
        ];

        // Remove campos nulos para limpar a resposta JSON
        return array_filter($data, function($value) {
            return $value !== null;
        });
    }
}
