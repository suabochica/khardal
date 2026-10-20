import type { Money } from './models.ts';

export function cop(amount: number): Money {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new RangeError('Invalid whole COP amount.');
  return { currency: 'COP', amount };
}

/** Strict decimal API conversion; COP fractions are rejected, never silently rounded. */
export function parseCop(value: string): Money {
  if (!/^\d+(?:\.0+)?$/.test(value))
    throw new RangeError('Invalid COP decimal.');
  return cop(Number(value));
}

export function lineTotal(price: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity) || quantity < 1)
    throw new RangeError('Invalid quantity.');
  return cop(price.amount * quantity);
}
