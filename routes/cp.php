<?php

use Illuminate\Support\Facades\Route;
use Notedis\StatamicNotedis\Http\Controllers\SettingsController;

Route::name('notedis.')->group(function () {
    Route::get('notedis/settings', [SettingsController::class, 'index'])
        ->name('settings.index')
        ->middleware('can:manage notedis');

    Route::post('notedis/settings', [SettingsController::class, 'update'])
        ->name('settings.update')
        ->middleware('can:manage notedis');
});
