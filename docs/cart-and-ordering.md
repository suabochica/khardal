# Cart and WhatsApp ordering

## S16 — persistent state

The browser owns a version-1 cart under `khardal:cart:v1:{provider}`. Mock,
WooCommerce and Shopify carts are isolated. Before supporting multiple stores
of the same provider on one origin, extend this namespace with a public store ID.
Only product/variant identity, display name/slug/presentation/SKU, integer COP
display price and quantity are stored. These prices are **not authoritative**.

Repeated additions merge by variant ID; quantity is an integer 1–99 and at most
50 distinct lines are accepted. Overflow is rejected, never rounded. Updates and
removal are explicit; snapshots are isolated copies. Invalid JSON, versions,
provider mismatch, duplicate identities or malformed stored lines yield an empty
recoverable state with an explanation. A valid next edit replaces the bad value.
Blocked/full storage retains an in-memory cart and explains reload loss.
Storage events synchronize tabs; simultaneous tab edits use last-write-wins.

Product “Agregar al carrito” now saves the selection and reports success or a
recoverable error. Native no-JavaScript submission remains a selection review,
explicitly not a saved cart. Inventory is not reserved. Cart surfaces follow in S17.

Checkpoint: `pnpm verify` passed (8 domain/config-independent commerce/cart tests,
4 config tests, 2 compiled runtime tests, zero diagnostics); all 21 Chromium
tests passed. Tested repeat additions, invalid quantities, overflow, corrupt data,
version/provider isolation, blocked storage, removal and real browser reload.

## S17 — cart surfaces

`/carrito` and the header's native-dialog drawer subscribe to the same store.
They expose item quantities, estimated unit/line totals and subtotal, removal,
empty state and shipping **Por confirmar**. The count is total units, not lines.
Focus is restored after rendering edited rows; Escape returns to the opener.
The drawer links to the full cart; the header begins as a native full-cart link
until enhancement is ready. Without JavaScript the page explains how to contact
the team rather than pretending a local-storage cart can be rendered server-side.

`GET /api/cart/context` exposes only the active provider enum, no-store. This lets
prerendered information pages choose the correct runtime cart without baking
provider credentials into HTML. Missing configuration gives a recoverable failure.
Mock cart panels are clearly labeled; real-provider carts do not become mock.

Checkpoint: `pnpm verify` passed with zero diagnostics; full browser suite passed
22 tests before the final sample notice/cross-tab additions, then both targeted
cart tests passed. Covered page/drawer/count synchronization, reload, removal,
empty state, Escape/focus return, fractional-input recovery, cross-tab storage
events and overflow checks at 320/390/768/1440px. `git diff --check` passed.

## S18 — authoritative reconciliation

`POST /api/cart/validate` accepts the provider and 1–50 unique variant IDs,
quantities 1–99 and expected display prices. Extra client totals are ignored.
JSON bodies are limited to 16 KiB while streaming, with a 5-second read deadline;
invalid JSON/content types, duplicate IDs, wrong providers and malformed numbers
fail before commerce work. Browser-origin requests must be same-origin. Responses
are no-store; configuration/API internals and credentials never reach the client.

The active server adapter retrieves current variant stock/prices with no catalog
cache. The server recomputes line/subtotals and returns normalized current items,
price changes and missing/unavailable/insufficient-stock issues. Provider failures
are recoverable 503 (rate limit: 429); provider changes are 409. No inventory is
reserved and no backend order is created. Real adapters remain future milestones.

Cart-page validation lists current issues and old → new prices. Valid changed
prices require explicit acceptance, updating stored estimates, then another fresh
validation. Unavailable lines must be removed or quantities adjusted. Every edit,
including cross-tab changes, aborts/discards an in-flight or previous result.
The browser has a 12-second timeout and retains the cart on failure. A general
WhatsApp contact remains available; it is not an unvalidated order message.

Checkpoint: `pnpm verify` passed (10 commerce/cart/HTTP-handler tests, 4 config,
2 production runtime tests, zero diagnostics). Targeted cart and validation browser
tests passed, including stale-price acceptance, insufficient stock, edit
invalidation, failure/retry and retention. Production runtime checks exercise the
actual route, no-store, current totals despite client tampering, method rejection,
provider context and failure isolation for unconnected real providers.
