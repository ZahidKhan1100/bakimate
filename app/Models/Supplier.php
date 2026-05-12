<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'shop_id',
        'name',
        'phone',
        'balance_sen',
    ];

    protected function casts(): array
    {
        return [
            'balance_sen' => 'integer',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function supplierTransactions(): HasMany
    {
        return $this->hasMany(SupplierTransaction::class);
    }
}
