<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Settlement — {{ $customer->name }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #0f172a; text-align: center; padding-top: 48px; }
        .box { border: 3px solid #2ec4b6; padding: 40px 32px; max-width: 480px; margin: 0 auto; border-radius: 8px; }
        h1 { font-size: 22px; margin: 0 0 8px; letter-spacing: 0.05em; }
        .accent { color: #2ec4b6; font-weight: bold; }
        .lead { font-size: 14px; margin: 24px 0; line-height: 1.6; }
        .sig { margin-top: 40px; font-size: 11px; color: #64748b; }
        .muted { color: #64748b; font-size: 11px; }
    </style>
</head>
<body>
    <div class="box">
        <h1 class="accent">FULL CLEARANCE CERTIFICATE</h1>
        <p style="margin:8px 0;">BakiMate</p>
        <p class="lead">
            This certifies that the account for <strong>{{ $customer->name }}</strong> with
            <strong>{{ $shopName }}</strong>@if(!empty($shopLocation))<br><span class="muted">{{ $shopLocation }}</span>@endif
            has an <span class="accent">outstanding balance of RM 0.00</span> as of this date.
        </p>
        <p class="lead">Thank you for your trust.</p>
        <p class="sig">Generated {{ $generatedAt }} · {{ config('app.timezone') }}</p>
    </div>
</body>
</html>
