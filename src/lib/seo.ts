import type { Product } from './commerce/models.ts';

export function siteOrigin(value: unknown): string | null {
  try {
    const url = new URL(typeof value === 'string' ? value : '');
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
export function pageSeo(
  url: URL,
  site: string | null,
  environment: string,
  noindex = false,
) {
  const query = new URLSearchParams();
  const page = url.searchParams.get('page');
  if (page && /^\d+$/.test(page) && Number(page) > 1) query.set('page', page);
  const canonical = site
    ? new URL(url.pathname + (query.size ? `?${query}` : ''), site).href
    : null;
  const state = [...url.searchParams.keys()].some(
    (k) => k !== 'page' && !/^utm_|^(?:gclid|fbclid)$/.test(k),
  );
  const privatePath = /^\/(?:api|dev|carrito|buscar|politicas)(?:\/|$)/.test(
    url.pathname,
  );
  return {
    canonical,
    indexable:
      environment === 'production' &&
      site !== null &&
      url.origin === site &&
      !noindex &&
      !state &&
      !privatePath,
  };
}
export const jsonLd = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
export function productSchema(
  product: Product,
  site: string | null,
): Record<string, unknown> | null {
  if (!site || product.sample || !product.variants.length) return null;
  const url = new URL(`/perfumes/${encodeURIComponent(product.slug)}`, site)
    .href;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    url,
    name: product.name,
    description: product.description,
    ...(product.images.length
      ? { image: product.images.map((i) => i.src) }
      : {}),
    offers: product.variants.map((v) => ({
      '@type': 'Offer',
      url,
      name: v.label,
      priceCurrency: 'COP',
      price: String(v.price.amount),
      ...(v.sku ? { sku: v.sku } : {}),
      ...(v.availability === 'unknown'
        ? {}
        : {
            availability: `https://schema.org/${v.availability === 'available' ? 'InStock' : 'OutOfStock'}`,
          }),
    })),
  };
}
