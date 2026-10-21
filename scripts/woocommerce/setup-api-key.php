<?php
/** Run through WP-CLI, after WooCommerce activation. Never print credentials. */
global $wpdb;
$user = get_user_by('login', getenv('WC_ADMIN_USER'));
if (!$user || !user_can($user, 'manage_woocommerce')) {
    WP_CLI::error('The configured local administrator cannot manage WooCommerce.');
}
$key = getenv('WC_API_CONSUMER_KEY');
$secret = getenv('WC_API_CONSUMER_SECRET');
if (!preg_match('/^ck_[a-f0-9]{40}$/', $key) || !preg_match('/^cs_[a-f0-9]{40}$/', $secret)) {
    WP_CLI::error('Invalid local API credential format.');
}
$table = $wpdb->prefix . 'woocommerce_api_keys';
$description = 'Khardal local read-only catalog';
$existing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE description = %s", $description));
if ($existing) {
    if (!hash_equals($existing->consumer_key, wc_api_hash($key)) || !hash_equals($existing->consumer_secret, $secret) || $existing->permissions !== 'read' || (int) $existing->user_id !== $user->ID) {
        WP_CLI::error('Existing local API credentials differ. Restore the original env file or rotate explicitly.');
    }
    WP_CLI::success('Existing read-only API key preserved.');
    return;
}
$inserted = $wpdb->insert($table, [
    'user_id' => $user->ID,
    'description' => $description,
    'permissions' => 'read',
    'consumer_key' => wc_api_hash($key),
    'consumer_secret' => $secret,
    'truncated_key' => substr($key, -7),
]);
if (!$inserted) {
    WP_CLI::error('Could not create the local read-only API key.');
}
WP_CLI::success('Local read-only API key created.');
