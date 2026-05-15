<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Trusted proxies (Railway, load balancers, etc.)
|--------------------------------------------------------------------------
|
| Used by Illuminate\Http\Middleware\TrustProxies. Set TRUSTED_PROXIES in
| .env / the host (e.g. * to trust forwarded headers from Railway's edge).
|
*/

return [

    'proxies' => filled(env('TRUSTED_PROXIES')) ? (string) env('TRUSTED_PROXIES') : '*',

];
