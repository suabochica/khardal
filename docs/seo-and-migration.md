# S30a — SEO and verified route migration

## Host and indexing

Set `STOREFRONT_ORIGIN=https://<confirmed-host>` in the **build process** and
`DEPLOYMENT_ENV=production` only for the chosen production deployment. The same
origin configures Astro's `site` and trusted-host rules. No final hostname has
been confirmed in this session; local/default builds remain non-indexable.

Metadata and middleware require the configured HTTPS origin, production mode
and an indexable route. Preview/wrong-host/private/filter/sample/pending-policy
states remain noindex. Missing site configuration fails closed. About/contact/FAQ
are now on-demand instead of prerendered so host-sensitive metadata cannot be
served as indexable static HTML on the wrong host. HTML is no-store.

Canonicals preserve actual pagination (`page=2`) and drop filter/variant/tracking
state. Search/filter/cart/API/dev/pending policy pages are excluded from indexing.
Open Graph includes Spanish locale, title/description, canonical URL when
configured and a self-authored 1200×630 **brand-only** social card. No unapproved
product photo, social account, review or manufacturing claim was added.

## Structured data and sitemap

Breadcrumb JSON-LD follows visible breadcrumb labels/links. Product JSON-LD is
emitted only for non-sample products with priced variants, using visible current
COP offers, supplied SKUs and actual availability. Unknown availability is omitted;
no rating, review, condition, brand provenance, shipping guarantee or return policy
is fabricated. JSON serialization escapes script-closing markup.

`/robots.txt` disallows all crawling outside the configured production origin.
At that origin it advertises `/sitemap.xml` and excludes private routes. Sitemap
generation reads the bounded provider catalog and excludes sample/unpriced product
URLs and pending policies. Home/catalog/collection entries containing samples are
omitted. No fabricated modification dates are generated; provider failure gives
503 rather than a falsely complete sitemap.

## Redirects verified now

- `/collections/all` → `/tienda`
- `/pages/nosotros` → `/nosotros`
- `/pages/contact` → `/contacto`
- `/cart` → `/carrito` (old cart state is not migrated)
- `/search` → `/buscar`, retaining query state.
- `/products/[slug]` and `/collections/[slug]` redirect only when the corresponding
  current product/collection exists. A known-old slug such as `khamrah` with no
  current destination remains a useful 404, not a misleading catalog/home redirect.

Tagged legacy collections and conflicting policy/product URL mappings stay in
the S02 inventory pending final catalog/content review. These technical local
redirects do not establish equivalence between demo and historical launch content.

## Checkpoint

`pnpm verify` passed with zero diagnostics, including metadata/schema unit tests
and runtime robots/sitemap/static-redirect checks. `pnpm test:seo:host` built a
production artifact for an isolated **example.test** origin, verified forwarded
chosen-host indexing versus wrong-host noindex, canonicals/OG, sample exclusion,
sitemap/robots and verified/missing legacy product destinations; it restored the
default build afterward. The real compiled Woo image/catalog check also passed.

S30b still requires the actual final host, final catalog/approved policy routes,
complete legacy export and hosted redirect/indexability checks. S30 remains open.
