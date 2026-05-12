<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CustomerPdfController extends Controller
{
    public function ledger(Request $request, int $customerId): Response
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        $rows = Transaction::query()
            ->where('customer_id', $customer->id)
            ->orderBy('created_at')
            ->get(['created_at', 'type', 'amount_sen', 'note']);

        $pdf = Pdf::loadView('pdf.customer-ledger', [
            'shopName' => $shop->name,
            'customer' => $customer,
            'rows' => $rows,
            'generatedAt' => now()->timezone(config('app.timezone'))->format('Y-m-d H:i'),
        ])->setPaper('a4', 'portrait');

        $filename = 'bakimate-ledger-'.$customer->id.'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function settlement(Request $request, int $customerId): Response
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        if ((int) $customer->balance_sen !== 0) {
            abort(422, 'Settlement certificate is available only when outstanding balance is zero.');
        }

        $pdf = Pdf::loadView('pdf.settlement-certificate', [
            'shopName' => $shop->name,
            'shopLocation' => $shop->location,
            'customer' => $customer,
            'generatedAt' => now()->timezone(config('app.timezone'))->format('Y-m-d H:i'),
        ])->setPaper('a4', 'portrait');

        $filename = 'bakimate-settlement-'.$customer->id.'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
