<?php

namespace App\Actions\Supplier;

use App\Models\Shop;
use App\Models\Supplier;

class CreateSupplierAction
{
    /** @param  array{name: string, phone?: ?string}  $data */
    public function execute(Shop $shop, array $data): Supplier
    {
        return Supplier::query()->create([
            'shop_id' => $shop->id,
            'name' => trim($data['name']),
            'phone' => isset($data['phone']) && $data['phone'] !== '' ? trim((string) $data['phone']) : null,
            'balance_sen' => 0,
        ]);
    }
}
