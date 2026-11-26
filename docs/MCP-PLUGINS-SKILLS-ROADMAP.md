# MCP Servers, Plugins, and Skills Roadmap

**Project:** Moonshine Capital Broker Commission Calculator (`Commission-Estimator`)  
**Last Updated:** 2026-11-25  
**Structure:** Each category is split into **Part A: Custom to Create** (purpose-built for this brokerage & multi-partner commission engine) and **Part B: Existing to Use** (production-ready tools and integrations).

---

## 1. MCP (Model Context Protocol Servers)

### Part A: Custom MCP Servers to Create

1. **`commission-engine-mcp`** — *Core Calculation & Audit Server*
   - Exposes `/shared/lib/calculator-engine.js` as deterministic, callable MCP tools:
     - `simulate_commission`
     - `compare_pay_plans`
     - `calculate_override_spread`
     - `project_36_months`
     - `reverse_target_deals`
   - Enables AI agents, recruiter bots, or internal dashboards to execute verified, zero-hallucination commission math directly from the single source of truth rather than approximating formulas.

2. **`pay-plan-registry-mcp`** — *Funding Partner Pay-Plan Manager*
   - Reads, validates, versions, and diffs modular pay-plan profiles under `/shared/config/pay-plans/` (`direct-rate`, `agency-override`, `iso-volume-split`, `custom-partner`, and future funding partners).
   - Suggested tools: `parse_partner_pay_plan_pdf`, `validate_ladder_schema`, `diff_pay_plan_versions`, `publish_pay_plan_version`.
   - Allows onboarding new funding partner compensation charts in minutes without editing presentation code.

3. **`broker-crm-pipeline-mcp`** — *Lead & Earnings-Plan Sync*
   - Connects the calculator's "Send Me My Earnings Plan" submission and serialized scenario parameters (`plan`, `opmode`, `deals`, `size`, `ag`, `iso`, `cp`) to your CRM (GoHighLevel, HubSpot, Pipedrive, or Airtable).
   - Suggested tools: `upsert_broker_prospect`, `log_modeled_scenario`, `schedule_recruiter_callback`, `fetch_partner_conversion_metrics`.

4. **`compliance-disclosure-mcp`** — *Earnings Claim & Legal Guardrail Server*
   - Audits generated marketing copy, landing pages, PDFs, and partner brochures against FTC earnings-claim guardrails.
   - Automatically flags unverified rate promises, missing hypothetical disclaimers ("no income is earned without acquiring funded customers"), or accidental third-party trademark leaks.

5. **`variant-release-mcp`** — *Multi-Variant Build & Parity Controller*
   - Wraps repository scripts (`promote-variant`, `build:review`, `export:portfolio`, `npm test`) into MCP tools that check cross-variant calculation parity, inspect live Vercel preview URLs, and detect CSS/DOM regressions across all 4 variants.

### Part B: Existing MCP Servers to Use

1. **GitHub MCP (`@modelcontextprotocol/server-github`)**
   - Automate PR creation, issue tracking for new funding partner pay plans, commit reviews, and release tags on `JFeimster/Commission-Estimator`.
2. **Vercel MCP (Official Vercel MCP Server)**
   - Inspect deployment logs, diagnose `npm install`/build errors automatically, manage environment variables, and verify preview URLs directly from your AI workspace.
3. **Playwright MCP (`@playwright/mcp`)**
   - Visually test all 4 variants, toggle Solo vs. Agency Mode, verify donut and area chart updates, test mobile viewports, and capture marketing screenshots automatically.
4. **Google Workspace / Drive / Sheets MCP**
   - Pull updated lender commission rate sheets from Google Sheets or Google Drive folders and sync modeled partner earnings plans to Docs or Gmail.
5. **HubSpot / Salesforce / Notion / Airtable MCP**
   - Store funding partner agreements, commission schedules, recruiter playbooks, and broker onboarding pipelines.
6. **Stripe / Billing or Accounting MCP (Optional)**
   - Useful if you later track broker SaaS/credit subscription referrals or reconcile actual vs. projected commission payouts.
