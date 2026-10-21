import { cop, lineTotal } from '../commerce/money.ts';

export type Provider = 'mock' | 'woocommerce' | 'shopify';
export interface CartItem {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  label: string;
  sku: string;
  amountCop: number;
  quantity: number;
}
export interface CartState {
  version: 1;
  provider: Provider;
  items: CartItem[];
}
export const MAX_LINES = 50;
export const MAX_QUANTITY = 99;
export function isProvider(value: unknown): value is Provider {
  return value === 'mock' || value === 'woocommerce' || value === 'shopify';
}
export function cartKey(provider: Provider): string {
  return `khardal:cart:v1:${provider}`;
}
export function emptyCart(provider: Provider): CartState {
  return { version: 1, provider, items: [] };
}
export function validQuantity(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= MAX_QUANTITY
  );
}
function validItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as CartItem;
  return (
    ['productId', 'variantId', 'name', 'label', 'sku'].every(
      (key) =>
        typeof item[key as keyof CartItem] === 'string' &&
        String(item[key as keyof CartItem]).trim().length > 0 &&
        String(item[key as keyof CartItem]).length <= 300,
    ) &&
    typeof item.slug === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) &&
    item.slug.length <= 200 &&
    validQuantity(item.quantity) &&
    Number.isSafeInteger(item.amountCop) &&
    item.amountCop >= 0
  );
}
export function subtotal(items: CartItem[]): number {
  return cop(
    items.reduce(
      (sum, item) => sum + lineTotal(cop(item.amountCop), item.quantity).amount,
      0,
    ),
  ).amount;
}
export function parseCart(raw: string | null, provider: Provider): CartState {
  if (raw === null) return emptyCart(provider);
  if (raw.length > 200000)
    throw new Error('El carrito guardado es demasiado grande.');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Carrito inválido.');
  const state = value as CartState;
  if (
    state.version !== 1 ||
    state.provider !== provider ||
    !Array.isArray(state.items) ||
    state.items.length > MAX_LINES ||
    !state.items.every(validItem) ||
    new Set(state.items.map((i) => i.variantId)).size !== state.items.length
  )
    throw new Error('Carrito incompatible o inválido.');
  subtotal(state.items);
  // Copy only known fields; stored prices remain display estimates, never authority.
  return {
    version: 1,
    provider,
    items: state.items.map(
      ({
        productId,
        variantId,
        slug,
        name,
        label,
        sku,
        amountCop,
        quantity,
      }) => ({
        productId,
        variantId,
        slug,
        name,
        label,
        sku,
        amountCop,
        quantity,
      }),
    ),
  };
}
export function addItem(state: CartState, item: CartItem): CartState {
  if (!validItem(item))
    throw new Error('Revisa la presentación y la cantidad.');
  const next = structuredClone(state);
  const existing = next.items.find((i) => i.variantId === item.variantId);
  if (existing) {
    if (existing.productId !== item.productId)
      throw new Error('La presentación no coincide.');
    const quantity = existing.quantity + item.quantity;
    if (!validQuantity(quantity))
      throw new Error('El máximo es 99 unidades por presentación.');
    Object.assign(existing, item, { quantity });
  } else {
    if (next.items.length >= MAX_LINES)
      throw new Error('El máximo es 50 presentaciones distintas.');
    next.items.push({ ...item });
  }
  subtotal(next.items);
  return next;
}
export function updateQuantity(
  state: CartState,
  variantId: string,
  quantity: number,
): CartState {
  if (!validQuantity(quantity))
    throw new Error('Usa una cantidad entera entre 1 y 99.');
  const next = structuredClone(state);
  const item = next.items.find((i) => i.variantId === variantId);
  if (!item) throw new Error('La presentación ya no está en el carrito.');
  item.quantity = quantity;
  subtotal(next.items);
  return next;
}
export function removeItem(state: CartState, variantId: string): CartState {
  return {
    ...state,
    items: state.items.filter((i) => i.variantId !== variantId),
  };
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function createCartStore(provider: Provider, storage: StoragePort) {
  let state = emptyCart(provider);
  let warning = '';
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const read = () => {
    try {
      state = parseCart(storage.getItem(cartKey(provider)), provider);
      warning = '';
    } catch {
      state = emptyCart(provider);
      warning =
        'No pudimos recuperar el carrito guardado. Puedes comenzar uno nuevo.';
    }
  };
  read();
  const commit = (next: CartState) => {
    state = next;
    try {
      storage.setItem(cartKey(provider), JSON.stringify(state));
      warning = '';
    } catch {
      warning =
        'El carrito solo está disponible en esta pestaña. No se pudo guardar; se perderá al recargar.';
    }
    notify();
  };
  return {
    snapshot: () => structuredClone(state),
    warning: () => warning,
    subscribe(listener: () => void) {
      listeners.add(listener);
      listener();
      return () => {
        listeners.delete(listener);
      };
    },
    add: (item: CartItem) => commit(addItem(state, item)),
    update: (id: string, quantity: number) =>
      commit(updateQuantity(state, id, quantity)),
    remove: (id: string) => commit(removeItem(state, id)),
    replace: (items: CartItem[]) =>
      commit(
        parseCart(JSON.stringify({ version: 1, provider, items }), provider),
      ),
    reload() {
      read();
      notify();
    },
  };
}
export type CartStore = ReturnType<typeof createCartStore>;
