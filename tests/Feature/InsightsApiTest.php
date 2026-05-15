<?php

namespace Tests\Feature;

use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InsightsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_insights_returns_json_for_authenticated_user_with_shop(): void
    {
        $user = User::factory()->create();
        Shop::query()->create([
            'user_id' => $user->id,
            'name' => 'Test Shop',
            'primary_currency_code' => 'MYR',
            'subscription_expires_at' => now()->addDays(7),
            'credit_quick_items' => Shop::DEFAULT_CREDIT_QUICK_ITEMS,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/reports/insights?timezone=UTC');

        $response->assertOk()
            ->assertJsonStructure([
                'top_debtors',
                'week_cashflow',
                'projection',
                'weekly_nudges',
                'credit_by_category',
                'generated_at',
            ]);
    }

    public function test_reports_insights_returns_422_when_user_has_no_shop(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/reports/insights?timezone=UTC');

        $response->assertStatus(422);
        $this->assertStringContainsString('No shop', (string) $response->json('message'));
    }
}
