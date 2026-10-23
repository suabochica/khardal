# S35a — WooCommerce release handoff

Status: **local technical preparation verified; not deployed to production**.
Updated 2026-10-23. Shopify is deferred by the owner. WooCommerce is the active
launch candidate; final infrastructure/cost ownership is still S34b.

## Available evidence

| Area | Evidence |
| --- | --- |
| Real backend and catalog | S21–S24: pinned Docker versions, seeded fixture parity, ordinary merchant products, private REST client, current prices/stock and bounded 30-second catalog freshness. |
| Content intake | [S28a audit](launch-content.md): 13 local products, 12 sample-marked; merchant test variation unpriced. Real publication remains outstanding. |
| Image delivery | [S29a](photography.md): authorized Woo raster optimization, production Sharp, WebP/srcset/sizes, prioritized gallery and reserved layout. Final photos remain outstanding. |
| SEO/migration | [S30a](seo-and-migration.md): canonical/OG/schema, robots/sitemap, verified local legacy destinations and production-host versus wrong-host test. |
| Customer journey | [S31](journey-review.md): real filtering/cart/price-stock-to-handoff and actual auth failure/restoration; mock suite remains separate. |
| Responsive/accessibility | [S32a](responsive-accessibility.md): 18 real-Woo scans, four viewports, keyboard focus and six visual captures. Real device/SR coverage remains outstanding. |
| Performance | [S33](performance.md): 24 documented local samples; cart CLS reduced to zero; mobile median LCP 0.96–1.156s. Hosted/final-photo and field measurements remain outstanding. |
| Restore and manual orders | [S20b](order-rehearsal.md): actual SQL/files restore in disposable project; native admin order pending → on-hold → repeated save → cancellation; exact stock and unpaid status verified. |

All steps have separate commits/checkpoint entries in `TODO.md`. The native order
was created in a disposable restored copy, not in the source store or a live shop.
Source fixture/admin/API checks passed after cleanup. The deprecated navigation
wait follow-up reran the rehearsal and restored zero type-check hints.

## External inputs still required

| Step | Needed to finish |
| --- | --- |
| S28b | Approved real launch catalog, copy/history, service facts, final policies and confirmed social accounts. Local publication/sample flags are not content approval. |
| S29b | Original approved product/packaging/lifestyle photos and factual alt/product mapping. |
| S30b | Confirmed final public storefront/backend/media origins, complete old URL export and approved destination map; hosted indexability/redirect checks. |
| S32b | Actual iOS Safari, Android Chrome and screen-reader sessions with versions/results. |
| S34b | Production backend/hosting choice and responsibility; quoted hosting/domain/storage/backup/maintenance costs and patch/restore ownership. No cost estimate has been invented. |
| S05b | Actual hosted CI run URL/SHA and preview verification. A local pipeline pass is not a hosted run. |
| S35b | Access to the chosen environment, domain/DNS/HTTPS/reverse proxy, runtime secrets, production monitoring endpoint and final staff smoke check. |

The observed legacy hostname `khardal.co` has not been treated as deployment
authorization. No credentials or approved publication inputs for a final host
were supplied in this session. The local `.env` and backup environments remain
ignored and are not deployment secrets to copy into this document.

## Deployment sequence once inputs are supplied

1. Complete the content/photography checkpoints and prepare the approved production
   WooCommerce catalog separately from local fixtures. Resolve pending policy text,
   sample prices, missing prices and merchandising before indexing.
2. Configure runtime commerce settings on the host: provider `woocommerce`, the
   canonical HTTPS Woo API base and read-only key/secret with required catalog/
   settings access. Confirm country/COP and final tax/stock behavior in the backend.
3. Build with the confirmed public configuration (example placeholders only):

   ```sh
   pnpm install --frozen-lockfile
   STOREFRONT_ORIGIN=https://store.example.test WOO_MEDIA_ORIGIN=https://media.example.test DEPLOYMENT_ENV=production pnpm verify
   ```

   Replace the reserved example.test hosts with the confirmed hosts. These
   origin/environment settings are build-time configuration, not values
   merely added after deployment. The media allowlist is exact host/port/upload
   path; confirm real transformed image responses. Rebuild after an origin change.
4. Run the standalone Node artifact on its assigned internal port behind HTTPS,
   passing approved external host/protocol headers. Verify host routing using the
   actual proxy, including a wrong-host/preview request that must stay noindex.
5. Capture/verify a backend backup and retain its matching files/environment/image
   set. Rehearse recovery on isolated hosted staging; the local restore evidence is
   useful but does not establish production storage permissions or recovery time.
6. Repeat the local test suite against final content and equivalent hosted staging,
   plus actual-device review. Record the hosted CI/deploy SHA, URLs and results.
7. Coordinate the final staff-controlled request/order check, verify monitoring,
   and only then record S35b completion and the chosen production launch.

## Hosted smoke evidence to record

- Domain/TLS and approved host canonical metadata; preview/private/filter/sample
  noindex; robots/sitemap contain only intended final URLs.
- Home, listing, search/filter/back/reload, collection, normal/missing product,
  image variants, contact and approved policy routes; representative legacy URLs.
- Current native variant price/stock at cart validation, changed-price review and
  backend failure/retry; catalog edit visibility within the documented cache policy.
- Primary WhatsApp number/message encoding/open/copy fallback and persistent cart.
  Opening/copying remains intent, not payment/order confirmation.
- Staff acceptance, manual backend record/reference and inventory/payment states.
  Actual payment and fulfillment must be recorded separately from handoff analytics.
- Anonymous availability/error/latency monitoring, actionable logs without private
  credentials or customer messages, verified backup schedule and restore owner.
- Final-photo/host lab rerun plus a post-launch field LCP/CLS/INP plan. No external
  user tracking was enabled by the local measurement work.

## Rollback

Keep the previously verified app artifact/configuration and matching backend
backup. An app-only rollback may use its earlier artifact; a backend schema/data
change requires the matching SQL/files/environment and compatible pinned images.
Rehearse on an isolated copy before replacing production data. Verify login, API,
images, orders and stock, then repeat hosted smoke checks. `woo:down` preserves
volumes and is not a backup; destructive reset is not rollback.

S35a checkpoint: evidence/dependency/command review and whitespace checks passed.
S35/S35b remain open. The next user inputs are final catalog/policies/photos,
confirmed hosts/hosting access and real-device/SR evidence.
