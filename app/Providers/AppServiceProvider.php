<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $scheme = config('bakimate.password_reset_app_scheme', 'bakimate');
            $path = config('bakimate.password_reset_app_path', 'reset-password');
            $email = $notifiable->getEmailForPasswordReset();

            return sprintf('%s://%s?%s', $scheme, $path, http_build_query([
                'token' => $token,
                'email' => $email,
            ]));
        });
    }
}
