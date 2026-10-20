# Shared commerce and browsing

## S10 — normalized contract and mock catalog

`src/lib/commerce/models.ts` defines the shared adapter: product/collection
lookup, product listing/search, pagination and current cart validation. Routes
must use `provider.server.ts`; selecting an unimplemented real provider produces
an unavailable error, never a silent mock fallback. Secrets stay behind the
Astro server environment boundary. Real clients arrive in S23/S25.

Money is integer **whole COP pesos**, with safe-integer bounds. `parseCop`
accepts decimal API strings only when their fractional component is zero;
fractional/negative/unsafe amounts fail instead of rounding. Stock is separate
from availability: unknown availability cannot be ordered; null quantity is not
invented inventory. IDs are provider identities; SKUs are stable migration keys.

There are 12 synthetic products / 36 size variants with stable `KH-DEMO-*` SKUs.
All have `sample: true`. Names, descriptions, notes, prices, availability and
self-authored SVG illustrations are **development data**, not approved products
or photographs. Cases include long names, variable prices, sold-out sizes and
products, unknown availability, absent notes/images and multiple images.
Top 10 is a deterministic curated set of ten, not measured sales popularity.

Common list semantics: 1-based pages, page sizes 1–100 (default 6), deterministic
featured order and ID-tied price/name sorting. Search is case/accent insensitive;
category, family and collection are exact matches. Different filter dimensions
are ANDed. Inclusive price bounds must match the same variant; sold-out variants
remain browseable. Prices sort by the lowest variant price, independent of stock.
Pages beyond the end return no items; missing detail lookups return null. Adapter
responses are isolated copies. Provider errors expose normalized codes, never
credentials or raw API bodies.

Cart validation accepts only variant identity/quantity, not client totals. It
reports missing/unavailable/insufficient-stock lines and recomputes integer
totals. Duplicate lines are rejected (avoids bypassing per-variant stock limits);
max 50 lines / 99 units per line. This is the domain integration point; bounded
HTTP input validation and changed-price review arrive in S18. No stock is reserved.

Checkpoint: `pnpm verify` passed (4 commerce domain tests, 4 config tests,
2 runtime tests, zero type diagnostics, formatting/lint/build). Domain tests cover
money conversion/overflow, unique variant/SKU identity, pagination and curation,
accented search and combined filters, isolated responses and unavailable data.

## S11 — editorial homepage

The homepage fetches its curated selection through the server adapter at request
time (`no-store`), with a recoverable 503 view if the provider is unavailable.
It uses a split editorial hero, one primary discovery CTA, three service steps,
featured cards, collection introductions, a brand introduction and native FAQs.
At this checkpoint discovery links are real in-page anchors; S12 connects the
catalog/collection routes and S14 adds product links when detail routes exist.
The copy makes no manufacturing, payment-security, review or shipping promises.

Mock pages display a prominent sample notice and force noindex even in a
production deployment. The synthetic images have explicit illustration captions.
The hero reserves image space, prioritizes its image and uses the licensed fonts.
Production now renders the homepage dynamically: configured but unimplemented
real providers return 503 without leaking configuration or substituting samples.

Checkpoint: full `pnpm verify` and 8 browser tests passed. Homepage checks cover
one h1, working discovery/collection anchors, image priority and no horizontal
overflow at 320/390/768/1440px. Reviewed 390px and 1440px screenshots against the
home references: stacked mobile / split desktop hero, tonal sections, generous
spacing and three editorial cards. Final photography/content remains S28/S29.

## S12 — catalog and collection browsing

`/tienda` and `/colecciones/[slug]` use one listing loader/presentation. Route
frontmatter sets HTTP status/headers (setting them in a nested Astro component
does not propagate reliably). Missing collections are 404, malformed pages 400,
provider failures 503; successful listings use no-store while adapter caching is
pending S24/S26. The UI distinguishes sold-out from unknown availability, renders
absent images, and offers first-page recovery for out-of-range pages. Pagination
is native links with an optional pending live status; no JavaScript is required
for browsing. Back/forward restores the pending/busy state on pageshow.

Homepage collection links and discovery CTA now reach real routes; the header
includes Tienda and Más vendidos. Top 10 explicitly discloses its curated sample
status. Product cards gain detail links at S14, when those destinations exist.

Checkpoint: `pnpm verify` and all 11 browser tests passed. Checked collection
membership, two-page listing, sold-out/unknown/missing-image cards, malformed and
out-of-range pages, actual 404/400/503 responses, pending navigation and layouts
at 320/390/768/1440px. Production runtime tests verify no-store and no secret
sentinels in listing responses; configured real providers never fall back to mock.
