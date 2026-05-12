<?php

namespace App\Http\Controllers\Api;

use App\Actions\Auth\AuthenticateAppleUserAction;
use App\Actions\Auth\AuthenticateGoogleUserAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\AppleLoginRequest;
use App\Http\Requests\GoogleLoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function google(GoogleLoginRequest $request, AuthenticateGoogleUserAction $action): JsonResponse
    {
        try {
            $user = $action->execute($request->validated('id_token'));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }

        return $this->authResponse($user);
    }

    public function apple(AppleLoginRequest $request, AuthenticateAppleUserAction $action): JsonResponse
    {
        try {
            $user = $action->execute(
                $request->validated('id_token'),
                $request->validated('full_name'),
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }

        return $this->authResponse($user);
    }

    /**
     * Dev/demo helper: returns a token for the seeded demo account when enabled.
     */
    public function demo(): JsonResponse
    {
        if (! config('bakimate.demo_login_enabled')) {
            return response()->json([
                'message' => 'Demo login is disabled. For local dev set APP_ENV=local (default) or DEMO_LOGIN_ENABLED=true in .env. Never enable on public production APIs.',
            ], 403);
        }

        $user = User::query()->where('email', 'demo@bakimate.test')->first();

        if (! $user) {
            return response()->json([
                'message' => 'Demo user missing. Run: php artisan migrate --seed (creates demo@bakimate.test).',
            ], 503);
        }

        return $this->authResponse($user, 'mobile-demo');
    }

    private function authResponse(User $user, string $tokenName = 'mobile'): JsonResponse
    {
        $token = $user->createToken($tokenName)->plainTextToken;
        $shop = $user->shops()->first();

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'shop' => $shop !== null ? ShopProfileController::serializeShop($shop) : null,
        ]);
    }
}
