<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    /**
     * Same Mailgun setup as Habimate — use the existing domain + API key until BakiMate has its own.
     * Requires: composer symfony/mailgun-mailer (already in composer.json).
     */
    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        // Hostname only (e.g. api.mailgun.net). Strip accidental https:// from .env.
        'endpoint' => ($h = preg_replace('#^https?://#i', '', trim((string) env('MAILGUN_ENDPOINT', 'api.mailgun.net')))) === '' ? 'api.mailgun.net' : $h,
        'scheme' => 'https',
    ],

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        /**
         * Allowed id_token "aud" values. Set any of:
         * - GOOGLE_CLIENT_IDS="id1,id2,..." and/or
         * - GOOGLE_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID,
         *   GOOGLE_ANDROID_CLIENT_ID, GOOGLE_EXPO_CLIENT_ID (mirror Expo EXPO_PUBLIC_GOOGLE_*).
         * Expo Go tokens usually use the Web (or Expo) client id as aud — include every distinct client.
         */
        'client_ids' => collect(array_merge(
            array_values(array_filter(array_map(
                'trim',
                explode(',', trim((string) env('GOOGLE_CLIENT_IDS', ''))),
            ))),
            [
                trim((string) env('GOOGLE_CLIENT_ID')),
                trim((string) env('GOOGLE_WEB_CLIENT_ID')),
                trim((string) env('GOOGLE_IOS_CLIENT_ID')),
                trim((string) env('GOOGLE_ANDROID_CLIENT_ID')),
                trim((string) env('GOOGLE_EXPO_CLIENT_ID')),
            ],
        ))
            ->filter(fn (string $id) => $id !== '')
            ->unique()
            ->values()
            ->all(),
    ],

    /** Google AI Studio — same receipt flow as Habimate / house-expenses-backend. */
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash-lite'),
    ],

    'apple' => [
        /**
         * Comma-separated JWT "aud" values (normally your app bundle ID, sometimes a Services ID).
         */
        'client_ids' => array_values(array_unique(array_filter(array_map(
            'trim',
            explode(',', trim((string) (env('APPLE_CLIENT_IDS', '') ?: env('APPLE_CLIENT_ID', 'com.ihabimate.bakimate')))),
        )))),
    ],

    'revenuecat' => [
        'webhook_secret' => env('REVENUECAT_WEBHOOK_SECRET'),
    ],

    'stripe' => [
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],
];
