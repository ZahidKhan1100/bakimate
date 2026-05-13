<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Email/password accounts created before verification shipped had null email_verified_at.
     * Treat them as verified so existing users are not locked out by `verified` middleware.
     */
    public function up(): void
    {
        DB::table('users')
            ->whereNotNull('password')
            ->whereNull('email_verified_at')
            ->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // Intentionally empty — do not clear verification timestamps.
    }
};
