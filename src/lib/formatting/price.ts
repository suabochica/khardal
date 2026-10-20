const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  currencyDisplay: 'code',
  maximumFractionDigits: 0,
});

// UI amounts are whole COP pesos, not centavos. Adapters must convert explicitly.
export function formatCop(amountCop: number): string {
  if (!Number.isSafeInteger(amountCop) || amountCop < 0) {
    throw new Error(
      'COP display amounts must be non-negative safe integers in pesos.',
    );
  }
  return cop.format(amountCop);
}
