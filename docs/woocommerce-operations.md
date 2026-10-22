# S24 — Freshness, validation and local operations

## Browsing, filters and pagination

WooCommerce browsing uses the shared normalized selector: accent/case-insensitive
search, AND across collection/type/family, inclusive price bounds matching one
variant, stable featured/name/minimum-price order, and one-based pagination.
Unavailable variants remain browseable; unpriced products remain visible without
price bounds and sort after priced products in both price directions. URL state
and first-page resets are unchanged across providers.

The catalog snapshot is bounded to 500 products/categories, 200 variations per
parent and four variation workers. These are explicit small-catalog limits;
larger stores require a reviewed indexing/native-query implementation instead of
silently truncated results. Native Woo search/price filters are not substituted
where they would change the shared semantics.

## Cache and freshness policy

- **30 seconds**, non-sliding, measured from the beginning of provider reads.
  Hits do not extend expiry. The next request after expiry refreshes from Woo.
- At most **4** store/context entries, each at most **2 MiB serialized normalized
  JSON** (8 MiB payload bound, plus normal JavaScript/runtime overhead).
- Keys include provider/schema, store URL, CO/COP and a SHA-256 credential identity.
  Changing credentials cannot reuse another identity's successful response.
- A snapshot contains products, collections and visibility; queries derive their
  results from that snapshot. There is no unbounded per-query cache.
- Simultaneous refreshes coalesce. Callers receive isolated copies. Eviction or
  validation invalidation prevents an older in-flight refresh from reinserting data.
- Expired entries are never served as outage fallback. Errors are not cached as
  valid catalog data. The existing error page offers retry/contact.
- HTML, cart context and reconciliation responses remain `Cache-Control: no-store`.
  The cache is server-side provider data only; browser carts are separate local data.

This is process-local caching, not a shared Redis/CDN cache. Each Node instance
observes the same maximum cache age independently. A backend edit normally appears
on the next browse request after expiry, plus provider response time. Catalog reads
have a 20-second deadline and individual HTTP requests have an 8-second deadline;
a failed refresh produces an error instead of serving older data.

## Current cart reconciliation

`Solicitar pedido por WhatsApp` now works with WooCommerce. Reconciliation bypasses
the catalog cache and performs current reads of currency, published requested
parents and their variations. It fetches only requested parents, sharing variation
reads when multiple lines use the same parent. Its operation deadline is 10 seconds
(the browser allows 12 seconds). It neither reserves stock nor creates an order.

The server validates identities and quantities, ignores client totals and uses
current COP prices. Missing parents/variants produce missing-line recovery;
unpriced/disabled/unknown/sold-out variants are unavailable. Current insufficient
quantity blocks the handoff. Parent-managed inventory is aggregated across the
requested variations, preventing two lines from independently consuming the same
available units. The UI explains shared inventory when applicable.

Changed prices still require acceptance and another fresh validation. Every
attempt invalidates that store's browsing cache, including failures, so subsequent
browsing does not retain the pre-validation snapshot. A successful result prepares
the Spanish request and retains all S19 behavior: explicit open/copy, expiry,
long-message fallback, cart retention and no order/payment confirmation.

Any server-confirmed sample product marks the request **DEMOSTRACIÓN — NO ES UN
PEDIDO REAL**, even under the WooCommerce provider. The browser also persists an
optional sample flag for the cart notice; only server product data determines the
outgoing message's demo status. Old version-1 carts remain readable. Unpriced or
missing lines are named accurately without inventing a price or quantity.

The prepared-message minute is a review interval, not a reservation. Stock can
change afterward; staff must still confirm availability, shipping, payment and
acceptance under [the manual procedure](manual-order-operations.md).

## Checks

```sh
pnpm verify
pnpm test:woocommerce:local
pnpm test:woocommerce:storefront
pnpm test:woocommerce:journey
pnpm test:ui
```

The journey command requires the compiled build and S21–S22. It creates nonce-owned
temporary variable/simple products, exercises native Woo edits, and removes only
its own products in `finally`. It never edits existing merchant/fixture products,
sends a business message or creates an order. Its WhatsApp navigation is intercepted.
The real TTL check intentionally waits for expiry; this is not a mocked clock.

## Backups

From the project root with the local database running:

```sh
pnpm woo:backup
pnpm woo:backup:check backups/woocommerce/<backup-directory>
```

The backup command briefly stops WordPress, leaves MariaDB running for a
single-transaction SQL dump, archives the full WordPress volume and copies the
matching local environment file. It also records pinned image references and
portable SHA-256 checksums. An exit trap restores WordPress's previous running
state, including after a failed operation. Do not run other WP-CLI/catalog writers
during this maintenance window.

Backups live under ignored `backups/woocommerce/`; directories/files are private
(0700/0600 through umask). They contain database records and credentials: keep any
external copy private too. `woo:backup:check` checks all four payload checksums
and both gzip streams without printing their contents. A directory without a
complete valid `SHA256SUMS` is not a verified backup. A failed backup can leave an
incomplete directory for inspection; restart the stack manually if Docker itself
prevents the exit trap from doing so.

