<?php
/** Local development only; shared by Apache and WP-CLI. */
if (!defined('ABSPATH')) {
    exit;
}
if (wp_get_environment_type() === 'local') {
    // Keep the verified release set stable; all upgrades are explicit.
    add_filter('auto_update_plugin', '__return_false');
    add_filter('auto_update_theme', '__return_false');
    // Local admin/order tests must not send real customer email.
    add_filter('pre_wp_mail', '__return_true');
}
