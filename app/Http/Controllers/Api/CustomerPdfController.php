<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CustomerPdfController extends Controller
{
    private function currencyCodeFromShop(\App\Models\Shop $shop): string
    {
        $c = strtoupper((string) ($shop->primary_currency_code ?? 'MYR'));

        return $c !== '' ? $c : 'MYR';
    }

    /** Strip control chars and cap length so DomPDF does not choke on odd UTF-8. */
    private function plainText(?string $note, int $max = 800): string
    {
        if ($note === null || $note === '') {
            return '';
        }
        $s = html_entity_decode($note, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';

        return Str::limit($s, $max);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function outputPdf(string $view, array $data, string $filename): Response
    {
        try {
            @ini_set('memory_limit', '256M');

            $pdf = Pdf::loadView($view, $data)->setPaper('a4', 'portrait');

            return response($pdf->output(), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]);
        } catch (\Throwable $e) {
            Log::error('PDF generation failed', [
                'view' => $view,
                'message' => $e->getMessage(),
            ]);

            abort(500, 'Unable to generate PDF. Please try again.');
        }
    }

    public function ledger(Request $request, int $customerId): Response
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $currency = $this->currencyCodeFromShop($shop);

        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        $rows = Transaction::query()
            ->where('customer_id', $customer->id)
            ->orderBy('created_at')
            ->get(['created_at', 'type', 'amount_sen', 'note']);

        $tz = (string) config('app.timezone', 'UTC');

        return $this->outputPdf('pdf.customer-ledger', [
            'shopName' => $shop->name,
            'currencyCode' => $currency,
            'customer' => $customer,
            'rows' => $rows,
            'generatedAt' => now()->timezone($tz)->format('Y-m-d H:i'),
        ], 'bakimate-ledger-'.$customer->id.'.pdf');
    }

    public function settlement(Request $request, int $customerId): Response
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $currency = $this->currencyCodeFromShop($shop);

        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        if ((int) $customer->balance_sen !== 0) {
            abort(422, 'Settlement certificate is available only when outstanding balance is zero.');
        }

        return $this->outputPdf('pdf.settlement-certificate', [
            'shopName' => $shop->name,
            'currencyCode' => $currency,
            'shopLocation' => $shop->location,
            'customer' => $customer,
            'generatedAt' => now()->timezone((string) config('app.timezone', 'UTC'))->format('Y-m-d H:i'),
        ], 'bakimate-settlement-'.$customer->id.'.pdf');
    }

    public function creditInvoice(Request $request, int $customerId, int $transactionId): Response
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $currency = $this->currencyCodeFromShop($shop);

        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        $transaction = Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('customer_id', $customer->id)
            ->whereKey($transactionId)
            ->firstOrFail();

        if ($transaction->type !== Transaction::TYPE_CREDIT) {
            abort(422, 'Only credit transactions can generate this invoice.');
        }

        $customer->refresh();

        $amountSen = (int) $transaction->amount_sen;
        $balanceSen = (int) $customer->balance_sen;
        $itemLabel = $transaction->item_key !== null && trim((string) $transaction->item_key) !== ''
            ? $this->plainText((string) $transaction->item_key, 120)
            : '';

        $invoiceNo = sprintf('C%d-T%d', $customer->id, $transaction->id);

        return $this->outputPdf('pdf.credit-invoice', [
            'shopName' => $shop->name,
            'shopLocation' => $this->plainText($shop->location, 300),
            'shopContact' => $this->plainText($shop->contact, 120),
            'paymentInstructions' => $this->plainText($shop->payment_instructions, 500),
            'currencyCode' => $currency,
            'customer' => $customer,
            'amountFormatted' => $currency.' '.number_format($amountSen / 100, 2),
            'balanceAfterFormatted' => $currency.' '.number_format($balanceSen / 100, 2),
            'itemLabel' => $itemLabel,
            'note' => $this->plainText($transaction->note),
            'invoiceNo' => $invoiceNo,
            'issuedAt' => now()->timezone((string) config('app.timezone', 'UTC'))->format('Y-m-d H:i'),
        ], 'bakimate-credit-'.$customer->id.'-'.$transaction->id.'.pdf');
    }

    public function paymentReceipt(Request $request, int $customerId, int $transactionId): Response
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $currency = $this->currencyCodeFromShop($shop);

        $customer = Customer::query()
            ->where('shop_id', $shop->id)
            ->whereKey($customerId)
            ->firstOrFail();

        $transaction = Transaction::query()
            ->where('shop_id', $shop->id)
            ->where('customer_id', $customer->id)
            ->whereKey($transactionId)
            ->firstOrFail();

        if ($transaction->type !== Transaction::TYPE_PAYMENT) {
            abort(422, 'Only payment transactions can generate this receipt.');
        }

        $customer->refresh();

        $amountSen = (int) $transaction->amount_sen;
        $balanceSen = (int) $customer->balance_sen;

        $receiptNo = sprintf('P%d-T%d', $customer->id, $transaction->id);

        return $this->outputPdf('pdf.payment-receipt', [
            'shopName' => $shop->name,
            'shopLocation' => $this->plainText($shop->location, 300),
            'shopContact' => $this->plainText($shop->contact, 120),
            'paymentInstructions' => $this->plainText($shop->payment_instructions, 500),
            'currencyCode' => $currency,
            'customer' => $customer,
            'amountFormatted' => $currency.' '.number_format($amountSen / 100, 2),
            'balanceAfterFormatted' => $currency.' '.number_format($balanceSen / 100, 2),
            'note' => $this->plainText($transaction->note),
            'receiptNo' => $receiptNo,
            'issuedAt' => now()->timezone((string) config('app.timezone', 'UTC'))->format('Y-m-d H:i'),
        ], 'bakimate-payment-'.$customer->id.'-'.$transaction->id.'.pdf');
    }
}
