import {
  cartKey,
  createCartStore,
  type CartStore,
  type Provider,
} from './state';

const stores = new Map<Provider, CartStore>();
export function getCartStore(provider: Provider): CartStore {
  let store = stores.get(provider);
  if (!store) {
    // Access localStorage lazily: browsers can throw even when reading the property.
    store = createCartStore(provider, {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    });
    stores.set(provider, store);
    const current = store;
    window.addEventListener('storage', (event) => {
      if (event.key === cartKey(provider) || event.key === null)
        current.reload();
    });
  }
  return store;
}
