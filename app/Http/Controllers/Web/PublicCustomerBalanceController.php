<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use Illuminate\View\View;

class PublicCustomerBalanceController extends Controller
{
    public function __invoke(string $token): View
    {
        abort_unless(strlen($token) >= 40 && ctype_alnum($token), 404);

        /** @var Customer|null $cust */
        $cust = Customer::query()
            ->where('balance_public_token', $token)
            ->with('shop')
            ->first();

        if ($cust === null) {
            return view('customer_public_balance_gone');
        }

        $codeRaw = trim((string) ($cust->shop?->primary_currency_code ?? ''));
        $currency = preg_match('/^[A-Za-z]{3}$/', $codeRaw) === 1 ? strtoupper($codeRaw) : '';

        $balanceSen = is_int($cust->balance_sen) ? $cust->balance_sen : (int) $cust->balance_sen;
        $balanceMajor = $balanceSen / 100.0;
        $balanceLabel = $currency !== ''
            ? ($currency.' '.number_format($balanceMajor, 2, '.', ','))
            : number_format($balanceMajor, 2, '.', ',');

        $transactions = Transaction::query()
            ->where('customer_id', $cust->id)
            ->orderByDesc('created_at')
            ->limit(40)
            ->get();

        /** @var list<array{humanDate: string, formatted: string}> $txnRows */
        $txnRows = [];
        foreach ($transactions as $t) {
            $major = (((int) $t->amount_sen) / 100.0);
            $lbl = $t->type === Transaction::TYPE_PAYMENT ? 'Payment' : 'Credit (udhaar)';
            $formatted = $currency !== ''
                ? ($lbl.' — '.$currency.' '.number_format($major, 2, '.', ','))
                : ($lbl.' — '.number_format($major, 2, '.', ','));
            $humanDate = '';
            if ($t->created_at !== null) {
                $humanDate = $t->created_at->timezone(config('app.timezone'))->format('M j, Y g:i A');
            }
            $txnRows[] = ['humanDate' => $humanDate, 'formatted' => $formatted];
        }

        return view('customer_public_balance', [
            'customerName' => (string) $cust->name,
            'shopName' => (string) ($cust->shop?->name ?? ''),
            'balance_label' => $balanceLabel,
            'txn_rows' => $txnRows,
        ]);
    }
}
