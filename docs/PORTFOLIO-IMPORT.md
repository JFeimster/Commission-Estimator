# Flash-UI Portfolio Import Instructions

Target repository: `https://github.com/JFeimster/flash-ui-portfolio` (`https://flash-ui-portfolio.vercel.app/`).

## 1. Generate the Portable Export
```bash
npm run export:portfolio
```
This creates a verified, nested-URL-safe folder at:
`dist/portfolio/sites/commission-estimator/`

## 2. Copy Into Flash-UI Portfolio
Copy the exported folder into the portfolio repository's `sites/` directory:
```bash
cp -R dist/portfolio/sites/commission-estimator <flash-ui-portfolio>/sites/
```

## 3. Register Grouped Entry in `data/site-registry.json`
Do **not** overwrite existing portfolio entries. Upsert exactly one entry by slug from:
`dist/portfolio/sites/commission-estimator/proposed-site-registry-entry.json`
into the portfolio repository's `data/site-registry.json`.

The batch also adds showcase copy to `data/asset-showcase.json` and four variant contracts to `data/variant-route-contracts.json`. The actual catalog loader (`assets/js/app.js`) consumes generated route resolution and showcase metadata.

From the portfolio workspace, regenerate with the established process and validate:

```powershell
./scripts/generate-route-resolution.ps1
node --test tests/*.test.mjs
```

This produces one hub and four variant routes. Preserve unrelated entries. No catalog redesign, taxonomy changes, Catalog v2 or generalized import automation are part of this batch. The prepared portfolio branch is `codex/batch-01-commission-estimator`; pushing, merging and deploying require release authorization.

- Grouped variants: `[1, 2, 3, 4]`
- Selected production default: `variant-1` (Punk Utility Brutalism)
- All shared paths are strictly relative (`../shared/`) so every variant functions at any nested URL path.
