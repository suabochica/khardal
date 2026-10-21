import { getCartStore } from './client';
import { isProvider } from './state';
let context: ReturnType<typeof load> | undefined;
async function load() {
  const response = await fetch('/api/cart/context', {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  const data: unknown = await response.json();
  if (
    !response.ok ||
    !data ||
    typeof data !== 'object' ||
    !('provider' in data) ||
    !isProvider(data.provider)
  )
    throw new Error(
      'No pudimos cargar el carrito. Recarga la página para intentar de nuevo.',
    );
  return { provider: data.provider, store: getCartStore(data.provider) };
}
export function activeCart() {
  return (context ??= load());
}
