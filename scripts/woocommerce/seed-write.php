<?php

function khardal_preflight($catalog) {
    global $wpdb;
    $ids = [];
    foreach ($catalog['products'] as $p) {
        $parent = khardal_sku_id($p['parentSku']);
        if ($parent) {
            khardal_assert(wc_get_product($parent)->is_type('variable'), 'Existing fixture parent has the wrong product type.');
            $ids[] = $parent;
            foreach (wc_get_product($parent)->get_children() as $child) khardal_assert(get_post_meta($child, KHARDAL_SEED_META, true) === KHARDAL_SEED, 'Fixture parent has an unrelated variation.');
        }
        foreach ($p['variants'] as $v) {
            $id = khardal_sku_id($v['sku']);
            if ($id) {
                khardal_assert($parent && get_post_type($id) === 'product_variation' && (int) wp_get_post_parent_id($id) === $parent, 'Fixture variant belongs to the wrong parent.');
                $ids[] = $id;
            }
        }
    }
    if ($ids) {
        $placeholders = implode(',', array_fill(0, count($ids), '%d'));
        $used = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}woocommerce_order_itemmeta WHERE meta_key IN ('_product_id', '_variation_id') AND meta_value IN ($placeholders)", $ids));
        khardal_assert((int) $used === 0, 'Fixture products are referenced by an order. Seed will not reset their stock; use a separate clean test environment.');
    }
    foreach (khardal_categories($catalog) as $slug => $_) khardal_term_id('product_cat', $slug);
    $owned = get_option('khardal_fixture_attributes', []);
    foreach (['kh-presentacion', 'kh-familia'] as $slug) {
        $id = wc_attribute_taxonomy_id_by_name($slug);
        khardal_assert(!$id || ($owned[$slug] ?? 0) === $id, 'An unrelated global attribute already uses ' . $slug);
        if ($id) foreach (get_terms(['taxonomy' => wc_attribute_taxonomy_name($slug), 'hide_empty' => false]) as $term) khardal_assert(get_term_meta($term->term_id, KHARDAL_SEED_META, true) === KHARDAL_SEED, 'Unrelated attribute term would be changed.');
    }
    foreach ($catalog['images'] as $image) {
        $id = khardal_image_id($image['id']);
        if ($id) khardal_assert(get_post_meta($id, '_khardal_source_sha256', true) === $image['sourceSha256'], 'Fixture illustration source changed; use a separate versioned/clean fixture environment.');
    }
}

function khardal_upsert_term($taxonomy, $slug, $name, $description = '', $parent = 0) {
    $id = khardal_term_id($taxonomy, $slug);
    $props = ['name' => $name, 'description' => $description, 'parent' => $parent, 'slug' => $slug];
    $result = $id ? wp_update_term($id, $taxonomy, $props) : wp_insert_term($name, $taxonomy, $props);
    khardal_assert(!is_wp_error($result), is_wp_error($result) ? $result->get_error_message() : 'Term save failed.');
    $id = (int) $result['term_id'];
    update_term_meta($id, KHARDAL_SEED_META, KHARDAL_SEED);
    return $id;
}

function khardal_attributes() {
    $ids = [];
    foreach (['kh-presentacion' => 'Presentación', 'kh-familia' => 'Familia olfativa'] as $slug => $name) {
        $id = wc_attribute_taxonomy_id_by_name($slug);
        if (!$id) {
            $id = wc_create_attribute(['name' => $name, 'slug' => $slug, 'type' => 'select', 'order_by' => 'menu_order', 'has_archives' => false]);
            khardal_assert(!is_wp_error($id), 'Cannot create global attribute.');
            delete_transient('wc_attribute_taxonomies');
            WC_Cache_Helper::invalidate_cache_group('woocommerce-attributes');
        }
        $ids[$slug] = (int) $id;
        $taxonomy = wc_attribute_taxonomy_name($slug);
        if (!taxonomy_exists($taxonomy)) register_taxonomy($taxonomy, ['product'], ['hierarchical' => false, 'public' => false]);
    }
    update_option('khardal_fixture_attributes', $ids, false);
    return $ids;
}

function khardal_product_attribute($id, $taxonomy, $options, $variation) {
    $attribute = new WC_Product_Attribute();
    $attribute->set_id($id); $attribute->set_name($taxonomy); $attribute->set_options($options);
    $attribute->set_visible(true); $attribute->set_variation($variation);
    return $attribute;
}

