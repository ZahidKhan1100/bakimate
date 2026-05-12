<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MonthlyStatementPdfController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $shop = $request->user()?->shops()->firstOrFail();

        $month = (string) $request->query('month', '');
        $tz = config('app.timezone');
        $now = CarbonImmutable::now()->timezone($tz);

        if ($month === '') {
            $month = $now->format('Y-m');
        }

        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            abort(422, 'Invalid month. Use YYYY-MM.');
        }

        $start = CarbonImmutable::parse($month.'-01', $tz)->startOfMonth()->startOfDay();
        $end = $start->endOfMonth()->endOfDay();

        $rows = Transaction::query()
            ->where('shop_id', $shop->id)
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at')
            ->get(['created_at', 'type', 'amount_sen', 'note', 'item_key', 'customer_id']);

        $customerNames = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereIn('id', $rows->pluck('customer_id')->unique()->filter())
            ->pluck('name', 'id');

        $creditByItem = [];
        foreach ($rows as $t) {
            if ($t->type !== Transaction::TYPE_CREDIT) {
                continue;
            }
            $k = $t->item_key !== null && trim((string) $t->item_key) !== '' ? trim((string) $t->item_key) : 'Other';
            $creditByItem[$k] = ($creditByItem[$k] ?? 0) + (int) $t->amount_sen;
        }

        $payments = (int) $rows->where('type', Transaction::TYPE_PAYMENT)->sum('amount_sen');
        $credits = (int) $rows->where('type', Transaction::TYPE_CREDIT)->sum('amount_sen');

        $pdf = Pdf::loadView('pdf.monthly-statement', [
            'shopName' => $shop->name,
            'monthLabel' => $start->format('F Y'),
            'customerNames' => $customerNames,
            'paymentsTotalSen' => $payments,
            'creditsTotalSen' => $credits,
            'creditByItem' => $creditByItem,
            'generatedAt' => $now->format('Y-m-d H:i'),
        ])->setPaper('a4', 'portrait');

        $filename = 'bakimate-statement-'.$start->format('Y-m').'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
