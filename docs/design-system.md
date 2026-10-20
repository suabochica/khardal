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
