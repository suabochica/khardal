# S02 — Content and migration inventory

Reviewed: **2026-10-20**. Scope: public pages and repository assets, without backend access. This is a discovery inventory, not a complete catalog export or publication approval.

## Status and collection rules

- **Approved**: explicitly confirmed by the project owner in the planning conversation and recorded in `../TODO.md`.
- **Observed**: visible on a source page; still needs confirmation for the new storefront.
- **Missing**: not supplied or not retrievable; linked to an input ID below.
- **Development sample**: illustrative only; must never silently become a production product, price, stock count, review, or claim.
- Sources below were fetched on the review date unless labeled repository/conversation. Pages can change; recheck them during S28 and S30.
- CSV files in `inventory/` are editable intake templates, not backend import files. Add rows with source and approval status, retain old URLs, and use one variant row per SKU. Blank fields mean unknown, not zero, false, or permission to infer.

## Content coverage and source map

All relative web paths in this document refer to `https://khardal.co`.

| Content type / destination | Source | Available information and disposition | Missing input |
| --- | --- | --- | --- |
| Brand, locale, currency | Approved conversation; `../TODO.md` | Khardal Perfumería; es-CO; Colombia; COP. Existing site says Khardal Esencial; shipping policy says Khardal Essences. Approved name takes precedence. | I01: final logo files |
| Home hero and editorial copy `/` | `/`; `../ui-design/` | Existing Spanish copy and layout inspiration available; French atelier and manufacturing claims in references are illustrative. New hero copy needs approval. | I02 |
| Product and variant catalog `/perfumes/[slug]` | `/`; `/products/khamrah`; `inventory/products.csv` | 18 distinct product links observed on home; one detail page reviewed. KHAMRAH displays 30/60/100 Ml at 38,300/46,300/67,600 COP. These are observed prices, not approved launch prices. | I03 |
| Collections `/colecciones/[slug]` | Home navigation; `inventory/collections.csv` | Hombres, Mujeres, Árabes, Unisex, Top 10. Membership and ranking not exported. Top 10 is curated. | I04 |
| Search/filter metadata | Product intake template; no structured source supplied | Need fragrance families, notes, relevant category membership and supported sort data. Do not infer these from bottle imagery or names. | I03, I04 |
| Product imagery and lifestyle | `assets` section below; `/products/khamrah`; `/pages/nosotros` | Remote product/packaging/bottle and team/lifestyle image candidates exist. Originals and product association needed. | I05 |
| About `/nosotros` | `/pages/nosotros` | Story, Jonathan/Héctor founders, team and stores observed. About says more than 30 years; homepage FAQ says more than 35. Rewrite under approved brand after confirmation. | I02, I06 |
| Contact `/contacto` | Approved conversation; `/pages/contact` | Primary +57 310 8570230; secondary +57 312 2777427 approved. Existing page instead lists +57 311 8607690 and khardalesencial@gmail.com. Do not substitute legacy contacts. | I06 |
| FAQ `/preguntas-frecuentes` | Homepage FAQ | Inspired fragrances in Khardal bottles, 6–10 hour duration, nationwide delivery, cash on delivery and years-in-market claims observed. None approved by this inventory. | I07 |
| Shipping `/politicas/envios` | `/policies/shipping-policy`; home FAQ; KHAMRAH page | Policy says 3–7 business days (3–5 main cities); FAQ 2–5; PDP 2–7. Policy describes automatic shipping calculation, incompatible with manual WhatsApp confirmation. Shipping remains “Por confirmar” in the planned cart. | I08 |
| Returns `/politicas/devoluciones` | `/policies/refund-policy` | Observed: 30 calendar days for manufacturing defects on unopened/unused goods, returns within 5 calendar days, refunds within 15 business days, damage notification within 5 business days. Shipping policy separately asks reporting within 48 hours. Business must resolve terms and contact route before publication. | I09 |
| Privacy `/politicas/privacidad` | `/policies/privacy-policy` | Page dated 2025-04-19, Shopify-specific account/payment/cookie/marketing descriptions. Lists email above and Calle 6c n 21-15, 410005, CO. Adapt to actual provider, WhatsApp flow, storage and analytics rather than copy unchanged. | I10 |
| Terms `/politicas/terminos` | `/policies/terms-of-service` | Fetch returned **404**. No approved terms supplied. | I11 |
| Reviews/trust elements | `/products/khamrah` | Aggregate 4.83/5 from 6 reviews observed; review bodies/provenance/export unavailable. Do not migrate just an aggregate or fabricate testimonials. | I12 |
| Social links | Prompt versus existing home/footer | Prompt: Instagram `khardalperfumeria`, TikTok `@khardalperfumeria`. Site: Instagram `khardalesencial`, TikTok `@khardal_colombia`. Ownership/current accounts not confirmed. | I13 |
| WhatsApp/cart microcopy `/carrito` | Approved conversation; `../TODO.md` | “Solicitar pedido por WhatsApp”; estimated subtotal; shipping confirmed by staff; cart retained. No confirmed-order screen on handoff. Payment methods still require business confirmation. | I07 |
| SEO titles, descriptions and redirects | `inventory/urls.csv`; approved copy after S28 | Proposed paths recorded; no complete sitemap/export or search analytics available. | I14 |
| Error/empty/loading content | Planned new storefront, no legacy copy required | Author concise Spanish states during S11–S19; review with page content. | I02 |

