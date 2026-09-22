# Changelog

All notable changes to the Notedis Statamic addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/darinlarimore/statamic-notedis/compare/1.1.0...HEAD
[1.1.0]: https://github.com/darinlarimore/statamic-notedis/releases/tag/1.1.0
[1.0.0]: https://github.com/darinlarimore/statamic-notedis/releases/tag/v1.0.0
