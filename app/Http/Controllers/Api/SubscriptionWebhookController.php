<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessSubscriptionWebhookPayload;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        /** Dispatch async parsing of RevenueCat / Stripe payloads. */
        ProcessSubscriptionWebhookPayload::dispatch($request->all());

        return response()->noContent();
    }
}
