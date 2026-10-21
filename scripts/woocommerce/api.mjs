import { createHmac, randomBytes } from 'node:crypto';

export const base = `http://127.0.0.1:${process.env.WC_PORT ?? '8000'}`;
const encode = (value) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
export function auth(url, secret = process.env.WC_API_CONSUMER_SECRET) {
  const oauth = {
    oauth_consumer_key: process.env.WC_API_CONSUMER_KEY,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
  };
  const params = [...url.searchParams, ...Object.entries(oauth)]
    .map(([k, v]) => [encode(k), encode(v)])
    .sort(([ak, av], [bk, bv]) =>
      ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0,
    )
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  oauth.oauth_signature = createHmac('sha256', `${encode(secret)}&`)
    .update(`GET&${encode(url.origin + url.pathname)}&${encode(params)}`)
    .digest('base64');
  return (
    'OAuth ' +
    Object.entries(oauth)
      .map(([k, v]) => `${encode(k)}="${encode(v)}"`)
      .join(', ')
  );
}
export async function catalogGet(path) {
  const url = new URL(`/wp-json/wc/v3/${path}`, base);
  const response = await fetch(url, {
    headers: { Authorization: auth(url) },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Local WooCommerce REST returned ${response.status}.`);
  return response.json();
}
