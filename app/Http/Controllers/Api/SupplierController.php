<?php

namespace App\Http\Controllers\Api;

use App\Actions\Supplier\CreateSupplierAction;
use App\Actions\Supplier\DeleteSupplierAction;
use App\Actions\Supplier\UpdateSupplierAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Models\Supplier;
use App\Models\SupplierTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $shop = $request->user()?->shops()->firstOrFail();

        $paginator = Supplier::query()
            ->where('shop_id', $shop->id)
            ->orderByDesc('updated_at')
            ->paginate(25);

        return response()->json($paginator);
    }

    public function show(Request $request, int $supplierId): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $supplier = Supplier::query()
            ->where('shop_id', $shop->id)
            ->whereKey($supplierId)
            ->firstOrFail();

        $recent = SupplierTransaction::query()
            ->where('supplier_id', $supplier->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (SupplierTransaction $t) => [
                'id' => $t->id,
                'amount_sen' => (int) $t->amount_sen,
                'type' => $t->type,
                'note' => $t->note,
                'created_at' => $t->created_at !== null ? $t->created_at->toIso8601String() : null,
            ])
            ->values()
            ->all();

        return response()->json([
            ...$supplier->toArray(),
            'recent_transactions' => $recent,
        ]);
    }

    public function store(StoreSupplierRequest $request, CreateSupplierAction $action): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $data = $request->validated();
        $supplier = $action->execute($shop, [
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
        ]);

        return response()->json($supplier, 201);
    }

    public function update(
        UpdateSupplierRequest $request,
        UpdateSupplierAction $action,
        int $supplierId,
    ): JsonResponse {
        $shop = $request->user()?->shops()->firstOrFail();
        $supplier = Supplier::query()
            ->where('shop_id', $shop->id)
            ->whereKey($supplierId)
            ->firstOrFail();

        return response()->json($action->execute($supplier, $request->validated()));
    }

    public function destroy(Request $request, DeleteSupplierAction $action, int $supplierId): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $supplier = Supplier::query()
            ->where('shop_id', $shop->id)
            ->whereKey($supplierId)
            ->firstOrFail();

        try {
            $action->execute($supplier);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['success' => true]);
    }
}
