import type { APIRoute } from 'astro';
import { getCommerce } from '../../../lib/commerce/provider.server';
import { handleValidation } from '../../../lib/cart/validate.server';
export const ALL: APIRoute = ({ request, url }) =>
  handleValidation(request, getCommerce, url.origin);
