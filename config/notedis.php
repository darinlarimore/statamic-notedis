<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Site Key
    |--------------------------------------------------------------------------
    |
    | Your Notedis site key. Get this from your Notedis.com account.
    | This is required for the widget to function.
    |
    */

    'site_key' => env('NOTEDIS_SITE_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | API Endpoint
    |--------------------------------------------------------------------------
    |
    | The Notedis API endpoint. You typically don't need to change this
    | unless you're using a self-hosted version of Notedis.
    |
    */

    'api_endpoint' => env('NOTEDIS_API_ENDPOINT', 'https://notedis.com'),

    /*
    |--------------------------------------------------------------------------
    | Widget Position
    |--------------------------------------------------------------------------
    |
    | Where to display the feedback button on the page.
    | Options: bottom-right, bottom-left, top-right, top-left
    |
    */

    'widget_position' => env('NOTEDIS_WIDGET_POSITION', 'bottom-right'),

    /*
    |--------------------------------------------------------------------------
    | Widget Color
    |--------------------------------------------------------------------------
    |
    | The color of the feedback button. Use a hex color code.
    |
    */

    'widget_color' => env('NOTEDIS_WIDGET_COLOR', '#3B82F6'),

    /*
    |--------------------------------------------------------------------------
    | Logged In Only
    |--------------------------------------------------------------------------
    |
    | Set to true to only show the widget to logged-in users.
    |
    */

    'logged_in_only' => env('NOTEDIS_LOGGED_IN_ONLY', false),

    /*
    |--------------------------------------------------------------------------
    | Show in Control Panel
    |--------------------------------------------------------------------------
    |
    | Set to true to show the widget in the Statamic control panel.
    |
    */

    'show_in_cp' => env('NOTEDIS_SHOW_IN_CP', false),

    /*
    |--------------------------------------------------------------------------
    | Widget Source
    |--------------------------------------------------------------------------
    |
    | Where to load the widget JavaScript from.
    | Options: local (recommended), cdn
    |
    */

    'widget_source' => env('NOTEDIS_WIDGET_SOURCE', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Auto Inject
    |--------------------------------------------------------------------------
    |
    | Automatically inject the widget on all pages. Set to false if you
    | want to manually add the widget using the {{ notedis }} tag.
    |
    */

    'auto_inject' => env('NOTEDIS_AUTO_INJECT', true),

];
