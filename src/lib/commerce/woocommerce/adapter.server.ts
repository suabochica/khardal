import {
  CommerceError,
  type CommerceAdapter,
  type Product,
} from '../models.ts';
import { selectProducts } from '../catalog.ts';
import { createWooClient, type WooConfig } from './client.server.ts';
import {
  isPublic,
  mapCategories,
  mapProduct,
  nativeId,
  record,
} from './mapping.ts';

export function createWooCommerceAdapter(
  config: WooConfig,
  transport: typeof fetch = fetch,
): CommerceAdapter {
  const client = createWooClient(config, transport);
  const searchOnly = new Set<string>();
  const categories = (signal: AbortSignal) =>
    client
      .all('products/categories', { hide_empty: 'false' }, signal)
      .then(mapCategories);
  async function currency(signal: AbortSignal) {
    const { data } = await client.get('settings/general', {}, signal);
    if (
      !Array.isArray(data) ||
      data.map(record).find((s) => s.id === 'woocommerce_currency')?.value !==
        'COP'
    )
      throw new CommerceError(
        'unavailable',
        'WooCommerce debe tener COP configurado.',
      );
  }
  async function product(
    raw: unknown,
    cats: Awaited<ReturnType<typeof categories>>,
    signal: AbortSignal,
  ) {
    const source = record(raw);
    if (!isPublic(source)) return null;
    const variations =
      source.type === 'variable'
        ? await client.all(
            `products/${nativeId(source.id)}/variations`,
            { orderby: 'menu_order', order: 'asc' },
            signal,
            200,
          )
        : [];
    return mapProduct(source, variations, cats, config.url);
  }
  async function loadCatalog() {
    const signal = AbortSignal.timeout(20000);
    const [raw, cats] = await Promise.all([
      client.all(
        'products',
        { status: 'publish', orderby: 'menu_order', order: 'asc' },
        signal,
      ),
      categories(signal),
      currency(signal),
    ]);
    const sorted = raw
      .map(record)
      .sort(
        (a, b) =>
          Number(a.menu_order ?? 0) - Number(b.menu_order ?? 0) ||
          nativeId(a.id) - nativeId(b.id),
      );
    for (const p of sorted)
      if (p.catalog_visibility === 'search')
        searchOnly.add(`wc-p-${nativeId(p.id)}`);
    const output: (Product | null)[] = new Array(sorted.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, sorted.length) }, async () => {
        while (next < sorted.length) {
          const i = next++;
          output[i] = await product(sorted[i], cats, signal);
        }
      }),
    );
    return {
      products: output.filter((p): p is Product => p !== null),
      collections: cats.collections,
    };
  }
  // One request-local snapshot shared by facets/list/collections; no cross-request cache.
  let snapshot: ReturnType<typeof loadCatalog> | undefined;
  const load = () => (snapshot ??= loadCatalog());
  return {
    provider: 'woocommerce',
    async listProducts(query = {}) {
      const { products } = await load();
      return selectProducts(
        products.filter((p) => Boolean(query.search) || !searchOnly.has(p.id)),
        query,
      );
    },
    async getProduct(slug) {
      if (!slug || slug.length > 200) return null;
      const signal = AbortSignal.timeout(12000);
      const [raw, cats] = await Promise.all([
        client.all('products', { slug, status: 'publish' }, signal),
        categories(signal),
        currency(signal),
      ]);
      const found = raw.map(record).find((p) => p.slug === slug && isPublic(p));
      return found ? product(found, cats, signal) : null;
    },
    async listCollections() {
      return structuredClone((await load()).collections);
    },
    async getCollection(slug) {
      return structuredClone(
        (await load()).collections.find((c) => c.slug === slug) ?? null,
      );
    },
    async getFacets(collection) {
      const products = (await load()).products.filter(
        (p) => !collection || p.collectionSlugs.includes(collection),
      );
      return {
        categories: [
          ...new Set(products.map((p) => p.category).filter(Boolean)),
        ].sort(),
        families: [
          ...new Set(products.map((p) => p.family).filter(Boolean)),
        ].sort(),
      };
    },
    async validateCart() {
      throw new CommerceError(
        'unavailable',
        'La validación de pedidos de WooCommerce se conecta en S24.',
      );
    },
  };
}
