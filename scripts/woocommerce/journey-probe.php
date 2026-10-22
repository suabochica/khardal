<?php
// Temporary, nonce-owned test products only. Never edit existing catalog records.
try {
    if (wp_get_environment_type() !== 'local' || !in_array(wp_parse_url(home_url(), PHP_URL_HOST), ['127.0.0.1', 'localhost'], true)) throw new RuntimeException('Local environment required.');
    $input = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
    $token = $input['token'] ?? '';
    if (!preg_match('/^[a-f0-9]{24}$/', $token)) throw new RuntimeException('Invalid probe identity.');
    $action = $args[0] ?? '';
    $marker = '_khardal_s24_probe';
    $owned = fn($id) => get_post_meta($id, $marker, true) === $token;
    if ($action === 'cleanup') {
        foreach (['product_variation', 'product'] as $type) {
            $ids = get_posts(['post_type' => $type, 'post_status' => ['publish', 'private', 'draft', 'trash'], 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => $marker, 'meta_value' => $token]);
            foreach ($ids as $id) { $p = wc_get_product($id); if ($p) $p->delete(true); }
        }
        WP_CLI::line('{}');
        return;
    }
    if ($action === 'create') {
        $category = get_term_by('slug', 'frescos', 'product_cat');
        if (!$category) throw new RuntimeException('Seed S22 first.');
        $base = 'Prueba S24 ' . $token;
        $parent = new WC_Product_Variable();
        $parent->set_name($base . ' Ámbar variable'); $parent->set_slug('s24-' . $token . '-variable');
        $parent->set_sku('S24-' . $token . '-P'); $parent->set_status('publish'); $parent->set_category_ids([(int) $category->term_id]);
        $attribute = new WC_Product_Attribute(); $attribute->set_name('Presentación'); $attribute->set_options(['30 ml', '50 ml']); $attribute->set_visible(true); $attribute->set_variation(true);
        $parent->set_attributes([$attribute]);
        foreach ([$marker => $token, '_khardal_sample' => 'yes', '_khardal_category' => 'Eau de parfum', '_khardal_fragrance_family' => 'Ambarada'] as $key => $value) $parent->update_meta_data($key, $value);
        $parentId = $parent->save();
        $ids = [];
        foreach ([30 => 123000, 50 => 153000] as $ml => $price) {
            $v = new WC_Product_Variation(); $v->set_parent_id($parentId); $v->set_status('publish'); $v->set_sku('S24-' . $token . '-' . $ml);
            $v->set_attributes(['presentacion' => $ml . ' ml']); $v->set_regular_price((string) $price); $v->set_price((string) $price);
            $v->set_manage_stock(true); $v->set_stock_quantity(5); $v->set_stock_status('instock'); $v->update_meta_data($marker, $token);
            $ids[$ml] = $v->save();
        }
        WC_Product_Variable::sync($parentId);
        $simple = new WC_Product_Simple(); $simple->set_name($base . ' simple'); $simple->set_slug('s24-' . $token . '-simple');
        $simple->set_sku('S24-' . $token . '-S'); $simple->set_status('publish'); $simple->set_category_ids([(int) $category->term_id]);
        $simple->set_regular_price('99900'); $simple->set_price('99900'); $simple->set_manage_stock(true); $simple->set_stock_quantity(3); $simple->set_stock_status('instock');
        foreach ([$marker => $token, '_khardal_sample' => 'yes', '_khardal_category' => 'Eau de parfum', '_khardal_fragrance_family' => 'Ambarada'] as $key => $value) $simple->update_meta_data($key, $value);
        $simpleId = $simple->save();
        WP_CLI::line(wp_json_encode(['parent' => $parentId, 'v30' => $ids[30], 'v50' => $ids[50], 'simple' => $simpleId, 'slug' => $parent->get_slug(), 'simpleSlug' => $simple->get_slug(), 'name' => $parent->get_name()]));
        return;
    }
    $id = (int) ($input['id'] ?? 0);
    if (!$owned($id)) throw new RuntimeException('Refusing to change a product not owned by this probe.');
    $product = wc_get_product($id);
    if ($action === 'delete') $product->delete(true);
    elseif ($action === 'update') {
        if (array_key_exists('price', $input)) { $product->set_regular_price((string) $input['price']); $product->set_price((string) $input['price']); }
        if (array_key_exists('stock', $input)) { $product->set_manage_stock(true); $product->set_stock_quantity($input['stock']); $product->set_stock_status($input['stock'] > 0 ? 'instock' : 'outofstock'); }
        $product->save();
        if ($product->get_parent_id()) { WC_Product_Variable::sync($product->get_parent_id()); wc_delete_product_transients($product->get_parent_id()); }
    } else throw new RuntimeException('Unsupported probe action.');
    WP_CLI::line('{}');
} catch (Throwable $error) { WP_CLI::error($error->getMessage()); }
