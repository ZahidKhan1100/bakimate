<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Admin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateAdminCommand extends Command
{
    protected $signature = 'admin:create
                            {--email= : Staff email}
                            {--name= : Display name}
                            {--password= : Password (omit for prompt)}
                            {--force : Overwrite password when admin exists}';

    protected $description = 'Create a Filament staff admin (admins table, /admin login)';

    public function handle(): int
    {
        $email = (string) ($this->option('email') ?: $this->ask('Email'));
        $name = (string) ($this->option('name') ?: $this->ask('Full name'));
        $password = (string) ($this->option('password') ?: $this->secret('Password (min 10 chars)'));

        $validated = Validator::make(
            compact('email', 'name', 'password'),
            [
                'email' => ['required', 'email:rfc'],
                'name' => ['required', 'string', 'max:255'],
                'password' => ['required', 'string', 'min:10'],
            ],
        );

        if ($validated->fails()) {
            foreach ($validated->errors()->all() as $msg) {
                $this->error($msg);
            }

            return self::FAILURE;
        }

        $email = strtolower(trim($email));

        $existing = Admin::query()->where('email', $email)->first();

        if ($existing && ! $this->option('force') && ! $this->confirm("Admin {$email} exists. Update name and password?", false)) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $admin = Admin::query()->firstOrNew(['email' => $email]);
        $admin->name = trim($name);
        $admin->password = $password;
        $admin->save();

        $this->components->success(sprintf('Staff admin saved: %s', $admin->email));
        $url = rtrim((string) config('app.url'), '/').'/admin';
        $this->line("Filament: {$url}");

        return self::SUCCESS;
    }
}
