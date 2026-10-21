import {
  CommerceError,
  type CatalogImage,
  type Collection,
  type Product,
  type Variant,
} from '../models.ts';
import { parseCop } from '../money.ts';

export type WooRecord = Record<string, unknown>;
export function record(value: unknown): WooRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CommerceError(
      'unavailable',
      'WooCommerce devolvió datos de catálogo inválidos.',
    );
  return value as WooRecord;
}
export function rows(value: unknown): WooRecord[] {
  if (value === undefined) return [];
  if (!Array.isArray(value))
    throw new CommerceError(
      'unavailable',
      'WooCommerce devolvió datos de catálogo inválidos.',
    );
  return value.map(record);
}
export function nativeId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new CommerceError(
      'unavailable',
      'WooCommerce devolvió una identidad inválida.',
    );
  return value;
}
export const text = (value: unknown): string =>
  typeof value === 'string' ? value : '';
/** All provider copy is rendered as escaped plain text, never trusted HTML. */
export function plainText(value: unknown): string {
  const entities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    ndash: '–',
    mdash: '—',
  };
  return text(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:p|div|br|li|h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
      if (name.startsWith('#')) {
        const code =
          name[1]?.toLowerCase() === 'x'
            ? parseInt(name.slice(2), 16)
            : Number(name.slice(1));
        return code > 0 &&
          code <= 0x10ffff &&
          !(code >= 0xd800 && code <= 0xdfff)
          ? String.fromCodePoint(code)
          : '';
      }
      return entities[name.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, ' ')
    .trim();
}
export function meta(item: WooRecord, key: string): unknown {
  return rows(item.meta_data).find((m) => m.key === key)?.value;
}
export function isPublic(item: WooRecord): boolean {
  return (
    item.status === 'publish' &&
    item.catalog_visibility !== 'hidden' &&
    (item.type === 'simple' || item.type === 'variable')
  );
}

