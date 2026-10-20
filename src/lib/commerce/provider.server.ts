import { CommerceError, type CommerceAdapter } from './models';
import { createMockAdapter } from './mock';

export async function getCommerce(): Promise<CommerceAdapter> {
  const { commerceConfig } = await import('../../config/commerce.server');
  if (commerceConfig.provider === 'mock') return createMockAdapter();
  // Never quietly serve sample stock for a selected real provider.
  throw new CommerceError(
    'unavailable',
    'El proveedor de catálogo aún no está conectado.',
  );
}
