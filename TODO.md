# Khardal Perfumería — Implementation checklist

opencode -s ses_ea9e6c727ffePIispo0frfhGLm


## Approved baseline

- Brand: **Khardal Perfumería**. Customer-facing content: Spanish (`es-CO`), Colombia, COP.
- Stack: Astro, strict TypeScript, compiled Tailwind CSS, and pnpm.
- One shared storefront with mock, WooCommerce, and Shopify commerce adapters; two independently configured backend comparison deployments.
  - **2026-10-22 scope update:** the owner deferred Milestone 6. WooCommerce is the active launch candidate; Shopify implementation/real-store verification and comparative scoring are deferred, not completed. Mock remains the test baseline.
- No backend access is available yet. Start with deterministic fixtures, then real local WooCommerce through Docker Compose, then Shopify API simulations. Real Shopify validation remains a release dependency for the Shopify version.
- Primary WhatsApp: **+57 310 8570230**, `https://wa.me/573108570230`.
- Secondary WhatsApp: **+57 312 2777427**, available on the contact page.
- Ordering: browse → select variant → cart → validate → request through WhatsApp → staff confirms shipping/payment → staff manually creates the accepted order in the chosen backend.
- CTA: **“Solicitar pedido por WhatsApp”**. Opening WhatsApp is not a confirmed order or payment. Retain the cart after handoff; carts do not reserve inventory.
- Design authority: YAML palette in `ui-design/DESIGN.md`, Metrophobic + Inter, square corners, tonal layering rather than shadows. Use readable body text (approximately 16px), visible focus, adequate contrast, and approximately 44px touch targets.
- Mobile catalog: compact two-column layout where readable, single-column at narrow widths; editorial cards on the homepage. Validate against all six screen references.
- Use verified Colombian business facts. Reference-screen French locations, USD prices, Klarna, guarantees, reviews, and manufacturing claims are not approved business content.

## Step → checkpoint → commit protocol

1. Work on one numbered step at a time, respecting its dependencies.
2. Implement the listed scope and run its checkpoint. Keep a blocked or failed step unchecked and record why.
3. When the checkpoint passes, check the step and add evidence to the execution log in the same change.
4. Inspect Git status and diff; stage only the intended files. Create one focused commit for that step with its ID in the commit body (`Step: Sxx`).
5. A commit is the durable completion record. Locate it with `git log --all --grep='Step: Sxx'`; do not attempt to embed a commit's own hash in itself.
6. If a step grows too large, split it into named substeps before implementation, each with its own checkpoint and commit. Do not combine unrelated steps.
7. Once application scripts exist, run type checks and the production build for application changes, plus targeted tests where behavior warrants them. Documentation-only changes require content and whitespace review.
8. Record follow-up fixes as separate commits and log entries. Never mark simulated Shopify tests as real-store verification.

No commits or steps below are complete unless explicitly checked. Suggested commit subjects may be adjusted to accurately describe the resulting diff.

## Milestone 1 — Decisions and project foundation

- [x] **S01 — Record the approved plan**
  - Deliver: this baseline, ordered checklist, checkpoint protocol, and execution log.
  - Checkpoint: compare with `PROMPT.md`, the design references, and the user's five approved decisions; review `git diff --check`.
  - Commit: `docs: Record the implementation checklist`

- [x] **S02 — Inventory content and migration inputs**
  - Deliver: product/collection/URL inventory template, policy and contact source map, asset inventory, and outstanding business facts. Confirm current social accounts; the prompt and existing site differ.
  - Checkpoint: every required content type has a source or an explicit missing-input entry; sample data is labeled.
  - Commit: `docs: Inventory content and migration inputs`

- [x] **S03 — Bootstrap Astro and TypeScript**
  - Deliver: pnpm project, strict TypeScript, base Spanish document, development/build/check scripts, lockfile, and setup README.
  - Checkpoint: clean dependency installation, type check, and production build; root page renders with `lang="es-CO"`.
  - Commit: `build: Bootstrap the Astro application`

- [x] **S04 — Configure runtime and environments**
  - Deliver: validated provider configuration, credential-free `.env.example`, ignored local secrets, suitable Astro runtime adapter, and documented rendering/cache strategy.
  - Checkpoint: missing required provider configuration fails clearly; private credentials stay server-side; server rendering runs locally. Hosting remains provisional until a deployment smoke test.
  - Commit: `build: Configure runtime and environments`

