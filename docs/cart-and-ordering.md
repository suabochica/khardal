# Cart and WhatsApp ordering

## S16 — persistent state

The browser owns a version-1 cart under `khardal:cart:v1:{provider}`. Mock,
WooCommerce and Shopify carts are isolated. Before supporting multiple stores
of the same provider on one origin, extend this namespace with a public store ID.
Only product/variant identity, display name/slug/presentation/SKU, integer COP
display price and quantity are stored. These prices are **not authoritative**.

Repeated additions merge by variant ID; quantity is an integer 1–99 and at most
50 distinct lines are accepted. Overflow is rejected, never rounded. Updates and
removal are explicit; snapshots are isolated copies. Invalid JSON, versions,
provider mismatch, duplicate identities or malformed stored lines yield an empty
recoverable state with an explanation. A valid next edit replaces the bad value.
Blocked/full storage retains an in-memory cart and explains reload loss.
Storage events synchronize tabs; simultaneous tab edits use last-write-wins.

Product “Agregar al carrito” now saves the selection and reports success or a
recoverable error. Native no-JavaScript submission remains a selection review,
explicitly not a saved cart. Inventory is not reserved. Cart surfaces follow in S17.

Checkpoint: `pnpm verify` passed (8 domain/config-independent commerce/cart tests,
4 config tests, 2 compiled runtime tests, zero diagnostics); all 21 Chromium
tests passed. Tested repeat additions, invalid quantities, overflow, corrupt data,
version/provider isolation, blocked storage, removal and real browser reload.
