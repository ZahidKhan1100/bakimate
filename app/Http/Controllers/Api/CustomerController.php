<?php

namespace App\Http\Controllers\Api;

use App\Actions\Customer\CreateCustomerAction;
use App\Actions\Customer\DeleteCustomerAction;
use App\Actions\Customer\UpdateCustomerAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\CustomerPromise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $shop = $request->user()?->shops()->firstOrFail();

        $paginator = Customer::query()
            ->where('shop_id', $shop->id)
            ->orderByDesc('updated_at')
            ->paginate(25);

        return response()->json($paginator);
    }

    public function show(Request $request, int $customerId): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        return response()->json(array_merge($customer->toArray(), [
            'promises' => $customer->promises()
                ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
                ->orderByDesc('promised_date')
                ->limit(30)
                ->get()
                ->map(fn (CustomerPromise $p) => CustomerPromiseController::serialize($p))
                ->values()
                ->all(),
        ]));
    }

    public function store(StoreCustomerRequest $request, CreateCustomerAction $action): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $data = $request->validated();
        $customer = $action->execute($shop, [
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
        ]);

        return response()->json($customer, 201);
    }

    public function update(
        UpdateCustomerRequest $request,
        UpdateCustomerAction $action,
        int $customerId,
    ): JsonResponse {
        $shop = $request->user()?->shops()->firstOrFail();
        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        $customer = $action->execute($customer, $request->validated());

        return response()->json($customer);
    }

    public function destroy(Request $request, DeleteCustomerAction $action, int $customerId): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        $action->execute($customer);

        return response()->json(['success' => true]);
    }

    public function rotatePublicBalanceLink(Request $request, int $customerId): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        do {
            $token = Str::random(48);
        } while (Customer::query()->where('balance_public_token', $token)->exists());

        $customer->balance_public_token = $token;
        $customer->save();

        $base = rtrim((string) config('app.url'), '/');

        return response()->json([
            'url' => $base.'/v/'.$token,
            'path' => '/v/'.$token,
        ]);
    }
}
