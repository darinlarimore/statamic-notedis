<?php

namespace Notedis\StatamicNotedis\Fieldtypes;

use Notedis\StatamicNotedis\Http\Controllers\SettingsController;
use Statamic\Fields\Fieldtype;

class NotedisFieldtype extends Fieldtype
{
    protected $icon = 'text';

    protected $categories = ['special'];

    protected $configFields = [
        'site_key' => [
            'display' => 'Site Key',
            'instructions' => 'Your Notedis site key. Leave blank to use the default from settings.',
            'type' => 'text',
        ],
        'position' => [
            'display' => 'Button Position',
            'instructions' => 'Where to display the feedback button.',
            'type' => 'select',
            'default' => 'bottom-right',
            'options' => [
                'bottom-right' => 'Bottom Right',
                'bottom-left' => 'Bottom Left',
                'top-right' => 'Top Right',
                'top-left' => 'Top Left',
            ],
        ],
        'color' => [
            'display' => 'Button Color',
            'instructions' => 'Hex color code for the feedback button.',
            'type' => 'text',
            'default' => '#3B82F6',
        ],
    ];

    public function preProcess($data)
    {
        return $data ?? [];
    }

    public function process($data)
    {
        return $data ?? [];
    }

    public function preload()
    {
        return [
            'site_key' => SettingsController::getSettingValue('site_key'),
            'api_endpoint' => SettingsController::getSettingValue('api_endpoint', 'https://notedis.com'),
            'widget_position' => SettingsController::getSettingValue('widget_position', 'bottom-right'),
            'widget_color' => SettingsController::getSettingValue('widget_color', '#3B82F6'),
        ];
    }

    public function augment($value)
    {
        if (! is_array($value)) {
            $value = [];
        }

        $siteKey = $value['site_key'] ?? $this->config('site_key') ?? SettingsController::getSettingValue('site_key');
        $position = $value['position'] ?? $this->config('position') ?? SettingsController::getSettingValue('widget_position', 'bottom-right');
        $color = $value['color'] ?? $this->config('color') ?? SettingsController::getSettingValue('widget_color', '#3B82F6');

        if (empty($siteKey)) {
            return '<!-- Notedis: Site key not configured -->';
        }

        $config = [
            'siteKey' => $siteKey,
            'apiUrl' => SettingsController::getSettingValue('api_endpoint', 'https://notedis.com'),
            'position' => $position,
            'color' => $color,
        ];

        $configJson = json_encode($config);
        $widgetSource = SettingsController::getSettingValue('widget_source', 'local');

        if ($widgetSource === 'cdn') {
            $scriptSrc = 'https://cdn.notedis.com/widget.js';
        } else {
            $scriptSrc = asset('vendor/notedis/js/widget.js');
        }

        return <<<HTML
<script>
    window.notedisConfig = {$configJson};
</script>
<script src="{$scriptSrc}"></script>
HTML;
    }
}
