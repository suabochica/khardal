<?php

function khardal_verify($catalog) {
    $identities = ['products' => [], 'variants' => [], 'images' => [], 'categories' => [], 'attributes' => []];
    foreach (khardal_categories($catalog) as $slug => $c) {
        $id = khardal_term_id('product_cat', $slug);
        khardal_assert($id > 0, 'Missing category: ' . $slug);
        $term = get_term($id, 'product_cat');
        khardal_assert($term->name === $c['name'] && $term->description === $c['description'], 'Category text mismatch: ' . $slug);
        khardal_assert((int) $term->parent === ($c['parent'] ? $identities['categories'][$c['parent']] : 0), 'Category hierarchy mismatch.');
        $identities['categories'][$slug] = $id;
    }
    foreach (['kh-presentacion', 'kh-familia'] as $slug) {
        $id = wc_attribute_taxonomy_id_by_name($slug);
        khardal_assert($id > 0, 'Missing global attribute.');
        $identities['attributes'][$slug] = $id;
    }
    foreach ($catalog['collections'] as $c) khardal_assert(get_term_meta($identities['categories'][$c['slug']], '_khardal_fixture_collection_id', true) === $c['id'], 'Collection source identity mismatch.');
    $managedCategories = get_terms(['taxonomy' => 'product_cat', 'hide_empty' => false, 'fields' => 'ids', 'meta_query' => [['key' => KHARDAL_SEED_META, 'value' => KHARDAL_SEED]]]);
    khardal_assert(khardal_sorted(array_map('intval', $managedCategories)) === khardal_sorted(array_values($identities['categories'])), 'Unexpected managed categories.');
    foreach ($catalog['products'] as $index => $p) {
        $id = khardal_sku_id($p['parentSku']); $product = wc_get_product($id);
        khardal_assert($product && $product->is_type('variable'), 'Missing variable product: ' . $p['parentSku']);
        $identities['products'][$p['parentSku']] = $id;
        khardal_assert($product->get_name() === $p['name'] && $product->get_slug() === $p['slug'] && $product->get_description() === $p['description'], 'Product content mismatch: ' . $p['parentSku']);
        khardal_assert($product->get_status() === 'publish' && $product->get_menu_order() === $index, 'Product publication/order mismatch.');
        foreach (['_khardal_sample' => 'yes', '_khardal_fixture_id' => $p['id'], '_khardal_category' => $p['category'], '_khardal_fragrance_family' => $p['family']] as $key => $value) khardal_assert($product->get_meta($key) === $value, 'Product metadata mismatch: ' . $key);
        khardal_assert(isset($p['notes']) ? $product->get_meta('_khardal_notes') === $p['notes'] : !$product->meta_exists('_khardal_notes'), 'Optional notes mismatch.');
        $expectedCategories = array_merge(array_map(fn($slug) => $identities['categories'][$slug], $p['collectionSlugs']), [$identities['categories'][khardal_category_slug($p['category'])]]);
        khardal_assert(khardal_sorted($product->get_category_ids()) === khardal_sorted($expectedCategories), 'Collection/type membership mismatch.');
        $attributes = $product->get_attributes();
        $sizes = array_map(fn($v) => (int) get_term_by('slug', sanitize_title($v['label']), 'pa_kh-presentacion')->term_id, $p['variants']);
        $family = get_term_by('slug', sanitize_title($p['family']), 'pa_kh-familia');
        khardal_assert(isset($attributes['pa_kh-presentacion'], $attributes['pa_kh-familia']) && count($attributes) === 2, 'Product global attributes missing.');
        khardal_assert($attributes['pa_kh-presentacion']->get_id() === $identities['attributes']['kh-presentacion'] && $attributes['pa_kh-presentacion']->get_variation() && khardal_sorted($attributes['pa_kh-presentacion']->get_options()) === khardal_sorted($sizes), 'Presentation attribute mismatch.');
        khardal_assert($family && $attributes['pa_kh-familia']->get_id() === $identities['attributes']['kh-familia'] && !$attributes['pa_kh-familia']->get_variation() && $attributes['pa_kh-familia']->get_options() === [(int) $family->term_id], 'Family attribute mismatch.');
        $imageIds = [];
        foreach ($p['images'] as $image) $imageIds[] = khardal_image_id($image['id']);
        khardal_assert(array_map('intval', array_merge($product->get_image_id() ? [$product->get_image_id()] : [], $product->get_gallery_image_ids())) === $imageIds, 'Product gallery mismatch.');
        $variationIds = [];
        foreach ($p['variants'] as $order => $v) {
            $variantId = khardal_sku_id($v['sku']); $variant = wc_get_product($variantId);
            khardal_assert($variant && $variant->is_type('variation') && $variant->get_parent_id() === $id, 'Missing/wrong-parent variation: ' . $v['sku']);
            $identities['variants'][$v['sku']] = $variantId; $variationIds[] = $variantId;
            khardal_assert($variant->get_regular_price() === (string) $v['price']['amount'] && $variant->get_price() === (string) $v['price']['amount'] && $variant->get_sale_price() === '', 'Variant price mismatch: ' . $v['sku']);
            khardal_assert($variant->get_stock_quantity() === $v['stockQuantity'] && $variant->get_manage_stock() === ($v['stockQuantity'] !== null), 'Variant stock quantity mismatch: ' . $v['sku']);
            khardal_assert($variant->get_stock_status() === ($v['availability'] === 'available' ? 'instock' : 'outofstock') && $variant->get_backorders() === 'no', 'Variant availability mismatch: ' . $v['sku']);
            khardal_assert($v['availability'] === 'unknown' ? $variant->get_meta('_khardal_availability') === 'unknown' : !$variant->meta_exists('_khardal_availability'), 'Unknown availability metadata mismatch.');
            khardal_assert((int) $variant->get_meta('_khardal_size_ml') === $v['sizeMl'] && $variant->get_meta('_khardal_fixture_id') === $v['id'], 'Variant identity/size mismatch.');
            khardal_assert($variant->get_attributes() === ['pa_kh-presentacion' => sanitize_title($v['label'])] && $variant->get_menu_order() === $order, 'Variant presentation/order mismatch.');
        }
        khardal_assert(khardal_sorted($product->get_children()) === khardal_sorted($variationIds), 'Unexpected variations.');
        $parentAvailable = count(array_filter($p['variants'], fn($v) => $v['availability'] === 'available')) > 0;
        khardal_assert($product->get_stock_status() === ($parentAvailable ? 'instock' : 'outofstock'), 'Parent stock aggregation mismatch.');
    }
    foreach ($catalog['images'] as $image) {
        $id = khardal_image_id($image['id']);
        khardal_assert($id > 0, 'Missing fixture image.');
        $identities['images'][$image['id']] = $id;
        $file = get_attached_file($id); $size = wp_get_attachment_metadata($id);
        khardal_assert(is_file($file) && get_post_mime_type($id) === 'image/png' && $size['width'] === $image['width'] && $size['height'] === $image['height'], 'Fixture image file/dimensions mismatch.');
        khardal_assert(get_post_meta($id, '_wp_attachment_image_alt', true) === $image['alt'] && get_post_meta($id, '_khardal_source_sha256', true) === $image['sourceSha256'] && hash_file('sha256', $file) === get_post_meta($id, '_khardal_png_sha256', true), 'Fixture image content/alt mismatch.');
        khardal_assert(get_post_meta($id, '_khardal_source_image', true) === $image['src'] && (int) wp_get_post_parent_id($id) === $identities['products']['KH-DEMO-P-' . substr($image['productId'], -3)], 'Image source/product association mismatch.');
    }
    foreach (['products' => 'product', 'variants' => 'product_variation', 'images' => 'attachment'] as $key => $type) khardal_assert(khardal_sorted(khardal_owned_ids($type)) === khardal_sorted(array_values($identities[$key])), 'Duplicate or unexpected managed ' . $key);
    $top = wc_get_products(['limit' => -1, 'category' => ['top-10'], 'orderby' => 'menu_order', 'order' => 'ASC', 'return' => 'ids']);
    $expectedTop = array_values(array_map(fn($p) => $identities['products'][$p['parentSku']], array_filter($catalog['products'], fn($p) => in_array('top-10', $p['collectionSlugs'], true))));
    khardal_assert($top === $expectedTop && count($top) === 10, 'Curated Top 10 order/membership mismatch.');
    return $identities;
}
