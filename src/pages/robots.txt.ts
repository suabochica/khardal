import type { APIRoute } from 'astro';
import { DEPLOYMENT_ENV } from 'astro:env/server';
import { pageSeo, siteOrigin } from '../lib/seo';
export const GET: APIRoute = ({ url }) => {
  const site = siteOrigin(import.meta.env.SITE);
  const index = pageSeo(url, site, DEPLOYMENT_ENV).indexable;
  return new Response(
    index
      ? `User-agent: *\nDisallow: /api/\nDisallow: /dev/\nDisallow: /carrito\nDisallow: /buscar\nSitemap: ${site}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n',
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
};
