<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Multi-staff foundation: invites + membership (API wiring in a follow-up PR). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 32)->default('staff');
            $table->timestamps();
            $table->unique(['shop_id', 'user_id']);
            $table->index(['user_id', 'shop_id']);
        });

        Schema::create('shop_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('role', 32)->default('staff');
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
            $table->index(['shop_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_invitations');
        Schema::dropIfExists('shop_staff');
    }
};
