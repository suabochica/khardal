# S05 — Automated checks and preview setup

## Local quality gate

```sh
pnpm install --frozen-lockfile
DEPLOYMENT_ENV=preview pnpm verify
```

`verify` runs, in order:

1. `format:check` — Prettier with Astro support.
2. `lint` — ESLint flat config, recommended JavaScript/TypeScript/Astro rules,
   zero warnings allowed.
3. `test:config` — provider configuration behavior.
4. `test:commerce` — integer COP, mock catalog, shared query and validation behavior.
5. `test:woocommerce` — isolated catalog mapping/client error and credential-boundary checks.
6. `check` — Astro/TypeScript diagnostics.
7. `build` — Node production artifact and prerendered informational pages.
8. `test:runtime` — actual Node server, runtime-only dummy credentials, dynamic
   catalog/health responses, missing-credential behavior and public-response isolation.

CI also installs Chromium and runs `pnpm test:ui` after `verify`; browser checks
cover component interactions, shared browsing and automated accessibility scans.

Use `pnpm format` to apply formatting. Formatting/lint targets include application
code, tests, root `.mjs` configuration and explicit JSON/YAML project configuration.
Original prompt/design references, intake CSVs, planning notes and generated files
are outside those targets. Documentation still requires content/whitespace review.

`.node-version` pins Node 22.22.0 for CI; `packageManager` pins pnpm 12.14.0.
Local S05 checks ran on Node 25.9.0; the pinned Node 22 hosted run is pending.
Dependency versions and lockfile are committed. No backend credentials are required.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes to `main`, all pull requests and manual
dispatch. The single **Storefront checks** job installs the pinned toolchain and
locked dependencies, then runs `pnpm verify` with mock commerce and preview mode.
It uses read-only repository permissions and no repository secrets. A newer run
on the same ref cancels the previous run. The job has a 15-minute timeout.

After these commits are pushed to GitHub, inspect the Actions run and save its URL
and commit SHA in the S05b execution record. A local pass does not demonstrate
GitHub execution or branch protection. A maintainer can require **Storefront
checks** in repository rules once the first successful check exists.

## Render preview baseline

`render.yaml` configures a **Node web service**, not a static site:

- Preview-only name; no custom production domain.
- Free compute baseline, Node 22.22.0, pnpm 12.14.0.
- Mock commerce with no real store credentials.
- Full `pnpm verify` gate before serving `dist/server/entry.mjs`.
- Listen on `0.0.0.0` and Render's injected `PORT`.
- Health check at `/api/health`.
- Automatic updates after checks pass; manually generated PR previews via the
  `render-preview` label or `[render preview]` PR title.

To activate, connect `suabochica/khardal` to a Render workspace, create a Blueprint
from this repository's `render.yaml`, and inspect the resulting deployment logs.
The Blueprint branch becomes the service branch; no hardcoded branch overrides
PR-preview code. Render creates the service only after the repository is connected.
The committed configuration itself does not create a service or deployment.

Render service previews inherit the base service environment. Keep this service
mock-only. When backend testing becomes available, configure separate test-store
services with server-only credentials and verify connectivity there; do not attach
production store credentials to the preview baseline.

`DEPLOYMENT_ENV` is a **build-time**, server-public enum: `development`, `preview`,
or `production`. Non-production HTML gets `noindex, nofollow` metadata, including
prerendered informational pages. Mock catalog and pending policies force noindex
even in production mode. Rebuild when changing it; changing only the runtime
variable does not change prerendered metadata. Render additionally sets a noindex
header on its PR previews. Full canonical/sitemap/redirect work remains in S30.

## Hosted checkpoint (S05b — pending)

Record an Actions run URL, Render deployment URL, source SHA and results below
in the execution log after access is available:

| Check | Evidence required | Current status |
| --- | --- | --- |
| GitHub CI | Successful pinned Node/pnpm installation and every `verify` stage | Pending; GitHub CLI unavailable in this environment, no remote run verified |
| Hosted homepage | HTTPS 200, brand title, `es-CO`, non-production noindex metadata | Pending; no connected Render service/URL |
| Dynamic runtime | Two `/api/health` responses with different timestamps and `Cache-Control: no-store` | Local pass; hosted pending |
| Static image delivery | `/images/01-product.png` returns 200, PNG content type and decodable image | Hosted pending; image is a development reference |
| Image transformation | Exercise a responsive/optimized real image once S29 implements it | Not implemented yet; do not claim static delivery proves optimization |
| Secrets/configuration | Inject test-only private credentials in a separate test service; health succeeds, missing active credentials fail with named-field server logs, no credentials in public output | Local dummy-credential pass; hosted pending |
| Backend networking | Actual WooCommerce/Shopify API access from hosting runtime | Pending integration steps and test-store access |

Useful smoke checks after obtaining the URL:

```sh
curl --fail --include https://YOUR-PREVIEW-HOST/
curl --fail --include https://YOUR-PREVIEW-HOST/api/health
curl --fail --include https://YOUR-PREVIEW-HOST/api/health
curl --fail --output /dev/null --write-out '%{http_code} %{content_type}\n' \
  https://YOUR-PREVIEW-HOST/images/01-product.png
```

Open the preview in a browser to inspect the image and HTML metadata. An Actions
pass, schema validation, or local runtime pass alone does not complete this table.

## S05a verification record

- Frozen dependency installation passed without release-age policy exceptions.
- Preview-mode `pnpm verify` passed locally; four configuration tests and two
  runtime tests, successful build and no lint warnings. After replacing the
  deprecated ESLint config helper, formatting/lint/type checks passed with zero
  diagnostics.
- Prettier parsed the workflow/Blueprint YAML; workflow trigger/permission/command
  assertions passed.
- Render Blueprint passed its official JSON Schema fetched from
  `https://render.com/schema/render.yaml.json` on 2026-10-20.
- Hosted validation remains blocked as listed above. S05 stays open until S05b.
