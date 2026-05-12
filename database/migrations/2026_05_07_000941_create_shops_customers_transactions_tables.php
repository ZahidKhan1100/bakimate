<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Money is stored in smallest currency unit (sen) as signed/unsigned integers per field.
     */
    public function up(): void
    {
        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamp('subscription_expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone')->nullable();
            /** Cached outstanding balance in sen (what customer owes the shop). */
            $table->bigInteger('balance_sen')->default(0);
            $table->timestamps();

            $table->index(['shop_id', 'name']);
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            /** Always positive; interpretation depends on `type`. */
            $table->unsignedBigInteger('amount_sen');
            /** payment = money received (reduces balance); credit = udhaar extended (increases balance). */
            $table->string('type', 32);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['shop_id', 'created_at']);
            $table->index(['customer_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('shops');
    }
};
