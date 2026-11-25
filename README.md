# Moonshine Capital Broker Commission Calculator

**Multi-Variant Production & Flash-UI Portfolio Edition (`v1.0.0`)**

A static-deployable, deterministic Broker Commission Calculator built for Moonshine Capital partner recruitment, commission modeling, and business planning. Four genuinely distinct visual design variations share one authoritative calculation engine, compensation configuration, validation layer, and reporting engine.

## Selected Production Theme
- **Variant 1 — Punk Utility Brutalism** (`sites/variant-1/`, theme ID `punk-utility-brutalism`).
- Root production files (`index.html`, `style.css`, `script.js`) are generated from the authoritative Variant 1 source via `npm run promote -- variant-1`. No theme-selection gallery or alternate variants are exposed on the production root.

## All Four Design Variations
1. **Variant 1 — Punk Utility Brutalism** (`sites/variant-1/`) — *Selected production default.* High-contrast `#080808` canvas, electric green `#00F23D`, Barlow Condensed display type, dotted-grid hero, hard-edged utility workspace, white tier header band.
2. **Variant 2 — Broker's Manifesto** (`sites/variant-2/`) — *Preserved portfolio design.* Warm paper `#F2EBDD` editorial field manual, halftone sculpture & blueprint collage plates, contrasting ink-black earnings ledger, live flow schematic, broadsheet ledger table.
3. **Variant 3 — Lime Precision Fintech** (`sites/variant-3/`) — *Preserved portfolio design.* Dark graphite split hero with embedded bright white calculator transitioning into a `#F6F7F5` financial analytics dashboard with pale lime wash KPIs and accessible SVG donut charts.
4. **Variant 4 — Pastel Intelligence** (`sites/variant-4/`) — *Preserved portfolio design.* Airy `#FCFBFF` planning workspace with custom matte ceramic sculpture illustration, lavender/mint/butter spotlight cards, educational callouts, and deep-purple accessible charts.

Design review gallery: `sites/index.html` (marked `noindex, nofollow`, excluded from production builds).

## File Architecture
```
├── index.html / style.css / script.js   # Generated production root (from sites/variant-1/)
├── variants.json / project.json         # Variant & project manifests
├── shared/
│   ├── config/commission-config.js      # Single source of truth for rates, tiers, rules
│   ├── config/partner-links.js          # Centralized CTA URLs & optional CRM endpoint
│   └── lib/
│       ├── calculator-engine.js         # Deterministic commission & 36-mo projection engine
│       ├── state.js                     # Standardized state & non-PII URL serializer
│       ├── reporting.js                 # CSV, printable HTML, brochure & JSON exports
│       ├── charts.js                    # Zero-dependency accessible SVG chart engine
│       ├── controller.js                # Shared semantic DOM binder
│       └── faq-data.js                  # Disclosures, methodology & FAQ copy
├── sites/
│   ├── index.html                       # Review & portfolio comparison gallery
│   ├── variant-1/ ... variant-4/        # Four complete, independently styled variants
├── scripts/
│   ├── promote-variant.mjs              # Generates root production files from a variant
│   ├── build-review.mjs                 # Packages dist/review/ with all 4 variants + gallery
│   └── export-portfolio.mjs             # Packages nested Flash-UI Portfolio export
├── tests/                               # Automated engine & cross-variant parity tests
├── docs/                                # Detailed architecture & deployment docs
├── references/                          # Visual reference archive directory
└── previews/                            # Desktop & mobile capture directory
```

## Commands
```bash
npm run dev                     # Local dev server on port 3000
npm test                        # Run automated calculation & cross-variant parity tests
npm run promote -- variant-1    # Promote any variant (variant-1..4) to production root
npm run build                   # Promote Variant 1 and build static production dist/
npm run build:review            # Build dist/review/ containing root + all 4 variants + gallery
npm run export:portfolio        # Export nested Flash-UI Portfolio package to dist/portfolio/
npm run lint                    # TypeScript check
```

## Updating Compensation Terms (No Theme Edits Required)
All four variants and the production root read directly from `shared/config/commission-config.js`.
1. Replace illustrative rates/fees in `COMMISSION_CONFIG.products` with approved Moonshine Capital Partner Agreement terms.
2. Update `tiers`, `bonusRules`, and `recurringRules` if official schedules define them.
3. Populate `approvedSourceReference` and switch `verificationStatus` from `"DEMONSTRATION MODE"` to `"VERIFIED PROGRAM MODE"`.
4. Run `npm test` and `npm run build`.

## Known Limitations & Optional Integrations
- **Unverified Program Data**: Operates in `DEMONSTRATION MODE` until an approved Moonshine Capital compensation schedule is supplied.
- **Lead Capture / Email Endpoint**: `PARTNER_LINKS.leadCaptureEndpoint` in `shared/config/partner-links.js` is `null` by default. Email submission is truthfully disabled until a live HTTPS endpoint is configured; local report download remains fully active.
- **Partner Brochure PDF**: Set `PARTNER_LINKS.partnerBrochureUrl` to a hosted PDF URL when available (defaults to a generated local printable partner brochure).

## Documentation
- `docs/DESIGN-SYSTEM.md`
- `docs/COMMISSION-MODEL.md`
- `docs/PORTFOLIO-IMPORT.md`
- `docs/DEPLOYMENT.md`
