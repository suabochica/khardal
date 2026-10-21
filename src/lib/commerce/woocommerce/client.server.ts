import { createHmac, randomBytes } from 'node:crypto';
import {
  parseCommerceConfig,
  type CommerceConfig,
} from '../../../config/commerce.ts';
import { CommerceError } from '../models.ts';

export type WooConfig = Extract<CommerceConfig, { provider: 'woocommerce' }>;
const encode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
function authorization(url: URL, config: WooConfig): string {
  if (url.protocol === 'https:')
    return `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`;
  const oauth: Record<string, string> = {
    oauth_consumer_key: config.consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
  };
  const parameters = [...url.searchParams, ...Object.entries(oauth)]
    .map(([k, v]) => [encode(k), encode(v)])
    .sort(([ak, av], [bk, bv]) =>
      ak! < bk! ? -1 : ak! > bk! ? 1 : av! < bv! ? -1 : av! > bv! ? 1 : 0,
    )
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  oauth.oauth_signature = createHmac(
    'sha256',
    `${encode(config.consumerSecret)}&`,
  )
    .update(`GET&${encode(url.origin + url.pathname)}&${encode(parameters)}`)
    .digest('base64');
  return `OAuth ${Object.entries(oauth)
    .map(([k, v]) => `${encode(k)}="${encode(v)}"`)
    .join(', ')}`;
}
const unavailable = () =>
  new CommerceError(
    'unavailable',
    'No pudimos consultar el catálogo de WooCommerce.',
  );

export function createWooClient(
  input: WooConfig,
  transport: typeof fetch = fetch,
) {
  const config = parseCommerceConfig({
    COMMERCE_PROVIDER: 'woocommerce',
    WOOCOMMERCE_URL: input.url,
    WOOCOMMERCE_CONSUMER_KEY: input.consumerKey,
    WOOCOMMERCE_CONSUMER_SECRET: input.consumerSecret,
  }) as WooConfig;
  async function get(
    path: string,
    query: Record<string, string> = {},
    signal?: AbortSignal,
  ) {
    if (
      !/^products(?:\/categories|\/\d+(?:\/variations)?)?$/.test(path) &&
      path !== 'settings/general'
    )
      throw unavailable();
    const url = new URL(`${config.url}/wp-json/wc/v3/${path}`);
    for (const [key, value] of Object.entries(query))
      url.searchParams.set(key, value);
    let response: Response | undefined;
    try {
      response = await transport(url, {
        headers: {
          Accept: 'application/json',
          Authorization: authorization(url, config),
        },
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.any([
          AbortSignal.timeout(8000),
          ...(signal ? [signal] : []),
        ]),
      });
      if (response.status === 401 || response.status === 403)
        throw new CommerceError(
          'unauthorized',
          'No pudimos autenticar el catálogo de WooCommerce.',
        );
      if (response.status === 429)
        throw new CommerceError(
          'rate-limited',
          'WooCommerce solicita intentar de nuevo más tarde.',
        );
      if (
        !response.ok ||
        !response.headers.get('content-type')?.includes('application/json')
      )
        throw unavailable();
      if (Number(response.headers.get('content-length') ?? 0) > 5 * 1024 * 1024)
        throw unavailable();
      const reader = response.body?.getReader();
      if (!reader) throw unavailable();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 5 * 1024 * 1024) throw unavailable();
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const data: unknown = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      );
      const rawPages = response.headers.get('x-wp-totalpages');
      if (rawPages !== null && !/^\d+$/.test(rawPages)) throw unavailable();
      return { data, totalPages: rawPages === null ? null : Number(rawPages) };
    } catch (error) {
      if (error instanceof CommerceError) throw error;
      throw unavailable();
    } finally {
      await response?.body?.cancel().catch(() => {});
    }
  }
  async function all(
    path: string,
    query: Record<string, string> = {},
    signal?: AbortSignal,
    limit = 500,
  ): Promise<unknown[]> {
    const values: unknown[] = [];
    for (let page = 1; page <= Math.ceil(limit / 100); page++) {
      const { data, totalPages } = await get(
        path,
        { ...query, per_page: '100', page: String(page) },
        signal,
      );
      if (
        !Array.isArray(data) ||
        (totalPages !== null && totalPages > Math.ceil(limit / 100))
      )
        throw unavailable();
      values.push(...data);
      if (values.length > limit) throw unavailable();
      if (totalPages !== null ? page >= totalPages : data.length < 100)
        return values;
    }
    // Never silently truncate an API without trustworthy pagination headers.
    throw unavailable();
  }
  return { get, all };
}