export function mapCategories(input: unknown[]): {
  raw: WooRecord[];
  collections: Collection[];
  typeIds: Set<number>;
} {
  const raw = input.map(record);
  const typeIds = new Set<number>(
    raw
      .filter((c) => c.slug === 'khardal-demo-tipos')
      .map((c) => nativeId(c.id)),
  );
  for (let n = 0; n < raw.length; n++)
    for (const c of raw)
      if (typeIds.has(Number(c.parent))) typeIds.add(nativeId(c.id));
  const collections = raw
    .filter(
      (c) =>
        !typeIds.has(nativeId(c.id)) &&
        !['uncategorized', 'khardal-demo-colecciones'].includes(text(c.slug)),
    )
    .map((c) => ({
      id: `wc-c-${nativeId(c.id)}`,
      slug: text(c.slug),
      name: plainText(c.name),
      description: plainText(c.description),
    }));
  return { raw, collections, typeIds };
}
type Categories = ReturnType<typeof mapCategories>;
const size = (item: WooRecord): number | null => {
  const explicit = Number(meta(item, '_khardal_size_ml'));
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const label = rows(item.attributes)
    .map(
      (a) =>
        text(a.option) ||
        (Array.isArray(a.options) && a.options.length === 1
          ? text(a.options[0])
          : ''),
    )
    .find((s) => /^\d+(?:\.\d+)?\s*ml$/i.test(s.trim()));
  return label ? parseFloat(label) : null;
};
function mapVariant(
  item: WooRecord,
  parent: WooRecord,
  simple: boolean,
): Variant | null {
  if (
    item.status !== 'publish' ||
    item.price === '' ||
    item.price === null ||
    item.price === undefined
  )
    return null;
  let price;
  try {
    price = parseCop(text(item.price));
  } catch {
    throw new CommerceError(
      'unavailable',
      'WooCommerce devolvió un precio COP no representable.',
    );
  }
  const inherited =
    item.manage_stock === 'parent' ||
    (!simple && item.manage_stock === false && parent.manage_stock === true);
  const stock = inherited ? parent : item;
  const tracked = inherited || item.manage_stock === true;
  const quantity =
    tracked &&
    typeof stock.stock_quantity === 'number' &&
    Number.isSafeInteger(stock.stock_quantity) &&
    stock.stock_quantity >= 0
      ? stock.stock_quantity
      : null;
  const unknown =
    meta(item, '_khardal_availability') === 'unknown' ||
    (tracked && quantity === null);
  const availability = unknown
    ? 'unknown'
    : quantity === 0 || stock.stock_status === 'outofstock'
      ? 'sold-out'
      : stock.stock_status === 'instock'
        ? 'available'
        : 'unknown';
  const attributes = rows(item.attributes)
    .map(
      (a) =>
        plainText(a.option) ||
        (simple && Array.isArray(a.options) && a.options.length === 1
          ? plainText(a.options[0])
          : ''),
    )
    .filter(Boolean);
  return {
    id: simple
      ? `wc-p-${nativeId(item.id)}`
      : `wc-v-${nativeId(parent.id)}-${nativeId(item.id)}`,
    sku: text(item.sku),
    label: attributes.join(' · ') || 'Presentación única',
    sizeMl: size(item),
    price,
    availability,
    stockQuantity: quantity,
  };
}
function mapImages(item: WooRecord, base: string): CatalogImage[] {
  return rows(item.images).flatMap((image) => {
    try {
      if (!text(image.src)) return [];
      const url = new URL(text(image.src), `${base.replace(/\/+$/, '')}/`);
      if (
        (url.protocol !== 'https:' &&
          !(
            url.protocol === 'http:' &&
            ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
          )) ||
        url.username ||
        url.password ||
        [...url.searchParams.keys()].some((k) => /^(consumer_|oauth_)/i.test(k))
      )
        return [];
      return [
        {
          id: `wc-image-${nativeId(image.id)}`,
          src: url.href,
          alt: plainText(image.alt) || plainText(item.name),
          width:
            typeof image.width === 'number' && image.width > 0
              ? image.width
              : null,
          height:
            typeof image.height === 'number' && image.height > 0
              ? image.height
              : null,
        },
      ];
    } catch {
      return [];
    }
  });
}
export function mapProduct(
  input: unknown,
  variations: unknown[],
  categories: Categories,
  base: string,
): Product | null {
  const item = record(input);
  if (!isPublic(item)) return null;
  const attributes = rows(item.attributes);
  const familyAttribute = attributes.find(
    (a) => /familia/i.test(plainText(a.name)) || a.slug === 'pa_kh-familia',
  );
  const familyOptions = Array.isArray(familyAttribute?.options)
    ? familyAttribute.options.map(plainText).filter(Boolean)
    : [];
  const assigned = rows(item.categories);
  const allowedCollections = new Set(categories.collections.map((c) => c.slug));
  const slugs = new Set<string>();
  for (const c of assigned) {
    let current: WooRecord | undefined = categories.raw.find(
      (t) => t.id === c.id,
    );
    const seen = new Set<number>();
    while (current && !seen.has(nativeId(current.id))) {
      seen.add(nativeId(current.id));
      if (allowedCollections.has(text(current.slug)))
        slugs.add(text(current.slug));
      current = categories.raw.find((t) => t.id === current?.parent);
    }
  }
  const notes = meta(item, '_khardal_notes');
  let mappedNotes: Product['notes'];
  if (notes && typeof notes === 'object' && !Array.isArray(notes)) {
    const n = notes as WooRecord;
    const clean = (value: unknown) =>
      Array.isArray(value) ? value.map(plainText).filter(Boolean) : [];
    const parsed = {
      top: clean(n.top),
      heart: clean(n.heart),
      base: clean(n.base),
    };
    if (Object.values(parsed).some((values) => values.length))
      mappedNotes = parsed;
  }
  const variants =
    item.type === 'simple'
      ? [mapVariant(item, item, true)].filter((v): v is Variant => v !== null)
      : variations
          .map((v) => mapVariant(record(v), item, false))
          .filter((v): v is Variant => v !== null);
  const slug = text(item.slug),
    name = plainText(item.name);
  if (!slug || !name)
    throw new CommerceError(
      'unavailable',
      'WooCommerce devolvió un producto sin identidad pública.',
    );
  return {
    id: `wc-p-${nativeId(item.id)}`,
    slug,
    name,
    description:
      plainText(item.description) || plainText(item.short_description),
    category:
      plainText(meta(item, '_khardal_category')) ||
      plainText(
        assigned.find((c) => categories.typeIds.has(nativeId(c.id)))?.name,
      ) ||
      plainText(assigned.find((c) => c.slug !== 'uncategorized')?.name),
    family:
      plainText(meta(item, '_khardal_fragrance_family')) ||
      familyOptions.join(' · '),
    collectionSlugs: [...slugs],
    images: mapImages(item, base),
    ...(mappedNotes ? { notes: mappedNotes } : {}),
    variants,
    sample: meta(item, '_khardal_sample') === 'yes',
  };
}
