# Milestone 2 — Design system

## S06: foundations

- `src/styles/global.css` compiles Tailwind 4 and exposes all 47 YAML color tokens
  from `ui-design/DESIGN.md` as semantic utilities, with its spacing tokens.
- The YAML palette takes precedence over the conflicting prose palette. Default
  Tailwind color, radius and shadow scales are removed; components use square
  corners and tonal layering.
- Metrophobic 400 is the heading face; Inter variable is the body face. Only Latin
  normal WOFF2 files are served locally, with preloads and `font-display: swap`.
  Font licenses are distributed at `/licenses/fonts.txt`. Metrophobic has no 500
  face: headings use real 400 rather than requesting a nonexistent weight.
- Body text is 16px with 1.6 line height; supporting text and labels are at least
  14px. Responsive heading sizes retain the specified tracking. Focus outlines
  and reduced-motion handling are global defaults.
- `.page-container` has 20px phone gutters, 32px tablet/desktop gutters and an
  80rem maximum width. Components must accommodate 320px viewports and long text.
- Open **`/dev/design`** with `pnpm dev` for the development preview. Production
  requests return 404. Its samples are explicitly labeled development content.

Run `pnpm verify`, then `pnpm test:ui` (install Chromium first with
`pnpm exec playwright install chromium`; Linux CI uses `--with-deps`). Browser
tests use their own port 4330 and do not stop an existing development server.
CI runs the browser suite after the production checks.

S06 checkpoint: full verification passed; Chromium checked 320/390/768/1440px,
actual font loading, background/body tokens and horizontal overflow. Production
runtime tests verify the preview route returns 404. Preloading reduces font swap
exposure; field Core Web Vitals and real-device testing still belong to S32/S33.
The approved design direction is implemented; final visual feedback can be applied
through the preview without treating this checkpoint as a new business approval.

## S07: action and form atoms

`components/atoms/` provides Button, Link, Icon, Badge, Chip, TextField, Choice
and Status. Buttons default to `type="button"`; loading disables activation and
exposes `aria-busy`. Links remain native links. Icon-only actions require an
accessible name on their enclosing control; icons default to decorative.
TextField requires a unique ID/label and connects hint/error descriptions.
Choice keeps native checkbox/radio keyboard behavior with square styling.
Chips are independent toggle buttons and emit bubbling `chip-change` events;
future filters can consume them. Status uses native status/alert live regions.

Controls use minimum 44px interaction heights. Never remove focus outlines or
rely solely on color to communicate invalid fields: include an error message.
No form sends data from the preview; its demonstration actions update a status.

S07 checkpoint: `pnpm verify` and both browser tests passed. Keyboard activation,
chip toggles, native radio arrow navigation, checkbox selection, labels/error
descriptions, loading/disabled semantics and touch heights were checked in
Chromium. Six normal-text token pairs passed 4.5:1 contrast (primary CTA 6.73:1,
body 16.27:1, secondary 8.88:1, error 6.16:1, accent badge 13.27:1, error badge
7.24:1). Screen-reader/real-device review remains in S32.

## S08: product molecules

Price, ProductCard, Breadcrumbs, QuantityControl and VariantSelector live under
`components/molecules/`. The preview includes long names, missing images/notes,
zero-price display, different presentations and sold-out states. The displayed
prices and product names are explicitly fictional development content.

Prices accept **whole COP pesos** as non-negative safe integers (`amountCop`);
`formatCop` applies `es-CO` formatting with an explicit COP currency code. Future
adapters must convert provider monetary units explicitly. These UI props are not
the S10 commerce contract or authoritative stock/price validation.

VariantSelector uses native radio groups, disables unavailable presentations,
announces the selected price and emits bubbling `variant-change` with variant ID,
COP amount and availability. QuantityControl clamps committed input to integer
bounds, disables limit buttons and emits `quantity-change`. Empty/nonfinite input
returns to the minimum. Both controls remain usable as native inputs without JS;
client events are integration points for S14/S16 rather than an implemented cart.

S08 checkpoint: full verification passed; all 3 browser tests passed. Browser
coverage includes price changes (30/60ml), unavailable/all-unavailable choices,
quantity limits, empty/fractional input, breadcrumb current-page semantics and
responsive long-title cards without horizontal overflow at four viewport widths.

## S09: shared layout, navigation and disclosures

Header and Footer live in `components/organisms/`; StoreLayout composes the shared
document, skip link, sticky navigation, focusable main region and footer.
Navigation links are data-driven. The preview demonstrates Tienda, Más vendidos,
Nosotros and Contacto against existing preview anchors. The temporary homepage
only links to implemented destinations (Inicio and the primary WhatsApp). S11–S15
will supply real shopping, company and policy URLs as those pages are built.
Search, account, newsletter and real cart controls are not fabricated here.

Drawer accepts a unique `id`, title, optional left/right side and a trigger slot
(slot content must not contain another interactive control). Native `dialog`
provides modal semantics/background inertness; the component adds explicit Tab
wrapping, initial close-button focus, Escape/native cancel, backdrop and link
dismissal, expanded state and focus return. Background scroll is locked only
while a dialog is open; inner content can scroll. Crossing the desktop breakpoint
closes an open mobile menu and focuses the wordmark when the trigger becomes
hidden. Keep one Header per page to preserve its unique menu ID.

Accordion uses native `details`/`summary` so it works without client JavaScript.
Global reduced-motion styles apply; drawers do not depend on animation or blur.
Footer accepts approved secondary links and exposes the confirmed primary number.
Policy text in the preview is explicitly pending approval, not published terms.

S09 checkpoint: full verification and all 7 Chromium tests passed, with zero type
diagnostics. Checks include skip navigation, focus wrapping/return, Escape,
backdrop/close/link dismissal, scroll-lock release, breakpoint changes, desktop
navigation, native accordion keyboard use and primary WhatsApp destination.
Automated axe WCAG A/AA scans reported no violations in the mobile preview and
open menu. Mobile/desktop screenshots were visually reviewed; the preview product
grid now stays single-column below 640px so long names are readable. This is a
design-system preview, not the finished home/PLP/PDP. Real screen-reader, Safari,
Android/iOS device and full transactional testing remain in S32.
