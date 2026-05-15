<?php

namespace App\Policies;

use App\Models\Admin;

class AdminPolicy
{
    public function viewAny(Admin $user): bool
    {
        return $user->can('ViewAny:Admin');
    }

    public function view(Admin $user, Admin $record): bool
    {
        return $user->can('View:Admin');
    }

    public function create(Admin $user): bool
    {
        return $user->can('Create:Admin');
    }

    public function update(Admin $user, Admin $record): bool
    {
        return $user->can('Update:Admin');
    }

    public function delete(Admin $user, Admin $record): bool
    {
        return $user->can('Delete:Admin');
    }

    public function deleteAny(Admin $user): bool
    {
        return $user->can('DeleteAny:Admin');
    }

    public function restore(Admin $user, Admin $record): bool
    {
        return $user->can('Restore:Admin');
    }

    public function forceDelete(Admin $user, Admin $record): bool
    {
        return $user->can('ForceDelete:Admin');
    }

    public function forceDeleteAny(Admin $user): bool
    {
        return $user->can('ForceDeleteAny:Admin');
    }

    public function restoreAny(Admin $user): bool
    {
        return $user->can('RestoreAny:Admin');
    }

    public function replicate(Admin $user, Admin $record): bool
    {
        return $user->can('Replicate:Admin');
    }

    public function reorder(Admin $user): bool
    {
        return $user->can('Reorder:Admin');
    }
}
