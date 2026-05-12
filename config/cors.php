<?php

/*
 * Explicit CORS configuration for BakiMate.
 *
 * The mobile app uses Bearer tokens (Sanctum personal access tokens), so we do
 * NOT need credentialed (cookie) CORS — `supports_credentials => false`.
 *
 * `allowed_origins` falls back to `*` so native devices (which send no Origin
 * header anyway) keep working. Set CORS_ALLOWED_ORIGINS in production to lock
 * down browser-based callers (e.g. the public balance view).
 */

return [
    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'webhooks/*',
        'v/*', // public-balance link rendered to a browser; needs CORS for fonts/images
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', '*'))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
