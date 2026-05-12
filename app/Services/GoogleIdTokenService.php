<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GoogleIdTokenService
{
    /**
     * Verifies a Google ID token and returns sub, email, name.
     * Uses Google's tokeninfo endpoint for the scaffold; replace with JWKS verification for production scale.
     *
     * @return array{sub: string, email: string, name: string}
     */
    public function verifyAndExtract(string $idToken): array
    {
        $response = Http::timeout(15)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->ok()) {
            throw new \RuntimeException('Invalid Google ID token.');
        }

        $data = $response->json();
        $aud = $data['aud'] ?? null;

        /** @var list<string> $allowedClients */
        $allowedClients = config('services.google.client_ids', []);

        if ($allowedClients !== [] && ! in_array((string) $aud, $allowedClients, true)) {
            throw new \RuntimeException('Google token audience mismatch.');
        }

        $sub = $data['sub'] ?? null;
        $email = $data['email'] ?? null;
        $name = $data['name'] ?? ($data['email'] ?? 'User');

        if (! is_string($sub) || $sub === '' || ! is_string($email) || $email === '') {
            throw new \RuntimeException('Google token missing identity claims.');
        }

        return [
            'sub' => $sub,
            'email' => $email,
            'name' => is_string($name) ? $name : $email,
        ];
    }
}
