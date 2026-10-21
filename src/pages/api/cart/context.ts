import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const { commerceConfig } = await import('../../../config/commerce.server');
    return Response.json(
      { provider: commerceConfig.provider },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'El carrito no está disponible. Intenta de nuevo.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
