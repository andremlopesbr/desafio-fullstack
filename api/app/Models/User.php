<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    use HasFactory;
    protected $fillable = ['name', 'email'];
    protected $hidden = ['created_at', 'updated_at'];

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    public function balanceTransactions()
    {
        return $this->hasMany(UserBalanceTransaction::class);
    }
}
