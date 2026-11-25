# Deployment Guide (Production, Review & Portfolio)

The calculator requires **zero Node.js runtime or backend** once built. All artifacts deploy cleanly as static sites on Vercel, GitHub Pages, Netlify, or Cloudflare Pages.

## 1. Production Deployment (`npm run build`)
- Promotes `sites/variant-1/` (Punk Utility Brutalism) to the repository root (`index.html`, `style.css`, `script.js`), strips `noindex`, and bundles static assets via Vite into `dist/`.
- Excludes `sites/`, alternate variants, review gallery, and internal reference assets from the production bundle.
- Production root operates with zero dependency on `sites/`.

## 2. Review Deployment (`npm run build:review`)
- Outputs `dist/review/` containing:
  - Root production calculator (`index.html`)
  - Design Variations Gallery (`sites/index.html`) with `noindex, nofollow`
  - All four live standalone variants (`sites/variant-1/` through `sites/variant-4/`)
  - Shared core (`shared/`) and `robots.txt` disallowing `/sites/`.

## 3. Variant Promotion Workflow
To switch the production default to another preserved design without losing any variants:
```bash
npm run promote -- variant-3
npm test
npm run build
```
To restore Punk Utility Brutalism:
```bash
npm run promote -- variant-1
```

## 4. Portfolio Export (`npm run export:portfolio`)
- Outputs a self-contained, nested-URL-safe package to `dist/portfolio/sites/moonshine-broker-commission-calculator/`.
- Forces `DEMONSTRATION MODE` and rewrites relative imports (`../../shared/` → `../shared/`).
- Includes `proposed-site-registry-entry.json` for Flash-UI Portfolio integration.
