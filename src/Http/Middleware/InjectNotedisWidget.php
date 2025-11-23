<?php

namespace Notedis\StatamicNotedis\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Notedis\StatamicNotedis\Http\Controllers\SettingsController;

class InjectNotedisWidget
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Only inject if auto-inject is enabled
        if (! SettingsController::getSettingValue('auto_inject', true)) {
            return $response;
        }

        // Only inject on HTML responses
        if (! $this->isHtmlResponse($response)) {
            return $response;
        }

        // Check if we should show the widget
        if (! $this->shouldShowWidget()) {
            return $response;
        }

        // Inject the widget
        $content = $response->getContent();
        $widgetScript = $this->getWidgetScript();

        // Inject before closing body tag
        if (str_contains($content, '</body>')) {
            $content = str_replace('</body>', $widgetScript.'</body>', $content);
            $response->setContent($content);
        }

        return $response;
    }

    protected function isHtmlResponse($response): bool
    {
        if (! $response instanceof Response) {
            // Check if it's a different type of response that has a getContent method
            if (! method_exists($response, 'getContent')) {
                return false;
            }
        }

        $contentType = $response->headers->get('Content-Type', '');

        // If no content type is set but response has content, check if it looks like HTML
        if (empty($contentType)) {
            $content = $response->getContent();

            return str_contains($content, '<html') || str_contains($content, '<!DOCTYPE');
        }

        return str_contains($contentType, 'text/html');
    }

    protected function shouldShowWidget(): bool
    {
        $siteKey = SettingsController::getSettingValue('site_key');

        if (empty($siteKey)) {
            return false;
        }

        // Don't show in CP unless specifically enabled
        if (request()->is(config('statamic.cp.route', 'cp').'*')) {
            return SettingsController::getSettingValue('show_in_cp', false);
        }

        // Check if logged in only mode is enabled
        if (SettingsController::getSettingValue('logged_in_only', false)) {
            return auth()->check();
        }

        return true;
    }

    protected function getWidgetScript(): string
    {
        $config = [
            'siteKey' => SettingsController::getSettingValue('site_key'),
            'apiUrl' => SettingsController::getSettingValue('api_endpoint', 'https://notedis.com'),
            'position' => SettingsController::getSettingValue('widget_position', 'bottom-right'),
            'color' => SettingsController::getSettingValue('widget_color', '#3B82F6'),
        ];

        $configJson = json_encode($config);
        $widgetSource = SettingsController::getSettingValue('widget_source', 'local');

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
}