## Editable catalog intake

- [Products and variants](inventory/products.csv): one row per presentation; observed KHAMRAH rows demonstrate intake without inventing SKU, stock, or notes.
- [Collections](inventory/collections.csv): one row per collection. Fill membership with approved stable product keys; do not derive membership from proximity to cards on the homepage.
- [URLs](inventory/urls.csv): one row per known old path. Proposed mappings are not implemented redirects. Enumerate remaining paths from a backend export/sitemap before S30; expand tagged collection URLs and product aliases. Preserve query behavior deliberately.
- Product CSV prices are decimal **major units in COP**, not centavos. Convert explicitly when implementing normalized money. Blank compare-at price means unknown. Stock cannot be inferred from an enabled button.
- For future development fixtures, use `DEV-` SKU prefixes and `development_sample` status. Keep invented notes/prices/stock in fixtures separate from `observed_pending_approval` catalog intake. S10 will create deterministic sample data; S02 creates none.

## Asset inventory

| Path / source | Visual inventory / intended role | Publication status / next action |
| --- | --- | --- |
| `public/images/01-product.png` | Portrait bottle on linen; label reads AURÉLIA / BOIS DORÉ | Development/reference only; not established as a Khardal product. Need I05. |
| `public/images/02-product.png` | Faceted bottle with figs/wood; label AURÉLIA SAUVAGE | Development/reference only; product mapping and originality unconfirmed. Need I05. |
| `public/images/03-product.png` | Amber bottle on stone pedestal; label AETERNA / AMBRE LUMIERE | Development/reference only; different brand text, not approved hero photography. Need I05. |
| `ui-design/atoms.png` | Component reference sheet | Design reference, not a storefront asset. |
| `ui-design/screen-{small,large}-{home,plp,pdp}.png` | Six responsive layout references | Reference only; do not publish screenshots as product imagery. |
| `ui-design/DESIGN.md` | Tokens and component direction | Approved YAML palette/Metrophobic/Inter baseline with recorded adjustments. |
| `ui-design/code.html` | HTML prototype with external image URLs | Reference only; not production code or an asset source of record. |
| Existing homepage logo: `/cdn/shop/files/LOGOS-KHARDAL_1_a1cbecac-c922-4ca8-befc-22bc686f0893.png` | Legacy Khardal Esencial logo candidate | Need approved Khardal Perfumería vector/transparent variants, favicon, social image (I01). |
| KHAMRAH gallery at `/products/khamrah` | `LATTAFA_KHAMRAH_fb946eff-c3d6-458f-830d-c0e4468e2088.png`, `EMPAQUE_cb913c9e-ab4d-473d-82db-89c95ce55e0c.png`, `FRASCO_e74d0730-9d01-4be2-b19b-ad1607b3d67b.png` under `/cdn/shop/files/` | Observed remote candidates only. Request originals and confirm actual presentation/packaging rather than copy external-brand imagery blindly (I05). |
| About/contact page photos and social profiles | Lifestyle, preparation, team, stores | No originals supplied. Request selected originals, intended crop/use and product/person/location mapping (I05/I06/I13). |
| Metrophobic / Inter | Font families specified in design | No local font files yet; obtain appropriate distributions and include their license files during S06. |

