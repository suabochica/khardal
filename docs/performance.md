# S33 — Measured lab performance

Measured 2026-10-22 against the compiled Node storefront and real local Docker
WooCommerce. Run `pnpm verify` then `pnpm measure:performance`. Raw reproducible
results are written to ignored `test-results/performance/report.json`.

## Conditions

- Node v25.9.0, Chromium 156.0.8078.4, AMD Ryzen 7 2700X host.
- Three runs per route/profile: **24 samples** for home, listing, detail and
  populated cart. Fresh browser context and disabled browser cache for each run.
- Provider snapshot/media process warmed before navigation; private backend runs
  locally. Server cold starts/public hosting/real final photography are not included.
- Desktop: 1440×900, normal CPU, no network throttle.
- Mobile lab: 390×844, device scale 1, CPU 4× slowdown, 150ms network latency,
  200,000 bytes/s down (1.6 Mbps) and 75,000 bytes/s up (0.6 Mbps).
- PerformanceObserver captures LCP and maximum CLS session windows, excluding
  recent-input shifts. Fonts, initial cart content and network quiet are awaited;
  the cart-open interaction ends the LCP observation interval.

## Results after tuning

| Profile | Route | Median LCP ms | Maximum LCP ms | Maximum CLS | Median browser bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| Desktop | Home | 68 | 104 | 0 | 143,752 |
| Desktop | Catalog | 48 | 48 | 0 | 162,246 |
| Desktop | Detail | 80 | 92 | 0 | 154,494 |
| Desktop | Populated cart | 60 | 76 | 0 | 129,945 |
| Mobile lab | Home | 960 | 964 | 0 | 137,216 |
| Mobile lab | Catalog | 1,156 | 1,164 | 0 | 152,442 |
| Mobile lab | Detail | 984 | 992 | 0 | 146,497 |
| Mobile lab | Populated cart | 960 | 972 | 0 | 129,945 |

All observed samples met LCP ≤2.5s / CLS ≤0.1 in these conditions. The command
enforces median LCP and maximum CLS budgets and reports maximum LCP too, rather
than hiding outliers. These are local lab observations, not field CWV or Lighthouse
scores. The sample illustration hero and warm local backend are material conditions.

## Measured fix

The first pass found cart CLS **0.243 desktop / 0.4568 mobile** while local storage
hydrated: existing navigation/footer content moved when cart rows appeared.
The cart now reserves at least the viewport below the header and places its
continue-browsing action before changing cart content. Repeating all 24 samples
reduced observed cart CLS to **0**. No image/copy was replaced to improve the score.
`pnpm verify` passed with zero diagnostics, and all 18 real-Woo viewport/dialog
accessibility scans passed again after the layout adjustment.

## Interaction and post-launch monitoring

The scripted cart-open event-duration samples were 24–40ms on this run. They are
**not INP**. INP ≤200ms needs actual field observations, not a single automated click.

After the owner approves hosting/privacy/telemetry, collect real LCP/CLS/INP with
an appropriate web-vitals observer and an approved first-party endpoint. Group
by route type/device class and assess p75 with sample counts/time windows; do not
send query strings, cart contents, phone numbers, messages or credentials. No
external telemetry was activated by this step. Monitor provider failure/timeout
rates and latency separately from frontend vitals. WhatsApp open/copy events are
intent, not paid/completed order events.

Rerun the lab with final approved catalog/photos and hosted infrastructure, then
use real-user data after launch to evaluate the INP and field LCP/CLS targets.
S35 still owns production observation and the deployment/rollback smoke checks.
