<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * OAuth / IdP sign-ins already proved inbox control; older rows may have null email_verified_at.
     */
    public function up(): void
    {
        DB::table('users')
            ->whereNull('email_verified_at')
            ->where(function ($q): void {
                $q->whereNotNull('google_sub')->orWhereNotNull('apple_sub');
            })
            ->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // Non-reversible safely — do not clear verification flags.
    }
};