All three local product PNGs were opened for visual review. No assets were replaced or downloaded in S02. Dimensions/byte budgets and responsive renditions belong to S29.

## Missing-input register

Business confirmation remains pending; S02 completion means the missing inputs are recorded, not approved.

| ID | Requested input | Source / responsible party | Needed by |
| --- | --- | --- | --- |
| I01 | Final Khardal Perfumería logo, variants, favicon and social artwork | Business owner/designer | S06 preview; S28/S29 final |
| I02 | Approved hero/editorial/Spanish utility copy and brand story | Business owner + implementation copy review | S11/S15 drafts; S28 final |
| I03 | Full product/variant export or completed CSV: IDs/SKUs, sizes, COP prices, tax display, stock/backorder rules, descriptions, families/notes | Catalog manager; no backend access currently | S10 samples can proceed; S23/S27/S28 real catalog |
| I04 | Collection membership, featured products, Top 10 ordering and merchandising rules | Catalog manager | S12 sample; S28 final |
| I05 | Original approved bottle/packaging/gallery/lifestyle images, alt-text facts and product mapping | Business owner/photographer | S29 |
| I06 | Customer-service email/hours, legal business identity/address, active locations/team details, role of legacy phone | Business owner; contact/about/privacy sources above | S15 drafts; S28 final |
| I07 | Accepted payment methods after WhatsApp confirmation, cash-on-delivery coverage, fragrance/inspired-product claims and substantiated duration/history | Business owner; legacy FAQ is not new approval | S20 procedure; S28 final |
| I08 | Single shipping policy: destinations, delivery ranges, fees, tracking and problem reporting | Fulfillment owner; reconcile FAQ/PDP/policy | S28 |
| I09 | Single warranty/returns/refund policy and request channel, including timing conflicts | Business owner; existing refund/shipping pages | S28 |
| I10 | Privacy content matching actual data handling, providers, WhatsApp, cart persistence and chosen analytics | Business owner with implementation data-flow details | S28/S35 |
| I11 | Terms for manual WhatsApp order acceptance, final totals and payment | Business owner; source URL returned 404 | S28 |
| I12 | Review source/export, review bodies/product association and permission to publish | Business owner/review provider | S28 if reviews included; otherwise omit |
| I13 | Confirm official Instagram/TikTok from conflicting candidates above | Business owner; ownership not verifiable from existing links alone | S09 placeholders; S28 final links |
| I14 | Full legacy URL list, sitemap/backend exports, aliases, domain control and any SEO priorities | Store/domain owner | S30/S35 |
| I15 | Shopify test access and production backend credentials when selected | Store owner; Docker WooCommerce can proceed without them | S27/S35 |

## S02 checkpoint

- Content coverage: every planned content type has a source, a future authoring step, or an explicit missing-input ID in the source map.
- Templates: product rows identify source/status and unknown SKU/stock; collection rows and URL rows retain observed handles and proposed destinations. No fixture or price is labeled production-approved.
- Reconciliation: approved brand/WhatsApp override legacy candidates; social accounts remain pending I13, not falsely confirmed. Shipping, history, returns and contact discrepancies are recorded.
- Assets: all three local PNGs visually inspected; all nine design files accounted for; remote candidates separated from local approved assets.
- Scope: URL inventory is explicitly partial; no backend export, stock confirmation, review migration, final policy approval, or redirect implementation is claimed.
- Validation: Python standard-library CSV checks passed for 46 records (3 variant, 5 collection, 38 URL rows), consistent column counts, unique legacy paths, and 18 distinct observed product paths. Content/source coverage manually reviewed; `git diff --check` passed. No application exists yet, so no application tests/build apply.
