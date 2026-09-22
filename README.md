# Notedis Widget for Statamic

Add a floating feedback button to your Statamic site that lets visitors submit feedback, bug reports, and feature requests directly to your [Notedis.com](https://notedis.com) dashboard.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Settings Storage](#settings-storage)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Support](#support)
- [License](#license)

## Features

- **Control Panel Settings** - Configure everything through Statamic's UI (no .env editing required!)
- **Automatic Widget Integration** - Widget appears on all pages by default with zero configuration beyond the site key
- **Customizable Appearance** - Button position and color with visual color picker
- **User Access Control** - Show to all visitors or logged-in users only
- **Control Panel Support** - Optional widget display in Statamic CP for team feedback
- **Multiple Integration Methods** - Auto-inject, template tags, or fieldtype
- **Settings Persistence** - Settings stored in `resources/notedis.yaml` (version controlled)
- **Permission System** - Role-based access control for configuration
- **Secure Implementation** - Proper authentication and input validation
- **Compatible** - Statamic 4.x, 5.x & 6.x, PHP 8.1+
- **Static caching aware** - works with Statamic's half and full static caching

## Requirements

- **Statamic**: 4.x, 5.x, or 6.x
- **PHP**: 8.1, 8.2, 8.3, or 8.4
- **Composer**: For package management
- **Notedis Account**: Get your site key from [Notedis.com](https://notedis.com)

## Installation

### Via Composer (Recommended)

```bash
cd /path/to/your/statamic/project
composer require notedis/statamic-notedis
```

Assets will be published automatically during installation.

### Publish Configuration (Optional)

If you need to customize default values:

```bash
php artisan vendor:publish --tag=notedis-config
```

This creates `config/notedis.php` where you can set default values.

### Verify Installation

1. Log into your Statamic Control Panel
2. Navigate to **Tools > Notedis** (look for the pencil icon)
3. You should see the settings page

## Configuration

### Control Panel Settings (Recommended)

The easiest way to configure Notedis:

1. Log into your Statamic Control Panel
2. Navigate to **Tools > Notedis** in the sidebar
3. Enter your Notedis site key ([Get your site key from Notedis.com →](https://notedis.com/dashboard))
4. Customize widget settings:
   - **Button Position**: bottom-right, bottom-left, top-right, top-left
   - **Button Color**: Visual color picker (hex format)
   - **Widget Source**: Local (recommended) or CDN
   - **Auto Inject**: Automatically add widget to all pages
   - **Logged In Only**: Restrict to authenticated users
   - **Show in Control Panel**: Display widget in Statamic CP
5. Click **Save Settings**

Settings are saved to `resources/notedis.yaml` and take effect immediately.

**Note**: Settings configured via environment variables will take precedence over Control Panel settings and will be displayed as read-only in the UI.

### Environment Variables (Higher Priority)

You can configure settings via `.env` file. Environment variables override Control Panel settings:

```env
# Required
NOTEDIS_SITE_KEY=your-site-key-here

# Optional
NOTEDIS_API_ENDPOINT=https://notedis.com
NOTEDIS_WIDGET_POSITION=bottom-right
NOTEDIS_WIDGET_COLOR=#3B82F6
NOTEDIS_LOGGED_IN_ONLY=false
NOTEDIS_SHOW_IN_CP=false
NOTEDIS_WIDGET_SOURCE=local
NOTEDIS_AUTO_INJECT=true
```

**Note**: Environment variables take priority over Control Panel settings. If a setting is configured via environment variable, it will be shown as read-only in the Control Panel with an ENV badge.

## Usage

### Method 1: Automatic Injection (Default)

Once you configure your site key, the widget automatically appears on all pages. No code needed!

To disable auto-injection:
- Uncheck "Automatically inject widget on all pages" in Control Panel, or
- Set `NOTEDIS_AUTO_INJECT=false` in `.env`

### Method 2: Template Tag

Add the widget manually using Antlers tags:

```antlers
{{ notedis }}
```

#### Tag Parameters

Override default settings per-page:

```antlers
{{ notedis
    site_key="your-site-key"
    position="bottom-left"
    color="#FF5733"
    source="cdn"
}}
```

Available parameters:
- `site_key` - Your Notedis site key
- `api_url` - API endpoint (default: https://notedis.com)
- `position` - `bottom-right`, `bottom-left`, `top-right`, `top-left`
- `color` - Hex color code (e.g., `#3B82F6`)
- `source` - `local` or `cdn`

#### Advanced Tag Usage

Split config and script for more control:

```antlers
{{# Load config #}}
{{ notedis:button position="bottom-left" color="#FF5733" }}

{{# Load script separately #}}
{{ notedis:script source="local" }}
```

### Method 3: Fieldtype

Add widget control per-entry using blueprints:

**1. Add to blueprint:**

```yaml
fields:
  -
    handle: feedback_widget
    field:
      type: notedis
      display: 'Feedback Widget'
      site_key: '' # Optional: override default
      position: bottom-right
      color: '#3B82F6'
```

**2. Use in template:**

```antlers
{{ feedback_widget }}
```

## Usage Examples

### Example 1: Public Website

Show feedback button to all visitors on frontend only:

```env
NOTEDIS_SITE_KEY=your-site-key-here
NOTEDIS_SHOW_IN_CP=false
NOTEDIS_LOGGED_IN_ONLY=false
```

### Example 2: Members-Only Site

Display button only to logged-in users:

```env
NOTEDIS_SITE_KEY=your-site-key-here
NOTEDIS_LOGGED_IN_ONLY=true
```

### Example 3: Internal Tool

Show button everywhere including Control Panel:

```env
NOTEDIS_SITE_KEY=your-site-key-here
NOTEDIS_SHOW_IN_CP=true
```

### Example 4: Manual Placement

Disable auto-injection and place widget manually:

```env
NOTEDIS_SITE_KEY=your-site-key-here
NOTEDIS_AUTO_INJECT=false
```

Then in your layout:

```antlers
<!DOCTYPE html>
<html>
<head>
    <title>{{ title }}</title>
</head>
<body>
    {{ template_content }}
    {{ notedis position="bottom-right" color="#3B82F6" }}
</body>
</html>
```

## Settings Storage

Settings configured in the Control Panel are stored in:

```
resources/notedis.yaml
```

This file is **version controlled** and gets committed with your site content. This means:
- ✅ Settings are portable across environments
- ✅ Settings are backed up with your code
- ✅ Settings can be tracked in git
- ✅ Settings deploy with your site

### Settings Priority

The addon uses the following priority order (highest to lowest):

1. **Environment Variables** (`.env` file) - Highest priority
2. **Control Panel Settings** (`resources/notedis.yaml`)
3. **Config File Defaults** (`config/notedis.php`)

When a setting is configured via environment variable, it will override any value in the Control Panel and be displayed as read-only with an ENV badge in the settings UI.

Example `resources/notedis.yaml`:

```yaml
site_key: your-key-here
api_endpoint: https://notedis.com
widget_position: bottom-right
widget_color: '#3B82F6'
auto_inject: true
logged_in_only: false
show_in_cp: false
widget_source: local
```

## Troubleshooting

### Widget Not Appearing

1. **Check site key**: Verify it's correct in Control Panel or `.env`
2. **Browser console**: Look for JavaScript errors (F12)
3. **Clear cache**: Run `php please cache:clear`
4. **Auto-inject**: Ensure it's enabled or you've added the tag manually
5. **User restrictions**: Check if logged-in-only mode is limiting visibility
6. **Assets published**: Verify `public/vendor/notedis/js/widget.js` exists

### Button Position Not Changing

Valid positions:
- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`

### Color Not Applying

- ✅ Correct: `#3B82F6`
- ❌ Incorrect: `3B82F6` (missing `#`)

### 404 Error for widget.js

Run asset publish command:

```bash
php please vendor:publish --tag=notedis-assets
```

### Control Panel Widget Not Showing

Enable in settings:
- Check "Show widget in Control Panel" in CP settings, or
- Set `NOTEDIS_SHOW_IN_CP=true` in `.env`

### Settings Not Saving

1. Check file permissions on `resources/` directory
2. Verify user has "Configure Notedis" permission
3. Check browser console for AJAX errors

## Development

### Project Structure

```
statamic-notedis/
├── src/
│   ├── Fieldtypes/
│   │   └── NotedisFieldtype.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── SettingsController.php
│   │   └── Middleware/
│   │       └── InjectNotedisWidget.php
│   ├── Tags/
│   │   └── Notedis.php
│   └── ServiceProvider.php
├── config/
│   └── notedis.php
├── resources/
│   ├── dist/js/widget.js
│   └── views/settings.blade.php
├── routes/
│   └── cp.php
├── composer.json
├── CHANGELOG.md
├── LICENSE.md
└── README.md
```

### Code Formatting

Format code with Laravel Pint:

```bash
./vendor/bin/pint
```

### Permissions

The addon registers a `manage notedis` permission. Assign this to roles that should manage Notedis settings in the Control Panel.

It is deliberately not named `configure notedis`: Control Panel lockdown addons such as `trendyminds/nerf` deny every `configure *` permission, which would make the settings page unreachable.

## Support

### Issues

- **Addon Issues**: [GitHub Issues](https://github.com/darinlarimore/statamic-notedis/issues)
- **Notedis Service**: [Notedis Support](https://notedis.com/support)

### Resources

- [Notedis.com](https://notedis.com) - Official Notedis website
- [Statamic](https://statamic.com) - Statamic CMS
- [GitHub Repository](https://github.com/darinlarimore/statamic-notedis)

## License

MIT License. See [LICENSE.md](LICENSE.md) for details.

---

**Made with ❤️ for Statamic**