7. **Sentry or PostHog MCP**
   - Monitor live frontend runtime errors and conversion funnel analytics (e.g., which pay plan, scenario, or deal size preset prospects interact with most).

---

## 2. Plugins (Build, App, CMS, & Workflow Integrations)

### Part A: Custom Plugins to Create

1. **Vite Pay-Plan Schema & Validation Plugin (`vite-plugin-pay-plans`)**
   - Validates all `/shared/config/pay-plans/*.js` files at build time: verifies non-overlapping brackets, valid tier progression, generic labeling (zero third-party brand leaks), and auto-generates synced TypeScript definitions.

2. **White-Label Partner Embed Widget Plugin (`commission-estimator-embed.js`)**
   - Lightweight `<script>` / Web Component wrapper so agency leaders or partner websites can embed the calculator inside WordPress, Webflow, GoHighLevel, or Kajabi with custom brand colors, pre-selected pay plan (`data-plan="agency-override"`), and recruiter attribution (`data-ref="agent-123"`).

3. **GoHighLevel / HubSpot Scenario Webhook Plugin**
   - Captures serialized calculator state (`plan`, `opmode`, monthly volume, 36-month projection, active tier) upon lead form submit and automatically tags prospects by production profile (e.g., `Tier: High-Volume Agency`, `Goal: $25k+/mo`).

4. **Branded PDF Proposal Generator Plugin**
   - Upgrades the browser print view into a one-click, downloadable multi-page branded PDF ("Custom Partner Earnings & Agency Override Plan") with cover summary, charts, 5-level downline schedule, and compliance disclosures.

5. **Partner Rate-Sheet Importer Plugin**
   - Admin-only UI plugin that ingests a funding partner's PDF or CSV commission chart and outputs a clean, generically labeled JSON/JS pay-plan profile ready for `/shared/config/pay-plans/`.

### Part B: Existing Plugins to Use

#### Vite & Build Optimization
- **`vite-plugin-pwa`** — Turn the calculator into an installable, offline-capable mobile web app for live event demos without Wi-Fi.
- **`vite-plugin-sitemap` & `vite-plugin-compression`** — Auto-generate `sitemap.xml` and pre-compress assets (Brotli/Gzip) for fast Vercel edge delivery.
- **`rollup-plugin-visualizer`** — Inspect bundle composition to keep the calculator fast and lightweight.

#### Analytics, Attribution & Lead Capture
- **`@vercel/analytics` & `@vercel/speed-insights`** — Zero-config Core Web Vitals and traffic tracking on Vercel.
- **Plausible or PostHog JS Plugin** — Privacy-first event tracking (clicks on `Agency Mode`, `Download CSV`, `Compare All 4 Plans`, and `Become a Partner`).
- **Calendly / Cal.com Embed Plugin** — Inline recruiter booking inside the "Speak with Recruiter" CTA without leaving the calculator.

#### Export & Document Generation
- **`jspdf` + `jspdf-autotable` (or `pdf-lib`)** — True downloadable `.pdf` files directly from the browser without relying on the OS print dialog.
- **`xlsx` (SheetJS)** — Export multi-tab Excel workbooks (`Summary`, `Product Mix`, `Override Spreads`, `5-Level Schedule`, `36-Month Cashflow`) alongside CSV.

#### Code Quality & Accessibility
- **ESLint + Biome / Prettier** — Enforce consistent formatting and catch syntax or accessibility issues early.
- **Axe-core (`@axe-core/playwright`)** — Automated WCAG color contrast and keyboard accessibility audits across all 4 color themes.

---

## 3. Skills (Reusable AI Agent Instruction Modules — `SKILL.md`)

### Part A: Custom Skills to Create

1. **`pay-plan-onboarding` Skill**
   - Step-by-step SOP for converting any new funding partner's PDF or spreadsheet commission chart into a normalized `/shared/config/pay-plans/<partner>.js` profile, ensuring generic labeling, zero third-party trademark leakage, engine math parity, and mandatory unit test coverage.

