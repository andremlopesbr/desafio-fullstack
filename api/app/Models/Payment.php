<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id',
        'amount',
        'payment_date',
        'status',
        'discount_applied',
        'prorated_old',
        'prorated_new',
        'applied_credits',
        'credits_generated', // Campo adicional para Cenário 4 - Downgrade
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
        'discount_applied' => 'decimal:2',
        'prorated_old' => 'decimal:2',
        'prorated_new' => 'decimal:2',
        'applied_credits' => 'decimal:2',
        'credits_generated' => 'decimal:2',
    ];

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }
}
