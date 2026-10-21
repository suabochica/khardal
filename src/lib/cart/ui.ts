import { activeCart } from './context';
import { subtotal, type CartStore } from './state';
import { formatCop } from '../formatting/price';

function connectPanel(panel: HTMLElement, store: CartStore) {
  const list = panel.querySelector<HTMLElement>('[data-cart-items]')!;
  const template =
    panel.querySelector<HTMLTemplateElement>('[data-cart-item]')!;
  const feedback = panel.querySelector<HTMLElement>('[data-cart-feedback]')!;
  const render = () => {
    const items = store.snapshot().items;
    const focused = panel.contains(document.activeElement)
      ? document.activeElement?.getAttribute('data-focus-key')
      : null;
    list.replaceChildren();
    for (const [index, item] of items.entries()) {
      const fragment = template.content.cloneNode(true) as DocumentFragment;
      const text = (selector: string, value: string) => {
        fragment.querySelector(selector)!.textContent = value;
      };
      const name =
        fragment.querySelector<HTMLAnchorElement>('[data-item-name]')!;
      name.textContent = item.name;
      name.href = `/perfumes/${item.slug}`;
      text('[data-item-detail]', `${item.label} · SKU ${item.sku}`);
      text(
        '[data-item-price]',
        `Precio estimado: ${formatCop(item.amountCop)}`,
      );
      text('[data-item-total]', formatCop(item.amountCop * item.quantity));
      const input = fragment.querySelector<HTMLInputElement>(
        '[data-item-quantity]',
      )!;
      input.id = `${panel.dataset.cartPanel}-quantity-${index}`;
      input.dataset.variant = item.variantId;
      input.dataset.focusKey = `quantity:${item.variantId}`;
      input.value = String(item.quantity);
      const label =
        fragment.querySelector<HTMLLabelElement>('[data-item-label]')!;
      label.htmlFor = input.id;
      input.setAttribute(
        'aria-label',
        `Cantidad de ${item.name} ${item.label}`,
      );
      const remove =
        fragment.querySelector<HTMLButtonElement>('[data-item-remove]')!;
      remove.dataset.variant = item.variantId;
      remove.dataset.focusKey = `remove:${item.variantId}`;
      remove.setAttribute('aria-label', `Quitar ${item.name} ${item.label}`);
      list.append(fragment);
    }
    panel.querySelector<HTMLElement>('[data-cart-empty]')!.hidden =
      items.length > 0;
    panel.querySelector<HTMLElement>('[data-cart-totals]')!.hidden =
      items.length === 0;
    panel.querySelector('[data-cart-subtotal]')!.textContent = formatCop(
      subtotal(items),
    );
    panel.querySelector('[data-cart-warning]')!.textContent = store.warning();
    panel.querySelector<HTMLElement>('[data-cart-loading]')!.hidden = true;
    if (focused) {
      const target = Array.from(
        panel.querySelectorAll<HTMLElement>('[data-focus-key]'),
      ).find((el) => el.dataset.focusKey === focused);
      (
        target ??
        panel.querySelector<HTMLElement>('[data-focus-key]') ??
        feedback
      ).focus({ preventScroll: true });
    }
  };
  store.subscribe(render);
  panel.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.variant) return;
    try {
      store.update(input.dataset.variant, input.valueAsNumber);
      feedback.textContent = 'Cantidad actualizada.';
    } catch (error) {
      feedback.textContent =
        error instanceof Error ? error.message : 'Revisa la cantidad.';
      render();
    }
  });
  panel.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      '[data-item-remove]',
    );
    if (button?.dataset.variant) {
      store.remove(button.dataset.variant);
      feedback.textContent = 'Presentación retirada del carrito.';
    }
  });
}
export async function initCartUI() {
  try {
    const { store, provider } = await activeCart();
    document
      .querySelectorAll<HTMLElement>('[data-cart-sample]')
      .forEach((el) => {
        el.hidden = provider !== 'mock';
      });
    document
      .querySelectorAll<HTMLElement>('[data-cart-panel]')
      .forEach((panel) => connectPanel(panel, store));
    store.subscribe(() => {
      const count = store
        .snapshot()
        .items.reduce((sum, item) => sum + item.quantity, 0);
      document.querySelectorAll('[data-cart-count]').forEach((el) => {
        el.textContent = String(count);
      });
    });
    document.querySelector<HTMLElement>('[data-cart-fallback]')!.hidden = true;
    document.querySelector<HTMLElement>('[data-cart-enhancement]')!.hidden =
      false;
  } catch {
    document
      .querySelectorAll<HTMLElement>('[data-cart-loading]')
      .forEach((el) => {
        el.textContent =
          'No pudimos cargar el carrito. Recarga la página o contacta al equipo.';
      });
  }
}
