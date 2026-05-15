<?php

namespace App\Filament\Admin\Resources\Customers;

use App\Filament\Admin\Resources\Customers\Pages\ManageCustomers;
use App\Models\Customer;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CustomerResource extends Resource
{
    protected static ?string $model = Customer::class;

    protected static ?string $navigationLabel = 'Customers';

    protected static string|\UnitEnum|null $navigationGroup = 'Operations';

    protected static string|\BackedEnum|null $navigationIcon = Heroicon::OutlinedUserGroup;

    protected static ?int $navigationSort = 30;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('shop');
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('shop_id')
                ->relationship('shop', 'name')
                ->searchable()
                ->preload()
                ->required(),
            TextInput::make('name')
                ->required()
                ->maxLength(255),
            TextInput::make('phone')
                ->maxLength(255),
            TextInput::make('balance_sen')
                ->label('Balance (sen)')
                ->numeric()
                ->default(0)
                ->required(),
            DatePicker::make('next_due_at'),
            TextInput::make('goal_amount_sen')
                ->label('Goal amount (sen)')
                ->numeric(),
            DatePicker::make('goal_target_date'),
            TextInput::make('reliability_stars')
                ->numeric()
                ->minValue(0)
                ->maxValue(5),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')
                    ->sortable(),
                TextColumn::make('shop.name')
                    ->label('Shop')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('phone')
                    ->searchable(),
                TextColumn::make('balance_sen')
                    ->label('Balance')
                    ->formatStateUsing(fn (?int $state): string => number_format(($state ?? 0) / 100, 2).' MYR')
                    ->sortable(),
                TextColumn::make('next_due_at')
                    ->date()
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
            'index' => ManageCustomers::route('/'),
        ];
    }
}
