/** Whole Colombian pesos, never floating-point major/minor currency guesses. */
export interface Money {
  currency: 'COP';
  amount: number;
}
export interface CatalogImage {
  id: string;
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
}
export type Availability = 'available' | 'sold-out' | 'unknown';
export interface Variant {
  id: string;
  sku: string;
  label: string;
  sizeMl: number | null;
  price: Money;
  availability: Availability;
  stockQuantity: number | null;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  family: string;
  collectionSlugs: string[];
  images: CatalogImage[];
  notes?: { top: string[]; heart: string[]; base: string[] };
  variants: Variant[];
  sample: boolean;
}
export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
}
export type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name';
export interface ProductQuery {
  search?: string;
  collection?: string;
  category?: string;
  family?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: Sort;
  page?: number;
  pageSize?: number;
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface CartLineInput {
  variantId: string;
  quantity: number;
}
export interface ValidatedLine {
  stockGroup?: string;
  variantId: string;
  quantity: number;
  product: Product | null;
  variant: Variant | null;
  issue: 'missing' | 'unavailable' | 'insufficient-stock' | null;
  total: Money | null;
}
export interface CartValidation {
  sample?: boolean;
  lines: ValidatedLine[];
  valid: boolean;
  subtotal: Money;
}
export interface CommerceAdapter {
  readonly provider: 'mock' | 'woocommerce' | 'shopify';
  listProducts(query?: ProductQuery): Promise<Page<Product>>;
  getProduct(slug: string): Promise<Product | null>;
  listCollections(): Promise<Collection[]>;
  getCollection(slug: string): Promise<Collection | null>;
  getFacets(
    collection?: string,
  ): Promise<{ categories: string[]; families: string[] }>;
  validateCart(lines: CartLineInput[]): Promise<CartValidation>;
}
export class CommerceError extends Error {
  readonly code:
    'invalid-request' | 'unavailable' | 'unauthorized' | 'rate-limited';
  constructor(code: CommerceError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'CommerceError';
  }
}
