import { sampleCollections, sampleProducts } from './fixtures.ts';
import {
  CommerceError,
  type CartLineInput,
  type CommerceAdapter,
  type Variant,
} from './models.ts';
import { cop, lineTotal } from './money.ts';
import { selectProducts } from './catalog.ts';

export function createMockAdapter(): CommerceAdapter {
  const products = structuredClone(sampleProducts);
  const collections = structuredClone(sampleCollections);
  return {
    provider: 'mock',
    async getFacets(collection) {
      const members = products.filter(
        (p) => !collection || p.collectionSlugs.includes(collection),
      );
      return {
        categories: [...new Set(members.map((p) => p.category))].sort(),
        families: [...new Set(members.map((p) => p.family))].sort(),
      };
    },
    async listProducts(query = {}) {
      return selectProducts(products, query);
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
