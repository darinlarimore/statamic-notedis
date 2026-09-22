<?php

namespace Notedis\StatamicNotedis\Http\Controllers;

use Illuminate\Http\Request;
use Statamic\Facades\YAML;
use Statamic\Http\Controllers\CP\CpController;

class SettingsController extends CpController
{
    protected static function settingsPath()
    {
        return resource_path('notedis.yaml');
    }

    public function index()
    {
        $settings = $this->getSettings();

        $envConfigured = [
            'site_key' => self::isConfiguredViaEnv('site_key'),
            'api_endpoint' => self::isConfiguredViaEnv('api_endpoint'),
            'widget_position' => self::isConfiguredViaEnv('widget_position'),
            'widget_color' => self::isConfiguredViaEnv('widget_color'),
            'logged_in_only' => self::isConfiguredViaEnv('logged_in_only'),
            'show_in_cp' => self::isConfiguredViaEnv('show_in_cp'),
            'widget_source' => self::isConfiguredViaEnv('widget_source'),
            'auto_inject' => self::isConfiguredViaEnv('auto_inject'),
        ];

        return view('notedis::settings', [
            'settings' => $settings,
            'envConfigured' => $envConfigured,
            'title' => 'Notedis Settings',
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'site_key' => 'required|string',
            'api_endpoint' => 'nullable|url',
            'widget_position' => 'nullable|in:bottom-right,bottom-left,top-right,top-left',
            'widget_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'logged_in_only' => 'nullable|boolean',
            'show_in_cp' => 'nullable|boolean',
            'widget_source' => 'nullable|in:local,cdn',
            'auto_inject' => 'nullable|boolean',
        ]);

        // Save settings to dedicated YAML file
        file_put_contents(self::settingsPath(), YAML::dump($validated));

        return response()->json([
            'message' => 'Settings saved successfully',
            'settings' => $validated,
        ]);
    }

    protected function getSettings()
    {
        if (! file_exists(self::settingsPath())) {
            return $this->getDefaultSettings();
        }

        $settings = YAML::file(self::settingsPath())->parse() ?: [];

        return array_merge($this->getDefaultSettings(), $settings);
    }

    protected function getDefaultSettings()
    {
        return [
            'site_key' => config('notedis.site_key', ''),
            'api_endpoint' => config('notedis.api_endpoint', 'https://notedis.com'),
            'widget_position' => config('notedis.widget_position', 'bottom-right'),
            'widget_color' => config('notedis.widget_color', '#3B82F6'),
            'logged_in_only' => config('notedis.logged_in_only', false),
            'show_in_cp' => config('notedis.show_in_cp', false),
            'widget_source' => config('notedis.widget_source', 'local'),
            'auto_inject' => config('notedis.auto_inject', true),
        ];
    }

    public static function getSettingValue($key, $default = null)
    {
        // Environment variables take highest priority
        $envValue = self::getEnvValue($key);
        if ($envValue !== null) {
            return $envValue;
        }

        // Then check YAML file
        if (file_exists(self::settingsPath())) {
            $settings = YAML::file(self::settingsPath())->parse() ?: [];
            if (isset($settings[$key])) {
                return $settings[$key];
            }
        }

        // Finally use config defaults
        return config("notedis.{$key}", $default);
    }

    /**
     * The fallbacks config/notedis.php passes to env(), so a value that differs
     * from its fallback can only have come from the environment.
     *
     * @var array<string, mixed>
     */
    protected static array $configDefaults = [
        'site_key' => '',
        'api_endpoint' => 'https://notedis.com',
        'widget_position' => 'bottom-right',
        'widget_color' => '#3B82F6',
        'logged_in_only' => false,
        'show_in_cp' => false,
        'widget_source' => 'local',
        'auto_inject' => true,
    ];

    protected static function getEnvValue($key)
    {
        return self::isConfiguredViaEnv($key)
            ? config("notedis.{$key}")
            : null;
    }

    /**
     * Whether an environment variable is behind this setting.
     *
     * Read through config() rather than env(): once the app is config-cached
     * (`artisan config:cache`, which `artisan optimize` runs) env() returns
     * null outside config files, which would otherwise hide every environment
     * variable here and let the YAML file override it.
     */
    public static function isConfiguredViaEnv($key)
    {
        if (! array_key_exists($key, self::$configDefaults)) {
            return env('NOTEDIS_'.strtoupper($key)) !== null;
        }

        return config("notedis.{$key}") !== self::$configDefaults[$key];
    }
}
