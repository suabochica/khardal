import type { APIRoute } from 'astro';
import { DEPLOYMENT_ENV } from 'astro:env/server';
import { pageSeo, siteOrigin } from '../lib/seo';
import { getCommerce } from '../lib/commerce/provider.server';
const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const GET: APIRoute = async ({ url }) => {
  const site = siteOrigin(import.meta.env.SITE);
  const paths: string[] = [];
  if (pageSeo(url, site, DEPLOYMENT_ENV).indexable && site) {
    try {
      const commerce = await getCommerce();
      const first = await commerce.listProducts({ pageSize: 100 });
      const products = [...first.items];
      for (let page = 2; page <= first.totalPages; page++)
        products.push(
          ...(await commerce.listProducts({ page, pageSize: 100 })).items,
        );
      paths.push('/nosotros', '/contacto', '/preguntas-frecuentes');
      if (products.length && products.every((p) => !p.sample))
        paths.push('/', '/tienda');
      for (const p of products)
        if (!p.sample && p.variants.length)
          paths.push(`/perfumes/${encodeURIComponent(p.slug)}`);
      for (const c of await commerce.listCollections()) {
        const members = products.filter((p) =>
          p.collectionSlugs.includes(c.slug),
        );
        if (members.length && members.every((p) => !p.sample))
          paths.push(`/colecciones/${encodeURIComponent(c.slug)}`);
      }
    } catch {
      return new Response('Sitemap temporalmente no disponible.', {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' },
      });
    }
  }
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${xml(new URL(path, site!).href)}</loc></url>`).join('')}</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
};
