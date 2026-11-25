# Flash-UI Portfolio Import Instructions

Target repository: `https://github.com/JFeimster/flash-ui-portfolio` (`https://flash-ui-portfolio.vercel.app/`).

## 1. Generate the Portable Export
```bash
npm run export:portfolio
```
This creates a verified, nested-URL-safe folder at:
`dist/portfolio/sites/moonshine-broker-commission-calculator/`

## 2. Copy Into Flash-UI Portfolio
Copy the exported folder into the portfolio repository's `sites/` directory:
```bash
cp -R dist/portfolio/sites/moonshine-broker-commission-calculator <flash-ui-portfolio>/sites/
```

## 3. Register Grouped Entry in `data/site-registry.json`
Do **not** overwrite existing portfolio entries. Append the contents of:
`dist/portfolio/sites/moonshine-broker-commission-calculator/proposed-site-registry-entry.json`
into the portfolio repository's `data/site-registry.json`.

- Grouped variants: `[1, 2, 3, 4]`
- Selected production default: `variant-1` (Punk Utility Brutalism)
- All shared paths are strictly relative (`../shared/`) so every variant functions at any nested URL path.
