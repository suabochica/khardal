# S31 — WooCommerce customer journey verification

Verified 2026-10-22 against the compiled Node storefront and real local Docker
WooCommerce. Shopify parity is deferred by the owner; it is not part of this pass.

| Scenario | Evidence |
| --- | --- |
| Catalog pagination and ordinary merchant product | Compiled storefront check from S23/S29 includes manually created product, correct missing-price state, native images and true 404. |
| Search + category/family/price/sort | Real journey finds its nonce-owned product with combined filters and preserves results on reload. Shared selector tests cover combinations and price/sort semantics. |
| Variant choice + cart persistence | Real browser adds a native variant, retains it through reload and across prepared-message/open steps. |
| Current price review | Native WP-CLI price update is detected immediately by uncached reconciliation; acceptance requires a new validation. |
| Stock/error cases | Native stock shortage, sold-out, removed price and deleted variation all block the handoff. Cache-expiry update observed after 27,867ms on this run. |
| WhatsApp | Server-current message, correct primary number, DEMOSTRACIÓN marker, estimated subtotal, explicit open and retained cart. Outbound navigation is intercepted; no message sent. |
| Authentication failure/recovery | A separate compiled test server is restarted with an invalid API secret, producing a real Woo auth failure. Browser hides the prepared message and keeps cart bytes unchanged; restoring the test server credential allows retry. The Woo key/store itself is not changed. |
| Mock regression | All 29 existing Chromium tests passed separately with explicit mock provider. |

Commands: `pnpm verify`, `pnpm test:woocommerce:local`,
`pnpm test:woocommerce:journey`, `pnpm test:woocommerce:recovery`, `pnpm test:ui`.
The pipeline passed with zero type diagnostics. The real journey cleans up only
its temporary product records; the recovery test changes only isolated test-server
configuration. No accepted backend order/payment or manual admin-entry result is
inferred from these checks. S20b and hosted/device checks remain separate.
