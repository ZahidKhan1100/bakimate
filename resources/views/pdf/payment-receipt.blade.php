<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment receipt — {{ $customer->name }}</title>
    <style>
        @page { margin: 18mm; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #0f172a;
            margin: 0;
        }
        .header { border-bottom: 2px solid #15803d; padding-bottom: 12px; margin-bottom: 16px; }
        h1 { font-size: 20px; margin: 0 0 4px; color: #15803d; }
        .meta { font-size: 10px; color: #64748b; }
        .grid { width: 100%; margin-top: 14px; }
        .grid td { vertical-align: top; width: 50%; padding: 0 8px 0 0; }
        .box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; background: #f8fafc; }
        .box h2 { font-size: 11px; margin: 0 0 6px; color: #334155; text-transform: uppercase; }
        table.lines { width: 100%; border-collapse: collapse; margin-top: 18px; }
        table.lines th, table.lines td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
        table.lines th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
        .num { text-align: right; font-weight: bold; }
        .total-row td { border-top: 2px solid #15803d; font-size: 13px; }
        .footer { margin-top: 28px; font-size: 10px; color: #64748b; }
        .sign { margin-top: 36px; }
        .sign-line { border-top: 1px solid #94a3b8; width: 220px; margin-top: 40px; padding-top: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PAYMENT RECEIPT</h1>
        <p class="meta">BakiMate · {{ $shopName }} · Issued {{ $issuedAt }}</p>
        <p class="meta">Receipt #{{ $receiptNo }} · {{ $currencyCode }}</p>
    </div>

    <table class="grid">
        <tr>
            <td>
                <div class="box">
                    <h2>Shop</h2>
                    <strong>{{ $shopName }}</strong><br>
                    @if($shopLocation)
                        {{ $shopLocation }}<br>
                    @endif
                    @if($shopContact)
                        {{ $shopContact }}<br>
                    @endif
                    @if($paymentInstructions)
                        <span style="font-size:9px;">{{ $paymentInstructions }}</span>
                    @endif
                </div>
            </td>
            <td>
                <div class="box">
                    <h2>Customer</h2>
                    <strong>{{ $customer->name }}</strong><br>
                    @if($customer->phone)
                        {{ $customer->phone }}<br>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <table class="lines">
        <thead>
        <tr>
            <th>Description</th>
            <th class="num">Amount ({{ $currencyCode }})</th>
        </tr>
        </thead>
        <tbody>
        <tr>
            <td>
                Payment received (against udhaar / balance)
                @if($note)
                    <br><span style="color:#64748b;font-size:10px;">Note: {{ $note }}</span>
                @endif
            </td>
            <td class="num">{{ $amountFormatted }}</td>
        </tr>
        <tr class="total-row">
            <td><strong>Outstanding balance after this payment</strong></td>
            <td class="num">{{ $balanceAfterFormatted }}</td>
        </tr>
        </tbody>
    </table>

    <div class="footer">
        This document is generated for your records. Amounts are in {{ $currencyCode }}; minor units were converted for display.
    </div>

    <div class="sign">
        <div class="sign-line">Authorized signature / shop stamp</div>
    </div>
</body>
</html>
