<?php

namespace App\Actions\Supplier;

use App\Models\Supplier;

class UpdateSupplierAction
{
    /** @param  array{name?: string, phone?: ?string}  $data */
    public function execute(Supplier $supplier, array $data): Supplier
    {
        if (array_key_exists('name', $data)) {
            $supplier->name = trim((string) $data['name']);
        }
        if (array_key_exists('phone', $data)) {
            $p = $data['phone'];
            $supplier->phone = ($p !== null && trim((string) $p) !== '') ? trim((string) $p) : null;
        }
        $supplier->save();

        return $supplier->freshOrFail();
    }
}
