<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Ledger — {{ $customer->name }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #0f172a; }
        h1 { font-size: 18px; margin: 0 0 6px; }
        h2 { font-size: 13px; margin: 16px 0 8px; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
        .muted { color: #64748b; font-size: 10px; }
        .num { text-align: right; }
        .credit { color: #b91c1c; }
        .payment { color: #15803d; }
    </style>
</head>
<body>
    <h1>BakiMate — Customer ledger</h1>
    <p class="muted">Shop: {{ $shopName }} · Generated {{ $generatedAt }}</p>
    <h2>{{ $customer->name }}</h2>
    <p>Phone: {{ $customer->phone ?? '—' }} · Current balance: RM {{ number_format($customer->balance_sen / 100, 2) }}</p>

    <table>
        <thead>
        <tr>
            <th>Date</th>
            <th>Type</th>
            <th class="num">Amount (RM)</th>
            <th>Note</th>
        </tr>
        </thead>
        <tbody>
        @forelse($rows as $r)
            <tr>
                <td>{{ \Illuminate\Support\Carbon::parse($r->created_at)->timezone(config('app.timezone'))->format('Y-m-d H:i') }}</td>
                <td class="{{ $r->type === 'credit' ? 'credit' : 'payment' }}">{{ strtoupper($r->type) }}</td>
                <td class="num">{{ number_format($r->amount_sen / 100, 2) }}</td>
                <td>{{ $r->note ?? '—' }}</td>
            </tr>
        @empty
            <tr><td colspan="4">No transactions recorded.</td></tr>
        @endforelse
        </tbody>
    </table>
</body>
</html>
