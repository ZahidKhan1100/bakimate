<?php

namespace App\Filament\Admin\Resources\Shops;

use App\Filament\Admin\Resources\Shops\Pages\ManageShops;
use App\Models\Shop;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ShopResource extends Resource
{
    protected static ?string $model = Shop::class;

    protected static ?string $navigationLabel = 'Shops';

    protected static string|\UnitEnum|null $navigationGroup = 'Operations';

    protected static string|\BackedEnum|null $navigationIcon = Heroicon::OutlinedShoppingBag;

    protected static ?int $navigationSort = 20;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('user');
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('user_id')
                ->relationship('user', 'email')
                ->searchable()
                ->preload()
                ->required(),
            TextInput::make('name')
                ->required()
                ->maxLength(255),
            TextInput::make('primary_currency_code')
                ->label('Primary currency')
                ->length(3)
                ->default('MYR'),
            TextInput::make('location')
                ->maxLength(255),
            TextInput::make('contact')
                ->maxLength(255),
            Textarea::make('payment_instructions')
                ->columnSpanFull(),
            TextInput::make('reference_currency_code')
                ->label('Reference currency')
                ->maxLength(3),
            TextInput::make('reference_currency_per_myr')
                ->numeric()
                ->step('0.000001'),
            DateTimePicker::make('subscription_expires_at')
                ->seconds(false),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')
                    ->sortable(),
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('user.email')
                    ->label('Owner email')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('primary_currency_code')
                    ->label('CCY')
                    ->sortable(),
                TextColumn::make('subscription_expires_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('customers_count')
                    ->counts('customers')
                    ->label('Customers')
                    ->sortable(),
                TextColumn::make('suppliers_count')
                    ->counts('suppliers')
                    ->label('Suppliers')
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageShops::route('/'),
        ];
    }
}
