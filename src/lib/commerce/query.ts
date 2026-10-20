import { CommerceError } from './models.ts';

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
