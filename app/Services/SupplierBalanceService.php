<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\SupplierTransaction;

class SupplierBalanceService
{
    /** Recalculate cached balance sen (positive = shop owes supplier). */
    public function recalculateSupplierBalance(Supplier $supplier): int
    {
        $rows = SupplierTransaction::query()
            ->where('supplier_id', $supplier->id)
            ->get(['type', 'amount_sen']);

        return $this->balanceFromRows($rows);
    }

    /** @param  iterable<int, object{type: string, amount_sen: int}>  $rows */
    public function balanceFromRows(iterable $rows): int
    {
        $balance = 0;
        foreach ($rows as $row) {
            $balance += $this->deltaForRow((string) $row->type, (int) $row->amount_sen);
        }

        return $balance;
    }

    public function deltaForRow(string $type, int $amountSen): int
    {
        if ($amountSen < 0) {
            throw new \InvalidArgumentException('amount_sen must be non-negative.');
        }

        return match ($type) {
            SupplierTransaction::TYPE_PURCHASE => $amountSen,
            SupplierTransaction::TYPE_PAYMENT_OUT => -$amountSen,
            default => throw new \InvalidArgumentException('Unknown supplier transaction type: '.$type),
        };
    }

    public function syncCachedBalance(Supplier $supplier): void
    {
        $supplier->balance_sen = $this->recalculateSupplierBalance($supplier);
        $supplier->save();
    }
}
