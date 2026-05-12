<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Balance snapshot</title>
    <style>
        :root {
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
        }
        body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
        }
        main {
            width: min(620px, 100%);
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(148,163,184,0.25);
            border-radius: 16px;
            padding: 22px 20px;
        }
        h1 { font-size: 1.05rem; font-weight: 700; margin: 0 0 12px 0; }
        .muted { opacity: .78; font-size: .93rem; line-height: 1.35; margin: 4px 0 16px 0; }
        .badge { font-size: .74rem; text-transform: uppercase; letter-spacing: .06em; font-weight: 800; color: #2ec4b6; margin-bottom: 6px; }
        .amt { font-size: 2.1rem; font-weight: 900; letter-spacing: -0.02em; color: #fff; margin-bottom: 18px; }
        hr { border: none; border-top: 1px solid rgba(148,163,184,0.2); margin: 10px 0 16px 0; }
        ul { list-style: none; padding: 0; margin: 8px 0 0 0; }
        li { padding: 10px 0; border-bottom: 1px solid rgba(148,163,184,0.12); font-size: .93rem; }
        li:last-child { border-bottom: none; }
        .txn-date { opacity: .7; font-size: .82rem; display: block; margin-bottom: 3px; }
        .foot { margin-top: 20px; font-size: .78rem; opacity: .55; line-height: 1.4; }
    </style>
</head>
<body>
<main>
    <div class="badge">Customer balance (read-only)</div>
    @if(trim($shopName) !== '')
        <div class="muted">{{ $shopName }}</div>
    @endif
    <h1>{{ $customerName }}</h1>
    <div class="muted">Outstanding balance recorded in your shop ledger. This link does not allow changes.</div>
    <div class="amt">{{ $balance_label }}</div>
    <hr>
    @if(empty($txn_rows))
        <p class="muted" style="margin:0;">No ledger movement is shown.</p>
    @else
        <div class="badge" style="color:#cbd5f5;">Recent activity</div>
        <ul>
            @foreach ($txn_rows as $row)
                <li>
                    <span class="txn-date">{{ $row['humanDate'] }}</span>
                    {{ $row['formatted'] }}
                </li>
            @endforeach
        </ul>
    @endif
    <p class="foot">Powered by BakiMate. If this link reaches the wrong hands, regenerate it from the merchant app.</p>
</main>
</body>
</html>