- [ ] **S05 — Add automated checks and preview setup**
  - Deliver: formatting/lint scripts, CI installation/type/build checks, and preview deployment configuration.
  - Checkpoint: checks pass locally and in available CI; verify runtime, images, and secrets on preview hosting when credentials are available. Record unavailable hosting as blocked rather than verified.
  - Commit: `ci: Add checks and preview configuration`
  - [x] **S05a — Implement and locally verify checks/preview configuration.** Deliver formatting/lint scripts, CI workflow, Node version pin, Render mock preview Blueprint, noindex metadata and setup guide. Checkpoint: frozen install, local verification pipeline, YAML review and official Render schema validation. Commit: `ci: Add checks and preview configuration` (`Step: S05a`).
  - [ ] **S05b — Verify hosted CI and preview.** Record Actions run URL/SHA and hosted runtime/image/configuration results using [the hosted checkpoint](docs/ci-and-previews.md). Blocked: no GitHub CLI/remote run verification and no connected hosting workspace or preview URL. Commit after verification: `docs: Record hosted CI and preview checks` (`Step: S05b`). Parent S05 remains open; local checks do not count as hosted verification.

## Milestone 2 — Atomic design system

- [x] **S06 — Implement tokens and typography**
  - Deliver: Tailwind integration, semantic tokens, Metrophobic/Inter font loading, responsive spacing, and development-only visual preview.
  - Checkpoint: preview matches the approved YAML palette; text is readable, font loading avoids major layout shifts, and corners remain square.
  - Commit: `feat: Add design tokens and typography`

- [x] **S07 — Build action and form atoms**
  - Deliver: buttons, links, icons, labels, fields, chips, badges, and loading/error/disabled states.
  - Checkpoint: keyboard focus, contrast, labels, and touch targets pass manual review.
  - Commit: `feat: Add accessible interface primitives`

- [x] **S08 — Build product molecules**
  - Deliver: price display, product cards, breadcrumbs, quantity control, and variant selector.
  - Checkpoint: long names, COP prices, unavailable variants, and narrow layouts render correctly.
  - Commit: `feat: Add product interface components`

- [x] **S09 — Build navigation and shared layout**
  - Deliver: header, mobile menu, footer, and accessible drawer/accordion primitives. Navigation: Tienda, Más vendidos, Nosotros, Contacto; policies in footer.
  - Checkpoint: focus management, Escape dismissal, keyboard operation, scroll behavior, and responsive navigation work without overlapping content.
  - Commit: `feat: Add storefront navigation and layout`

## Milestone 3 — Shared commerce and browsing

- [x] **S10 — Define commerce models and fixtures**
  - Deliver: normalized products, variants, collections, images, money, availability, pagination, provider errors, and adapter contract. Implement a mock adapter with 8–12 deterministic sample products and stable SKUs.
  - Include: list/search products, list collections, retrieve product, and validate current cart prices/availability. Fixtures cover sizes, price differences, sold-out states, missing notes, long names, and multiple images. Top 10 is a curated collection.
  - Checkpoint: focused tests verify money handling, variant identity, pagination, and unavailable-data behavior; fixture data is clearly development-only.
  - Commit: `feat: Define commerce models and mock catalog`

- [x] **S11 — Build the homepage**
  - Deliver: editorial hero, collection links, featured products, verified service information, brand introduction, and FAQ/contact access.
  - Checkpoint: compare mobile/desktop hierarchy with references; use one clear primary CTA and working links.
  - Commit: `feat: Build the Spanish storefront homepage`

- [x] **S12 — Build catalog and collection pages**
  - Deliver: `/tienda`, `/colecciones/[slug]`, pagination, loading/error/empty states, and responsive product grids.
  - Checkpoint: collection membership, pagination, unavailable products, and narrow layouts behave correctly.
  - Commit: `feat: Add catalog and collection pages`

- [x] **S13 — Add search, filters, and sorting**
  - Deliver: `/buscar`, category/price/fragrance-family filtering as data supports it, URL state, and accessible mobile filter drawer. Specify common filter semantics for both providers.
  - Checkpoint: reload/back navigation preserves state; combinations, no results, and pagination resets are correct.
  - Commit: `feat: Add catalog search and filtering`

