<?php

namespace App\Actions\Supplier;

use App\Models\Supplier;
use App\Models\SupplierTransaction;
use App\Models\User;
use App\Services\SupplierBalanceService;
use Illuminate\Support\Facades\DB;

class RecordSupplierLedgerAction
{
    public function __construct(
        private readonly SupplierBalanceService $balances,
    ) {}

    /**
     * @param  array{type: string, amount_sen: int, note?: ?string}  $data
     */
    public function execute(User $user, int $supplierId, array $data): SupplierTransaction
    {
        $shop = $user->shops()->firstOrFail();
        /** @var Supplier $supplier */
        $supplier = Supplier::query()
            ->where('shop_id', $shop->id)
            ->whereKey($supplierId)
            ->firstOrFail();

        return DB::transaction(function () use ($shop, $supplier, $data) {
            $tx = SupplierTransaction::query()->create([
                'shop_id' => $shop->id,
                'supplier_id' => $supplier->id,
                'amount_sen' => $data['amount_sen'],
                'type' => $data['type'],
                'note' => isset($data['note']) ? (trim((string) $data['note']) ?: null) : null,
            ]);
            $this->balances->syncCachedBalance($supplier->fresh());

            return $tx->fresh();
        });
    }
}
