<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class GeminiReceiptSuggestionService
{
    public function __construct(
        private ?string $apiKey,
        private string $preferredModel,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            config('services.gemini.api_key'),
            (string) config('services.gemini.model', 'gemini-2.5-flash-lite'),
        );
    }

    /**
     * @return array{suggested_amount_sen: ?int, suggested_date_ymd: ?string, raw_preview: ?string, error: ?string}
     */
    public function suggestFromImage(string $bytes, string $mimeType): array
    {
        $key = trim((string) $this->apiKey);
        if ($key === '') {
            return [
                'suggested_amount_sen' => null,
                'suggested_date_ymd' => null,
                'raw_preview' => null,
                'error' => 'gemini_not_configured',
            ];
        }

        $mime = $this->normalizeMime($mimeType);
        $base64 = base64_encode($bytes);

        $prompt = <<<'PROMPT'
You are reading a retail receipt or invoice photo for a small shop (udhaar / installment ledger).
Return ONLY valid JSON (no markdown, no code fences) with exactly these keys:
- "amount_major" (number or null): total amount to pay in major currency units as printed (e.g. 49.95 for RM 49.95).
- "amount_sen" (integer or null): same total in smallest currency units if you can infer (e.g. 4995 for 49.95 MYR). Prefer this when obvious; else null and use amount_major.
- "date_ymd" (string or null): transaction or receipt date as YYYY-MM-DD if visible, else null.
- "note_short" (string or null): up to 80 chars: merchant or one-line context, else null.

If the image is not a receipt, return all nulls.
PROMPT;

        $payload = [
            'contents' => [[
                'role' => 'user',
                'parts' => [
                    ['inline_data' => ['mime_type' => $mime, 'data' => $base64]],
                    ['text' => $prompt],
                ],
            ]],
            'generationConfig' => [
                'temperature' => 0.1,
                'maxOutputTokens' => 256,
            ],
        ];

        $models = $this->modelsToTry();
        $lastResponse = null;

        foreach ($models as $model) {
            $resp = $this->generateContent($key, $model, $payload);
            $lastResponse = $resp;

            if ($resp->successful()) {
                return $this->parseSuccessfulResponse($resp->json());
            }

            $errMsg = strtolower((string) ($resp->json('error.message') ?? ''));
            $status = $resp->status();

            $tryNext = $status === 404
                || $status === 429
                || $status === 503
                || str_contains($errMsg, 'not found')
                || str_contains($errMsg, 'not supported')
                || str_contains($errMsg, 'quota')
                || str_contains($errMsg, 'resource_exhausted');

            Log::warning('Gemini receipt scan HTTP error', [
                'model' => $model,
                'status' => $status,
                'body' => $resp->body(),
            ]);

            if (! $tryNext) {
                break;
            }
        }

        if ($lastResponse !== null && ! $lastResponse->successful()) {
            return [
                'suggested_amount_sen' => null,
                'suggested_date_ymd' => null,
                'raw_preview' => null,
                'error' => 'gemini_request_failed',
            ];
        }

        return [
            'suggested_amount_sen' => null,
            'suggested_date_ymd' => null,
            'raw_preview' => null,
            'error' => 'gemini_request_failed',
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function generateContent(string $apiKey, string $model, array $payload): \Illuminate\Http\Client\Response
    {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'.rawurlencode($model).':generateContent';

        return Http::timeout(55)->post($url.'?key='.urlencode($apiKey), $payload);
    }

    /**
     * @return list<string>
     */
    private function modelsToTry(): array
    {
        $preferred = trim($this->preferredModel);

        return array_values(array_unique(array_filter([
            $preferred !== '' ? $preferred : null,
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash-8b',
        ])));
    }

    private function normalizeMime(string $mimeType): string
    {
        $m = strtolower(trim($mimeType));

        return in_array($m, ['image/jpeg', 'image/png', 'image/webp'], true) ? $m : 'image/jpeg';
    }

    /**
     * @param  array<string, mixed>|null  $json
     * @return array{suggested_amount_sen: ?int, suggested_date_ymd: ?string, raw_preview: ?string, error: ?string}
     */
    private function parseSuccessfulResponse(?array $json): array
    {
        if ($json === null) {
            return [
                'suggested_amount_sen' => null,
                'suggested_date_ymd' => null,
                'raw_preview' => null,
                'error' => 'gemini_request_failed',
            ];
        }

        $blockReason = $json['promptFeedback']['blockReason'] ?? null;
        if (is_string($blockReason) && $blockReason !== '') {
            Log::warning('Gemini receipt: blocked', ['reason' => $blockReason]);

            return [
                'suggested_amount_sen' => null,
                'suggested_date_ymd' => null,
                'raw_preview' => null,
                'error' => 'gemini_blocked',
            ];
        }

        $text = $this->extractTextFromCandidates($json);
        if ($text === null || trim($text) === '') {
            return [
                'suggested_amount_sen' => null,
                'suggested_date_ymd' => null,
                'raw_preview' => null,
                'error' => null,
            ];
        }

        $parsed = $this->decodeModelJson($text);
        if (! is_array($parsed)) {
            return [
                'suggested_amount_sen' => null,
                'suggested_date_ymd' => null,
                'raw_preview' => null,
                'error' => 'gemini_parse_failed',
            ];
        }

        /** @var int|null $sen */
        $sen = null;
        if (isset($parsed['amount_sen']) && is_numeric($parsed['amount_sen'])) {
            /** @phpstan-ignore-next-line */
            $sen = max(0, (int) round((float) $parsed['amount_sen']));
        } elseif (isset($parsed['amount_major']) && is_numeric($parsed['amount_major'])) {
            /** @phpstan-ignore-next-line */
            $sen = (int) round(((float) $parsed['amount_major']) * 100);
        }

        if ($sen !== null && ($sen <= 0 || $sen > 999_999_999_999)) {
            $sen = null;
        }

        /** @var string|null $ymd */
        $ymd = null;
        if (isset($parsed['date_ymd']) && is_string($parsed['date_ymd'])) {
            $d = trim($parsed['date_ymd']);
            $ymd = preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) === 1 ? $d : null;
        }

        $preview = null;
        if (isset($parsed['note_short']) && is_string($parsed['note_short'])) {
            $preview = mb_strlen($parsed['note_short']) <= 120 ? trim($parsed['note_short']) : (mb_substr(trim($parsed['note_short']), 0, 117).'…');
        }

        return [
            'suggested_amount_sen' => $sen,
            'suggested_date_ymd' => $ymd,
            'raw_preview' => $preview,
            'error' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $json
     */
    private function extractTextFromCandidates(array $json): ?string
    {
        $candidates = $json['candidates'] ?? null;
        if (! is_array($candidates) || $candidates === []) {
            return null;
        }

        $first = $candidates[0] ?? null;
        if (! is_array($first)) {
            return null;
        }

        $parts = $first['content']['parts'] ?? null;
        if (! is_array($parts) || $parts === []) {
            return null;
        }

        $text = $parts[0]['text'] ?? null;

        return is_string($text) ? $text : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeModelJson(string $text): ?array
    {
        $trimmed = trim($text);
        $trimmed = preg_replace('/^\s*```(?:json)?\s*/i', '', $trimmed) ?? $trimmed;
        $trimmed = preg_replace('/\s*```\s*$/', '', $trimmed) ?? $trimmed;
        $trimmed = trim($trimmed);
        /** @var mixed $decoded */
        $decoded = json_decode($trimmed, true);

        return is_array($decoded) ? $decoded : null;
    }
}
