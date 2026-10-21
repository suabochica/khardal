import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addItem,
  cartKey,
  createCartStore,
  emptyCart,
  parseCart,
  subtotal,
  updateQuantity,
  type CartItem,
} from '../src/lib/cart/state.ts';
const item: CartItem = {
  productId: 'p1',
  variantId: 'v1',
  slug: 'perfume-uno',
  name: 'Ámbar',
  sku: 'SKU-1',
  label: '30 ml',
  amountCop: 65000,
  quantity: 1,
};
test('repeated additions, explicit removal and safe integer estimates', () => {
  const state = addItem(addItem(emptyCart('mock'), item), {
    ...item,
    quantity: 2,
  });
  assert.equal(state.items[0]?.quantity, 3);
  assert.equal(subtotal(state.items), 195000);
  for (const quantity of [0, -1, 0.5, 100, NaN])
    assert.throws(() => updateQuantity(state, 'v1', quantity));
  assert.throws(() => addItem(updateQuantity(state, 'v1', 99), item));
  assert.throws(() =>
    addItem(emptyCart('mock'), {
      ...item,
      amountCop: Number.MAX_SAFE_INTEGER,
      quantity: 2,
    }),
  );
});
test('versioned persistence survives reload, isolates providers and handles corruption', () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
  const store = createCartStore('mock', storage);
  store.add(item);
  store.add(item);
  assert.equal(
    createCartStore('mock', storage).snapshot().items[0]?.quantity,
    2,
  );
  assert.equal(createCartStore('shopify', storage).snapshot().items.length, 0);
  assert.throws(() => parseCart(memory.get(cartKey('mock'))!, 'shopify'));
  store.remove('v1');
  assert.equal(store.snapshot().items.length, 0);
  for (const raw of [
    '{broken',
    JSON.stringify({ version: 2, provider: 'mock', items: [] }),
    JSON.stringify({
      version: 1,
      provider: 'mock',
      items: [{ ...item, quantity: 0 }],
    }),
    JSON.stringify({ version: 1, provider: 'mock', items: [item, item] }),
  ]) {
    memory.set(cartKey('mock'), raw);
    const recovered = createCartStore('mock', storage);
    assert.equal(recovered.snapshot().items.length, 0);
    assert.match(recovered.warning(), /recuperar/);
    recovered.add(item);
    assert.equal(recovered.warning(), '');
  }
});
test('merchant items without an assigned SKU keep variant identity and persist', () => {
  const cart = addItem(emptyCart('woocommerce'), {
    ...item,
    variantId: 'wc-p-10',
    sku: '',
  });
  assert.equal(
    parseCart(JSON.stringify(cart), 'woocommerce').items[0]?.variantId,
    'wc-p-10',
  );
  assert.equal(cart.items[0]?.sku, '');
});

test('blocked storage retains in-memory cart and reports non-persistence', () => {
  const store = createCartStore('mock', {
    getItem() {
      throw new Error();
    },
    setItem() {
      throw new Error();
    },
  });
  store.add(item);
  assert.equal(store.snapshot().items.length, 1);
  assert.match(store.warning(), /se perderá/);
  const copy = store.snapshot();
  copy.items.length = 0;
  assert.equal(store.snapshot().items.length, 1);
});