- [x] **S14 — Build product detail pages**
  - Deliver: `/perfumes/[slug]`, gallery, description, variant-specific price/stock, quantity, add-to-cart integration point, optional notes, policy summaries, and related products.
  - Checkpoint: each variant updates price/availability correctly; missing products return 404; optional content is omitted cleanly; responsive gallery works.
  - Commit: `feat: Add perfume detail pages`

- [x] **S15 — Build informational pages**
  - Deliver: `/nosotros`, `/contacto`, `/preguntas-frecuentes`, `/politicas/*`, and useful error pages. Keep missing policy/business content explicitly pending publication.
  - Checkpoint: navigation works, both WhatsApp numbers are accurate, and no placeholder claims are presented as facts.
  - Commit: `feat: Add business and policy page layouts`

## Milestone 4 — Cart and WhatsApp ordering

- [x] **S16 — Implement persistent cart state**
  - Deliver: add/update/remove variants, quantity validation, money calculations, and versioned provider-namespaced local persistence.
  - Checkpoint: targeted tests cover repeated additions, invalid quantities, corrupt stored data, reloads, and provider isolation. Stored prices are not authoritative.
  - Commit: `feat: Add persistent shopping cart state`

- [x] **S17 — Build cart page and drawer**
  - Deliver: `/carrito`, accessible drawer, item count, line totals, subtotal, and empty state. Shipping reads “Por confirmar”.
  - Checkpoint: changes update all visible cart surfaces; keyboard and mobile interactions work; full cart remains directly accessible.
  - Commit: `feat: Add cart page and drawer`

- [x] **S18 — Validate cart against the provider**
  - Deliver: server-side price/availability reconciliation before handoff, bounded request validation, changed-price review, missing-variant handling, and recoverable provider errors.
  - Checkpoint: tests cover stale prices, unavailable items, excessive quantities, backend failures, and tampered client totals.
  - Commit: `feat: Revalidate cart prices and availability`

- [x] **S19 — Implement WhatsApp handoff**
  - Deliver: encoded Spanish message with names, variant/SKU, presentation, quantities, current prices, estimated subtotal, and useful product links; primary number routing; copy-message and contact fallback.
  - Checkpoint: accents, line breaks, long carts, mobile/desktop links, and unavailable clipboard are handled. Cart persists; no false order/payment confirmation appears; failed validation offers retry/general contact.
  - Commit: `feat: Add WhatsApp order requests`

- [ ] **S20 — Document manual order operations**
  - Deliver: staff procedure for confirming availability, shipping, final amount, payment, and creating orders in the selected backend; define inventory timing and duplicate-request handling.
  - Checkpoint: walk through one request through manual order entry; distinguish handoff analytics from completed sales.
  - Commit: `docs: Define manual order handling`
  - [x] **S20a — Document operations and simulate the request-to-entry worksheet.** Deliver staff procedure, duplicate handling, inventory/payment rules and a labeled mock walkthrough. Checkpoint: reconcile a server-validated sample request with a manually completed worksheet, review totals and recovery cases. Commit: `docs: Define manual order handling` (`Step: S20a`).
  - [ ] **S20b — Verify actual backend order entry.** Dependency: provisioned/seeded WooCommerce (S21–S22), or accessible selected backend. Checkpoint: create one test order in the admin, record its ID and before/after stock, payment/status behavior and duplicate-request recovery. Real Shopify operations additionally require S27. S21–S22 now provide the local admin/API and shared sample catalog; this actual-entry walkthrough is ready to run. Parent S20 remains open until this checkpoint passes.

## Milestone 5 — Real local WooCommerce

- [x] **S21 — Provision WooCommerce with Docker**
  - Deliver: Docker Compose with official WordPress, MariaDB, persistent volumes, compatible pinned versions, and one-off WP-CLI setup installing WooCommerce. Configure Spanish and COP; supply local credentials through environment configuration.
  - Checkpoint: clean startup, working admin/API, and persistence across restart; document start/stop and explicit destructive reset separately.
  - Commit: `ops: Add local WooCommerce environment`

- [x] **S22 — Seed the shared sample catalog**
  - Deliver: repeatable SKU-based seed process for products, variations, images, categories, custom fragrance metadata, and stock from S10 fixtures.
  - Checkpoint: seed twice without duplicates; variant prices, category membership, and unavailable states match fixtures.
  - Commit: `ops: Seed the WooCommerce sample catalog`

- [x] **S23 — Implement WooCommerce catalog mapping**
  - Deliver: server-side REST client, credential handling, product/variation/collection mapping, and normalized errors.
  - Checkpoint: real local API integration checks cover normal and missing products, variation prices, image mapping, and authentication failures.
  - Commit: `feat: Add WooCommerce catalog adapter`

