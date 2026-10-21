<?php
/** Configuration checkpoint; emits versions and assertions, never credentials. */
global $wpdb;
$checks = [
    'WordPress pin' => get_bloginfo('version') === getenv('KHARDAL_WORDPRESS_VERSION'),
    'WooCommerce pin/activation' => defined('WC_VERSION') && WC_VERSION === getenv('KHARDAL_WOOCOMMERCE_VERSION'),
    'PHP minimum' => version_compare(PHP_VERSION, '8.3', '>='),
    'MariaDB pin' => str_starts_with($wpdb->get_var('SELECT VERSION()'), getenv('KHARDAL_MARIADB_VERSION') . '-'),
    'Spanish Colombia' => get_locale() === 'es_CO',
    'Timezone' => get_option('timezone_string') === 'America/Bogota',
    'Country' => get_option('woocommerce_default_country') === 'CO',
    'Currency' => get_woocommerce_currency() === 'COP',
    'Whole COP display' => wc_get_price_decimals() === 0,
    'Local URL' => home_url() === getenv('WP_LOCAL_URL'),
    'No indexing' => get_option('blog_public') === '0',
    'Local environment' => wp_get_environment_type() === 'local',
    'Updates explicit' => AUTOMATIC_UPDATER_DISABLED && !WP_AUTO_UPDATE_CORE,
    'Local mail suppressed' => apply_filters('pre_wp_mail', null, []) === true,
    'One local API key' => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}woocommerce_api_keys WHERE description = %s", 'Khardal local read-only catalog')) === 1,
];
foreach ($checks as $label => $passed) {
    if (!$passed) {
        WP_CLI::error($label . ' failed.');
    }
}
WP_CLI::success(sprintf('Configuration verified: WordPress %s; PHP %s; WooCommerce %s; %s; es_CO / CO / COP.', get_bloginfo('version'), PHP_VERSION, WC_VERSION, $wpdb->get_var('SELECT VERSION()')));
