<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class AppleIdTokenService
{
    private const JWKS_URI = 'https://appleid.apple.com/auth/keys';

    /**
     * @return array{sub: string, email?: string}
     */
    public function verifyAndExtract(string $idToken): array
    {
        $jwksPayload = Cache::remember('apple_jwks_payload', now()->addHours(24), function () {
            $resp = Http::timeout(15)->get(self::JWKS_URI);

            if (! $resp->ok()) {
                throw new \RuntimeException('Unable to load Apple signing keys.');
            }

            /** @var array<string, mixed> */
            return $resp->json();
        });

        /** @var array<string, \Firebase\JWT\Key> $keys */
        $keys = JWK::parseKeySet($jwksPayload, 'ES256');

        JWT::$leeway = 60;

        try {
            $payload = JWT::decode($idToken, $keys);
        } catch (\Throwable $e) {
            throw new \RuntimeException('Invalid Apple identity token.');
        }

        if (($payload->iss ?? null) !== 'https://appleid.apple.com') {
            throw new \RuntimeException('Invalid Apple issuer.');
        }

        $allowedAudiences = collect(config('services.apple.client_ids', []))
            ->filter(fn ($id) => is_string($id) && $id !== '')
            ->values()
            ->all();

        if ($allowedAudiences !== [] && ! in_array($payload->aud ?? null, $allowedAudiences, true)) {
            throw new \RuntimeException('Apple audience mismatch.');
        }

        $sub = $payload->sub ?? null;
        if (! is_string($sub) || $sub === '') {
            throw new \RuntimeException('Apple token missing subject.');
        }

        $email = $payload->email ?? null;

        return [
            'sub' => $sub,
            'email' => is_string($email) && $email !== '' ? $email : null,
        ];
    }
}
