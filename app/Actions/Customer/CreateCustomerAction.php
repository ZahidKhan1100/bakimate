<?php

namespace App\Actions\Customer;

use App\Models\Customer;
use App\Models\Shop;

class CreateCustomerAction
{
    /**
     * @param  array{name: string, phone?: string|null}  $data
     */
    public function execute(Shop $shop, array $data): Customer
    {
        return Customer::query()->create([
            'shop_id' => $shop->id,
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'balance_sen' => 0,
        ]);
    }
}
