import { CommerceError, type CommerceAdapter } from '../commerce/models.ts';
import { cop, lineTotal } from '../commerce/money.ts';
import { isProvider, validQuantity, MAX_LINES } from './state.ts';
import type { ValidationResult } from './validation.ts';
import { prepareHandoff } from './whatsapp.ts';

class InputError extends Error {
  status: number;
  constructor(status: number) {
    super('Solicitud de carrito inválida.');
    this.status = status;
  }
}
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
async function readBody(
  request: Request,
  trustedOrigin: string,
): Promise<unknown> {
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim() !==
    'application/json'
  )
    throw new InputError(415);
  const origin = request.headers.get('origin');
  if (origin && origin !== trustedOrigin) throw new InputError(403);
  if (Number(request.headers.get('content-length') ?? 0) > 16384)
    throw new InputError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError(400);
  const signal = AbortSignal.timeout(5000);
  const abort = () => {
    void reader.cancel();
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (signal.aborted) throw new InputError(408);
      if (done) break;
      size += value.byteLength;
      if (size > 16384) throw new InputError(413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      return JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      );
    } catch {
      throw new InputError(400);
    }
  } finally {
    signal.removeEventListener('abort', abort);
    void reader.cancel().catch(() => {});
  }
}
export async function handleValidation(
  request: Request,
  load: () => Promise<CommerceAdapter>,
  trustedOrigin = new URL(request.url).origin,
): Promise<Response> {
  if (request.method !== 'POST')
    return Response.json(
      { error: 'Usa POST para validar el carrito.' },
      { status: 405, headers: { ...headers, Allow: 'POST' } },
    );
  try {
    const body = await readBody(request, trustedOrigin);
    if (
      !body ||
      typeof body !== 'object' ||
      !('provider' in body) ||
      !isProvider(body.provider) ||
      !('lines' in body) ||
      !Array.isArray(body.lines) ||
      body.lines.length < 1 ||
      body.lines.length > MAX_LINES
    )
      throw new InputError(400);
    const lines = body.lines.map((line: unknown) => {
      if (
        !line ||
        typeof line !== 'object' ||
        !('variantId' in line) ||
        typeof line.variantId !== 'string' ||
        !line.variantId.trim() ||
        line.variantId.length > 300 ||
        !('quantity' in line) ||
        !validQuantity(line.quantity) ||
        !('expectedAmountCop' in line) ||
        typeof line.expectedAmountCop !== 'number' ||
        !Number.isSafeInteger(line.expectedAmountCop) ||
        line.expectedAmountCop < 0
      )
        throw new InputError(400);
      return {
        variantId: line.variantId,
        quantity: line.quantity,
        expectedAmountCop: line.expectedAmountCop,
      };
    });
    if (new Set(lines.map((l) => l.variantId)).size !== lines.length)
      throw new InputError(400);
    const adapter = await load();
    if (body.provider !== adapter.provider)
      return Response.json(
        {
          error: 'El proveedor cambió. Recarga el carrito antes de continuar.',
        },
        { status: 409, headers },
      );
    const validated = await adapter.validateCart(
      lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
    );
    const expected = new Map(lines.map((line) => [line.variantId, line]));
    if (
      validated.lines.length !== lines.length ||
      new Set(validated.lines.map((line) => line.variantId)).size !==
        lines.length ||
      validated.lines.some(
        (line) =>
          !expected.has(line.variantId) ||
          expected.get(line.variantId)!.quantity !== line.quantity,
      )
    )
      throw new Error('Inconsistent provider validation.');
    const resultLines: ValidationResult['lines'] = validated.lines.map(
      (line) => {
        const { product, variant } = line;
        const expectedAmountCop = expected.get(
          line.variantId,
        )!.expectedAmountCop;
        return {
          variantId: line.variantId,
          productName: product?.name ?? null,
          sharedStock: Boolean(line.stockGroup),
          quantity: line.quantity,
          issue: line.issue,
          changed:
            variant !== null && variant.price.amount !== expectedAmountCop,
          expectedAmountCop,
          maxQuantity: variant?.stockQuantity ?? null,
          current:
            product && variant
              ? {
                  productId: product.id,
                  variantId: variant.id,
                  slug: product.slug,
                  name: product.name,
                  sku: variant.sku,
                  label: variant.label,
                  amountCop: cop(variant.price.amount).amount,
                  ...(product.sample ? { sample: true } : {}),
                  quantity: line.quantity,
                }
              : null,
        };
      },
    );
    const result: ValidationResult = {
      provider: adapter.provider,
      validatedAt: new Date().toISOString(),
      valid: resultLines.every((l) => !l.issue),
      changed: resultLines.some((l) => l.changed),
      subtotalCop: cop(
        resultLines.reduce(
          (sum, l) =>
            sum +
            (l.current && !l.issue
              ? lineTotal(cop(l.current.amountCop), l.quantity).amount
              : 0),
          0,
        ),
      ).amount,
      sample:
        validated.sample ?? validated.lines.some((l) => l.product?.sample),
      lines: resultLines,
    };
    if (result.valid && !result.changed)
      result.handoff = prepareHandoff(result, trustedOrigin);
    return Response.json(result, { headers });
  } catch (error) {
    const status =
      error instanceof InputError
        ? error.status
        : error instanceof CommerceError && error.code === 'rate-limited'
          ? 429
          : 503;
    return Response.json(
      {
        error:
          status < 500 && status !== 429
            ? 'Revisa el carrito: cantidades enteras de 1 a 99 y hasta 50 presentaciones. Intenta de nuevo.'
            : 'No pudimos verificar precios y disponibilidad. Intenta de nuevo o contacta al equipo; no se ha creado un pedido.',
      },
      {
        status,
        headers: {
          ...headers,
          ...(status === 429 ? { 'Retry-After': '30' } : {}),
        },
      },
    );
  }
}
