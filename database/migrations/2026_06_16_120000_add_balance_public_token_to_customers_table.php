<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            /** Opaque token for read-only balance page (routes without Sanctum). */
            $table->string('balance_public_token', 64)->nullable()->unique()->after('reliability_stars');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['balance_public_token']);
            $table->dropColumn('balance_public_token');
        });
    }
};
