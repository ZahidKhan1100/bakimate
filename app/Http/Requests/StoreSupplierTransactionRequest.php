<?php

namespace App\Http\Requests;

use App\Models\SupplierTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupplierTransactionRequest extends FormRequest
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
            'supplier_id' => ['required', 'integer', 'min:1'],
            'amount_sen' => ['required', 'integer', 'min:1', 'max:1000000000'],
            'type' => ['required', 'string', Rule::in(SupplierTransaction::TYPES)],
            'note' => ['nullable', 'string', 'max:8000'],
        ];
    }
}
