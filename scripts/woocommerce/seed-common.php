<?php
const KHARDAL_SEED = 'khardal-demo-v1';
const KHARDAL_SEED_META = '_khardal_fixture_seed';

function khardal_assert($condition, $message) {
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function khardal_guard() {
    global $wpdb;
    khardal_assert(wp_get_environment_type() === 'local', 'Fixture commands require the local environment.');
    khardal_assert(in_array(wp_parse_url(home_url(), PHP_URL_HOST), ['127.0.0.1', 'localhost'], true), 'Fixture commands require a loopback site URL.');
    khardal_assert(defined('WC_VERSION') && WC_VERSION === getenv('KHARDAL_WOOCOMMERCE_VERSION'), 'Run the pinned local setup first.');
    khardal_assert(get_woocommerce_currency() === 'COP', 'Fixtures require COP.');
    khardal_assert((int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', 'khardal_demo_' . $wpdb->prefix)) === 1, 'Another fixture command is running.');
}

function khardal_sku_id($sku) {
    global $wpdb;
    $ids = $wpdb->get_col($wpdb->prepare("SELECT DISTINCT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_sku' AND meta_value = %s", $sku));
    khardal_assert(count($ids) <= 1, 'Duplicate SKU already exists: ' . $sku);
    if (!$ids) return 0;
    $id = (int) $ids[0];
    khardal_assert(get_post_meta($id, KHARDAL_SEED_META, true) === KHARDAL_SEED, 'SKU belongs to an unrelated record: ' . $sku);
    khardal_assert(get_post_status($id) !== 'trash', 'Restore or explicitly remove the trashed fixture SKU first: ' . $sku);
    return $id;
}

function khardal_term_id($taxonomy, $slug) {
    $term = get_term_by('slug', $slug, $taxonomy);
    if (!$term) return 0;
    khardal_assert(get_term_meta($term->term_id, KHARDAL_SEED_META, true) === KHARDAL_SEED, 'Taxonomy slug belongs to an unrelated term: ' . $slug);
    return (int) $term->term_id;
}

function khardal_image_id($id) {
    $ids = get_posts(['post_type' => 'attachment', 'post_status' => ['inherit', 'private', 'publish', 'trash'], 'fields' => 'ids', 'posts_per_page' => -1, 'meta_key' => '_khardal_fixture_image_id', 'meta_value' => $id]);
    khardal_assert(count($ids) <= 1, 'Duplicate fixture image: ' . $id);
    if (!$ids) return 0;
    khardal_assert(get_post_meta($ids[0], KHARDAL_SEED_META, true) === KHARDAL_SEED && get_post_status($ids[0]) !== 'trash', 'Fixture image is unrelated or trashed: ' . $id);
    return (int) $ids[0];
}

function khardal_categories($catalog) {
    $categories = [
        'khardal-demo-colecciones' => ['name' => 'Colecciones de muestra', 'description' => 'Colecciones del catálogo de demostración.', 'parent' => ''],
        'khardal-demo-tipos' => ['name' => 'Tipos de perfume de muestra', 'description' => 'Tipos del catálogo de demostración.', 'parent' => ''],
    ];
    foreach ($catalog['collections'] as $c) $categories[$c['slug']] = ['name' => $c['name'], 'description' => $c['description'], 'parent' => 'khardal-demo-colecciones'];
    foreach ($catalog['products'] as $p) $categories[khardal_category_slug($p['category'])] = ['name' => $p['category'], 'description' => 'Categoría de muestra.', 'parent' => 'khardal-demo-tipos'];
    return $categories;
}

function khardal_category_slug($name) {
    return 'tipo-' . sanitize_title($name);
}

function khardal_owned_ids($type) {
    return array_map('intval', get_posts(['post_type' => $type, 'post_status' => ['publish', 'private', 'draft', 'pending', 'future', 'inherit', 'trash'], 'fields' => 'ids', 'posts_per_page' => -1, 'meta_key' => KHARDAL_SEED_META, 'meta_value' => KHARDAL_SEED]));
}

function khardal_sorted($values) { sort($values); return $values; }

function khardal_counts($identities) {
    return ['products' => count($identities['products']), 'variants' => count($identities['variants']), 'images' => count($identities['images']), 'categories' => count($identities['categories']), 'attributes' => count($identities['attributes'])];
}
