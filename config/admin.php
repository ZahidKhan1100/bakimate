<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Allowed IPs for /admin (Filament)
    |--------------------------------------------------------------------------
    |
    | When non-empty, only these IPv4/IPv6 addresses may access the staff panel.
    | Useful behind a static VPN or office egress. Leave empty to allow all
    | (still require login + roles).
    |
    | Example: ['203.0.113.10', '192.168.1.0']
    |
    */
    'allowed_ips' => array_values(array_filter(array_map(
        trim(...),
        explode(',', (string) env('ADMIN_PANEL_ALLOWED_IPS', '')),
    ))),

];
