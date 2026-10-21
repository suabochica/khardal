import type { CartItem, Provider } from './state.ts';
export interface ValidationResult {
  provider: Provider;
  validatedAt: string;
  valid: boolean;
  changed: boolean;
  subtotalCop: number;
  lines: {
    variantId: string;
    quantity: number;
    issue: 'missing' | 'unavailable' | 'insufficient-stock' | null;
    changed: boolean;
    expectedAmountCop: number;
    current: CartItem | null;
    maxQuantity: number | null;
  }[];
}
