import {
  CommerceError,
  type Page,
  type Product,
  type ProductQuery,
} from './models.ts';

export function lowestPrice(product: Product): number | null {
  return product.variants.length
    ? Math.min(...product.variants.map((v) => v.price.amount))
    : null;
}

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .trim();
}
export function selectProducts(
  products: Product[],
  query: ProductQuery = {},
): Page<Product> {
  const {
    page = 1,
    pageSize = 6,
    sort = 'featured',
    minPrice,
    maxPrice,
  } = query;
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    [minPrice, maxPrice].some(
      (v) => v !== undefined && (!Number.isSafeInteger(v) || v < 0),
    ) ||
    (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) ||
    !['featured', 'price-asc', 'price-desc', 'name'].includes(sort)
  )
    throw new CommerceError(
      'invalid-request',
      'Parámetros de catálogo inválidos.',
    );
  const term = normalizeSearch(query.search ?? '');
  let items = products.filter(
    (p) =>
      (!term ||
        normalizeSearch(`${p.name} ${p.description} ${p.family}`).includes(
          term,
        )) &&
      (!query.collection || p.collectionSlugs.includes(query.collection)) &&
      (!query.category || p.category === query.category) &&
      (!query.family || p.family === query.family) &&
      ((minPrice === undefined && maxPrice === undefined) ||
        p.variants.some(
          (v) =>
            (minPrice === undefined || v.price.amount >= minPrice) &&
            (maxPrice === undefined || v.price.amount <= maxPrice),
        )),
  );
  if (sort !== 'featured')
    items = items.toSorted((a, b) => {
      const ap = lowestPrice(a),
        bp = lowestPrice(b);
      const comparison =
        sort === 'name'
          ? a.name.localeCompare(b.name, 'es-CO')
          : ap === null
            ? bp === null
              ? 0
              : 1
            : bp === null
              ? -1
              : (ap - bp) * (sort === 'price-desc' ? -1 : 1);
      return comparison || a.id.localeCompare(b.id);
    });
  return structuredClone({
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  });
}
