import type { Product } from './models.ts';

export function lowestPrice(product: Product): number {
  return Math.min(...product.variants.map((v) => v.price.amount));
}
