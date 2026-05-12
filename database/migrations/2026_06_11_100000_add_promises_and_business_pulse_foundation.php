<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->unsignedSmallInteger('reliability_stars')->default(0)->after('goal_target_date');
        });

        Schema::create('customer_promises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('amount_sen');
            $table->date('promised_date');
            /** pending | kept | missed | cancelled */
            $table->string('status', 16)->default('pending');
            $table->text('note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['shop_id', 'status', 'promised_date']);
            $table->index(['customer_id', 'promised_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_promises');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('reliability_stars');
        });
    }
};
