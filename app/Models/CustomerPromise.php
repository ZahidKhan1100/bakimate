<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerPromise extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_KEPT = 'kept';

    public const STATUS_MISSED = 'missed';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'shop_id',
        'customer_id',
        'amount_sen',
        'promised_date',
        'status',
        'note',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_sen' => 'integer',
            'promised_date' => 'date',
            'resolved_at' => 'datetime',
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
