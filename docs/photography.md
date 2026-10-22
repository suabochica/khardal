# S29a — Responsive image delivery

The three local PNG references were reopened for review on 2026-10-22. They show
AURÉLIA / BOIS DORÉ, AURÉLIA SAUVAGE and AETERNA / AMBRE LUMIERE labels. They are
not established as final Khardal product photography; S29b still requires originals,
confirmed product mapping and approved Spanish alt text. The current sample SVGs
remain explicitly labeled development illustrations.

## Technical pipeline

- Catalog raster images from the configured Woo media upload path use Astro's
  image service and explicitly pinned `sharp@0.35.5` in the production artifact.
- WebP and width-based `srcset`/`sizes` support phones/tablets/desktop without
  upscaling past original dimensions. Raster intrinsic size is inferred when Woo
  omits it and retained in a bounded 64-URL, one-hour dimensions cache.
- Product cards/thumbnails are lazy; the selected PDP image is eager/high-priority.
  Gallery selection updates optimized source, srcset, dimensions, caption and alt.
  Native full-image links remain available without JavaScript.
- CSS aspect containers reserve layout; SVGs keep their small vector originals.
  If an image is not authorized/available for processing it retains the original
  public URL rather than blocking the product page.

`WOO_MEDIA_ORIGIN` is a **build-process** public media base (default local
`http://127.0.0.1:8000`). Only its exact protocol/host/port and
`/wp-content/uploads/**` path are authorized. For a backend under a WordPress
subdirectory, include that base path. Rebuild for a new media origin; never put
credentials in it. Other CDN origins require explicit configuration/review.

Checkpoint: `pnpm verify` passed with zero diagnostics; the real compiled Woo
browser test fetched `/_image` with HTTP 200 and `image/webp`, checked real gallery
URLs and responsive overflow. All 29 UI tests passed, including gallery switching,
font/layout checks and accessibility scans. Sharp was added after the compiled
image test exposed a missing production dependency. Publication approval and final
photo selection are not implied by successful image transformation.
