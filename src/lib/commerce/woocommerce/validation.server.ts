import {
  CommerceError,
  type CartLineInput,
  type CartValidation,
  type Product,
  type ValidatedLine,
} from '../models.ts';
import { cop, lineTotal } from '../money.ts';
import {
  isPublic,
  mapProduct,
  nativeId,
  record,
  rows,
  type WooRecord,
  type mapCategories,
} from './mapping.ts';
import type { createWooClient } from './client.server.ts';

export function parseWooVariantId(
  value: string,
): { parent: number; variation: number | null } | null {
  const simple = /^wc-p-([1-9]\d*)$/.exec(value);
  const variable = /^wc-v-([1-9]\d*)-([1-9]\d*)$/.exec(value);
  const parent = Number(simple?.[1] ?? variable?.[1]);
  const variation = variable ? Number(variable[2]) : null;
  return Number.isSafeInteger(parent) &&
    parent > 0 &&
    (variation === null || Number.isSafeInteger(variation))
    ? { parent, variation }
    : null;
}
export async function validateWooCart(
  input: CartLineInput[],
  client: ReturnType<typeof createWooClient>,
  categories: (
    signal: AbortSignal,
  ) => Promise<ReturnType<typeof mapCategories>>,
  currency: (signal: AbortSignal) => Promise<void>,
  base: string,
): Promise<CartValidation> {
  if (
    !Array.isArray(input) ||
    input.length > 50 ||
    input.some(
      (l) =>
        !l ||
        typeof l.variantId !== 'string' ||
        l.variantId.length > 300 ||
        !Number.isSafeInteger(l.quantity) ||
        l.quantity < 1 ||
        l.quantity > 99,
    ) ||
    new Set(input.map((l) => l.variantId)).size !== input.length
  )
    throw new CommerceError('invalid-request', 'Líneas de carrito inválidas.');
  const parsed = input.map((l) => parseWooVariantId(l.variantId));
  const parents = [...new Set(parsed.flatMap((p) => (p ? [p.parent] : [])))];
  const fresh = new Map<
    number,
    { raw: WooRecord; variations: WooRecord[]; product: Product | null }
  >();
  if (parents.length) {
    const signal = AbortSignal.timeout(10000);
    const [raw, cats] = await Promise.all([
      client.all(
        'products',
        { include: parents.join(','), status: 'publish' },
        signal,
        100,
      ),
      categories(signal),
      currency(signal),
    ]);
    const items = raw.map(record).filter(isPublic);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, items.length) }, async () => {
        while (next < items.length) {
          const item = items[next++]!;
          const variations =
            item.type === 'variable'
              ? rows(
                  await client.all(
                    `products/${nativeId(item.id)}/variations`,
                    { orderby: 'menu_order', order: 'asc' },
                    signal,
                    200,
                  ),
                )
              : [];
          fresh.set(nativeId(item.id), {
            raw: item,
            variations,
            product: mapProduct(item, variations, cats, base),
          });
        }
      }),
    );
  }
  const lines: ValidatedLine[] = input.map((line, index) => {
    const identity = parsed[index];
    const parent = identity ? fresh.get(identity.parent) : undefined;
    const product = parent?.product ?? null;
    const correctType =
      identity?.variation === null
        ? parent?.raw.type === 'simple'
        : parent?.raw.type === 'variable';
    const rawVariant = correctType
      ? identity?.variation === null
        ? parent?.raw
        : parent?.variations.find((v) => v.id === identity?.variation)
      : undefined;
    const variant =
      product?.variants.find((v) => v.id === line.variantId) ?? null;
    const issue = !rawVariant
      ? 'missing'
      : !variant || variant.availability !== 'available'
        ? 'unavailable'
        : variant.stockQuantity !== null &&
            line.quantity > variant.stockQuantity
          ? 'insufficient-stock'
          : null;
    const inherited =
      rawVariant &&
      parent?.raw.type === 'variable' &&
      parent.raw.manage_stock === true &&
      (rawVariant.manage_stock === 'parent' ||
        rawVariant.manage_stock === false);
    return {
      ...line,
      product,
      variant,
      issue,
      total: variant && !issue ? lineTotal(variant.price, line.quantity) : null,
      ...(inherited ? { stockGroup: product!.id } : {}),
    };
  });
  const groups = new Map<string, number>();
  for (const line of lines)
    if (line.stockGroup && line.variant?.availability === 'available')
      groups.set(
        line.stockGroup,
        (groups.get(line.stockGroup) ?? 0) + line.quantity,
      );
  for (const line of lines)
    if (
      line.stockGroup &&
      line.variant?.stockQuantity != null &&
      (groups.get(line.stockGroup) ?? 0) > line.variant.stockQuantity
    ) {
      line.issue = 'insufficient-stock';
      line.total = null;
    }
  return {
    lines,
    valid: lines.every((l) => !l.issue),
    subtotal: cop(lines.reduce((sum, l) => sum + (l.total?.amount ?? 0), 0)),
    sample: lines.some((l) => l.product?.sample),
  };
}
