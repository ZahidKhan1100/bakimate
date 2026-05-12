<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payables ledger: amounts in minor units (sen) — positive balance = shop owes supplier.
     */
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 64)->nullable();
            /** Running total the shop owes this supplier (+ = debt to supplier). */
            $table->bigInteger('balance_sen')->default(0);
            $table->timestamps();

            $table->index(['shop_id', 'name']);
        });

        Schema::create('supplier_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            /** Always positive; meaning depends on `type`. */
            $table->unsignedBigInteger('amount_sen');
            /** purchase = stock/expense owing increases; payment_out = settled toward supplier decreases. */
            $table->string('type', 32);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['shop_id', 'created_at']);
            $table->index(['supplier_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_transactions');
        Schema::dropIfExists('suppliers');
    }
};