- [x] **S24 — Complete WooCommerce browsing and validation**
  - Deliver: search/filter/pagination parity, current cart validation, bounded caching, freshness policy, and operational backup/update documentation.
  - Checkpoint: common browsing-to-WhatsApp scenarios pass against Docker; stock/price changes become visible within the documented policy and immediately at handoff validation.
  - Commit: `feat: Complete WooCommerce integration`

## Milestone 6 — Shopify integration (deferred by owner)

S25–S27 are skipped for the current WooCommerce launch scope. Their unchecked
items preserve future scope, not release blockers for WooCommerce. No simulated
or real Shopify result is claimed.

- [ ] **S25 — Implement Shopify client and mapping**
  - Deliver: server-side Storefront API client, pinned supported API version, Colombia/COP context, products/variants/collections/images mapping, and fragrance metafield specification.
  - Checkpoint: mocked GraphQL responses verify queries, mappings, money conversion, missing data, and API errors. Record that real authentication is unverified.
  - Commit: `feat: Add Shopify catalog adapter`

- [ ] **S26 — Complete simulated Shopify behavior**
  - Deliver: pagination, supported search/filter semantics, current variant validation, cache policy, and lightweight API mocks (for example MSW).
  - Checkpoint: shared storefront scenarios pass against simulated Shopify responses, including pagination, rate limits, stock changes, and failures.
  - Commit: `test: Verify Shopify commerce scenarios`

- [ ] **S27 — Verify against a real Shopify store**
  - Dependency: Shopify development/test store access and required permissions.
  - Deliver: sales-channel publication, matching test catalog, metafields, market configuration, and real API verification record.
  - Checkpoint: authentication, price context, availability, search/filter behavior, cart validation, and manual order workflow pass on the actual platform.
  - Commit: `docs: Record real Shopify verification`
  - Blocker: no store access currently available. Simulated success does not complete this step.

## Milestone 7 — Content and launch preparation

- [ ] **S28 — Publish approved Spanish content**
  - Dependency: business-provided catalog, current policies, social accounts, and service information.
  - Deliver: real product copy, business/contact information, shipping/returns/privacy/terms content, and genuine reviews only where sourced.
  - Checkpoint: all customer-facing content reviewed; no sample prices, fabricated claims, or unresolved placeholders remain in the launch catalog.
  - Commit: `content: Add approved storefront content`
  - [x] **S28a — Audit launch content and prepare owner intake.** Checkpoint: inspect the actual WooCommerce catalog, map all missing launch inputs and document which existing facts are approved. Commit with `Step: S28a`.
  - [ ] **S28b — Publish owner-approved catalog, business and policy content.** Blocked on final catalog/copy/policies/social information. Keep S28 open until sample products/placeholders are removed from the launch set and reviewed.

- [ ] **S29 — Prepare and optimize photography**
  - Deliver: review three local assets; obtain original approved social/product assets; consistent bottle, alternate angle, packaging, and lifestyle imagery; responsive sizes and modern formats.
  - Checkpoint: images represent actual products, have useful Spanish alt text, reserve layout space, and prioritize the main image while lazy-loading lower content.
  - Commit: `perf: Optimize storefront photography`
  - [x] **S29a — Implement verified responsive image delivery and review current assets.** Use existing development artwork for technical checks; checkpoint responsive/modern formats, alt text and reserved layout. Commit with `Step: S29a`.
  - [ ] **S29b — Publish approved photography.** Blocked on originals and confirmed product mapping; technical image checks do not approve reference artwork. Parent S29 remains open.

- [ ] **S30 — Add SEO and migration redirects**
  - Deliver: metadata, canonicals, social previews, sitemap, accurate product/breadcrumb structured data, old-to-new URL redirects, and noindex configuration for comparison environments.
  - Checkpoint: representative old URLs resolve correctly; structured data matches visible products/prices; only the chosen production hostname is indexable.
  - Commit: `feat: Add SEO and migration redirects`
  - [x] **S30a — Implement configurable SEO and verified route redirects.** Checkpoint metadata/schema/indexability behavior in local production builds; commit with `Step: S30a`.
  - [ ] **S30b — Verify final host and complete approved migration map.** Blocked on domain/hosting and final real product URLs. Parent S30 remains open.

