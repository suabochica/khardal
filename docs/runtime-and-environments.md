# S04 — Runtime and environments

## Runtime decision

Use Astro's **Node standalone adapter** as the portable local baseline. The output
is a Node HTTP server plus static assets, not a static-only hosting bundle.
Build with `pnpm build`; run with `HOST=127.0.0.1 PORT=4321 pnpm start`.
The default adapter host may expose the server on all interfaces; set `HOST`
explicitly for local-only access. A production host should provide HTTPS at its
reverse proxy and pass its assigned port through `PORT`.

Hosting is **provisional**. S05/S35 must verify a real preview/production deployment,
including secrets, image processing, backend networking, and platform limits.
Cloudflare would require its own adapter/runtime validation; this Node build is
not a Workers deployment artifact.

## Rendering and caching policy

| Route/data | Rendering | Freshness policy |
| --- | --- | --- |
| Homepage and approved about/FAQ/policy pages | Explicit `export const prerender = true` | New editorial content requires rebuild; catalog sections added later must respect their chosen freshness policy |
| Catalog, collection, product and search pages (future) | On-demand server rendering | No shared HTML cache initially; provider response cache may use at most 60 seconds, keyed by provider/store/market/currency/query/variant context |
| Cart validation and WhatsApp preparation (future) | Server endpoints | `Cache-Control: no-store`; bypass catalog cache and retrieve authoritative current prices/stock |
| `/api/health` | On-demand server endpoint | `Cache-Control: no-store`; fresh timestamp; configuration/liveness only, not backend connectivity |
| Fingerprinted build assets | Static | Long-lived immutable caching at the host where configured |

Only the homepage and health endpoint exist at S04. The table specifies later
implementation constraints; catalog caching, webhooks and cart validation are not
implemented yet. Do not cache personalized responses. Future adapter caches must
be bounded; never use stale fallback for WhatsApp validation. Multi-instance
invalidation/webhooks can follow when deployment needs justify them.

## Configuration

For development, copy the contents of `.env.example` into an ignored `.env` file.
Without a file, `mock` is the default. Astro loads local env files during dev/build.
`pnpm start` explicitly loads `.env` with Node's `--env-file-if-exists` flag;
existing process environment takes precedence. It does not automatically load
`.env.production` or `.env.local`: inject deployment variables through the host,
or use Node's explicit env-file option when running the entrypoint yourself.

| Setting | Required for | Meaning |
| --- | --- | --- |
| `COMMERCE_PROVIDER` | Optional; defaults to `mock` | Exactly `mock`, `woocommerce` or `shopify`; an empty/unknown value fails validation |
| `WOOCOMMERCE_URL` | WooCommerce | Store root, including a WordPress subpath if used; HTTPS, or HTTP on localhost/127.0.0.1/::1 for local Docker |
| `WOOCOMMERCE_CONSUMER_KEY` | WooCommerce | REST API consumer key; provision read access for the catalog adapter |
| `WOOCOMMERCE_CONSUMER_SECRET` | WooCommerce | Matching REST API secret |
| `SHOPIFY_STORE_DOMAIN` | Shopify | Permanent bare `store-name.myshopify.com` hostname, not a custom storefront URL |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Shopify | Private Storefront API token, not an Admin token |

API clients, permissions verification and Shopify API version pinning belong to
S23/S25. S04 validates configuration shape, not whether credentials work. Docker
URLs must be reachable from the **Astro process**; local loopback is suitable when
Astro runs on the host and WordPress exposes a port. If both later run in a private
container network, review the transport/hostname policy explicitly rather than
silently allowing all HTTP hosts.

All settings use `astro:env/server` with secret access, including provider selection
and hostnames, so they are read at runtime rather than baked into the artifact.
Provider-specific fields are individually optional in Astro's schema; the shared
parser requires only fields for the selected provider. Whitespace-only credentials
fail; inactive-provider settings are ignored. Errors report field names/rules, not
secret values. URL credentials/query/fragment and malformed Shopify domains are
rejected.

`src/config/commerce.server.ts` is the sole application environment entrypoint.
Future server adapters must import its normalized `commerceConfig`, not read
arbitrary environment variables. Its `astro:env/server` import enforces a client
bundle boundary. Never pass this config into component props, HTML, JSON responses
or logs. Never prefix credentials with `PUBLIC_`.

Validation runs when the server configuration module is initialized (during
prerender if imported there, or runtime route loading). A build without backend
credentials is valid in mock mode. Real-provider deployments must supply runtime
credentials and probe `/api/health` before accepting traffic; a successful static
homepage alone does not validate the dynamic server. An invalid configuration
fails dynamic initialization with a named-field error. Restart after changing
environment settings.

## Checkpoints

```sh
pnpm install --frozen-lockfile
pnpm test:config
pnpm check
pnpm build
pnpm test:runtime
git diff --check
```

Configuration tests cover defaults, inactive providers, missing fields, transport
rules, hostname validation and non-disclosing errors. Runtime smoke tests launch
the same production build with different process environments, verify the static
Spanish homepage and uncached dynamic health responses, and check failure behavior
and public credential isolation. These checks do not connect to real backends.
