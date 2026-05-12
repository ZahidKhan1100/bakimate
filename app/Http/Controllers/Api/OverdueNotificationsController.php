<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SmartCollectionsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OverdueNotificationsController extends Controller
{
    public function __construct(
        private readonly SmartCollectionsService $collections,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();
        $tz = config('app.timezone');
        $now = CarbonImmutable::now()->timezone($tz);

        return response()->json([
            /** Smart Collections ranking (risk score + days metrics). Max 60 rows for notification-style pickers. */
            'customers' => $this->collections->priorityRows($shop, $now, 60),
            'bakiscore' => $this->collections->bakiScore($shop, $now),
            'generated_at' => $now->toIso8601String(),
        ]);
    }
}
