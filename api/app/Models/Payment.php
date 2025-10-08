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
    ];

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }
}