function khardal_seed_image($image, &$created) {
    $id = khardal_image_id($image['id']);
    if (!$id) {
        $png = base64_decode($image['png'] ?? '', true);
        khardal_assert($png && substr($png, 0, 8) === "\x89PNG\r\n\x1a\n", 'Missing rasterized PNG illustration.');
        $size = getimagesizefromstring($png);
        khardal_assert($size && $size[0] === $image['width'] && $size[1] === $image['height'], 'Unexpected raster dimensions.');
        $upload = wp_upload_bits('khardal-demo-' . sanitize_file_name($image['id']) . '.png', null, $png);
        khardal_assert(!$upload['error'], 'Image upload failed.');
        $id = wp_insert_attachment(['post_mime_type' => 'image/png', 'post_title' => 'Muestra ' . $image['id'], 'post_status' => 'inherit'], $upload['file'], 0, true);
        khardal_assert(!is_wp_error($id), 'Attachment creation failed.');
        require_once ABSPATH . 'wp-admin/includes/image.php';
        wp_update_attachment_metadata($id, wp_generate_attachment_metadata($id, $upload['file']));
        update_post_meta($id, KHARDAL_SEED_META, KHARDAL_SEED);
        update_post_meta($id, '_khardal_fixture_image_id', $image['id']);
        update_post_meta($id, '_khardal_source_sha256', $image['sourceSha256']);
        update_post_meta($id, '_khardal_png_sha256', hash('sha256', $png));
        $created['images']++;
    }
    update_post_meta($id, '_wp_attachment_image_alt', $image['alt']);
    update_post_meta($id, '_khardal_source_image', $image['src']);
    return (int) $id;
}

function khardal_seed($catalog, &$created) {
    khardal_preflight($catalog);
    $attributes = khardal_attributes();
    $categories = [];
    foreach (khardal_categories($catalog) as $slug => $c) $categories[$slug] = khardal_upsert_term('product_cat', $slug, $c['name'], $c['description'], $c['parent'] ? $categories[$c['parent']] : 0);
    foreach ($catalog['collections'] as $c) update_term_meta($categories[$c['slug']], '_khardal_fixture_collection_id', $c['id']);
    $images = [];
    foreach ($catalog['images'] as $image) $images[$image['id']] = khardal_seed_image($image, $created);
    foreach ($catalog['products'] as $index => $p) {
        $id = khardal_sku_id($p['parentSku']);
        if (!$id) $created['products']++;
        $product = $id ? wc_get_product($id) : new WC_Product_Variable();
        $product->set_name($p['name']); $product->set_slug($p['slug']); $product->set_sku($p['parentSku']);
        $product->set_status('publish'); $product->set_catalog_visibility('visible');
        $product->set_description($p['description']); $product->set_short_description('Catálogo de demostración. No disponible para pedidos reales.');
        $product->set_menu_order($index); $product->set_manage_stock(false);
        $product->set_category_ids(array_merge(array_map(fn($slug) => $categories[$slug], $p['collectionSlugs']), [$categories[khardal_category_slug($p['category'])]]));
        $sizeIds = [];
        foreach ($p['variants'] as $v) $sizeIds[] = khardal_upsert_term('pa_kh-presentacion', sanitize_title($v['label']), $v['label']);
        $familyId = khardal_upsert_term('pa_kh-familia', sanitize_title($p['family']), $p['family']);
        $product->set_attributes([
            khardal_product_attribute($attributes['kh-presentacion'], 'pa_kh-presentacion', $sizeIds, true),
            khardal_product_attribute($attributes['kh-familia'], 'pa_kh-familia', [$familyId], false),
        ]);
        $product->set_default_attributes([]);
        $productImages = array_map(fn($image) => $images[$image['id']], $p['images']);
        $product->set_image_id($productImages[0] ?? 0); $product->set_gallery_image_ids(array_slice($productImages, 1));
        foreach ([KHARDAL_SEED_META => KHARDAL_SEED, '_khardal_sample' => 'yes', '_khardal_fixture_id' => $p['id'], '_khardal_category' => $p['category'], '_khardal_fragrance_family' => $p['family']] as $key => $value) $product->update_meta_data($key, $value);
        if (isset($p['notes'])) $product->update_meta_data('_khardal_notes', $p['notes']); else $product->delete_meta_data('_khardal_notes');
        $id = $product->save();
        foreach ($productImages as $imageId) wp_update_post(['ID' => $imageId, 'post_parent' => $id]);
        foreach ($p['variants'] as $order => $v) {
            $variantId = khardal_sku_id($v['sku']);
            if (!$variantId) $created['variants']++;
            $variant = $variantId ? wc_get_product($variantId) : new WC_Product_Variation();
            $variant->set_parent_id($id); $variant->set_sku($v['sku']); $variant->set_status('publish');
            $variant->set_attributes(['pa_kh-presentacion' => sanitize_title($v['label'])]);
            $variant->set_menu_order($order); $variant->set_regular_price((string) $v['price']['amount']);
            $variant->set_sale_price(''); $variant->set_date_on_sale_from(null); $variant->set_date_on_sale_to(null);
            $variant->set_price((string) $v['price']['amount']); $variant->set_backorders('no');
            $variant->set_manage_stock($v['stockQuantity'] !== null); $variant->set_stock_quantity($v['stockQuantity']);
            $variant->set_stock_status($v['availability'] === 'available' ? 'instock' : 'outofstock');
            foreach ([KHARDAL_SEED_META => KHARDAL_SEED, '_khardal_fixture_id' => $v['id'], '_khardal_size_ml' => $v['sizeMl'], '_khardal_sample' => 'yes'] as $key => $value) $variant->update_meta_data($key, $value);
            if ($v['availability'] === 'unknown') $variant->update_meta_data('_khardal_availability', 'unknown'); else $variant->delete_meta_data('_khardal_availability');
            $variant->save();
        }
        WC_Product_Variable::sync($id);
        wc_delete_product_transients($id);
        clean_post_cache($id);
    }
}
