<?php

namespace App\Actions\Auth;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;

/**
 * House-expenses-backend style: Mailgun HTTP API via {@see sendMailgunEmail} + Blade template.
 */
final class SendVerificationEmailMailgunAction
{
    public function execute(User $user): void
    {
        $minutes = (int) Config::get('auth.verification.expire', 60);
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            CarbonImmutable::now()->addMinutes($minutes),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ],
        );

        $html = view('emails.verify-email', [
            'name' => $user->name,
            'verificationUrl' => $verificationUrl,
        ])->render();

        $ok = sendMailgunEmail(
            $user->email,
            (string) __('Verify your email address'),
            $html,
        );

        if (! $ok) {
            Log::warning('Verification email (Mailgun curl) did not complete successfully', [
                'user_id' => $user->id,
            ]);
        }
    }
}
