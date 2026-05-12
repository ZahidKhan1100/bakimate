<?php

namespace App\Http\Requests;

use App\Models\CustomerPromise;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerPromiseRequest extends FormRequest
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
            'status' => ['required', Rule::in([
                CustomerPromise::STATUS_PENDING,
                CustomerPromise::STATUS_KEPT,
                CustomerPromise::STATUS_MISSED,
                CustomerPromise::STATUS_CANCELLED,
            ])],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
