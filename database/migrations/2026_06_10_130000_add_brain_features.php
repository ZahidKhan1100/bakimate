<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            /** Total instalment goal (principal) in sen; progress ≈ paid = goal − current balance while goal set. */
            $table->unsignedBigInteger('goal_amount_sen')->nullable()->after('next_due_at');
            $table->date('goal_target_date')->nullable()->after('goal_amount_sen');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->string('item_key', 80)->nullable()->after('note');
            $table->index(['shop_id', 'item_key']);
        });

        Schema::table('shops', function (Blueprint $table) {
            $table->json('credit_quick_items')->nullable()->after('payment_instructions');
            /** Reference display only: units of this currency per 1 MYR (e.g. PKR 73 means 1 MYR → 73 PKR). */
            $table->string('reference_currency_code', 8)->nullable()->after('credit_quick_items');
            $table->decimal('reference_currency_per_myr', 16, 6)->nullable()->after('reference_currency_code');
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn(['credit_quick_items', 'reference_currency_code', 'reference_currency_per_myr']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['shop_id', 'item_key']);
            $table->dropColumn('item_key');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['goal_amount_sen', 'goal_target_date']);
        });
    }
};
