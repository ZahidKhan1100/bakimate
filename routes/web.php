<?php

use App\Http\Controllers\Web\PublicCustomerBalanceController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/v/{token}', PublicCustomerBalanceController::class)
    ->where('token', '[A-Za-z0-9]{40,128}');

Route::get('/email/verify/{id}/{hash}', function (\Illuminate\Foundation\Auth\EmailVerificationRequest $request) {
    $request->fulfill();

    return redirect()->away(config('bakimate.email_verified_redirect_url'));
})->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
