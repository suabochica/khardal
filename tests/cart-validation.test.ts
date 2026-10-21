import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleValidation } from '../src/lib/cart/validate.server.ts';
import { createMockAdapter } from '../src/lib/commerce/mock.ts';
const line = { variantId: 'mock-001-30', quantity: 2, expectedAmountCop: 1 };
const request = (body: unknown) =>
  new Request('https://khardal.test/api/cart/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const load = async () => createMockAdapter();
test('validation recomputes tampered totals and reports changed prices and missing stock', async () => {
  const response = await handleValidation(
    request({ provider: 'mock', lines: [line], subtotal: 1 }),
    load,
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.equal(result.subtotalCop, 130000);
  assert.equal(result.changed, true);
  assert.equal(result.valid, true);
  const failed = await (
    await handleValidation(
      request({
        provider: 'mock',
        lines: [
          { ...line, quantity: 99 },
          { ...line, variantId: 'missing' },
          { ...line, variantId: 'mock-007-30' },
        ],
      }),
      load,
    )
  ).json();
  assert.equal(failed.valid, false);
  assert.deepEqual(
    failed.lines.map((l: { issue: string }) => l.issue),
    ['insufficient-stock', 'missing', 'unavailable'],
  );
});
test('request bounds and provider failures are recoverable and non-disclosing', async () => {
  for (const lines of [
    [],
    [line, line],
    [{ ...line, quantity: 100 }],
    [{ ...line, quantity: 1.5 }],
    Array.from({ length: 51 }, (_, n) => ({ ...line, variantId: String(n) })),
  ])
    assert.equal(
      (await handleValidation(request({ provider: 'mock', lines }), load))
        .status,
      400,
    );
  assert.equal(
    (
      await handleValidation(
        request({ provider: 'shopify', lines: [line] }),
        load,
      )
    ).status,
    409,
  );
  const failed = await handleValidation(
    request({ provider: 'mock', lines: [line] }),
    async () => {
      throw new Error('private-token-marker');
    },
  );
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes('private-token-marker'));
  assert.equal(
    (
      await handleValidation(
        new Request('https://khardal.test/api/cart/validate'),
        load,
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await handleValidation(
        new Request('https://khardal.test/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ' '.repeat(17000),
        }),
        load,
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await handleValidation(
        new Request('https://khardal.test/api/cart/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://other.test',
          },
          body: '{}',
        }),
        load,
      )
    ).status,
    403,
  );
});
