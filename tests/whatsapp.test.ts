import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareHandoff, PRIMARY_WHATSAPP } from '../src/lib/cart/whatsapp.ts';
import type { ValidationResult } from '../src/lib/cart/validation.ts';
const result: ValidationResult = {
  provider: 'mock',
  validatedAt: '2026-10-21T12:00:00.000Z',
  valid: true,
  changed: false,
  subtotalCop: 130000,
  lines: [
    {
      variantId: 'v1',
      quantity: 2,
      issue: null,
      changed: false,
      expectedAmountCop: 65000,
      maxQuantity: 5,
      current: {
        productId: 'p1',
        variantId: 'v1',
        name: 'Té, ámbar & jazmín',
        label: '30 ml',
        sku: 'KH-DEMO-1',
        amountCop: 65000,
        quantity: 2,
        slug: 'te-ambar',
      },
    },
  ],
};
test('WhatsApp encoding preserves accents, lines, identities and authoritative totals', () => {
  const handoff = prepareHandoff(result, 'https://tienda.test', 'demo-ref');
  assert.equal(
    new URL(handoff.url).origin + new URL(handoff.url).pathname,
    PRIMARY_WHATSAPP,
  );
  assert.equal(new URL(handoff.url).searchParams.get('text'), handoff.message);
  assert.match(handoff.message, /Té, ámbar & jazmín/);
  assert.match(handoff.message, /Cantidad: 2/);
  assert.match(handoff.message, /COP\s130\.000/);
  assert.match(handoff.message, /https:\/\/tienda.test\/perfumes\/te-ambar/);
  assert.match(handoff.message, /DEMOSTRACIÓN/);
  assert.match(handoff.message, /no confirma un pedido ni un pago/);
  assert.equal(handoff.expiresAt, '2026-10-21T12:01:00.000Z');
  assert.throws(() =>
    prepareHandoff({ ...result, valid: false }, 'https://tienda.test'),
  );
  assert.throws(() =>
    prepareHandoff({ ...result, changed: true }, 'https://tienda.test'),
  );
});
test('long carts keep the complete message and use copy/paste rather than truncation', () => {
  const handoff = prepareHandoff(
    {
      ...result,
      lines: Array.from({ length: 50 }, () =>
        structuredClone(result.lines[0]!),
      ),
    },
    'https://tienda.test',
    'long-demo',
  );
  assert.equal(handoff.copyRequired, true);
  assert.equal(handoff.url, PRIMARY_WHATSAPP);
  assert.match(handoff.message, /50\. Té, ámbar & jazmín/);
});
