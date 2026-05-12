<?php

namespace App\Http\Controllers\Api;

use App\Actions\Transaction\RecordPaymentOrCreditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransactionRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;

class TransactionController extends Controller
{
    public function store(StoreTransactionRequest $request, RecordPaymentOrCreditAction $action): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shops()->value('id');
        $customerId = (int) $request->validated('customer_id');

        Customer::query()
            ->where('shop_id', $shopId)
            ->whereKey($customerId)
            ->firstOrFail();

        $validated = $request->validated();

        $transaction = $action->execute($user, $customerId, [
            'type' => $validated['type'],
            'amount_sen' => (int) $validated['amount_sen'],
            'note' => $validated['note'] ?? null,
            'next_due_at' => $validated['next_due_at'] ?? null,
            'item_key' => $validated['item_key'] ?? null,
            'goal_amount_sen' => $validated['goal_amount_sen'] ?? null,
            'goal_target_date' => $validated['goal_target_date'] ?? null,
        ]);

        /** @var Customer $customerFresh */
        $customerFresh = Customer::query()
            ->where('shop_id', $shopId)
            ->whereKey($customerId)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'transaction' => $transaction,
            'customer' => $customerFresh,
        ], 201);
    }
}