- [x] **S31 — Verify WooCommerce customer journeys**
  - Deliver: targeted end-to-end coverage for browsing, filtering, variant selection, cart persistence, reconciliation and WhatsApp handoff against real local WooCommerce, with mock regressions labeled separately.
  - Checkpoint: agreed scenarios and failure recovery pass. Shopify parity is deferred with Milestone 6.
  - Commit: `test: Verify WooCommerce shopping journeys`

- [ ] **S32 — Complete responsive and accessibility review**
  - Deliver: recorded desktop/tablet/phone checks, keyboard/screen-reader review, and real iOS Safari/Android Chrome checks when devices are available; fixes split into substeps if needed.
  - Checkpoint: six reference layouts reviewed, no overflow or blocked CTAs, functional focus management and announcements, readable text, and usable touch targets.
  - Commit: `docs: Record responsive accessibility checks`
  - [ ] **S32a — Run available viewport, keyboard and automated accessibility checks.** Record browser/emulation scope, compare six references and commit evidence with `Step: S32a`.
  - [ ] **S32b — Complete assistive-technology and physical-device review.** Record real screen-reader and iOS Safari/Android Chrome results when available. Parent S32 remains open until required manual coverage is recorded.

- [ ] **S33 — Measure and tune performance**
  - Deliver: representative home/listing/detail/cart lab measurements and targeted improvements; plan real-user monitoring after launch.
  - Checkpoint: target LCP ≤ 2.5s and CLS ≤ 0.1 in documented lab conditions; assess interaction responsiveness. Validate the INP ≤ 200ms target with field data when available rather than claiming lab scores prove it.
  - Commit: `perf: Tune and measure storefront performance`

- [ ] **S34 — Record WooCommerce production decision**
  - Deliver: record the current WooCommerce release candidate, verified capabilities and hosting/maintenance/cost ownership. Cross-provider scoring is deferred with Shopify.
  - Checkpoint: owner confirms the actual production backend/hosting and operating costs; distinguish local evidence from hosted results.
  - [x] **S34a — Record owner scope change and WooCommerce launch candidate.** Checkpoint: reconcile release dependencies with the Shopify deferral; commit with `Step: S34a`.
  - [ ] **S34b — Confirm production operating decision.** Pending hosting/backend ownership and costs. Parent S34 remains open.

- [ ] **S35 — Deploy and verify production**
  - Dependency: chosen backend access, hosting/domain access, approved content, and completed release checks for that provider.
  - Deliver: production configuration, operational monitoring, handoff analytics, backup/rollback instructions, and launch smoke-test record.
  - Checkpoint: domain/HTTPS, catalog freshness, redirects, primary WhatsApp, manual order workflow, and rollback procedure verified. Monitor real-user performance after launch.
  - Commit: `ops: Record production launch verification`

## Deferred scope

Accounts, wishlists, fragrance quizzes, newsletter subscriptions, online payments, automatic draft-order creation, and bidirectional backend synchronization are later increments. Do not display nonfunctional controls for these features. Native Shopify/WooCommerce checkout and Colombian gateway compatibility require a separate implementation decision.

## Execution log

