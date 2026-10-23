# Vercel deployment — routing fix

The reported `https://khardal.vercel.app` returned Vercel `404 NOT_FOUND` for `/`,
`/api/health` and `/contacto`. These were platform errors, not the app's Spanish
404. The repository previously built only a standalone Node server; Vercel needs
its own adapter's Build Output API routes and functions.

## Committed configuration

- `@astrojs/vercel@11.0.16` (Astro 7 peer), selected automatically on Vercel or by
  the explicit `build:vercel` command. Local/CI/Render builds retain Node standalone.
- `vercel.json` selects Astro, frozen pnpm install and `pnpm build:vercel`.
- The adapter emits `.vercel/output/config.json`, static assets and `_render.func`,
  including routes for `/`, pages, images and API endpoints. Generated output is
  ignored by Git; Vercel rebuilds it from source.
- ISR is disabled so query state and no-store cart validation remain correct.
  Sharp image processing stays in the Node function; no analytics service is enabled.
- Vercel primary/deployment hostnames are recognized as exact trusted origins.
  Preview aliases preserve API Origin checks; only the configured canonical host
  can be indexable, and preview builds stay noindex by default.

## Project settings and redeploy

Deploy the commit containing this fix from the branch connected to Vercel.
In **Project → Settings → Build and Deployment**:

| Setting | Value |
| --- | --- |
| Framework Preset | **Astro** |
| Root Directory | Repository root (`.` / no nested override) |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build:vercel` (also committed in vercel.json) |
| Output Directory | **Automatic; disable custom override** — do not publish `dist` or `dist/client` as a static site |
| Node.js Version | **22.x**, using the current patched release (project minimum 22.22.0) |

Do not use `pnpm start` as Vercel's build command or `pnpm verify` as its deployment
build command: the latter contains standalone Node runtime smoke tests. CI runs
that pipeline separately. Vercel invokes the generated serverless function itself.

Redeploy after saving settings/environment values; a new deployment is required
to replace the old static/standalone output. The build log should say
`adapter: @astrojs/vercel` and show functions/static output under `.vercel/output`.
If it still reports `@astrojs/node`, check the deployed commit, root and command.

## Environment for the current preview

The frontend host is now known, but content approval is still pending. For a
working **demo preview** while WooCommerce is only on the developer machine:

```dotenv
COMMERCE_PROVIDER=mock
DEPLOYMENT_ENV=preview
STOREFRONT_ORIGIN=https://khardal.vercel.app
```

Vercel system production/deployment URLs provide the origin fallback when exposed;
the explicit storefront origin keeps the canonical stable. Environment values
must be applied to the deployment environment being redeployed.

To show actual WooCommerce products, use instead:

```dotenv
COMMERCE_PROVIDER=woocommerce
WOOCOMMERCE_URL=https://<reachable-wordpress-base>
WOOCOMMERCE_CONSUMER_KEY=<hosted-store-read-key>
WOOCOMMERCE_CONSUMER_SECRET=<hosted-store-read-secret>
WOO_MEDIA_ORIGIN=https://<public-wordpress-media-base>
```

Configure the real values in Vercel's environment settings; these are placeholders,
not repository credentials. The WordPress base may include its subdirectory.
`127.0.0.1:8000` / `localhost:8000` on Vercel refers to the function environment,
not the laptop's Docker container. A local-only backend cannot supply hosted real
products. Mock preview is an explicit provider selection, never an automatic fallback.

Keep `DEPLOYMENT_ENV=preview` until the publication checkpoints are complete. Use
production mode only with the confirmed public host and approved catalog/content.

## Verification and remaining hosted checkpoint

`pnpm test:vercel` builds a mock preview, checks root/API route manifests, imports
the actual emitted function and exercises home/catalog/contact/cart, health,
validation on primary/preview origins, custom 404 and WebP processing. A local media
fixture makes this independent of Docker. It verifies that local env files and a
build-time private sentinel are absent from packaged output, then restores the
standalone build for local runtime checks. CI runs it after the Node verification
pipeline. It does not deploy to a Vercel account.

After redeploy, `/api/health` should return HTTP 200 JSON and `/contacto` HTTP 200
HTML. `/api/cart/context` identifies the selected provider. If the app shows a
Spanish catalog-unavailable 503, routing is working and backend URL/authentication
needs checking; it is different from Vercel's platform `NOT_FOUND`.

Hosted success is not yet recorded: this session has no authenticated Vercel CLI
or linked project access. Record the new deployment SHA/URL, actual route statuses,
image processing and backend reachability after redeployment under S35b/S05b.
