import { defineMiddleware } from 'astro:middleware';
import { DEPLOYMENT_ENV } from 'astro:env/server';
import { pageSeo, siteOrigin } from './lib/seo';
import { getCommerce } from './lib/commerce/provider.server';

const redirects: Record<string, string> = {
  '/collections/all': '/tienda',
  '/pages/nosotros': '/nosotros',
  '/pages/contact': '/contacto',
  '/cart': '/carrito',
};
export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  let destination = redirects[url.pathname];
  if (url.pathname === '/search') destination = '/buscar';
  const product = /^\/products\/([^/]+)$/.exec(url.pathname);
  const collection = /^\/collections\/([^/]+)$/.exec(url.pathname);
  if (!destination && (product || collection)) {
    try {
      const commerce = await getCommerce();
      const found = product
        ? await commerce.getProduct(decodeURIComponent(product[1]!))
        : await commerce.getCollection(decodeURIComponent(collection![1]!));
      if (found)
        destination = product
          ? `/perfumes/${encodeURIComponent(found.slug)}`
          : `/colecciones/${encodeURIComponent(found.slug)}`;
    } catch {
      return new Response(
        'No podemos resolver este enlace ahora. Intenta de nuevo.',
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        },
      );
    }
  }
  const response = destination
    ? new Response(null, {
        status: 301,
        headers: {
          Location: destination + url.search,
          'Cache-Control': 'no-store',
        },
      })
    : await next();
  if (
    !pageSeo(url, siteOrigin(import.meta.env.SITE), DEPLOYMENT_ENV).indexable ||
    response.status >= 400
  )
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (response.headers.get('content-type')?.includes('text/html'))
    response.headers.set('Cache-Control', 'no-store');
  return response;
});
