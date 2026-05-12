<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ShopDuitNowQrController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();

        $request->validate([
            'qr' => ['required', 'file', 'image', 'max:2048', 'mimes:jpeg,jpg,png,webp'],
        ]);

        $file = $request->file('qr');
        if ($file === null) {
            abort(422, 'Missing QR file.');
        }

        if ($shop->duitnow_qr_path) {
            Storage::disk('public')->delete($shop->duitnow_qr_path);
        }

        $path = $file->store('duitnow/'.$shop->id, 'public');
        $shop->update(['duitnow_qr_path' => $path]);

        return response()->json(ShopProfileController::serializeShop($shop->fresh()));
    }

    public function destroy(Request $request): JsonResponse
    {
        $shop = $request->user()?->shops()->firstOrFail();

        if ($shop->duitnow_qr_path) {
            Storage::disk('public')->delete($shop->duitnow_qr_path);
            $shop->update(['duitnow_qr_path' => null]);
        }

        return response()->json(ShopProfileController::serializeShop($shop->fresh()));
    }
}
