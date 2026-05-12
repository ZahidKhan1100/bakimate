<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            /** Optional installment / follow-up reminder date (shown on dashboard priority list). */
            $table->date('next_due_at')->nullable()->after('balance_sen');
            $table->index(['shop_id', 'next_due_at']);
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['shop_id', 'next_due_at']);
            $table->dropColumn('next_due_at');
        });
    }
};
