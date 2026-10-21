import { activeCart } from './context';
import type { ValidationResult } from './validation';
import { formatCop } from '../formatting/price';

export async function initValidation() {
  const root = document.querySelector<HTMLElement>('[data-cart-validation]');
  if (!root) return;
  try {
    const { store, provider } = await activeCart();
    const button = root.querySelector<HTMLButtonElement>(
      '[data-cart-validate]',
    )!;
    const status = root.querySelector<HTMLElement>('[data-validation-status]')!;
    const list = root.querySelector<HTMLElement>('[data-validation-lines]')!;
    const accept = root.querySelector<HTMLButtonElement>(
      '[data-accept-prices]',
    )!;
    let result: ValidationResult | null = null;
    let revision = 0;
    let controller: AbortController | null = null;
    store.subscribe(() => {
      revision++;
      controller?.abort();
      result = null;
      accept.hidden = true;
      status.textContent = '';
      list.replaceChildren();
      button.disabled = false;
      button.removeAttribute('aria-busy');
      root.hidden = !store.snapshot().items.length;
      root.dispatchEvent(new CustomEvent('cart:validation-cleared'));
    });
    button.addEventListener('click', async () => {
      const current = revision;
      controller = new AbortController();
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      status.textContent = 'Verificando precios y disponibilidad…';
      list.replaceChildren();
      accept.hidden = true;
      result = null;
      root.dispatchEvent(new CustomEvent('cart:validation-cleared'));
      try {
        const response = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(12000),
          ]),
          body: JSON.stringify({
            provider,
            lines: store.snapshot().items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              expectedAmountCop: i.amountCop,
            })),
          }),
        });
        const data = await response.json();
        if (current !== revision) return;
        if (!response.ok)
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'No pudimos verificar el carrito. Intenta de nuevo.',
          );
        result = data as ValidationResult;
        for (const line of result.lines) {
          const li = document.createElement('li');
          const name = line.current
            ? `${line.current.name} · ${line.current.label}`
            : 'Presentación retirada del catálogo';
          const issue =
            line.issue === 'missing'
              ? 'No disponible: quítala del carrito.'
              : line.issue === 'unavailable'
                ? 'Agotada o disponibilidad por confirmar: quítala o consulta al equipo.'
                : line.issue === 'insufficient-stock'
                  ? `Solo hay ${line.maxQuantity} unidades; ajusta la cantidad.`
                  : 'Disponible.';
          li.textContent = `${name}: ${issue}${line.changed ? ` Precio anterior ${formatCop(line.expectedAmountCop)} → actual ${formatCop(line.current!.amountCop)}.` : ''}`;
          list.append(li);
        }
        status.textContent = !result.valid
          ? 'Hay presentaciones que debes revisar. Ajusta el carrito y vuelve a validar; no se ha creado un pedido.'
          : result.changed
            ? 'Los precios cambiaron. Revisa y acepta los precios actuales antes de continuar.'
            : `Precios y disponibilidad verificados. Subtotal estimado: ${formatCop(result.subtotalCop)}. Envío por confirmar. No se ha creado un pedido.`;
        accept.hidden = !(result.valid && result.changed);
        if (result.valid && !result.changed)
          root.dispatchEvent(
            new CustomEvent('cart:validated', { detail: result }),
          );
      } catch (error) {
        if (current === revision)
          status.textContent =
            error instanceof Error && error.name !== 'TimeoutError'
              ? error.message
              : 'La verificación tardó demasiado. Intenta de nuevo o contacta al equipo.';
      } finally {
        if (current === revision) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      }
    });
    accept.addEventListener('click', () => {
      if (!result?.valid || !result.changed) return;
      const items = result.lines.map((l) => l.current!);
      store.replace(items);
      status.textContent =
        'Precios actualizados en el carrito. Vuelve a validar antes de continuar.';
    });
  } catch {
    /* The cart panel already offers reload/contact recovery. */
  }
}
