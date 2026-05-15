<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_signed_verification_link_works_without_web_session(): void
    {
        Config::set('bakimate.email_verified_redirect_url', 'bakimate://verify-email?verified=1');

        $user = User::factory()->unverified()->create([
            'email' => 'verify-test@example.com',
        ]);

        $url = URL::temporarySignedRoute(
            'verification.verify',
            CarbonImmutable::now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ],
        );

        $response = $this->get($url);

        $response->assertRedirect('bakimate://verify-email?verified=1');
        $this->assertNotNull($user->fresh()->email_verified_at);
    }
}