| Step | Checkpoint evidence | Commit lookup / status |
| --- | --- | --- |
| S01 | Reviewed against prompt, design files/screens, and approved brand, mock-backend strategy, WhatsApp routing, manual orders, and design adjustments. Whitespace validation performed before commit. | `git log --all --grep='Step: S01'` |
| S02 | [Content/source map, asset review, missing-input register and CSV templates](docs/content-inventory.md). Reviewed seven public pages plus terms URL (404); social conflicts remain pending owner confirmation. CSV checkpoint passed: 46 rows, consistent columns, unique old paths, 18 observed product links. `git diff --check` passed. | `git log --all --grep='Step: S02'` |
| S03 | Astro 7.4.1, strict TypeScript 6.0.3 (compatible with the checker's peer range), pnpm 12.14.0, shared Spanish layout and [setup README](README.md). Fresh `pnpm install` and `pnpm install --frozen-lockfile --force` passed on Node 25.9.0; `pnpm check`: zero errors/warnings/hints; `pnpm build`: one static page. Production preview HTTP smoke check passed: 200, HTML, `es-CO`, brand title, one h1, Spanish copy, zero scripts. Generated output/local env ignore checks and `git diff --check` passed. | `git log --all --grep='Step: S03'` |
| S04 | [Runtime/env decision and cache policy](docs/runtime-and-environments.md); Node standalone, prerendered home, dynamic no-store health endpoint, server-only provider configuration and credential-free `.env.example`. Frozen install, 4 config tests, type check (zero diagnostics), production build and 2 runtime tests passed. Same build exercised all three providers with runtime-only dummy credentials; missing-token failure verified. Build-time secret sentinel absent from all 18 output files; local env files ignored. `git diff --check` passed. Hosting remains provisional pending deployment smoke test; no backend connectivity claimed. | `git log --all --grep='Step: S04'` |
| S05a | [CI/preview setup and checkpoint](docs/ci-and-previews.md). Frozen install and preview-mode local verification passed (format, lint, 4 config tests, type check, build, 2 runtime tests). Final type check: zero errors/warnings/hints. Workflow YAML assertions and official Render Blueprint schema validation passed; `git diff --check` passed. S05b hosted evidence unavailable; parent S05 remains open. | `git log --all --grep='Step: S05a'` |
| S06 | [Design foundations](docs/design-system.md): Tailwind tokens, self-hosted licensed/preloaded fonts, readable typography, responsive development preview. `pnpm verify` passed with zero diagnostics; `pnpm test:ui` passed Chromium font/token/overflow checks at 320/390/768/1440px. Runtime suite confirms preview 404 in production; `git diff --check` passed. | `git log --all --grep='Step: S06'` |
| S07 | [Accessible atoms](docs/design-system.md): actions, icons, fields, choices, chips, badges and live states. `pnpm verify` passed with zero diagnostics; 2 browser tests passed including keyboard/focus, labels/errors, disabled/loading states and 44px targets. Six text contrast pairs passed 4.5:1; `git diff --check` passed. | `git log --all --grep='Step: S07'` |
| S08 | [Product molecules](docs/design-system.md): COP prices, long-title cards, breadcrumbs, bounded quantity and native variant selectors. `pnpm verify` passed with zero diagnostics; all 3 browser tests passed including changed prices, unavailable variants, quantity edge cases and responsive overflow checks; `git diff --check` passed. | `git log --all --grep='Step: S08'` |
| S09 | [Shared layout and navigation](docs/design-system.md): responsive header/footer, skip link, modal drawers and native accordions. `pnpm verify` passed with zero diagnostics; all 7 Chromium tests passed including focus trapping/return, dismissal, scroll lock, desktop resize, accordions and WhatsApp. Axe scans: no WCAG A/AA violations in mobile preview/open menu. Reviewed mobile/desktop screenshots; narrow cards use one column. `git diff --check` passed. | `git log --all --grep='Step: S09'` |

| S10 | [Shared contract and mock catalog](docs/commerce.md): 12 labeled sample products, 36 stable variants/SKUs, curated Top 10, integer COP and authoritative mock validation. `pnpm verify` passed: 4 commerce tests, 4 config tests, 2 runtime tests and zero diagnostics. Pagination, money/overflow, identities, optional/unavailable data and combined filtering checked; `git diff --check` passed. | `git log --all --grep='Step: S10'` |

| S11 | [Editorial homepage](docs/commerce.md): server-driven selection, sample/noindex notice, hero, collections, service steps, brand introduction, FAQs and WhatsApp. `pnpm verify` and 8 browser tests passed; zero type diagnostics. Reviewed mobile/desktop screenshots against references; verified anchors, reserved hero image and four-width overflow checks. Real-provider unavailable views return 503; `git diff --check` passed. | `git log --all --grep='Step: S11'` |

| S12 | [Catalog and collections](docs/commerce.md): shared SSR listing, native pagination, loading/empty/error views, real navigation links and distinct unknown/sold-out states. `pnpm verify` and all 11 browser tests passed, zero diagnostics. Actual 404/400/503 and no-store checked in production; collection membership, optional data, pending status and four viewport widths checked; `git diff --check` passed. | `git log --all --grep='Step: S12'` |

| S13 | [URL search/filter semantics](docs/commerce.md): `/buscar`, adapter facets, category/family/inclusive COP range, stable sorting and mobile drawer with no-JS fallback. `pnpm verify` and all 14 browser tests passed, zero diagnostics. Checked bounded/duplicate queries, combinations, empty results, reload/back, pagination reset/preservation and mobile no-JS filtering; `git diff --check` passed. | `git log --all --grep='Step: S13'` |

| S14 | [Perfume details and selection event](docs/commerce.md): gallery, live variant prices/SKUs/stock, bounded quantity, optional notes, related cards and policy summaries. `pnpm verify` and 17 browser tests passed, zero diagnostics. Checked missing products (404), unavailable variants/products, gallery, cart-integration payload, no-JS review and long names at four widths. Reviewed mobile/desktop catalog/detail screenshots against references; `git diff --check` passed. | `git log --all --grep='Step: S14'` |

| S15 | [Business, policy and error pages](docs/commerce.md): about/contact/FAQ, all four pending policy structures, custom 404/500 and complete shared navigation/footer. `pnpm verify`, all 20 browser tests and `git diff --check` passed; zero diagnostics. Internal-link destinations return 200, both WhatsApp contacts match approved numbers, pending policies force noindex, error statuses/recovery work. Axe: no WCAG A/AA violations on five mobile/desktop surfaces and open filters. Final business/policy approval remains S28. | `git log --all --grep='Step: S15'` |

| S16 | [Persistent cart](docs/cart-and-ordering.md): versioned provider namespaces, merge/update/remove, bounded quantities, safe COP estimates and recoverable corrupt/blocked storage. `pnpm verify` passed (8 commerce/cart tests, zero diagnostics); all 21 browser tests passed, including repeated additions through reload. `git diff --check` passed. | `git log --all --grep='Step: S16'` |

| S17 | [Cart page and drawer](docs/cart-and-ordering.md): synchronized counts, edits/removal, COP estimates, empty state, shipping “Por confirmar” and runtime provider context. `pnpm verify` passed, zero diagnostics; full 22-test UI suite passed, followed by 2 passing targeted cart tests after cross-tab/sample refinements. Checked focus/Escape, reload, invalid input, cross-tab updates and four-width overflow; `git diff --check` passed. | `git log --all --grep='Step: S17'` |

| S18 | [Server reconciliation](docs/cart-and-ordering.md): bounded no-store API, current provider prices/stock, changed-price acceptance, missing/unavailable/quantity recovery and stale-result invalidation. `pnpm verify` passed (10 commerce/cart/handler tests, zero diagnostics); targeted cart/validation browser checks passed. Compiled API verified current totals despite tampering, provider failure isolation and method/no-store behavior; `git diff --check` passed. | `git log --all --grep='Step: S18'` |

| S19 | [WhatsApp handoff](docs/cart-and-ordering.md): authoritative encoded Spanish message, explicit open/copy, full long-cart fallback, expiry/edit invalidation and retained cart. `pnpm verify` passed (5 config, 13 domain/handler/message tests, zero diagnostics); all 29 browser tests passed. Fixed compiled-server trusted-origin mismatch; actual Origin-header regression and compiled browser smoke passed. Reviewed cart screenshots; axe found no violations on long-cart/handoff. External navigation intercepted, no business message sent; `git diff --check` passed. | `git log --all --grep='Step: S19'` |

| S20a | [Staff operations and labeled walkthrough](docs/manual-order-operations.md), [entry worksheet](docs/manual-order-template.md). Reviewed official WooCommerce/Shopify admin/stock documentation. Executed mock validation handler with price-change rejection then acceptance: COP 240,000 subtotal; manually reconciled simulated COP 15,000 shipping / COP 255,000 total and stock arithmetic. Recorded duplicate handling, payment pending and no real backend ID/order/stock movement. Content/link/whitespace review passed; application checks unchanged from S19. | `git log --all --grep='Step: S20a'` |
| S20b | S21–S22 provide the local WooCommerce admin/API and shared sample catalog. The actual admin-entry/stock-transition walkthrough is now unblocked; Shopify also requires S27. Parent S20 remains open. | Ready for actual walkthrough; no completion commit |
| S21 | [Pinned local WooCommerce](docs/local-woocommerce.md): WordPress 7.1.3/PHP 8.3.36, MariaDB 11.4.13, WP-CLI 2.12.0 (images digest-pinned), WooCommerce 11.2.1 with official checksums. Fresh healthy startup, repeated setup (one API key), es_CO/CO/COP, real admin login and OAuth-signed REST checks passed. Stop/start and down/up preserved marker, plugin/user/API credentials. Env ignored/0600, frozen install, Compose/shell validation and `pnpm verify` passed (zero diagnostics); `git diff --check` passed. | `git log --all --grep='Step: S21'` |

| S22 | [Shared catalog seed and mapping](docs/woocommerce-seeding.md): 12 variable products, 36 exact fixture SKUs, 22 rasterized sample images, 7 managed categories and 2 global attributes. `pnpm woo:seed:repeat-check` passed with identical IDs and zero products/variants/images created on the second run. CRUD + native REST verified all prices/stock, unknown/sold-out states, categories, optional notes, image alt/dimensions/content and curated Top 10 order. `pnpm woo:check`, `pnpm verify` (zero diagnostics) and `git diff --check` passed. S20b is now unblocked but not completed. | `git log --all --grep='Step: S22'` |

| S23 | [Server-only WooCommerce catalog adapter](docs/woocommerce-adapter.md): authenticated bounded REST, simple/variable products, native collections, current COP/stock/images and normalized failures. `pnpm verify` passed (5 config, 14 commerce/cart, 6 Woo mapping/client tests, zero diagnostics, build and 2 runtime tests). Real Docker API and compiled Chromium storefront checks passed, including the merchant-created Perfume WooCommerce, missing products, variation prices, images and credential isolation; all 29 mock UI tests passed. Local ignored `.env` activated WooCommerce; merchant routes return 200 with “Precio por confirmar” for the unpriced variation. `git diff --check` passed. S24 cart reconciliation/caching and S20b remain open. | `git log --all --grep='Step: S23'` |

| S24 | [WooCommerce freshness, reconciliation and operations](docs/woocommerce-operations.md): bounded 30s credential-partitioned cache, uncached current cart reads, aggregate parent-stock validation, sample-aware handoff and backup/update runbook. `pnpm verify` passed (5 config, 14 commerce/cart, 11 Woo tests, zero diagnostics, build/2 runtime tests); real API, compiled storefront and live price/stock-to-WhatsApp journey passed; all 29 mock UI tests passed. Native price edit refreshed after 27,845ms; price review, unavailable/missing data and retained cart verified. Probe cleanup/fixture parity passed. Private backup creation/integrity and restart/admin/API checks passed; full restore rehearsal remains S35. `git diff --check` passed. S20b remains pending. | `git log --all --grep='Step: S24'` |

| S34a | [WooCommerce launch scope](docs/launch-scope.md): recorded owner-requested Shopify deferral, Woo release candidate, Woo-only S31 scope and explicit publication/host/device blockers. Reviewed checklist/evidence and `git diff --check`; no production selection, Shopify parity or hosted verification claimed. | `git log --all --grep='Step: S34a'` |

| S28a | [Launch content audit/intake](docs/launch-content.md): read-only live Woo REST confirmed 13 products/37 variations, 12 sample products and the unpriced merchant variation. Mapped approved contacts/workflow and all pending copy/catalog/policy/photo/social inputs. Content and whitespace review passed. No sample content was approved for launch; S28b remains blocked. | `git log --all --grep='Step: S28a'` |

| S29a | [Responsive image delivery and asset review](docs/photography.md): bounded intrinsic-size lookup, authorized Woo upload paths, WebP/srcset/sizes, eager PDP/lazy lower images and responsive gallery updates. Reopened three reference PNGs; publication remains unapproved. `pnpm verify`, real compiled image/WebP check and all 29 UI tests passed; zero diagnostics and `git diff --check` passed. S29b remains blocked on approved photography. | `git log --all --grep='Step: S29a'` |

| S30a | [SEO and verified redirects](docs/seo-and-migration.md): host-gated metadata/canonicals/OG, brand card, accurate non-sample Product/Breadcrumb JSON-LD, robots/sitemap and live-destination legacy routing. `pnpm verify` passed with zero diagnostics; isolated example.test production-host/forwarded-host test and real compiled Woo test passed. Final host/catalog/migration publication remains S30b; `git diff --check` passed. | `git log --all --grep='Step: S30a'` |

| S31 | [WooCommerce journey review](docs/journey-review.md): real compiled filtering/cart/price-stock/handoff checks plus native invalid-credential failure/recovery with unchanged cart. `pnpm verify`, real local API/journey/recovery and all 29 mock UI checks passed; zero diagnostics. Real cache refresh 27,867ms; outbound WhatsApp intercepted and no order/payment claimed. Shopify scope deferred; `git diff --check` passed. | `git log --all --grep='Step: S31'` |

For each subsequent step, add the commands/manual checks performed, their results, and any blockers. Keep this log concise; link longer measurement or review reports from the relevant row.
