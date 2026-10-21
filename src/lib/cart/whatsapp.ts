import { formatCop } from '../formatting/price.ts';
import type { ValidationResult } from './validation.ts';
export const PRIMARY_WHATSAPP = 'https://wa.me/573108570230';
export const MAX_PREFILLED_URL = 4000;
export interface Handoff {
  requestId: string;
  message: string;
  url: string;
  copyRequired: boolean;
  expiresAt: string;
}
const clean = (value: string) => value.replace(/\s+/gu, ' ').trim();
export function prepareHandoff(
  result: ValidationResult,
  origin: string,
  requestId: string = crypto.randomUUID(),
): Handoff {
  if (
    !result.valid ||
    result.changed ||
    !result.lines.length ||
    result.lines.some((l) => l.issue || !l.current)
  )
    throw new Error('A fresh valid cart is required.');
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol))
    throw new Error('Invalid storefront URL.');
  const message = [
    ...(result.provider === 'mock'
      ? [
          'DEMOSTRACIÓN — NO ES UN PEDIDO REAL. Productos y precios de muestra.',
          '',
        ]
      : []),
    'Hola, Khardal Perfumería. Quisiera solicitar la confirmación de este pedido:',
    `Referencia de solicitud (no es número de pedido): ${requestId}`,
    '',
    ...result.lines.flatMap((line, index) => {
      const item = line.current!;
      return [
        `${index + 1}. ${clean(item.name)} · ${clean(item.label)}`,
        `SKU: ${clean(item.sku) || `Sin SKU asignado (variante ${clean(item.variantId)})`} | Cantidad: ${line.quantity}`,
        `Precio unitario: ${formatCop(item.amountCop)} | Total: ${formatCop(item.amountCop * line.quantity)}`,
        new URL(`/perfumes/${encodeURIComponent(item.slug)}`, base.origin).href,
        '',
      ];
    }),
    `Subtotal estimado: ${formatCop(result.subtotalCop)}`,
    'Envío: Por confirmar.',
    `Precios y disponibilidad consultados: ${result.validatedAt}`,
    'Por favor, confirmar disponibilidad, envío, valor final y forma de pago.',
    'Esta solicitud no confirma un pedido ni un pago y no reserva inventario.',
  ].join('\n');
  const encoded = `${PRIMARY_WHATSAPP}?text=${encodeURIComponent(message)}`;
  const copyRequired = encoded.length > MAX_PREFILLED_URL;
  return {
    requestId,
    message,
    url: copyRequired ? PRIMARY_WHATSAPP : encoded,
    copyRequired,
    expiresAt: new Date(Date.parse(result.validatedAt) + 60000).toISOString(),
  };
}
