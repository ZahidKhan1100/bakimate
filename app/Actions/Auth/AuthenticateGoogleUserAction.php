<?php

namespace App\Actions\Auth;

use App\Models\Shop;
use App\Models\User;
use App\Services\GoogleIdTokenService;
use Illuminate\Support\Facades\DB;

class AuthenticateGoogleUserAction
{
    public function __construct(
        private readonly GoogleIdTokenService $googleIdToken,
    ) {}

    public function execute(string $idToken): User
    {
        $claims = $this->googleIdToken->verifyAndExtract($idToken);

        return DB::transaction(function () use ($claims) {
            $user = User::query()->where('google_sub', $claims['sub'])->first();

            if ($user) {
                $user->fill([
                    'name' => $claims['name'],
                    'email' => $claims['email'],
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ]);
                $user->save();

                return $user;
            }

            $user = User::query()->create([
                'name' => $claims['name'],
                'email' => $claims['email'],
                'google_sub' => $claims['sub'],
                'password' => null,
                'email_verified_at' => now(),
            ]);

            Shop::query()->create([
                'user_id' => $user->id,
                'name' => 'My Shop',
                'primary_currency_code' => 'MYR',
                /** Dev-friendly: grant trial so write routes work out of the box; tighten for production. */
                'subscription_expires_at' => now()->addDays(30),
                'credit_quick_items' => Shop::DEFAULT_CREDIT_QUICK_ITEMS,
            ]);

            return $user;
        });
    }
}
