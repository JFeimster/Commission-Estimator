# Recommended Additional Pages & Files

Actionable roadmap of additional pages, configurations, shared modules, automation scripts, tests, and governance documentation to bring the **Moonshine Capital Broker Commission Calculator** to full production, compliance, CI/CD, and Flash-UI Portfolio readiness.

---

## 1. Additional HTML Pages (`.html`)

- [ ] **`404.html`** — Branded error page matching Variant 1 (Punk Utility Brutalism) with a direct link back to the root calculator for static hosts (GitHub Pages / Vercel).
- [ ] **`disclosures.html`** — Dedicated full-text Earnings Disclosure, Methodology & Legal Terms page linked from the production footer and exported reports.
- [ ] **`brochure.html`** — Standalone, print-optimized (`@media print`) Partner Program Brochure page that mirrors the active `COMMISSION_CONFIG` without requiring a pre-built static PDF.
- [ ] **`embed.html`** — Stripped-down, header/footer-free iframe-embeddable calculator view (importing `./shared/`) for embedding inside Moonshine Capital’s main marketing site or partner blog posts.
- [ ] **`sites/compare.html`** — Dedicated 2-up / 4-up synchronized viewport comparison page (desktop + 375px mobile frames) for design review stakeholders.

---

## 2. SEO, Static Hosting & Deployment Configs (`.json`, `.yaml`, `.xml`, `.txt`, `.svg`)

- [ ] **`vercel.json`** — Production deployment headers (`Cache-Control`, `X-Content-Type-Options`, `Referrer-Policy`, CSP), clean URLs, and rewrite rules ensuring `/sites/*` is blocked or excluded in production.
- [ ] **`robots.txt`** — Root crawler policy permitting production indexing while explicitly blocking review paths if ever co-hosted.
- [ ] **`sitemap.xml`** — Search engine sitemap listing the production root, `disclosures.html`, and `brochure.html`.
- [ ] **`site.webmanifest`** — Web App Manifest defining app name, theme color (`#080808`), background color (`#00F23D`), and icons for mobile bookmarking.
- [ ] **`public/og-card.svg` / `public/og-card.png`** — Dedicated `1200×630` Open Graph / Twitter social sharing preview image referenced by `og:image` in `index.html`.
- [ ] **`.github/workflows/ci.yml`** — GitHub Actions workflow running `npm test`, `npm run lint`, `npm run build`, and `npm run export:portfolio` on every PR and push.
- [ ] **`.github/workflows/deploy-pages.yml`** — Automated static deployment workflow publishing `dist/` (production) or `dist/review/` (preview branch) to GitHub Pages.
- [ ] **`schemas/commission-config.schema.json`** — JSON Schema validating `commission-config.js` / verified compensation schedules before switching from `DEMONSTRATION MODE` to `VERIFIED PROGRAM MODE`.
- [ ] **`schemas/theme.schema.json`** — JSON Schema validating every `sites/variant-*/theme.json` token contract.
- [ ] **`schemas/variants.schema.json`** — JSON Schema enforcing single `defaultVariant` and required metadata fields in `variants.json`.

---

## 3. Shared Financial & Integration Modules (`.js`, `.ts`, `.css`)

- [ ] **`shared/config/verified-schedule.example.json`** — Annotated template showing Moonshine Capital leadership the exact fields needed to supply official approved rates, tier bonuses, clawback windows, and fixed-fee rules.
- [ ] **`shared/lib/lead-client.js`** — Isolated optional webhook/CRM submission module (rate-limited, input-validated, graceful fallback to local report download when `PARTNER_LINKS.leadCaptureEndpoint` is `null`).
- [ ] **`shared/lib/analytics-hooks.js`** — Privacy-first, opt-in event hook interface (`calculator_changed`, `scenario_switched`, `report_exported`, `partner_cta_clicked`) with zero hardcoded third-party trackers.
- [ ] **`shared/styles/print.css`** — Shared `@media print` stylesheet ensuring crisp multi-page PDF output across all four variants and exported reports.
- [ ] **`shared/styles/a11y.css`** — Shared accessibility utilities (`.sr-only`, reduced-motion resets, high-contrast forced-colors overrides) imported by all variants.
- [ ] **`src/types/config.d.ts`** — Full TypeScript ambient module declarations for all `/shared/lib/*.js` exports so IDEs get complete autocomplete and strict type checking.

---

## 4. Automation, QA & Screenshot Scripts (`.mjs`)

- [ ] **`scripts/capture-previews.mjs`** — Playwright/Puppeteer script that spins up a local static server and captures real `1440×900` desktop and `390×844` mobile screenshots into `previews/variant-{1..4}-{desktop,mobile}.png`.
- [ ] **`scripts/validate-schemas.mjs`** — CLI check validating `variants.json`, `project.json`, and all four `theme.json` files against `schemas/*.schema.json`.
- [ ] **`scripts/audit-contrast.mjs`** — Automated WCAG AA/AAA contrast checker scanning color pairs across all four `theme.json` files.
- [ ] **`scripts/check-links.mjs`** — Link and asset integrity verifier scanning `index.html`, `sites/index.html`, all variants, and `dist/portfolio/` for broken paths or missing images.
- [ ] **`scripts/build-production.mjs`** — Dedicated static production packager that copies only the promoted root + required `shared/` files into `dist/production/` with zero dev/review artifacts.

---

## 5. Additional Automated Tests (`.test.mjs`)

- [ ] **`tests/browser-e2e.test.mjs`** — Headless browser end-to-end test verifying live DOM updates, slider-to-number synchronization, mobile 320px zero-overflow layout, and identical rendered dollar figures across root and all 4 variants.
- [ ] **`tests/portfolio-export.test.mjs`** — Verifies `npm run export:portfolio` produces a valid `proposed-site-registry-entry.json`, forces `DEMONSTRATION MODE`, and resolves every rewritten `../shared/` import.
- [ ] **`tests/accessibility.test.mjs`** — Automated DOM/axe-core check verifying form labels, ARIA attributes, `<title>`/`<desc>` inside SVG charts, and keyboard focus order across all 4 variants.

---

## 6. Governance, Compliance & Project Documentation (`.md`)

- [ ] **`CHANGELOG.md`** — Semantic version history tracking compensation config changes, variant updates, and promotion events.
- [ ] **`SECURITY.md`** — Security policy covering static-site threat model, non-PII URL guarantees, and optional webhook endpoint requirements.
- [ ] **`docs/COMPLIANCE-CHECKLIST.md`** — Pre-launch sign-off checklist for legal/compliance review before switching `verificationStatus` to `VERIFIED PROGRAM MODE`.
- [ ] **`docs/CRM-INTEGRATION.md`** — Payload contract, CORS headers, and error handling spec for wiring `PARTNER_LINKS.leadCaptureEndpoint` to HubSpot, Salesforce, or Zapier.
- [ ] **`docs/QA-MATRIX.md`** — Manual browser/device sign-off matrix (iOS Safari, Android Chrome, Desktop Chrome/Firefox/Safari, 320px–1440px, print-to-PDF, keyboard-only navigation).
