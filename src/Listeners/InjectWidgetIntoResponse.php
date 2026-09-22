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
            return app(Session::class)
                ->pushRegion('{{ notedis }}', [], 'antlers.html')
                ->placeholder();
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

    protected function isStaticallyCached(): bool
    {
        return class_exists(Cache::class) && Cache::isBeingUsedOnCurrentRoute();
    }
}
