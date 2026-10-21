# S23 — WooCommerce catalog adapter

## Activation and local review

S23 connects the shared storefront to WooCommerce REST `wc/v3`. With S21 running:

```sh
pnpm woo:use
pnpm dev
```

`woo:use` copies the four runtime commerce settings into ignored `.env`, using
the local read-only credentials from `.env.woocommerce`. It preserves unrelated
settings, writes permissions 0600 and prints no secrets. Restart Astro after
changing environment configuration if the development watcher has not reloaded it.
The provider default remains mock for fresh clones/CI without this local override.

This workspace was activated and verified at `http://localhost:4321`:

- `/tienda` contains the published WooCommerce catalog, including ordinary merchant
  products without fixture metadata. The current 13 products span three six-item pages.
- `/tienda?page=3` includes the manually created **Perfume WooCommerce**. Its saved
  WooCommerce `menu_order` is 13; it has not been moved ahead of the curated products.
- `/buscar?q=Perfume%20WooCommerce` and `/perfumes/perfume-woocommerce` resolve it.
- Its 30 ml variation currently has an empty price in WooCommerce. The storefront
  shows **Precio por confirmar** and disables adding until a price is published.
  It does not invent COP 0 or treat missing pricing as sold-out inventory.

## Server client and credential boundary

`src/lib/commerce/woocommerce/client.server.ts` validates the configured backend
URL, preserves a WordPress subdirectory and sends credentials only in server-side
Authorization headers: Basic over HTTPS, OAuth 1.0/HMAC-SHA256 over allowed local
HTTP. Credentials never appear in API query strings, public component props or
browser API requests. Redirects are rejected rather than forwarding authorization
to another endpoint. No private WordPress response bodies are exposed as errors.

The client normalizes 401/403 to `unauthorized`, 429 to `rate-limited`, and transport,
timeout, malformed JSON, unexpected response types and backend errors to
`unavailable`. Individual requests have an 8-second timeout and a streamed 5 MiB
response bound. Endpoint paths are constrained to the catalog/settings operations
used by the adapter.

The store's currency is checked through read-only general settings before mapping
money. A non-COP store fails explicitly instead of relabeling another currency.
COP amounts use the strict shared decimal conversion: zero is a valid published
price, an empty string is not, and fractional/unsafe amounts are not rounded.

## Product mapping

Only published simple/variable products enter this catalog. Hidden and unsupported
product types do not become orderable perfume records. Search-only visibility is
respected in listings. No SKU prefix or fixture-only metadata is required.

| WooCommerce data | Shared representation |
| --- | --- |
| Simple product ID | Product and single variant `wc-p-{id}` |
| Variable product ID | Product `wc-p-{id}` |
| Published, priced variation | Variant `wc-v-{parentId}-{variationId}` |
| Current `price` | Whole COP money, including the effective sale price |
| Empty variation price | Omitted from priced choices; product remains browseable even when none are priced |
| Variation attributes | Presentation label; size parsed from explicit ml metadata or an actual ml option |
| Missing ml or image dimensions | `null`, not an invented quantity or dimension |
| Missing SKU | Empty optional display value; cart still uses native variant identity |
| Tracked stock | Current quantity, including inherited parent stock |
| Explicit unknown metadata / inconsistent stock | `unknown`, not selectable |
| Out-of-stock / zero quantity | `sold-out` |
| Untracked `instock` | Available with quantity `null`, displayed as quantity to confirm |

Descriptions, names and attribute text are normalized to escaped plain text; raw
provider HTML is not injected into the page. Only the required normalized fields
leave the server, not the full REST metadata/customer/admin response.

Images retain their real public source URLs and IDs, with product-name fallback
for an empty alt. Invalid schemes/credential-bearing URLs are omitted. WooCommerce
does not normally include intrinsic dimensions in its image records, so the gallery
uses its existing reserved aspect ratio when dimensions are unknown.

Missing prices, descriptions, SKU, notes, images or fragrance fields do not cause
the product to silently disappear. Notes are optional; family comes from explicit
metadata or the merchant's Familia olfativa attribute, never inferred from a name
or photograph. Empty facet values are omitted. Missing SKU is displayed honestly
as “Sin SKU asignado”; it is not replaced with a fabricated SKU.

## Categories and collections

Seeded types live below `khardal-demo-tipos`; collection containers are structural
and are not advertised as customer collections. The seeded child collections and
ordinary merchant categories such as **Árabes** are mapped to collections.
`uncategorized` is omitted. Nested collection membership includes allowed ancestors.

The normalized type uses `_khardal_category`, then a native type category, then
the merchant's own category when no type hierarchy exists. Fragrance notes and
the sample marker preserve the S22 specification. Pages containing sample products
keep the demo notice/noindex behavior even though the provider is WooCommerce.

## S23 browsing baseline and S24 boundary

The existing storefront requires list/collection/facet operations together. S23
therefore loads a **bounded complete normalized catalog per request**, shares that
snapshot within one adapter instance, and applies the same selector as mock for
search, AND filters, inclusive same-variant price ranges and sorting. Products with
no published price are included without price bounds and placed last in price sorts.

API pages are followed explicitly: at most five product/category pages (500
records) and two variation pages per product (200 records). Exceeding limits fails
instead of returning a partial catalog. Variation requests use four workers. The
catalog operation has a 20-second deadline; detail lookup has 12 seconds. Featured
order follows native `menu_order`, then native numeric ID. Detail misses return null
and produce the existing real 404 page.

There is **no cross-request catalog cache**. S24 still owns scalable browsing/query
optimization, freshness/cache policy, current cart reconciliation, full
browsing-to-WhatsApp verification and backend operational guidance. The WooCommerce
adapter currently rejects cart validation as unavailable; it never falls back to
mock validation or prepares an unverified WooCommerce order message. Existing cart
failure recovery/contact remains available. S20b is a separate pending admin workflow.

## Checkpoint commands and evidence

```sh
pnpm verify
pnpm test:woocommerce:local
pnpm test:woocommerce:storefront # needs the production build from verify
pnpm test:ui
```

- `verify` passed: formatting/lint, 5 config tests, 14 shared commerce/cart tests,
  6 Woo client/mapping tests, zero type diagnostics, build and 2 runtime tests.
- The separate local API check passed against Docker: fixture price/stock/image/
  notes mappings, ordinary merchant product inclusion, missing products, collection
  membership and invalid-credential handling. It performs no catalog writes.
- The compiled-server Chromium check passed: pagination to the real merchant
  product, its detail/price-pending state, seeded variation price changes, WordPress
  image URLs, 404, and overflow at 320/390/768/1440px. It confirmed no private
  credentials in HTML/client JS and no browser calls to the private WooCommerce API.
- All 29 existing mock UI tests passed. Their server explicitly selects mock so
  a developer's ignored WooCommerce environment cannot alter the CI baseline.
- The already-running local development site was checked separately: provider
  WooCommerce and HTTP 200 for the merchant product's catalog/search/detail routes.

Local/API/browser results are real WooCommerce checks; the isolated client tests
simulate failures. These checks do not verify Shopify or complete S24/S20b.
