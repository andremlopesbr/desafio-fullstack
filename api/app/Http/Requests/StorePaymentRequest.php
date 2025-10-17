<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contract_id' => 'required|integer|exists:contracts,id',
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'status' => 'nullable|string',
            'discount_applied' => 'nullable|numeric|min:0',
            'prorated_old' => 'nullable|numeric|min:0',
            'prorated_new' => 'nullable|numeric|min:0',
            'applied_credits' => 'nullable|numeric|min:0',
        ];
    }
}
