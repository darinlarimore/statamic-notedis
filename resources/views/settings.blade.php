@extends('statamic::layout')

@section('title', 'Notedis Settings')

@section('content')

<div class="flex items-center justify-between mb-6">
    <h1 class="flex-1">{{ __('Notedis Settings') }}</h1>
</div>

<div class="card p-0">
    <form method="POST" action="{{ cp_route('notedis.settings.update') }}" id="notedis-settings-form">
        @csrf

        <div class="p-6 space-y-6">

            {{-- Site Key --}}
            <div class="form-group">
                <label class="block mb-2 font-bold">
                    Site Key <span class="text-red-500">*</span>
                    @if($envConfigured['site_key'])
                        <span class="ml-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">ENV</span>
                    @endif
                </label>
                <input
                    type="text"
                    name="site_key"
                    class="input-text w-full {{ $envConfigured['site_key'] ? 'text-gray-600 cursor-not-allowed' : '' }}"
                    value="{{ old('site_key', $settings['site_key'] ?? '') }}"
                    {{ $envConfigured['site_key'] ? 'readonly' : 'required' }}
                    placeholder="your-notedis-site-key"
                >
                <p class="mt-1 text-xs text-gray-600">
                    @if($envConfigured['site_key'])
                        This setting is configured via environment variable (NOTEDIS_SITE_KEY) and cannot be changed here.
                    @else
                        Your Notedis site key. <a href="https://notedis.com/dashboard" target="_blank" class="text-blue-600 hover:text-blue-800 underline">Get your site key from Notedis.com →</a>
                    @endif
                </p>
                @error('site_key')
                    <p class="mt-1 text-xs text-red-600">{{ $message }}</p>
                @enderror
            </div>

            {{-- API Endpoint --}}
            <div class="form-group">
                <label class="block mb-2 font-bold">
                    API Endpoint
                    @if($envConfigured['api_endpoint'])
                        <span class="ml-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">ENV</span>
                    @endif
                </label>
                <input
                    type="url"
                    name="api_endpoint"
                    class="input-text w-full {{ $envConfigured['api_endpoint'] ? 'text-gray-600 cursor-not-allowed' : '' }}"
                    value="{{ old('api_endpoint', $settings['api_endpoint'] ?? 'https://notedis.com') }}"
                    placeholder="https://notedis.com"
                    {{ $envConfigured['api_endpoint'] ? 'readonly' : '' }}
                >
                <p class="mt-1 text-xs text-gray-600">
                    @if($envConfigured['api_endpoint'])
                        This setting is configured via environment variable (NOTEDIS_API_ENDPOINT) and cannot be changed here.
                    @else
                        The Notedis API endpoint. Leave default unless using a self-hosted version.
                    @endif
                </p>
                @error('api_endpoint')
                    <p class="mt-1 text-xs text-red-600">{{ $message }}</p>
                @enderror
            </div>

            {{-- Widget Position --}}
            <div class="form-group">
                <label class="block mb-2 font-bold">
                    Button Position
                    @if($envConfigured['widget_position'])
                        <span class="ml-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">ENV</span>
                    @endif
                </label>
                <select name="widget_position" class="input-text w-full {{ $envConfigured['widget_position'] ? 'text-gray-600 cursor-not-allowed' : '' }}" {{ $envConfigured['widget_position'] ? 'disabled' : '' }}>
                    <option value="bottom-right" {{ ($settings['widget_position'] ?? 'bottom-right') == 'bottom-right' ? 'selected' : '' }}>
                        Bottom Right
                    </option>
                    <option value="bottom-left" {{ ($settings['widget_position'] ?? '') == 'bottom-left' ? 'selected' : '' }}>
                        Bottom Left
                    </option>
                    <option value="top-right" {{ ($settings['widget_position'] ?? '') == 'top-right' ? 'selected' : '' }}>
                        Top Right
                    </option>
                    <option value="top-left" {{ ($settings['widget_position'] ?? '') == 'top-left' ? 'selected' : '' }}>
                        Top Left
                    </option>
                </select>
                @if($envConfigured['widget_position'])
                    <input type="hidden" name="widget_position" value="{{ $settings['widget_position'] ?? 'bottom-right' }}">
                @endif
                <p class="mt-1 text-xs text-gray-600">
                    @if($envConfigured['widget_position'])
                        This setting is configured via environment variable (NOTEDIS_WIDGET_POSITION) and cannot be changed here.
                    @else
                        Where to display the feedback button on the page.
                    @endif
                </p>
                @error('widget_position')
                    <p class="mt-1 text-xs text-red-600">{{ $message }}</p>
                @enderror
            </div>

            {{-- Widget Color --}}
            <div class="form-group">
                <label class="block mb-2 font-bold">
                    Button Color
                    @if($envConfigured['widget_color'])
                        <span class="ml-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">ENV</span>
                    @endif
                </label>
                <div class="flex items-center gap-3">
                    <input
                        type="color"
                        name="widget_color"
                        id="widget_color_picker"
                        class="h-10 w-16 rounded border border-gray-300 {{ $envConfigured['widget_color'] ? 'cursor-not-allowed opacity-50' : 'cursor-pointer' }}"
                        value="{{ old('widget_color', $settings['widget_color'] ?? '#3B82F6') }}"
                        {{ $envConfigured['widget_color'] ? 'disabled' : '' }}
                    >
                    <input
                        type="text"
                        id="widget_color_text"
                        class="input-text flex-1 {{ $envConfigured['widget_color'] ? 'text-gray-600 cursor-not-allowed' : '' }}"
                        value="{{ old('widget_color', $settings['widget_color'] ?? '#3B82F6') }}"
                        placeholder="#3B82F6"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        {{ $envConfigured['widget_color'] ? 'readonly' : '' }}
                    >
                </div>
                <p class="mt-1 text-xs text-gray-600">
                    @if($envConfigured['widget_color'])
                        This setting is configured via environment variable (NOTEDIS_WIDGET_COLOR) and cannot be changed here.
                    @else
                        The color of the feedback button (hex color code).
                    @endif
                </p>
                @error('widget_color')
                    <p class="mt-1 text-xs text-red-600">{{ $message }}</p>
                @enderror
            </div>

            {{-- Widget Source --}}
            <div class="form-group">
                <label class="block mb-2 font-bold">
                    Widget Source
                    @if($envConfigured['widget_source'])
                        <span class="ml-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">ENV</span>
                    @endif
                </label>
                <select name="widget_source" class="input-text w-full {{ $envConfigured['widget_source'] ? 'text-gray-600 cursor-not-allowed' : '' }}" {{ $envConfigured['widget_source'] ? 'disabled' : '' }}>
                    <option value="local" {{ ($settings['widget_source'] ?? 'local') == 'local' ? 'selected' : '' }}>
                        Local (Recommended)
                    </option>
                    <option value="cdn" {{ ($settings['widget_source'] ?? '') == 'cdn' ? 'selected' : '' }}>
                        CDN
                    </option>
                </select>
                @if($envConfigured['widget_source'])
                    <input type="hidden" name="widget_source" value="{{ $settings['widget_source'] ?? 'local' }}">
                @endif
                <p class="mt-1 text-xs text-gray-600">
                    @if($envConfigured['widget_source'])
                        This setting is configured via environment variable (NOTEDIS_WIDGET_SOURCE) and cannot be changed here.
                    @else
                        Where to load the widget JavaScript from. Local is recommended for better performance and privacy.
                    @endif
                </p>
                @error('widget_source')
                    <p class="mt-1 text-xs text-red-600">{{ $message }}</p>
                @enderror
            </div>

            {{-- Auto Inject --}}
            <div class="form-group">
                <label class="flex items-center">
                    <input
                        type="hidden"
                        name="auto_inject"
                        value="0"
                    >
                    <input
                        type="checkbox"
                        name="auto_inject"
                        value="1"
                        class="mr-2"
                        {{ ($settings['auto_inject'] ?? true) ? 'checked' : '' }}
                        {{ $envConfigured['auto_inject'] ? 'disabled' : '' }}
                    >
                    <span class="font-bold">Automatically inject widget on all pages</span>
                    @if($envConfigured['auto_inject'])
                        <span class="ml-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">ENV</span>
                    @endif
                </label>
                <p class="mt-1 ml-6 text-xs text-gray-600">
                    @if($envConfigured['auto_inject'])
                        This setting is configured via environment variable (NOTEDIS_AUTO_INJECT) and cannot be changed here.
                    @else
                        When enabled, the widget will appear on all pages automatically. Disable to use manual placement with tags.
                    @endif
                </p>
                @error('auto_inject')
                    <p class="mt-1 ml-6 text-xs text-red-600">{{ $message }}</p>
                @enderror
            </div>

            {{-- Logged In Only --}}
            <div class="form-group">
                <label class="flex items-center">
                    <input
                        type="hidden"
                        name="logged_in_only"
                        value="0"
                    >
                    <input
                        type="checkbox"
                        name="logged_in_only"
                        value="1"
                        class="mr-2"
                        {{ ($settings['logged_in_only'] ?? false) ? 'checked' : '' }}
                        {{ $envConfigured['logged_in_only'] ? 'disabled' : '' }}
                    >
                    <span class="font-bold">Show only to logged-in users</span>
                    @if($envConfigured['logged_in_only'])
                        <span class="ml-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">ENV</span>
                    @endif
                </label>
                <p class="mt-1 ml-6 text-xs text-gray-600">
                    @if($envConfigured['logged_in_only'])
                        This setting is configured via environment variable (NOTEDIS_LOGGED_IN_ONLY) and cannot be changed here.
                    @else
                        Restrict widget visibility to authenticated users only.
                    @endif
                </p>
                @error('logged_in_only')
                    <p class="mt-1 ml-6 text-xs text-red-600">{{ $message }}</p>
                @enderror
            </div>

            {{-- Show in CP --}}
            <div class="form-group">
                <label class="flex items-center">
                    <input
                        type="hidden"
                        name="show_in_cp"
                        value="0"
                    >
                    <input
                        type="checkbox"
                        name="show_in_cp"
                        value="1"
                        class="mr-2"
                        {{ ($settings['show_in_cp'] ?? false) ? 'checked' : '' }}
                        {{ $envConfigured['show_in_cp'] ? 'disabled' : '' }}
                    >
                    <span class="font-bold">Show widget in Control Panel</span>
                    @if($envConfigured['show_in_cp'])
                        <span class="ml-2 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">ENV</span>
                    @endif
                </label>
                <p class="mt-1 ml-6 text-xs text-gray-600">
                    @if($envConfigured['show_in_cp'])
                        This setting is configured via environment variable (NOTEDIS_SHOW_IN_CP) and cannot be changed here.
                    @else
                        Enable the feedback widget inside the Statamic Control Panel for team feedback.
                    @endif
                </p>
                @error('show_in_cp')
                    <p class="mt-1 ml-6 text-xs text-red-600">{{ $message }}</p>
                @enderror
            </div>

        </div>

        <div class="border-t p-4 bg-gray-50 flex justify-between items-center">
            <a href="{{ cp_route('index') }}" class="btn">
                {{ __('Cancel') }}
            </a>
            <button type="submit" class="btn-primary">
                {{ __('Save Settings') }}
            </button>
        </div>
    </form>
</div>

<script>
// Sync color picker and text input
document.addEventListener('DOMContentLoaded', function() {
    const colorPicker = document.getElementById('widget_color_picker');
    const colorText = document.getElementById('widget_color_text');

    if (colorPicker && colorText) {
        colorPicker.addEventListener('change', function() {
            colorText.value = this.value;
        });

        colorText.addEventListener('change', function() {
            if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
                colorPicker.value = this.value;
            }
        });
    }

    // Handle form submission via AJAX
    const form = document.getElementById('notedis-settings-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;

            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => {
                // Show success message
                if (window.$toast) {
                    window.$toast.success(data.message || 'Settings saved successfully');
                } else {
                    alert(data.message || 'Settings saved successfully');
                }
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            })
            .catch(error => {
                console.error('Error:', error);
                if (window.$toast) {
                    window.$toast.error('Failed to save settings');
                } else {
                    alert('Failed to save settings');
                }
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            });
        });
    }
});
</script>

@endsection
