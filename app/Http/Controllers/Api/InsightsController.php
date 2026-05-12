<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InsightsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $tzName = $this->resolveInsightsTimezone($request);
        $now = CarbonImmutable::now($tzName);
        $weekStart = $now->startOfWeek()->startOfDay();

        $topDebtors = Customer::query()
            ->where('shop_id', $shop->id)
            ->where('balance_sen', '>', 0)
            ->orderByDesc('balance_sen')
            ->limit(5)
            ->get(['id', 'name', 'phone', 'balance_sen'])
            ->map(fn (Customer $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'balance_sen' => (int) $c->balance_sen,
            ]);

        $weekCashflow = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->addDays($i);
            $dayStart = $day->startOfDay();
            $dayEnd = $day->endOfDay();
            $payments = (int) Transaction::query()
                ->where('shop_id', $shop->id)
                ->where('type', Transaction::TYPE_PAYMENT)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->sum('amount_sen');
            $credit = (int) Transaction::query()
                ->where('shop_id', $shop->id)
                ->where('type', Transaction::TYPE_CREDIT)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->sum('amount_sen');
            $weekCashflow[] = [
                'date' => $day->toDateString(),
                'label' => $day->format('D'),
                'payments_collected_sen' => $payments,
                'credit_given_sen' => $credit,
            ];
        }

        $windowStart = $now->subDays(28)->startOfDay();
        $windowPayments = (int) Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->where('created_at', '>=', $windowStart)
            ->sum('amount_sen');
        $expectedNextWeekSen = (int) round($windowPayments / 4);

        $cutoff = $now->subDays(7)->toDateTimeString();
        $recentPaidIds = DB::table('transactions')
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->groupBy('customer_id')
            ->havingRaw('MAX(created_at) >= ?', [$cutoff])
            ->pluck('customer_id');

        $weeklyNudges = Customer::query()
            ->where('shop_id', $shop->id)
            ->where('balance_sen', '>', 0)
            ->whereNotIn('id', $recentPaidIds->all())
            ->orderByDesc('balance_sen')
            ->limit(25)
            ->get(['id', 'name', 'phone', 'balance_sen'])
            ->map(function (Customer $c) use ($now, $tzName) {
                $last = Transaction::query()
                    ->where('customer_id', $c->id)
                    ->where('type', Transaction::TYPE_PAYMENT)
                    ->max('created_at');

                $daysSince = null;
                if ($last !== null) {
                    $daysSince = (int) CarbonImmutable::parse((string) $last)
                        ->timezone($tzName)
                        ->startOfDay()
                        ->diffInDays($now->startOfDay());
                }

                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'balance_sen' => (int) $c->balance_sen,
                    'last_payment_at' => $last !== null
                        ? CarbonImmutable::parse((string) $last)->timezone($tzName)->toIso8601String()
                        : null,
                    'days_since_payment' => $daysSince,
                ];
            });

        $monthStart = $now->startOfMonth()->startOfDay();
        $monthEnd = $now->endOfMonth()->endOfDay();
        $creditRows = Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_CREDIT)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->get(['amount_sen', 'item_key']);
        $byItem = [];
        foreach ($creditRows as $t) {
            $k = $t->item_key !== null && trim((string) $t->item_key) !== ''
                ? trim((string) $t->item_key)
                : 'Other';
            $byItem[$k] = ($byItem[$k] ?? 0) + (int) $t->amount_sen;
        }
        arsort($byItem);
        $creditByCategory = [];
        foreach ($byItem as $label => $sen) {
            $creditByCategory[] = ['item_key' => $label, 'credit_given_sen' => (int) $sen];
        }

        /** Proportional split: each debtor’s outstanding is allocated across item_keys by lifetime credit shares. */
        $estimatedUdhaarByItem = [];
        $customersOwing = Customer::query()
            ->where('shop_id', $shop->id)
            ->where('balance_sen', '>', 0)
            ->get(['id', 'balance_sen']);

        foreach ($customersOwing as $owe) {
            $creditTotals = Transaction::query()
                ->where('shop_id', $shop->id)
                ->where('customer_id', $owe->id)
                ->where('type', Transaction::TYPE_CREDIT)
                ->get(['amount_sen', 'item_key']);
            $lifetimeByKey = [];
            foreach ($creditTotals as $ct) {
                $ik = $ct->item_key !== null && trim((string) $ct->item_key) !== ''
                    ? trim((string) $ct->item_key)
                    : 'Other';
                $lifetimeByKey[$ik] = ($lifetimeByKey[$ik] ?? 0) + (int) $ct->amount_sen;
            }
            $lifeTotal = array_sum($lifetimeByKey);
            if ($lifeTotal <= 0) {
                continue;
            }
            $balance = (int) $owe->balance_sen;
            foreach ($lifetimeByKey as $label => $part) {
                $estimatedUdhaarByItem[$label] = ($estimatedUdhaarByItem[$label] ?? 0)
                    + (int) round($balance * ($part / $lifeTotal));
            }
        }

        $creditItemPulse = [];
        $pulseKeys = array_unique(array_merge(array_keys($byItem), array_keys($estimatedUdhaarByItem)));
        foreach ($pulseKeys as $pk) {
            $creditItemPulse[] = [
                'item_key' => $pk,
                'credit_given_month_sen' => (int) ($byItem[$pk] ?? 0),
                'estimated_udhaar_outstanding_sen' => (int) ($estimatedUdhaarByItem[$pk] ?? 0),
            ];
        }

        usort(
            $creditItemPulse,
            static fn (array $a, array $b): int => $b['credit_given_month_sen'] <=> $a['credit_given_month_sen'],
        );

        /** Cash collected this month globally (payments), for context beside credit mix. */
        $monthPayments = (int) Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->sum('amount_sen');

        $staleCutoff = $now->copy()->subDays(30)->endOfDay();
        $deadMoneySen = (int) Customer::query()
            ->where('shop_id', $shop->id)
            ->where('balance_sen', '>', 0)
            ->whereIn('id', function ($q) use ($shop, $staleCutoff) {
                $q->select('customer_id')
                    ->from('transactions')
                    ->where('shop_id', $shop->id)
                    ->groupBy('customer_id')
                    ->havingRaw('MAX(created_at) < ?', [$staleCutoff->format('Y-m-d H:i:s')]);
            })
            ->sum('balance_sen');

        $thisWeekCollected = (int) Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->whereBetween('created_at', [$weekStart, $now])
            ->sum('amount_sen');

        $lastWeekStart = $weekStart->subWeek();
        $lastWeekEnd = $weekStart->subSecond();
        $lastWeekCollected = (int) Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->whereBetween('created_at', [$lastWeekStart, $lastWeekEnd])
            ->sum('amount_sen');

        $collectionVelocityPct = null;
        if ($lastWeekCollected > 0) {
            $collectionVelocityPct = round(
                (($thisWeekCollected - $lastWeekCollected) / $lastWeekCollected) * 100,
                1,
            );
        }

        $loyalRows = Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->selectRaw('customer_id, COUNT(*) as installment_count, SUM(amount_sen) as total_payment_sen')
            ->groupBy('customer_id')
            ->orderByDesc('installment_count')
            ->limit(5)
            ->get();

        $loyalCustomerIds = $loyalRows->pluck('customer_id')->unique()->filter()->values()->all();
        $loyalNames = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereIn('id', $loyalCustomerIds)
            ->pluck('name', 'id');

        $topLoyalists = [];
        foreach ($loyalRows as $row) {
            $cid = (int) $row->customer_id;
            $topLoyalists[] = [
                'customer_id' => $cid,
                'name' => (string) ($loyalNames[$cid] ?? 'Customer '.$cid),
                'installment_count' => (int) $row->installment_count,
                'total_payment_sen' => (int) $row->total_payment_sen,
            ];
        }

        return response()->json([
            'top_debtors' => $topDebtors,
            'week_cashflow' => $weekCashflow,
            'projection' => [
                'next_week_expected_collect_sen' => $expectedNextWeekSen,
                'basis' => 'avg_payment_last_28d_div_4',
            ],
            'weekly_nudges' => $weeklyNudges,
            'credit_by_category' => $creditByCategory,
            /** @see credit_item_pulse for richer udhaar / quick-item diagnostics */
            'credit_item_pulse' => $creditItemPulse,
            'credit_item_pulse_method' => 'proportional_udhaar_by_lifetime_credit_tag',
            'month_payments_collected_sen' => $monthPayments,
            'business_pulse' => [
                'dead_money_sen' => $deadMoneySen,
                'dead_money_days_stale' => 30,
                'this_week_payments_collected_sen' => $thisWeekCollected,
                'last_week_payments_collected_sen' => $lastWeekCollected,
                'collection_velocity_pct' => $collectionVelocityPct,
                'top_loyalists' => $topLoyalists,
            ],
            'generated_at' => $now->toIso8601String(),
        ]);
    }

    private function resolveInsightsTimezone(Request $request): string
    {
        $raw = $request->query('timezone');
        if (! is_string($raw) || trim($raw) === '') {
            return (string) config('app.timezone');
        }

        $trim = trim($raw);
        if (strlen($trim) > 64 || preg_match('/[^A-Za-z0-9\/_\+\-]/', $trim)) {
            return (string) config('app.timezone');
        }

        try {
            new \DateTimeZone($trim);

            return $trim;
        } catch (\Throwable) {
            return (string) config('app.timezone');
        }
    }
}
