<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use App\Services\SmartCollectionsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        private readonly SmartCollectionsService $collections,
    ) {}

    public function summary(Request $request)
    {
        $shop = $request->user()?->shops()->firstOrFail();

        $now = CarbonImmutable::now()->timezone(config('app.timezone'));
        $weekStart = $now->startOfWeek()->startOfDay();
        $monthStart = $now->startOfMonth()->startOfDay();
        $todayStart = $now->startOfDay();

        $paymentsWeek = Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->where('created_at', '>=', $weekStart)
            ->sum('amount_sen');

        $paymentsMonth = Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->where('created_at', '>=', $monthStart)
            ->sum('amount_sen');

        $paymentsToday = Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->where('created_at', '>=', $todayStart)
            ->sum('amount_sen');

        $creditMonth = Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_CREDIT)
            ->where('created_at', '>=', $monthStart)
            ->sum('amount_sen');

        $totalOutstandingSen = Customer::query()
            ->where('shop_id', $shop->id)
            ->where('balance_sen', '>', 0)
            ->sum('balance_sen');

        $priorityCustomers = $this->collections->priorityRows($shop, $now, 5);
        $bakiscore = $this->collections->bakiScore($shop, $now);

        return response()->json([
            'total_outstanding_sen' => (int) $totalOutstandingSen,
            'today' => [
                'payments_collected_sen' => (int) $paymentsToday,
            ],
            'week' => [
                'payments_collected_sen' => (int) $paymentsWeek,
            ],
            'month' => [
                'payments_collected_sen' => (int) $paymentsMonth,
                'credit_given_sen' => (int) $creditMonth,
            ],
            'priority_customers' => $priorityCustomers,
            'bakiscore' => $bakiscore,
            'generated_at' => $now->toIso8601String(),
        ]);
    }
}
