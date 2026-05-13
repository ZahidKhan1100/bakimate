<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Shop;
use App\Models\Transaction;
use App\Models\User;
use App\Services\BalanceService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BakimateLedgerSeeder extends Seeder
{
    /**
     * Demo user + shop + customers + transactions (amounts in sen).
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $user = User::query()->firstOrCreate(
                ['email' => 'demo@bakimate.test'],
                [
                    'name' => 'Demo Shopkeeper',
                    'password' => null,
                    'google_sub' => 'seed-demo-sub-001',
                    'email_verified_at' => now(),
                ],
            );

            $shop = Shop::query()->firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => 'Demo Shop',
                    'subscription_expires_at' => now()->addYear(),
                ],
            );

            $c1 = Customer::query()->firstOrCreate(
                ['shop_id' => $shop->id, 'name' => 'Ahmad (Walk-in)'],
                [
                    'phone' => '+60123456789',
                    'balance_sen' => 0,
                ],
            );

            $c2 = Customer::query()->firstOrCreate(
                ['shop_id' => $shop->id, 'name' => 'Kedai Runcit Ally'],
                [
                    'phone' => '+60199887766',
                    'balance_sen' => 0,
                ],
            );

            if (Transaction::query()->where('customer_id', $c1->id)->doesntExist()) {
                Transaction::query()->create([
                    'shop_id' => $shop->id,
                    'customer_id' => $c1->id,
                    'amount_sen' => 120_000,
                    'type' => Transaction::TYPE_CREDIT,
                    'note' => 'Stock on tabar',
                ]);
                Transaction::query()->create([
                    'shop_id' => $shop->id,
                    'customer_id' => $c1->id,
                    'amount_sen' => 35_000,
                    'type' => Transaction::TYPE_PAYMENT,
                    'note' => 'Cash partial',
                ]);
            }

            if (Transaction::query()->where('customer_id', $c2->id)->doesntExist()) {
                Transaction::query()->create([
                    'shop_id' => $shop->id,
                    'customer_id' => $c2->id,
                    'amount_sen' => 450_000,
                    'type' => Transaction::TYPE_CREDIT,
                    'note' => 'Monthly supply',
                ]);
            }

            $svc = app(BalanceService::class);
            foreach (Customer::query()->where('shop_id', $shop->id)->get() as $c) {
                $svc->syncCachedBalance($c);
            }
        });
    }
}
