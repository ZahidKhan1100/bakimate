<?php

namespace App\Actions\Supplier;

use App\Models\Supplier;

class DeleteSupplierAction
{
    public function execute(Supplier $supplier): void
    {
        if ((int) $supplier->balance_sen !== 0) {
            throw new \RuntimeException('Settle supplier balance before removing them.');
        }
        $supplier->delete();
    }
}
