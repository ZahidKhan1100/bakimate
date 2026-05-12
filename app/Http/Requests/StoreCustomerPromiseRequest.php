<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerPromiseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'amount_sen' => ['required', 'integer', 'min:1', 'max:2147483647'],
            /** YYYY-MM-DD */
            'promised_date' => ['required', 'date', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
