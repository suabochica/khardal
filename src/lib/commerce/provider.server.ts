import { CommerceError, type CommerceAdapter } from './models';
import { createMockAdapter } from './mock';
import { createWooCommerceAdapter } from './woocommerce/adapter.server';

export async function getCommerce(): Promise<CommerceAdapter> {
  const { commerceConfig } = await import('../../config/commerce.server');
  if (commerceConfig.provider === 'mock') return createMockAdapter();
  if (commerceConfig.provider === 'woocommerce')
    return createWooCommerceAdapter(commerceConfig);
  // Never quietly serve sample stock for a selected real provider.
  throw new CommerceError(
    'unavailable',
    'El proveedor de catálogo aún no está conectado.',
  );
}
