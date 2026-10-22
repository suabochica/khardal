# S32a — Available responsive/accessibility review

Reviewed 2026-10-22 using the compiled Node storefront, real local WooCommerce
and Chromium. Command: `pnpm test:woocommerce:accessibility` (requires build/S21–S22).

## Recorded coverage

- Home, catalog, product detail and populated cart at **320, 390, 768 and 1440px**.
- 16 page scans plus open mobile cart and filter dialogs: **18 WCAG A/AA automated
  scans**, tags wcag2a/wcag2aa/wcag21aa, with zero violations.
- One visible h1 and no horizontal overflow at each tested route/width.
- Keyboard skip-link → main focus, drawer initial focus, Shift+Tab/Tab wrapping,
  Escape dismissal and return to cart/filter opener.
- A real native product is added before cart checks; results are not screenshots
  of an empty mock cart. No order or outbound message is created.

## Visual comparison

Six full-page captures were generated and opened: home/catalog/detail at 390 and
1440px. They are reproducible under ignored `test-results/launch-review/`.
Compared with the six home/PLP/PDP references: mobile stacking, split desktop hero
and detail columns, square tonal surfaces, readable copy, restrained navigation,
native variant states, gallery and footer remain consistent with the approved
design adjustments. Sample artwork is labeled and not presented as final photography.

Screenshot review caught two adjacent brand-section text links running together
on desktop. A wrapping flex group with a real gap now separates the actions; the
browser check asserts distinct rendered target spacing. Updated scans/captures
passed after the fix. `pnpm verify` also passed with zero diagnostics.

## S32b outstanding

This pass is Chromium viewport emulation and scripted real DOM keyboard focus,
plus visual review. Physical iOS Safari/Android Chrome and an actual screen-reader
session have not been recorded. Run those against the approved content/production
candidate and document device/OS/browser/assistive-technology versions, orientation,
zoom, dialog/variant/cart announcements and any fixes. Parent S32 remains open.
