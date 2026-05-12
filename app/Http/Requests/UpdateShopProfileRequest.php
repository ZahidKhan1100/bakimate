<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateShopProfileRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'primary_currency_code' => ['nullable', 'string', 'size:3', 'regex:/^[A-Za-z]{3}$/'],
            'location' => ['nullable', 'string', 'max:4000'],
            'contact' => ['nullable', 'string', 'max:64'],
            'payment_instructions' => ['nullable', 'string', 'max:8000'],
            'credit_quick_items' => ['nullable', 'array', 'max:24'],
            'credit_quick_items.*' => ['string', 'max:64'],
            'reference_currency_code' => ['nullable', 'string', 'max:8'],
            'reference_currency_per_myr' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
        ];
    }
}
