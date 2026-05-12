<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Parses RevenueCat / Stripe webhook payloads and updates shop.subscription_expires_at.
 * Implement provider-specific logic here.
 */
class ProcessSubscriptionWebhookPayload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public array $payload)
    {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        Log::info('subscription.webhook.received', ['keys' => array_keys($this->payload)]);
        // TODO: verify signature (REVENUECAT_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET) and map to shops.
    }
}
