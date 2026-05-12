<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReceiptScanRequest;
use App\Services\GeminiReceiptSuggestionService;
use Illuminate\Http\JsonResponse;

class ReceiptScanController extends Controller
{
    public function __invoke(StoreReceiptScanRequest $request): JsonResponse
    {
        $upload = $request->file('image');
        if ($upload === null) {
            return response()->json(['message' => 'Image is required.'], 422);
        }

        $path = $upload->getRealPath();
        if (! is_string($path) || $path === '') {
            return response()->json(['message' => 'Could not read upload path.'], 422);
        }

        /** @var resource|false $stream */
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            return response()->json(['message' => 'Could not read image.'], 422);
        }
        $bytes = stream_get_contents($stream);
        fclose($stream);

        if ($bytes === false) {
            return response()->json(['message' => 'Could not read image.'], 422);
        }

        $mime = strtolower((string) ($upload->getMimeType() ?: 'image/jpeg'));

        $svc = GeminiReceiptSuggestionService::fromConfig();

        /** @var array{suggested_amount_sen: ?int, suggested_date_ymd: ?string, raw_preview: ?string, error: ?string} $parsed */
        $parsed = $svc->suggestFromImage($bytes, $mime);

        return response()->json([
            'suggested_amount_sen' => $parsed['suggested_amount_sen'] ?? null,
            'suggested_date_ymd' => $parsed['suggested_date_ymd'] ?? null,
            'raw_preview' => $parsed['raw_preview'] ?? null,
            'error_code' => $parsed['error'] ?? null,
        ]);
    }
}
