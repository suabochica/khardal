# S28a — Launch content audit and owner intake

Audit date: 2026-10-22. This is publication preparation, not content approval.
The real local WooCommerce REST catalog was read without changing products.

## Current catalog

- 13 published variable products / 37 native variations.
- 12 products / 36 variations are explicitly marked development samples.
- The merchant-created **Perfume WooCommerce** (ID 13) is not sample-marked, but
  its only variation has no price. Its reference image/copy still need publication
  review; publication in a local test admin is not business approval.
- 22 images on sample products are generated development illustrations. Horizonte
  mineral intentionally has no images. The merchant product has one uploaded PNG.
- The two missing-note cases and sold-out/unknown inventory cases are deliberate
  fixtures, not substantiated launch product descriptions or stock commitments.

S28 cannot pass while this launch set consists of samples and an unpriced test
product. Keep the sample environment intact for regression checks; prepare the
approved production catalog separately rather than removing its sample flags.

## Approved facts available

- Khardal Perfumería; Colombia; Spanish `es-CO`; COP.
- Primary WhatsApp **+57 310 8570230** (`https://wa.me/573108570230`).
- Alternative contact **+57 312 2777427** (`https://wa.me/573122777427`).
- Browse → cart → current price/stock check → WhatsApp request → staff confirms
  availability/shipping/final total/payment → manual backend order entry.
- A request/open/copy is not order/payment confirmation; carts do not reserve stock.

## Owner input to complete S28b

| Input | What to supply / confirm |
| --- | --- |
| Launch catalog | Final products/variants/SKUs, COP prices, actual stock rules, descriptions, family/notes where known and collection membership. Use the S02 CSV templates or the confirmed production WooCommerce catalog. |
| Brand/editorial copy | Review current hero, introductions and FAQ; provide approved history and team/store facts. Resolve the conflicting legacy years-in-business claims before using either. |
| Contact/business identity | Legal identity, service email, hours and actual addresses/locations. Existing phone approval does not approve legacy email/address candidates. |
| Shipping | Coverage, agreed fee calculation, delivery ranges, tracking and problem-reporting channel for manual WhatsApp orders. |
| Returns/warranty/refunds | Approved conditions, timelines, request channel and reimbursement handling; reconcile conflicting legacy policies. |
| Privacy | Controller/contact, actual WooCommerce/hosting/WhatsApp/cart storage/analytics data flows, retention and customer rights. |
| Terms | Manual acceptance, final totals/payment conditions and relevant customer-service process. |
| Social accounts | Confirm the official Instagram/TikTok handles; prompt and legacy site disagree. |
| Reviews | Only genuine sourced review text, provenance and product association; otherwise omit. |
| Photography | Original approved files, product/angle/packaging association, useful factual Spanish alt text and permission to publish. |

The source map and input IDs remain in [the content inventory](content-inventory.md).
No delivery guarantees, tax treatment, payment method or policy deadlines were
inferred from reference screens or from old pages with conflicting facts.

## Publication sequence

1. Supply approved inputs and record their source/review date.
2. Populate the production WooCommerce catalog with final images/metadata and
   review price/stock context; preserve development fixtures in the local test store.
3. Replace pending business/policy structures with approved Spanish content and
   review each customer-facing route, including no-result/error/order microcopy.
4. Review final catalog pages and structured data together; resolve missing prices,
   sample flags, pending policies and misleading claims before indexing/deployment.
5. Record owner sign-off, final catalog source and publication evidence under S28b.

S28a checkpoint: live read-only REST audit confirmed the counts/unpriced variation;
approved facts and every missing content type have an intake/source entry. Content
and whitespace review passed. S28b/S28 remain blocked on actual approved inputs.
