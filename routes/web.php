<?php

use App\Http\Controllers\Web\PublicCustomerBalanceController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/v/{token}', PublicCustomerBalanceController::class)
    ->where('token', '[A-Za-z0-9]{40,128}');
