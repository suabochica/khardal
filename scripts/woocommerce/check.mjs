import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';

const base = `http://127.0.0.1:${process.env.WC_PORT ?? '8000'}`;
const encode = (value) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
function auth(url, secret = process.env.WC_API_CONSUMER_SECRET) {
  const oauth = {
    oauth_consumer_key: process.env.WC_API_CONSUMER_KEY,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
  };
  const params = [...url.searchParams, ...Object.entries(oauth)]
    .map(([k, v]) => [encode(k), encode(v)])
    .sort(
      ([ak, av], [bk, bv]) =>
        ak.localeCompare(bk, 'en') || av.localeCompare(bv, 'en'),
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
const get = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
const root = await get(`${base}/wp-json/`);
assert.equal(root.status, 200, 'WordPress REST index');
assert.ok(
  (await root.json()).namespaces.includes('wc/v3'),
  'WooCommerce REST namespace',
);
const productsUrl = new URL(`${base}/wp-json/wc/v3/products?per_page=1`);
assert.equal(
  (await get(productsUrl)).status,
  401,
  'Protected catalog rejects anonymous access',
);
const products = await get(productsUrl, {
  headers: { Authorization: auth(productsUrl) },
});
assert.equal(products.status, 200, 'Signed read-only catalog request');
assert.ok(Array.isArray(await products.json()));
assert.equal(
  (
    await get(productsUrl, {
      headers: { Authorization: auth(productsUrl, 'invalid-local-secret') },
    })
  ).status,
  401,
  'Invalid signature rejected',
);

const login = await get(`${base}/wp-login.php`);
assert.equal(login.status, 200, 'Login page');
const testCookies = login.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ');
const signedIn = await get(`${base}/wp-login.php`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Cookie: testCookies },
  body: new URLSearchParams({
    log: process.env.WC_ADMIN_USER,
    pwd: process.env.WC_ADMIN_PASSWORD,
    'wp-submit': 'Log In',
    redirect_to: `${base}/wp-admin/`,
    testcookie: '1',
  }),
});
assert.equal(signedIn.status, 302, 'Admin login accepted');
const cookies = [
  ...login.headers.getSetCookie(),
  ...signedIn.headers.getSetCookie(),
]
  .map((c) => c.split(';')[0])
  .join('; ');
assert.ok(
  cookies.includes('wordpress_logged_in_'),
  'Authenticated session cookie',
);
const admin = await get(`${base}/wp-admin/`, { headers: { Cookie: cookies } });
assert.equal(admin.status, 200, 'Admin dashboard');
assert.match(await admin.text(), /wpadminbar/);
console.log(
  'PASS: REST index, WooCommerce namespace, signed catalog, rejected anonymous/bad signatures, admin login/dashboard. No credential values printed.',
);
