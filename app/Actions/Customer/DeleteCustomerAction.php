<?php

namespace App\Actions\Customer;

use App\Models\Customer;

class DeleteCustomerAction
{
    public function execute(Customer $customer): void
    {
        $customer->delete();
    }
}
