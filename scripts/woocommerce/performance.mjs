import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { withStorefront } from './browser-server.mjs';
import { catalogGet } from './api.mjs';

const [parent] = await catalogGet('products?slug=brisa-bergamota');
const variants = await catalogGet(`products/${parent.id}/variations`);
const variant = variants.find(
  (v) => v.price !== '' && v.stock_status === 'instock',
);
assert.ok(variant);
const item = {
  productId: `wc-p-${parent.id}`,
  variantId: `wc-v-${parent.id}-${variant.id}`,
  slug: parent.slug,
  name: parent.name,
  label: variant.attributes.map((a) => a.option).join(' · '),
  sku: variant.sku,
  amountCop: Number(variant.price),
  quantity: 1,
  sample: true,
};
const profiles = [
  {
    name: 'desktop',
    width: 1440,
    height: 900,
    cpu: 1,
    latency: 0,
    download: -1,
    upload: -1,
  },
  {
    name: 'mobile',
    width: 390,
    height: 844,
    cpu: 4,
    latency: 150,
    download: 200000,
    upload: 75000,
  },
];
const rows = [];
let browserVersion = '';
await withStorefront(async ({ base, browser }) => {
  browserVersion = browser.version();
  for (const profile of profiles)
    for (const path of [
      '/',
      '/tienda',
      '/perfumes/brisa-bergamota',
      '/carrito',
    ])
      for (let run = 1; run <= 3; run++) {
        // Standardize provider warmth; browser/cache/network still start fresh per sample.
        assert.equal((await fetch(`${base}/tienda`)).status, 200);
        const context = await browser.newContext({
          viewport: { width: profile.width, height: profile.height },
          deviceScaleFactor: 1,
        });
        await context.addInitScript((item) => {
          globalThis.localStorage.setItem(
            'khardal:cart:v1:woocommerce',
            JSON.stringify({
              version: 1,
              provider: 'woocommerce',
              items: [item],
            }),
          );
          globalThis.__lab = {
            lcp: 0,
            cls: 0,
            session: 0,
            start: 0,
            last: 0,
            events: [],
            lcpElement: '',
          };
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              globalThis.__lab.lcp = e.startTime;
              globalThis.__lab.lcpElement = e.element?.tagName ?? '';
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              if (e.hadRecentInput) continue;
              const s = globalThis.__lab;
              if (
                s.last &&
                e.startTime - s.last < 1000 &&
                e.startTime - s.start < 5000
              )
                s.session += e.value;
              else {
                s.session = e.value;
                s.start = e.startTime;
              }
              s.last = e.startTime;
              s.cls = Math.max(s.cls, s.session);
            }
          }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver((list) => {
            for (const e of list.getEntries())
              if (e.interactionId) globalThis.__lab.events.push(e.duration);
          }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
        }, item);
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: profile.latency,
          downloadThroughput: profile.download,
          uploadThroughput: profile.upload,
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
        let bytes = 0;
        cdp.on('Network.loadingFinished', (event) => {
          bytes += event.encodedDataLength;
        });
        assert.equal((await page.goto(base + path)).status(), 200);
        await page.evaluate(() => globalThis.document.fonts.ready);
        if (path === '/carrito')
          await page
            .locator('[data-cart-panel="page"] [data-cart-items] li')
            .waitFor();
        await page.waitForLoadState('networkidle');
        await page
          .getByRole('button', { name: 'Abrir carrito', exact: true })
          .click();
        await page
          .getByRole('dialog', { name: 'Carrito', exact: true })
          .waitFor();
        await new Promise((r) => setTimeout(r, 200));
        const result = await page.evaluate(() => ({
          lcpMs: globalThis.__lab.lcp,
          cls: globalThis.__lab.cls,
          lcpElement: globalThis.__lab.lcpElement,
          interactionEventMs: globalThis.__lab.events.length
            ? Math.max(...globalThis.__lab.events)
            : null,
          ttfbMs: performance.getEntriesByType('navigation')[0].responseStart,
          fcpMs:
            performance.getEntriesByName('first-contentful-paint')[0]
              ?.startTime ?? null,
        }));
        assert.ok(result.lcpMs > 0, 'LCP sample was observed.');
        rows.push({
          profile: profile.name,
          path,
          run,
          ...result,
          transferredBytes: bytes,
        });
        await context.close();
      }
});
const median = (values) =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = profiles.flatMap((p) =>
  ['/', '/tienda', '/perfumes/brisa-bergamota', '/carrito'].map((path) => {
    const samples = rows.filter((r) => r.profile === p.name && r.path === path);
    return {
      profile: p.name,
      path,
      medianLcpMs: Math.round(median(samples.map((r) => r.lcpMs))),
      maxLcpMs: Math.round(Math.max(...samples.map((r) => r.lcpMs))),
      maxCls: Number(Math.max(...samples.map((r) => r.cls)).toFixed(4)),
      medianBytes: median(samples.map((r) => r.transferredBytes)),
      maxInteractionEventMs:
        Math.max(...samples.map((r) => r.interactionEventMs ?? 0)) || null,
    };
  }),
);
await mkdir('test-results/performance', { recursive: true });
await writeFile(
  'test-results/performance/report.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      node: process.version,
      browser: browserVersion,
      cpu: cpus()[0]?.model,
      conditions: {
        provider: 'real local WooCommerce; warm snapshot/media process',
        browserCache: 'disabled; fresh context per sample',
        profiles,
        interaction: 'scripted cart-open event timing sample; NOT field INP',
      },
      summary,
      rows,
    },
    null,
    2,
  ),
);
console.table(summary);
assert.ok(
  summary.every((r) => r.medianLcpMs <= 2500 && r.maxCls <= 0.1),
  'Lab median LCP / maximum CLS target exceeded; inspect test-results/performance/report.json.',
);
