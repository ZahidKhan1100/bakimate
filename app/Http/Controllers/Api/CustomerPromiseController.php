<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerPromiseRequest;
use App\Http\Requests\UpdateCustomerPromiseRequest;
use App\Models\Customer;
use App\Models\CustomerPromise;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerPromiseController extends Controller
{
    public function store(
        StoreCustomerPromiseRequest $request,
        Request $http,
        int $customerId,
    ): JsonResponse {
        $shop = $http->user()?->shops()->firstOrFail();
        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        $d = $request->validated();
        $promise = CustomerPromise::query()->create([
            'shop_id' => $shop->id,
            'customer_id' => $customer->id,
            'amount_sen' => (int) $d['amount_sen'],
            'promised_date' => $d['promised_date'],
            'note' => $d['note'] ?? null,
            'status' => CustomerPromise::STATUS_PENDING,
        ]);

        return response()->json(self::serialize($promise->fresh()), 201);
    }

    public function update(
        UpdateCustomerPromiseRequest $request,
        Request $http,
        int $customerId,
        int $promiseId,
    ): JsonResponse {
        $shop = $http->user()?->shops()->firstOrFail();

        Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        $promise = CustomerPromise::query()
            ->where('shop_id', $shop->id)
            ->where('customer_id', $customerId)
            ->whereKey($promiseId)
            ->firstOrFail();

        $before = $promise->status;

        $v = $request->validated();

        $status = $v['status'];
        $patch = ['status' => $status];

        if (array_key_exists('note', $v)) {
            $patch['note'] = $v['note'];
        }

        if (in_array($status, [
            CustomerPromise::STATUS_KEPT,
            CustomerPromise::STATUS_MISSED,
            CustomerPromise::STATUS_CANCELLED,
        ], true)) {
            $patch['resolved_at'] = CarbonImmutable::now();
        }

        if ($status === CustomerPromise::STATUS_PENDING) {
            $patch['resolved_at'] = null;
        }

        $promise->update($patch);

        if ($before === CustomerPromise::STATUS_PENDING && $status === CustomerPromise::STATUS_KEPT) {
            /** @var Customer $owner */
            $owner = Customer::query()->whereKey($customerId)->firstOrFail();

            $owner->increment('reliability_stars');
        }

        return response()->json(self::serialize($promise->fresh()));
    }

    /**
     * @return array<string, mixed>
     */
    public static function serialize(CustomerPromise $promise): array
    {
        return [
            'id' => $promise->id,
            'customer_id' => $promise->customer_id,
            'amount_sen' => (int) $promise->amount_sen,
            'promised_date' => $promise->promised_date?->toDateString(),
            'status' => $promise->status,
            'note' => $promise->note,
            'resolved_at' => $promise->resolved_at !== null
                ? $promise->resolved_at->toIso8601String()
                : null,
            'updated_at' => $promise->updated_at?->toIso8601String(),
        ];
    }
}
