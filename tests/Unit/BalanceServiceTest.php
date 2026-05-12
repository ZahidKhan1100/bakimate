<?php

namespace Tests\Unit;

use App\Models\Transaction;
use App\Services\BalanceService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BalanceServiceTest extends TestCase
{
    #[Test]
    public function it_computes_balance_from_credit_and_payment_rows(): void
    {
        $svc = new BalanceService;

        $rows = [
            (object) ['type' => Transaction::TYPE_CREDIT, 'amount_sen' => 5000],
            (object) ['type' => Transaction::TYPE_PAYMENT, 'amount_sen' => 2000],
            (object) ['type' => Transaction::TYPE_CREDIT, 'amount_sen' => 1000],
        ];

        $this->assertSame(4000, $svc->balanceFromTransactionRows($rows));
    }

    #[Test]
    public function delta_for_payment_is_negative(): void
    {
        $svc = new BalanceService;

        $this->assertSame(-100, $svc->deltaForTransaction(Transaction::TYPE_PAYMENT, 100));
        $this->assertSame(250, $svc->deltaForTransaction(Transaction::TYPE_CREDIT, 250));
    }
}
