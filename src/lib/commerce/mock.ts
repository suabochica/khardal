import { sampleCollections, sampleProducts } from './fixtures.ts';
import {
  CommerceError,
  type CartLineInput,
  type CommerceAdapter,
  type ProductQuery,
  type Product,
  type Variant,
} from './models.ts';
import { cop, lineTotal } from './money.ts';

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .trim();
}
export function lowestPrice(product: Product): number {
  return Math.min(...product.variants.map((v) => v.price.amount));
}
export function createMockAdapter(): CommerceAdapter {
  const products = structuredClone(sampleProducts);
  const collections = structuredClone(sampleCollections);
  return {
    provider: 'mock',
    async listProducts(query: ProductQuery = {}) {
      const {
        page = 1,
        pageSize = 6,
        sort = 'featured',
        minPrice,
        maxPrice,
      } = query;
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100 ||
        [minPrice, maxPrice].some(
          (v) => v !== undefined && (!Number.isSafeInteger(v) || v < 0),
        ) ||
        (minPrice !== undefined &&
          maxPrice !== undefined &&
          minPrice > maxPrice) ||
        !['featured', 'price-asc', 'price-desc', 'name'].includes(sort)
      ) {
        throw new CommerceError(
          'invalid-request',
          'Parámetros de catálogo inválidos.',
        );
      }
      const term = normalizeSearch(query.search ?? '');
      let items = products.filter(
        (p) =>
          (!term ||
            normalizeSearch(`${p.name} ${p.description} ${p.family}`).includes(
              term,
            )) &&
          (!query.collection || p.collectionSlugs.includes(query.collection)) &&
          (!query.category || p.category === query.category) &&
          (!query.family || p.family === query.family) &&
          // Price bounds must match the SAME variant, including unavailable variants for browsing.
          p.variants.some(
            (v) =>
              (minPrice === undefined || v.price.amount >= minPrice) &&
              (maxPrice === undefined || v.price.amount <= maxPrice),
          ),
      );
      if (sort !== 'featured')
        items = items.toSorted((a, b) => {
          const comparison =
            sort === 'name'
              ? a.name.localeCompare(b.name, 'es-CO')
              : (lowestPrice(a) - lowestPrice(b)) *
                (sort === 'price-desc' ? -1 : 1);
          return comparison || a.id.localeCompare(b.id);
        });
      const total = items.length;
      return structuredClone({
        items: items.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      });
    },
    async getProduct(slug) {
      return structuredClone(products.find((p) => p.slug === slug) ?? null);
    },
    async listCollections() {
      return structuredClone(collections);
    },
    async getCollection(slug) {
      return structuredClone(collections.find((c) => c.slug === slug) ?? null);
    },
    async validateCart(input: CartLineInput[]) {
      if (
        input.length > 50 ||
        input.some(
          (l) =>
            !l ||
            typeof l.variantId !== 'string' ||
            !Number.isSafeInteger(l.quantity) ||
            l.quantity < 1 ||
            l.quantity > 99,
        ) ||
        new Set(input.map((l) => l.variantId)).size !== input.length
      )
        throw new CommerceError(
          'invalid-request',
          'Líneas de carrito inválidas.',
        );
      const lines = input.map((line) => {
        const product =
          products.find((p) =>
            p.variants.some((v) => v.id === line.variantId),
          ) ?? null;
        const variant: Variant | null =
          product?.variants.find((v) => v.id === line.variantId) ?? null;
        const issue = !variant
          ? ('missing' as const)
          : variant.availability !== 'available'
            ? ('unavailable' as const)
            : variant.stockQuantity !== null &&
                line.quantity > variant.stockQuantity
              ? ('insufficient-stock' as const)
              : null;
        return {
          ...line,
          product,
          variant,
          issue,
          total:
            variant && !issue ? lineTotal(variant.price, line.quantity) : null,
        };
      });
      return structuredClone({
        lines,
        valid: lines.every((l) => !l.issue),
        subtotal: cop(
          lines.reduce((sum, l) => sum + (l.total?.amount ?? 0), 0),
        ),
      });
    },
  };
}
