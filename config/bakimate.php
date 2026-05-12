<?php

$demoExplicit = env('DEMO_LOGIN_ENABLED');

return [
    /**
     * When true, POST /api/auth/demo issues a Sanctum token for the seeded demo user.
     *
     * If DEMO_LOGIN_ENABLED is omitted from .env, it defaults to enabled only when APP_ENV is local,
     * so artisan serve works without extra config. Set DEMO_LOGIN_ENABLED=false to turn it off locally,
     * or DEMO_LOGIN_ENABLED=true to allow it on other environments (not recommended).
     */
    'demo_login_enabled' => $demoExplicit !== null && $demoExplicit !== ''
        ? filter_var($demoExplicit, FILTER_VALIDATE_BOOLEAN)
        : env('APP_ENV', 'production') === 'local',
];
