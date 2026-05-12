<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierTransaction extends Model
{
    public const TYPE_PURCHASE = 'purchase';

    /** Shop paid supplier (reduces what we owe). */
    public const TYPE_PAYMENT_OUT = 'payment_out';

    /** @var list<string> */
    public const TYPES = [self::TYPE_PURCHASE, self::TYPE_PAYMENT_OUT];

    protected $fillable = [
        'shop_id',
        'supplier_id',
        'amount_sen',
        'type',
        'note',
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

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
