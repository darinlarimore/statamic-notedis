<?php

namespace Notedis\StatamicNotedis\Listeners;

use Notedis\StatamicNotedis\Http\Controllers\SettingsController;
use Notedis\StatamicNotedis\Tags\Notedis as NotedisTag;
use Statamic\Events\ResponseCreated;
use Statamic\Facades\Antlers;
use Statamic\StaticCaching\Middleware\Cache;
use Statamic\StaticCaching\NoCache\Session;
use Statamic\Tags\Context;
use Statamic\Tags\Parameters;

class InjectWidgetIntoResponse
{
    public function handle(ResponseCreated $event): void
    {
        if (! SettingsController::getSettingValue('auto_inject', true)) {
            return;
        }

        if (empty(SettingsController::getSettingValue('site_key'))) {
            return;
        }

        $response = $event->response;
        $content = $response->getContent();

        if (! is_string($content) || ! str_contains($content, '</body>')) {
            return;
        }

        if (($markup = $this->markup()) === null) {
            return;
        }

        $response->setContent(str_replace('</body>', $markup.'</body>', $content));
    }

    /**
     * The widget markup, as a nocache region when the page is statically cached.
     *
     * A cached page is replayed without this code running again, so rendered
     * markup would be frozen in for every visitor. Storing the tag instead
     * means the logged-in check runs on each request.
     */
    protected function markup(): ?string
    {
        if ($this->isStaticallyCached()) {
            return $this->staticallyCachedMarkup();
        }

        if (SettingsController::getSettingValue('logged_in_only', false) && ! auth()->check()) {
            return null;
        }

        $tag = app(NotedisTag::class);
        $tag->setParser(Antlers::parser());
        $tag->setContext(new Context([]));
        $tag->setParameters(Parameters::make([], new Context([])));

        return $tag->widget();
    }

    /**
     * The widget on a statically cached page.
     *
     * Only the config travels through the nocache region, because Statamic
     * swaps those in with `setHTMLUnsafe()` and scripts parsed from a string
     * never execute -- which left the loader sitting inert in the DOM. The
     * loader is written into the page itself, where it runs normally, and
     * waits for the region to arrive before booting the widget.
     */
    protected function staticallyCachedMarkup(): string
    {
        $placeholder = app(Session::class)
            ->pushRegion('{{ notedis:config }}', [], 'antlers.html')
            ->placeholder();

        $src = json_encode($this->scriptSource());

        return $placeholder.<<<HTML
<script>
(function () {
    var load = function () {
        var holder = document.querySelector('[data-notedis-config]');

        if (! holder || window.notedisConfig) {
            return !! holder;
        }

        try {
            window.notedisConfig = JSON.parse(holder.getAttribute('data-notedis-config'));
        } catch (e) {
            return true;
        }

        var script = document.createElement('script');
        script.src = {$src};
        script.async = true;
        document.body.appendChild(script);

        return true;
    };

    if (! load()) {
        document.addEventListener('statamic:nocache.replaced', load, { once: true });
    }
})();
</script>
HTML;
    }

    /**
     * Where the widget script is served from.
     */
    protected function scriptSource(): string
    {
        return SettingsController::getSettingValue('widget_source', 'local') === 'cdn'
            ? 'https://cdn.notedis.com/widget.js'
            : asset('vendor/notedis/js/widget.js');
    }

    protected function isStaticallyCached(): bool
    {
        return class_exists(Cache::class) && Cache::isBeingUsedOnCurrentRoute();
    }
}
