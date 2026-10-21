import type { CartItem, Provider } from './state.ts';
import type { Handoff } from './whatsapp.ts';
export interface ValidationResult {
  provider: Provider;
  validatedAt: string;
  valid: boolean;
  changed: boolean;
  subtotalCop: number;
  handoff?: Handoff;
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
