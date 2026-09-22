<?php

namespace Notedis\StatamicNotedis\Tags;

use Notedis\StatamicNotedis\Http\Controllers\SettingsController;
use Statamic\Tags\Tags;

class Notedis extends Tags
{
    protected static $handle = 'notedis';

    /**
     * The {{ notedis }} tag.
     *
     * @return string
     */
    public function index()
    {
        return $this->widget();
    }

    /**
     * The {{ notedis:widget }} tag.
     *
     * @return string
     */
    public function widget()
    {
        $siteKey = $this->params->get('site_key', SettingsController::getSettingValue('site_key'));

        if (empty($siteKey)) {
            return '<!-- Notedis: Site key not configured -->';
        }

        // Check if logged in only mode is enabled
        if (SettingsController::getSettingValue('logged_in_only', false) && ! auth()->check()) {
            return '<!-- Notedis: Logged in users only -->';
        }

        $config = [
            'siteKey' => $siteKey,
            'apiUrl' => $this->params->get('api_url', SettingsController::getSettingValue('api_endpoint', 'https://notedis.com')),
            'position' => $this->params->get('position', SettingsController::getSettingValue('widget_position', 'bottom-right')),
            'color' => $this->params->get('color', SettingsController::getSettingValue('widget_color', '#3B82F6')),
        ];

        $configJson = json_encode($config);
        $widgetSource = $this->params->get('source', SettingsController::getSettingValue('widget_source', 'local'));

        if ($widgetSource === 'cdn') {
            $scriptSrc = 'https://cdn.notedis.com/widget.js';
        } else {
            // Use local bundled version
            $scriptSrc = asset('vendor/notedis/js/widget.js');
        }

        return <<<HTML
<script>
    window.notedisConfig = {$configJson};
</script>
<script src="{$scriptSrc}"></script>
HTML;
    }

    /**
     * The `{{ notedis:config }}` tag - the per-visitor decision only.
     *
     * Rendered inside a `{{ nocache }}` region so the logged-in check runs on
     * every request. It deliberately emits no `<script src>`: Statamic swaps
     * nocache regions in with `setHTMLUnsafe()`, and the HTML spec marks
     * scripts parsed from a string as already-executed, so a loader placed
     * here would sit in the DOM and never run.
     */
    public function config()
    {
        $siteKey = $this->params->get('site_key', SettingsController::getSettingValue('site_key'));

        if (empty($siteKey)) {
            return '';
        }

        if (SettingsController::getSettingValue('logged_in_only', false) && ! auth()->check()) {
            return '';
        }

        $config = json_encode([
            'siteKey' => $siteKey,
            'apiUrl' => $this->params->get('api_url', SettingsController::getSettingValue('api_endpoint', 'https://notedis.com')),
            'position' => $this->params->get('position', SettingsController::getSettingValue('widget_position', 'bottom-right')),
            'color' => $this->params->get('color', SettingsController::getSettingValue('widget_color', '#3B82F6')),
        ]);

        return '<span data-notedis-config=\''.htmlspecialchars($config, ENT_QUOTES).'\'></span>';
    }

    /**
     * The {{ notedis:button }} tag - renders just the config without script.
     * Useful if you want to load the script separately.
     *
     * @return string
     */
    public function button()
    {
        $siteKey = $this->params->get('site_key', SettingsController::getSettingValue('site_key'));

        if (empty($siteKey)) {
            return '';
        }

        $config = [
            'siteKey' => $siteKey,
            'apiUrl' => $this->params->get('api_url', SettingsController::getSettingValue('api_endpoint', 'https://notedis.com')),
            'position' => $this->params->get('position', SettingsController::getSettingValue('widget_position', 'bottom-right')),
            'color' => $this->params->get('color', SettingsController::getSettingValue('widget_color', '#3B82F6')),
        ];

        $configJson = json_encode($config);

        return <<<HTML
<script>
    window.notedisConfig = {$configJson};
</script>
HTML;
    }

    /**
     * The {{ notedis:script }} tag - renders just the script tag.
     * Use with {{ notedis:button }} for more control.
     *
     * @return string
     */
    public function script()
    {
        $widgetSource = $this->params->get('source', SettingsController::getSettingValue('widget_source', 'local'));

        if ($widgetSource === 'cdn') {
            $scriptSrc = 'https://cdn.notedis.com/widget.js';
        } else {
            $scriptSrc = asset('vendor/notedis/js/widget.js');
        }

        return "<script src=\"{$scriptSrc}\"></script>";
    }
}
