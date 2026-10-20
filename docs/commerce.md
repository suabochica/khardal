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