The SQL dump, files and environment belong together. Keeping only volume names,
only an image tag or only the database does not preserve uploads/plugin files and
the matching API/database credentials. `woo:down` preserves volumes but is not a
backup. The S21 destructive reset is not a recovery procedure.

### Restore runbook — isolated test project first

Choose a verified backup and an unused local port. Use Bash with `set -euo pipefail`.
The following example uses project **khardal-restore** and port **8001**, distinct
from the normal stack. Ensure that project has no existing data before beginning:

```sh
backup="$PWD/backups/woocommerce/<backup-directory>"
pnpm woo:backup:check "$backup"

WC_PORT=8001 docker compose -p khardal-restore --env-file "$backup/local-environment.env" up -d --wait db
gzip -dc "$backup/database.sql.gz" | WC_PORT=8001 docker compose -p khardal-restore --env-file "$backup/local-environment.env" exec -T db sh -c 'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" exec mariadb --user=root'
gzip -dc "$backup/wordpress.tar.gz" | WC_PORT=8001 docker compose -p khardal-restore --env-file "$backup/local-environment.env" run --rm --no-deps -T --user 0:0 --entrypoint sh setup -c 'tar -xf - -C /var/www/html && chown -R 33:33 /var/www/html'
WC_PORT=8001 docker compose -p khardal-restore --env-file "$backup/local-environment.env" up -d --wait wordpress
WC_PORT=8001 node --env-file="$backup/local-environment.env" scripts/woocommerce/check.mjs
```

Review admin login, media, variants, orders and stock on the restored site before
any production recovery. Use the recorded image versions and inspect required
migrations if restoring into a different release. Stop this isolated project with
`docker compose -p khardal-restore --env-file "$backup/local-environment.env" down`;
remove only its disposable volumes when intentionally finished with the drill.

S24 verified backup creation/integrity and automatic restart, not this full restore
drill. A staging restore/rollback rehearsal remains a production-operations check
for S35. No existing source volumes were replaced to test backups.

## Updates and routine maintenance

1. Capture and verify a backup before changing core, PHP, MariaDB or WooCommerce.
2. Select compatible release versions from official metadata, pull/inspect their
   images and update exact image digests and the expected versions in Compose.
   Persistent volumes do not upgrade simply because an image tag changes.
3. Rehearse on the isolated restored project. Update WordPress/plugin explicitly
   with WP-CLI to the reviewed version, run `core update-db` and any WooCommerce
   database migration required by that release. Do not use an unpinned `latest`
   upgrade or assume a plugin file downgrade reverses its schema migration.
4. Verify official core/plugin checksums, configuration, admin/API and media, then
   the local mapping/storefront/journey commands above. Never reseed products
   referenced by real/test orders to make stock comparisons pass.
5. Record versions, migrations and results in a dedicated checkpoint/commit. If
   rollback is needed, restore the matching database/files/environment and old
   image set; a tag-only rollback is insufficient after data migrations.

For routine stop/start use `woo:stop` / `woo:up`; for container recreation without
data removal use `woo:down` / `woo:up`. `woo:check` checks admin and authentication;
`woo:seed:check` checks exact fixture parity and may legitimately detect stock
changes after order tests. Use actual backend order/inventory evidence for S20b.

## S24 checkpoint — 2026-10-22

- `pnpm verify` passed: format/lint, 5 config tests, 14 shared commerce/cart tests,
  11 Woo client/mapping/cache/reconciliation tests, zero type diagnostics, build
  and 2 compiled runtime tests.
- Cache tests covered coalescing, fixed expiry, identity isolation, memory/entry
  bounds, no stale fallback and invalidation of in-flight insertion. Reconciliation
  tests covered fresh prices/stock, missing/unpriced/disabled/unknown data, shared
  parent inventory, provider failure and sample-message authority.
- Real Docker API mapping and compiled storefront checks passed; all 29 existing
  mock UI tests passed. Fixture parity and native admin/auth checks passed afterward.
- The real compiled Woo journey passed: combined filters and reload, add/reload,
  native price change with acceptance, fresh stock limits, sold-out/unpriced/deleted
  variations, intercepted WhatsApp open and retained cart. A separate live price
  edit refreshed after **27,845 ms**, within the 30-second snapshot policy.
- Temporary probe products were cleaned up; the original 13 published products
  remained and there were zero probe products. No orders or business messages were created.
- A private SQL/files/environment backup was created and passed SHA-256/gzip
  checks; WordPress restarted and admin/API checks passed. The archive directory
  and credential copy were 0700/0600 and ignored by Git. Full restore remains a
  separate rehearsal, as noted above.
- The development storefront at `localhost:4321` returned a valid, unchanged,
  sample-labeled WooCommerce handoff from the current seeded variant. No outbound
  WhatsApp send was performed. `git diff --check` passed.
