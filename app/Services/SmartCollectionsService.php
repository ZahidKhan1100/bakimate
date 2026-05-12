<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Shop;
use App\Models\Transaction;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class SmartCollectionsService
{
    /**
     * Highest-risk debtors first (Smart Collections priority).
     *
     * @return array<int, array<string, mixed>>
     */
    public function priorityRows(Shop $shop, CarbonImmutable $now, int $limit = 5): array
    {
        $take = max(24, min(120, $limit * 20));

        $customers = Customer::query()
            ->where('shop_id', $shop->id)
            ->where('balance_sen', '>', 0)
            ->orderByDesc('balance_sen')
            ->limit($take)
            ->get();

        if ($customers->isEmpty()) {
            return [];
        }

        $ids = $customers->pluck('id')->all();

        $lastPayByCustomer = DB::table('transactions')
            ->where('shop_id', $shop->id)
            ->where('type', Transaction::TYPE_PAYMENT)
            ->whereIn('customer_id', $ids)
            ->groupBy('customer_id')
            ->selectRaw('customer_id, MAX(created_at) as last_payment_at')
            ->get()
            ->pluck('last_payment_at', 'customer_id');

        $today = $now->startOfDay();

        return $customers
            ->map(function (Customer $c) use ($now, $today, $lastPayByCustomer) {
                /** @var string|null $raw */
                $raw = $lastPayByCustomer->get($c->id);
                $lastPayCarbon = null;
                if ($raw !== null) {
                    $lastPayCarbon = CarbonImmutable::parse((string) $raw)->timezone(config('app.timezone'));
                }

                $daysSincePayment = null;
                if ($lastPayCarbon !== null) {
                    $daysSincePayment = (int) $today->diffInDays($lastPayCarbon->startOfDay());
                }

                $daysOverdue = $this->daysOverdue($c->next_due_at, $now);

                $risk = $this->riskScore((int) $c->balance_sen, $daysOverdue, $daysSincePayment);

                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'balance_sen' => (int) $c->balance_sen,
                    'next_due_at' => $c->next_due_at?->format('Y-m-d'),
                    'days_overdue' => $daysOverdue,
                    'days_since_last_payment' => $daysSincePayment,
                    'last_payment_at' => $lastPayCarbon?->toIso8601String(),
                    'risk_score' => $risk,
                ];
            })
            ->sortByDesc(fn (array $row) => $row['risk_score'])
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @return array{score: int, tier: string, label: string, avg_risk: float}
     */
    public function bakiScore(Shop $shop, CarbonImmutable $now): array
    {
        $rows = $this->priorityRows($shop, $now, 12);

        if ($rows === []) {
            return [
                'score' => 100,
                'tier' => 'strong',
                'label' => 'No open debt on the book',
                'avg_risk' => 0.0,
            ];
        }

        $avgRisk = array_sum(array_column($rows, 'risk_score')) / count($rows);
        $score = (int) max(10, min(100, round(100 - min($avgRisk * 1.15, 92))));

        if ($score >= 72) {
            $tier = 'strong';
            $label = 'Collections look healthy';
        } elseif ($score >= 44) {
            $tier = 'watch';
            $label = 'Some accounts need attention';
        } else {
            $tier = 'at_risk';
            $label = 'Chase collections — several slow payers';
        }

        return [
            'score' => $score,
            'tier' => $tier,
            'label' => $label,
            'avg_risk' => round($avgRisk, 2),
        ];
    }

    private function riskScore(int $balanceSen, ?int $daysOverdue, ?int $daysSincePayment): int
    {
        $overduePart = ($daysOverdue ?? 0) * 10;
        $stallPart = (int) round(($daysSincePayment ?? 45) * 1.4);
        $sizePart = (int) min(22, $balanceSen / 180_000);

        return (int) min(100, $overduePart + $stallPart + $sizePart);
    }

    private function daysOverdue(mixed $due, CarbonImmutable $now): ?int
    {
        if ($due === null) {
            return null;
        }
        $dueDay = CarbonImmutable::parse((string) $due)->startOfDay();
        $today = $now->startOfDay();
        if ($dueDay->greaterThanOrEqualTo($today)) {
            return null;
        }

        return (int) $dueDay->diffInDays($today);
    }
}
