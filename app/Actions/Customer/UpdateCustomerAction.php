<?php

namespace App\Actions\Customer;

use App\Models\Customer;

class UpdateCustomerAction
{
    /**
     * @param  array{name?: string, phone?: string|null, goal_amount_sen?: int|null, goal_target_date?: string|null}  $data
     */
    public function execute(Customer $customer, array $data): Customer
    {
        $customer->fill([
            'name' => $data['name'] ?? $customer->name,
            'phone' => array_key_exists('phone', $data) ? $data['phone'] : $customer->phone,
        ]);

        if (array_key_exists('goal_amount_sen', $data)) {
            $customer->goal_amount_sen = $data['goal_amount_sen'];
        }
        if (array_key_exists('goal_target_date', $data)) {
            $customer->goal_target_date = $data['goal_target_date'];
        }

        $customer->save();

        return $customer->fresh();
    }
}
