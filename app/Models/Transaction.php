<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    public const TYPE_PAYMENT = 'payment';

    public const TYPE_CREDIT = 'credit';

    protected $fillable = [
        'shop_id',
        'customer_id',
        'amount_sen',
        'type',
        'note',
        'item_key',
    ];

    protected function casts(): array
    {
        return [
            'amount_sen' => 'integer',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
