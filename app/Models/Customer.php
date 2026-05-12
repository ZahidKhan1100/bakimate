<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'shop_id',
        'name',
        'phone',
        'balance_sen',
        'next_due_at',
        'goal_amount_sen',
        'goal_target_date',
        'reliability_stars',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'balance_public_token',
    ];

    protected function casts(): array
    {
        return [
            'balance_sen' => 'integer',
            'next_due_at' => 'date',
            'goal_amount_sen' => 'integer',
            'goal_target_date' => 'date',
            'reliability_stars' => 'integer',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function promises(): HasMany
    {
        return $this->hasMany(CustomerPromise::class);
    }
}
