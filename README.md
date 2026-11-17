# QR Grove

Plant a tiny 3D garden that turns into a scannable QR code when you look at it from above.

Every dark module of the code becomes a tree, pine, bush, rock or hedge with a dark top. Light modules stay open ground with the odd flower, leaf or snow drift. The finder patterns become hedges around a pond. Pick a season, replant for a new layout, then switch to the top-down view and scan.

## Stack

Svelte 5, Vite, TypeScript, three.js, qrcode-generator.

```sh
pnpm install
pnpm dev
pnpm test   # garden rules: dark tops on dark modules, light decor on light ones
pnpm check
```

## Layout

- `src/lib/qr.ts`: QR matrix (UTF-8, error correction Q) and finder-pattern lookup
- `src/lib/seasons.ts`: per-season palettes
- `src/lib/garden.ts`: turns a matrix into a list of boxes (pure, seeded)
- `src/lib/scene.ts`: three.js renderer, iso ↔ top-down camera, PNG export
- `src/lib/share.ts`: state in the URL query string
