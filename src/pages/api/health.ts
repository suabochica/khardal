import type { APIRoute } from 'astro';
import { commerceConfig } from '../../config/commerce.server';

export const GET: APIRoute = () => {
  // Validate configuration without exposing it or claiming backend connectivity.
  if (!commerceConfig.provider)
    throw new Error('Commerce configuration is unavailable.');

  return Response.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
