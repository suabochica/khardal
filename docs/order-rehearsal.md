# S20b — Actual restored WooCommerce admin rehearsal

Verified 2026-10-22 using WordPress 7.1.3, WooCommerce 11.2.1 and PHP 8.3.36.
This was a GUI-driven Playwright rehearsal on an **isolated restored local copy**,
not a customer sale, payment or production operation.

```sh
pnpm woo:rehearse:orders backups/woocommerce/<verified-backup-directory>
```

The command checks backup integrity, creates a random Compose project and unused
loopback port, restores the real SQL dump and WordPress files, and verifies admin
login/signed REST access. It uses the matching backup environment without printing
credentials. It checks local mail suppression before touching the admin form.

All creation/editing of the test order uses the actual WooCommerce admin UI:
Add order → product picker by variation SKU → quantities → edit shipping → save
pending → add private request note → change status → reopen/save → cancel.
WP-CLI is used only to read/assert the resulting order and stock, not to fabricate
the order transitions. The random project's containers/copied volumes are removed
afterward; the source store and backup are preserved.

## Observed result

- Project: `khardal-rehearsal-ff431c8b5bfb` (disposable copy, now removed).
- Native order ID: **91 in that copy only**. This is not an ID created in the
  main store at port 8000.
- Recorded request reference: `S20B-b9749360-06da-43a5-9452-5d9a23acf7a6`.
- `KH-DEMO-001-030`, 30 ml × 2: COP 130,000.
- `KH-DEMO-001-050`, 50 ml × 1: COP 110,000.
- Subtotal COP 240,000; **fictitious rehearsal shipping** COP 15,000; total COP 255,000.
- Private note records demonstration/quote acceptance for the exercise and payment
  **not received**. No customer data, real shipping tariff or tax policy was asserted.

| Operation | Native state | 30 ml stock | 50 ml stock | Paid |
| --- | --- | ---: | ---: | --- |
| Before order | — | 5 | 6 | — |
| Create/save pending | pending | 5 | 6 | false |
| Assign awaiting payment | on-hold | 3 | 5 | false |
| Reopen same recorded ID and save again | on-hold | 3 | 5 | false |
| Cancel/release | cancelled | 5 | 6 | false |

Exactly one permanent order record was added in the copy. Reusing its recorded
reference/ID did not create a duplicate or reduce stock twice. This verifies the
manual ledger/reopen procedure, not an automatic cross-channel deduplication service.

The report and cancelled-order capture are reproducible under ignored
`test-results/order-rehearsal/`. The source store's fixture parity/admin/API checks
were rerun after the isolated project cleanup. No business WhatsApp message or
payment was sent. S20b and parent S20 now have actual local-backend evidence.

## Restore evidence and production boundary

This also completes an actual **local isolated restore drill** for the verified
SQL/files/environment backup: the restored site authenticated, displayed the
catalog, and processed native stock transitions. The earlier S24 note that only
backup creation was verified describes that earlier checkpoint; this rehearsal
adds the restore evidence. Hosted storage, production permissions, HTTPS, final
content and actual production rollback still require S35.