2. **`commission-math-auditor` Skill**
   - Enforces strict financial invariants whenever `/shared/lib/calculator-engine.js` changes:
     - Zero automatic rate inflation across partner tiers
     - Strict 100% product allocation validation
     - QCB fallback and intermediate manager roll-up precedence
     - `+1 month` cash receipt lag vs. earned accrual separation
     - Hard generation caps (e.g., 2-Gen Leadership Override capped at Gen 2)

3. **`multi-variant-theme-sync` Skill**
   - Playbook for adding any new UI control or section across all 4 variants (`variant-1` through `variant-4`) using theme-adaptive `--pp-*` custom properties, verifying light/dark WCAG contrast ratios, promoting `variant-1` to production root, and running `build:review` + `export:portfolio`.

4. **`broker-compliance-copywriter` Skill**
   - Guidelines for writing landing-page copy, FAQs, partner brochures, and recruiter email follow-ups for commercial funding broker recruitment without triggering FTC income-claim violations (hypothetical framing, truthful methodology disclosures, clear qualification notes).

5. **`vercel-static-release-preflight` Skill**
   - Automated pre-deployment checklist: validates Node engine constraints, verifies clean `npm install` peer dependency resolution, checks `vercel.json` / `.vercelignore` / `robots.txt` / SEO meta tags, and runs the full automated test suite before pushing to GitHub.

6. **`partner-recruiting-funnel` Skill**
   - Playbook for building recruiter attribution URLs, pre-filled scenario presets (e.g., "Solo MCA Broker", "10-Agent ISO Desk", "MGA Agency Builder"), and structured onboarding follow-up sequences.

### Part B: Existing Skills to Use

1. **`frontend-design`** — Maintain distinct visual craftsmanship across all 4 design variants (Punk Utility Brutalism, Broker's Manifesto, Lime Precision Fintech, Pastel Intelligence) while avoiding generic SaaS clutter.
2. **`applet-seo`** — Configure OpenGraph social share cards, Twitter cards, JSON-LD `WebApplication`/`FAQPage` structured data, and canonical URLs so shared calculator links render cleanly in LinkedIn, iMessage, and Slack.
3. **`pwa-integration`** — Add Web App Manifest, service worker caching, icons, and in-app install prompts for offline field/tablet use.
4. **`firebase-integration-rpc` or `cloudsql-setup`** — Upgrade from stateless URL sharing to persistent user accounts, saved broker portfolios, multi-agent agency dashboards, or recruiter CRM storage when ready.
5. **`workspace-integration`** — Connect Google Sheets (live lender rate cards), Gmail (automated earnings-plan delivery), and Google Calendar (direct recruiter scheduling).
6. **`securecoder-persona`** — Enforce input sanitization, safe HTML/CSV escaping (including CSV formula injection protection), environment-variable hygiene, and server-side validation whenever adding backend lead capture or CRM webhooks.
7. **`image-generation`** — Generate cohesive editorial assets, OpenGraph preview banners, or brochure visuals matched to each variant's design palette.

---

## Suggested Implementation Priority

| Priority | Item | Category | Immediate Impact |
| :--- | :--- | :--- | :--- |
| **1** | `pay-plan-onboarding` + `commission-math-auditor` | Custom Skills | Fastest, safest way to add more funding partners with zero regressions |
| **2** | Vercel MCP + GitHub MCP + Playwright MCP | Existing MCP | Automated deploy monitoring and visual testing across all 4 variants |
| **3** | White-Label Embed Plugin (`commission-estimator-embed.js`) | Custom Plugin | Lets partners and agency leaders embed the calculator with recruiter attribution |
| **4** | `jspdf` / `xlsx` Export + `vite-plugin-pwa` | Existing Plugins | Native PDF/Excel downloads and offline mobile demo support |
| **5** | `commission-engine-mcp` + `broker-crm-pipeline-mcp` | Custom MCP | Direct AI-assisted recruiting & automated CRM scenario syncing |
