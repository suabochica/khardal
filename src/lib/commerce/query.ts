import { CommerceError, type ProductQuery, type Sort } from './models.ts';

export function readQuery(params: URLSearchParams): ProductQuery {
  const fail = () => {
    throw new CommerceError(
      'invalid-request',
      'Revisa los filtros de búsqueda.',
    );
  };
  for (const key of [
    'q',
    'categoria',
    'familia',
    'min',
    'max',
    'orden',
    'page',
  ])
    if (params.getAll(key).length > 1) fail();
  const text = (key: string, max: number) => {
    const value = params.get(key)?.trim();
    if (value && value.length > max) fail();
    return value || undefined;
  };
  const price = (key: string) => {
    const value = text(key, 16);
    if (value === undefined) return undefined;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) fail();
    return Number(value);
  };
  const minPrice = price('min'),
    maxPrice = price('max');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    fail();
  const sort = text('orden', 20) ?? 'featured';
  if (!['featured', 'price-asc', 'price-desc', 'name'].includes(sort)) fail();
  return {
    search: text('q', 200),
    category: text('categoria', 80),
    family: text('familia', 80),
    minPrice,
    maxPrice,
    sort: sort as Sort,
    page: readPage(params),
  };
}

export function readPage(params: URLSearchParams): number {
  const raw = params.get('page') ?? '1';
  const page = Number(raw);
  if (
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000
  ) {
    throw new CommerceError(
      'invalid-request',
      'El número de página no es válido.',
    );
  }
  return page;
}

export function pageUrl(url: URL, page: number): string {
  const params = new URLSearchParams(url.search);
  if (page === 1) params.delete('page');
  else params.set('page', String(page));
  return url.pathname + (params.size ? `?${params}` : '');
}
