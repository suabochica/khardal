# WooCommerce launch scope — 2026-10-22

The owner requested skipping Milestone 6 and proceeding with Milestone 7.
WooCommerce is the active release candidate. S25–S27 and Shopify parity/scoring
are deferred, not verified. Existing provider configuration remains compatible
with a future integration; the implemented storefront uses local WooCommerce.

## Evidence available

- S21–S24 provide pinned local WordPress/MariaDB/WooCommerce, repeatable sample
  catalog, real catalog mapping, bounded 30-second browsing freshness and uncached
  authoritative cart reconciliation.
- The compiled browser journey reaches a prepared WhatsApp message with real
  price/stock changes, cart retention and explicit sample labeling.
- Local backups were created/integrity-checked; the restore runbook is documented.
- Mock UI regression and local real-store checks are separate. Neither represents
  hosted verification or completed sales.

## Remaining launch decisions and inputs

- Approved real catalog, copy, service facts, policies, social links and original
  product photographs (S28/S29).
- Final storefront/backend hostname, HTTPS/reverse-proxy/credential setup and
  hosting access. `khardal.co` is an observed legacy domain, not newly confirmed
  deployment authorization (S30b/S34b/S35).
- Hosting/database/storage/backup costs, administrator and patch ownership,
  retention and restore rehearsal. No unquoted recurring cost is invented.
- Actual manual order-entry/stock-transition walkthrough (S20b), hosted CI/preview
  evidence (S05b), physical-device/screen-reader coverage (S32b) and launch smoke
  verification (S35).

Local WooCommerce evidence supports continuing technical launch preparation now.
It does not publish missing business facts, approve reference photography, confirm
the production host or constitute a production deployment.

S34a checkpoint: reviewed the source checklist and execution evidence, updated
Shopify-dependent release conditions and split externally blocked publication/
verification steps before implementation. Documentation/whitespace review passed.
