import type { ValidationResult } from './validation';
import type { Handoff } from './whatsapp';

export function initHandoff() {
  const root = document.querySelector<HTMLElement>('[data-cart-validation]');
  const panel = root?.querySelector<HTMLElement>('[data-handoff]');
  if (!root || !panel) return;
  const link = panel.querySelector<HTMLAnchorElement>('[data-whatsapp-open]')!;
  const message = panel.querySelector<HTMLTextAreaElement>(
    '[data-whatsapp-message]',
  )!;
  const copy = panel.querySelector<HTMLButtonElement>('[data-whatsapp-copy]')!;
  const status = panel.querySelector<HTMLElement>('[data-handoff-status]')!;
  const title = panel.querySelector<HTMLElement>('[data-handoff-title]')!;
  let handoff: Handoff | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fresh = () =>
    handoff !== null && Date.now() < Date.parse(handoff.expiresAt);
  const expire = () => {
    title.textContent = 'Vuelve a verificar el carrito';
    handoff = null;
    link.hidden = true;
    link.removeAttribute('href');
    copy.disabled = true;
    message.value = '';
    status.textContent =
      'La verificación caducó. Vuelve a solicitar el pedido para verificar precios y disponibilidad actuales.';
  };
  root.addEventListener('cart:validation-cleared', () => {
    clearTimeout(timer);
    handoff = null;
    panel.hidden = true;
    message.value = '';
    link.removeAttribute('href');
  });
  root.addEventListener('cart:validated', (event) => {
    const result = (event as CustomEvent<ValidationResult>).detail;
    if (!result.valid || result.changed || !result.handoff) return;
    handoff = result.handoff;
    title.textContent = 'Tu mensaje está preparado';
    panel.hidden = false;
    link.hidden = false;
    copy.disabled = false;
    message.value = handoff.message;
    link.href = handoff.url;
    link.textContent = handoff.copyRequired
      ? 'Abrir WhatsApp y pegar mensaje'
      : 'Abrir WhatsApp';
    status.textContent = handoff.copyRequired
      ? 'El mensaje es largo. Cópialo completo y pégalo en WhatsApp; no se ha recortado ningún producto.'
      : 'Mensaje listo para revisar y enviar. La verificación caduca en un minuto.';
    clearTimeout(timer);
    if (!fresh()) expire();
    else
      timer = setTimeout(
        expire,
        Math.min(60000, Date.parse(handoff.expiresAt) - Date.now()),
      );
  });
  link.addEventListener('click', (event) => {
    if (!fresh()) {
      event.preventDefault();
      expire();
      return;
    }
    status.textContent =
      'Se solicitó abrir WhatsApp. Envía el mensaje allí y espera la confirmación del equipo. Tu carrito se conserva; no se ha confirmado un pedido ni un pago.';
  });
  copy.addEventListener('click', async () => {
    if (!fresh()) {
      expire();
      return;
    }
    const current = handoff;
    try {
      await navigator.clipboard.writeText(message.value);
      if (current === handoff)
        status.textContent =
          'Mensaje copiado. Pégalo en WhatsApp y espera la confirmación del equipo.';
    } catch {
      if (current !== handoff) return;
      message.focus();
      message.select();
      status.textContent =
        'No pudimos copiar automáticamente. El mensaje está seleccionado: usa Copiar, Ctrl+C o Cmd+C y pégalo en WhatsApp.';
    }
  });
  window.addEventListener('pageshow', () => {
    if (handoff && !fresh()) expire();
  });
}
