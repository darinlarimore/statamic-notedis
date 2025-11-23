<?php

namespace Notedis\StatamicNotedis;

use Notedis\StatamicNotedis\Http\Middleware\InjectNotedisWidget;
use Statamic\Facades\CP\Nav;
use Statamic\Facades\Permission;
use Statamic\Providers\AddonServiceProvider;

class ServiceProvider extends AddonServiceProvider
{
    protected $tags = [
        Tags\Notedis::class,
    ];

    protected $fieldtypes = [
        Fieldtypes\NotedisFieldtype::class,
    ];

    protected $routes = [
        'cp' => __DIR__.'/../routes/cp.php',
    ];

    protected $middlewareGroups = [
        'web' => [
            InjectNotedisWidget::class,
        ],
        'statamic.cp.authenticated' => [
            InjectNotedisWidget::class,
        ],
    ];

    protected $publishAfterInstall = true;

    public function bootAddon()
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'notedis');

        $this->publishes([
            __DIR__.'/../config/notedis.php' => config_path('notedis.php'),
        ], 'notedis-config');

        $this->publishes([
            __DIR__.'/../resources/dist' => public_path('vendor/notedis'),
        ], 'notedis-assets');

        $this->mergeConfigFrom(
            __DIR__.'/../config/notedis.php', 'notedis'
        );

        // Register CP navigation
        $this->registerCpNavigation();

        // Register permissions
        $this->registerPermissions();
    }

    protected function registerCpNavigation()
    {
        Nav::extend(function ($nav) {
            $nav->create('Notedis')
                ->section('Tools')
                ->icon('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>')
                ->route('notedis.settings.index')
                ->can('configure notedis');
        });
    }

    protected function registerPermissions()
    {
        Permission::register('configure notedis', function ($permission) {
            $permission
                ->label('Configure Notedis')
                ->description('Allows configuring Notedis settings');
        });
    }
}
