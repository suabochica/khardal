<?php
require __DIR__ . '/seed-common.php';
require __DIR__ . '/seed-write.php';
require __DIR__ . '/seed-verify.php';

try {
    khardal_guard();
    $catalog = json_decode(stream_get_contents(STDIN), true, 64, JSON_THROW_ON_ERROR);
    khardal_assert(($catalog['schema'] ?? null) === 1 && ($catalog['source'] ?? '') === 'khardal-development-fixtures', 'Unsupported fixture manifest.');
    khardal_assert(count($catalog['products']) >= 8 && count($catalog['products']) <= 12, 'Unexpected fixture product count.');
    $skus = [];
    foreach ($catalog['products'] as $p) {
        khardal_assert($p['sample'] === true && preg_match('/^KH-DEMO-P-\d{3}$/', $p['parentSku']), 'Only labeled development products may be seeded.');
        $skus[] = $p['parentSku'];
        foreach ($p['variants'] as $v) {
            khardal_assert(preg_match('/^KH-DEMO-\d{3}-\d{3}$/', $v['sku']) && $v['price']['currency'] === 'COP' && is_int($v['price']['amount']) && $v['price']['amount'] >= 0, 'Invalid fixture SKU or whole COP price.');
            khardal_assert(in_array($v['availability'], ['available', 'sold-out', 'unknown'], true), 'Invalid availability.');
            khardal_assert(($v['availability'] === 'unknown' && $v['stockQuantity'] === null) || ($v['availability'] !== 'unknown' && is_int($v['stockQuantity']) && $v['stockQuantity'] >= 0), 'Invalid fixture stock quantity.');
            $skus[] = $v['sku'];
        }
    }
    khardal_assert(count($skus) === count(array_unique($skus)), 'Duplicate fixture SKUs.');
    $mode = $args[0] ?? '';
    khardal_assert(in_array($mode, ['seed', 'check'], true), 'Use seed or check.');
    $created = ['products' => 0, 'variants' => 0, 'images' => 0];
    if ($mode === 'seed') khardal_seed($catalog, $created);
    $identities = khardal_verify($catalog);
    WP_CLI::line(wp_json_encode(['counts' => khardal_counts($identities), 'created' => $created, 'identities' => $identities], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
} catch (Throwable $error) {
    WP_CLI::error($error->getMessage());
}
