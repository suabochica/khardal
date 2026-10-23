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
The owner subsequently selected a Vercel frontend deployment attempt. Vercel builds
now select its dedicated adapter/Build Output API; standalone Node remains the
local/CI/Render default. See [Vercel setup](vercel-deployment.md) for exact settings,
runtime environment and redeployment checks.
Cloudflare would require its own adapter/runtime validation; this Node build is
not a Workers deployment artifact.

## Rendering and caching policy

| Route/data | Rendering | Freshness policy |
| --- | --- | --- |
| About, contact and FAQ pages | On-demand since S30 for host-sensitive SEO | HTML no-store; editorial code changes require rebuild |
| Homepage, catalog, collection, product and search pages | On-demand server rendering | `Cache-Control: no-store` initially; future provider response cache may use at most 60 seconds, keyed by provider/store/market/currency/query/variant context |
| Pending policy pages | On-demand server rendering, noindex | `Cache-Control: no-store`; approved publication replaces these structures in S28 |
| Cart validation and WhatsApp preparation (future) | Server endpoints | `Cache-Control: no-store`; bypass catalog cache and retrieve authoritative current prices/stock |
| `/api/health` | On-demand server endpoint | `Cache-Control: no-store`; fresh timestamp; configuration/liveness only, not backend connectivity |
| Fingerprinted build assets | Static | Long-lived immutable caching at the host where configured |

S11–S15 add shared browsing and informational routes to the S04 baseline.
Provider caching, webhooks and HTTP cart validation are not implemented yet;
the mock adapter provides domain validation only. Do not cache personalized responses. Future adapter caches must
be bounded; never use stale fallback for WhatsApp validation. Multi-instance
invalidation/webhooks can follow when deployment needs justify them.

## Configuration

### Trusted public origin (S19)

Astro's production adapter normalizes untrusted Host headers to localhost. The
cart API compares browser Origin to the normalized request origin; WhatsApp
messages also use this trusted origin for product links. `security.allowedDomains`
therefore permits exact HTTP loopback hosts for local checks and the explicit
public storefront origin for hosted builds. It never trusts all domains.

Set `STOREFRONT_ORIGIN=https://your-storefront.example` **in the build process
environment** before `pnpm build`; this configuration-time setting is not loaded
from `.env`. Render's `RENDER_EXTERNAL_URL` is used when no explicit value exists.
Only HTTPS non-loopback origins without credentials/path/query/fragment are
accepted. Rebuild when the public origin changes. Reverse proxies must pass the
approved external host/protocol; S05b/S35 must verify their actual configuration.
This is the storefront address, not the WooCommerce/Shopify backend URL.

### Runtime commerce settings

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
S05 adds `DEPLOYMENT_ENV` separately as a build-time **public server** enum used
for non-production robots metadata; it is not a commerce credential. See the
[CI/preview guide](ci-and-previews.md) for deployment and rebuild requirements.
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
credentials and probe `/api/health` before accepting traffic; a successful
informational page alone does not validate the dynamic server. An invalid configuration
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
the same production build with different process environments, verify the dynamic
Spanish homepage/catalog, informational routes and uncached health responses, and check failure behavior
and public credential isolation. These checks do not connect to real backends.
