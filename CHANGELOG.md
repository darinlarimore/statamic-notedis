# Changelog

All notable changes to the Notedis Statamic addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-09-22

### Fixed
- The widget never appeared on statically cached sites. Statamic swaps nocache
  regions into the page with `setHTMLUnsafe()`, and the HTML spec marks scripts
  parsed from a string as already-executed, so the `<script src>` the region
  carried sat in the DOM and never ran -- `window.notedisWidget` stayed
  undefined and no button was created. The loader is now written into the page
  itself, where it executes normally, and only the per-visitor config travels
  through the nocache region, so the logged-in check still runs per request.

### Added
- A `{{ notedis:config }}` tag that emits the widget settings as data without a
  script tag, for placing inside a `{{ nocache }}` region.

## [1.3.1] - 2026-09-22

### Fixed
- Environment variables were ignored on config-cached installs. `env()` returns
  null outside config files once `artisan config:cache` has run (as
  `artisan optimize` does on most deploys), so every `NOTEDIS_*` variable looked
  unset: the settings page showed no ENV badges and left the fields editable,
  and saving the form wrote a YAML file that then outranked the environment.
  Both checks now read through `config()`, comparing against the fallbacks in
  `config/notedis.php`.

## [1.3.0] - 2026-09-22

### Changed
- **Breaking:** the permission is now `manage notedis` rather than
  `configure notedis`. Control Panel lockdown addons commonly deny every
  `configure *` permission -- `trendyminds/nerf` does, with a hardcoded
  allowlist -- which made the settings page redirect to the dashboard on any
  site running one, super users included. If you granted `configure notedis`
  to a role, re-grant `manage notedis`.

## [1.2.1] - 2026-09-22

### Fixed
- The Control Panel settings page could redirect to the dashboard instead of
  opening, even for super users. The `configure notedis` permission was added
  with `Permission::register()` from `bootAddon()`, so if Statamic booted its
  permissions before this addon booted, the registration landed after boot had
  finished and the gate never learned the ability -- and `Gate::after` only
  grants super users abilities it recognises as Statamic permissions. It is now
  registered through `Permission::extend()`, which is replayed on boot
  regardless of ordering.

## [1.2.0] - 2026-09-22

### Fixed
- The widget now works on statically cached sites. Injection happened in
  middleware that wraps Statamic's static cache, so a cached page was replayed
  without it ever running and the button never appeared. Injection moved to the
  `ResponseCreated` event, which fires before the page is cached, and on a
  statically cached route the widget is registered as a `nocache` region so the
  site key lookup and the logged-in check run on every request rather than
  being frozen into the cache.

## [1.1.2] - 2026-09-22

### Fixed
- Saving settings in the Control Panel still rendered the raw JSON response.
  The Control Panel reads the view's markup out of the Vue mount point and
  recompiles it as a template, so the form on screen is a new element and the
  listener bound in 1.1.1 was attached to a discarded one. The submit and
  colour-field handlers are now delegated from `document`, which survives that
  re-render.

## [1.1.1] - 2026-09-22

### Fixed
- Saving settings in the Control Panel no longer replaces the page with the raw
  JSON response. The Control Panel renders addon views inside the Vue app's
  mount point and boots from deferred scripts, so the old `DOMContentLoaded`
  handler never bound to the form and it fell back to a native POST. The script
  now renders in the `scripts` section, outside that element.
- Use `Statamic.$toast` for save notifications; `window.$toast` is not defined,
  so every save fell through to `alert()`.
- Surface a failed save instead of reporting success on a non-2xx response.

## [1.1.0] - 2026-09-22

### Changed
- Added support for Statamic 6.x
- Added support for PHP 8.4

### Fixed
- Republish the widget script on `statamic:install` so deploys that gitignore
  `public/vendor` still serve `widget.js`

## [1.0.0] - 2025-01-23

### Added
- Initial release of Notedis Statamic addon
- **Control Panel settings page** - Configure everything through Statamic UI
- Automatic widget injection on all pages
- Template tag support (`{{ notedis }}`)
- Fieldtype for per-entry widget control
- Configuration via environment variables or CP settings
- Support for multiple widget positions (bottom-right, bottom-left, top-right, top-left)
- Customizable button color with visual color picker in CP
- Logged-in-only display mode
- Control Panel display option
- Local and CDN widget loading options
- Complete documentation (README, INSTALL)
- Compatible with Statamic 4.x and 5.x
- Compatible with PHP 8.1, 8.2, and 8.3

### Features
- **Visual settings interface** in Control Panel under Tools > Notedis
- Permission-based access control for settings
- Settings stored in YAML format for portability
- Auto-injection with configurable on/off toggle
- Manual template tag placement
- Advanced tag parameters for per-page customization
- Fieldtype for blueprint-based widget configuration
- Secure authentication and access control
- Respects user login state
- Browser compatibility detection
- Comprehensive error handling
- Real-time settings updates without cache clearing

[Unreleased]: https://github.com/darinlarimore/statamic-notedis/compare/1.4.0...HEAD
[1.4.0]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.4.0
[1.3.1]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.3.1
[1.3.0]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.3.0
[1.2.1]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.2.1
[1.2.0]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.2.0
[1.1.2]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.1.2
[1.1.1]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.1.1
[1.1.0]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.1.0
[1.0.0]: https://github.com/darinlarimore/statamic-notedis/releases/tag/v1.0.0
