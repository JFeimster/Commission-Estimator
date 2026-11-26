# Commission Model & Configuration Guide

## Batch 01 source review — November 25, 2026

The four existing pay plan modules remain the sole registry. Direct models funded-volume percentages or fixed fees; Agency models Bonus Revenue (BR) times personal split and agency overrides; ISO models markup points times volume-tier split; Custom supports configurable versions of these bases. No parallel registry was added.

| Source | Disposition |
| --- | --- |
| [DAC-Comp widget](https://github.com/JFeimster/DAC-Comp/blob/main/dac-comp-widget.js) | Reusable BR, split, differential and level formulas. BR selector explicitly uses proxies. No contractual rates imported. |
| [Commission-Calculator exporter](https://github.com/JFeimster/Commission-Calculator/blob/main/scripts/export-portfolio.mjs) | Reused fail-closed demonstration checks and removal of partner links/lead endpoints. |
| [Partner Command Center simulator](https://github.com/JFeimster/partner-command-center/blob/main/tools/commission-simulator.js) | Flat-fee and funded-percentage math already fits Direct/Custom. Examples are not verified schedules. |
| [BrokerFlow](https://github.com/JFeimster/brokerflow-ai) | Funding classification and operations resources; no current publicly authorized compensation schedule established. No routing data copied. |
| [ResourceGrid affiliate registry](https://github.com/JFeimster/ResourceGrid/blob/main/registries/conversion/affiliate-partners.json) | Referral destinations, not compensation authorization. No affiliate links copied. |
| [ResourceGrid providers](https://github.com/JFeimster/ResourceGrid/blob/main/registries/funding/providers.json) and [products](https://github.com/JFeimster/ResourceGrid/blob/main/registries/funding/products.json) | Historical imported commission strings and provider verification labels do not establish current schedule applicability or disclosure authorization. No rates adopted. |
| Notion Affiliate Partner Resources / Funding Partners DB | Affiliate marketing material and unverified comparison ranges; discovery only. No private URLs or page content exported. |
| Local DAC Pay Plan Chart, Policies folder | Version 01.09.25. Its qualification/residual structure differs from the generic 18-tier model. Current applicability and redistribution authorization are unestablished. File excluded from builds/exports. |
| [DAC official partner page](https://davidallencapital.com/partner/) | Public lender-revenue split and team override description supports the model category, not every existing tier, BR rate or qualification. No partner-specific schedule marked verified. |
| GoKapital official broker program | Returned HTTP 403 during review; no rates adopted. |
| moonshine-partners.registry.json / moonshine.registry-map.json | Not located in the searched desktop resources or named repository trees. Existing funding registries supplied discovery context only. |

All product commission/BR rates, agency ladder and qualification thresholds, level/leadership percentages, ISO brackets and markup, Custom defaults, bonuses, recurring trails and payment timing remain **unverified illustrative assumptions**. Existing Business Capital and Revenue-Based 4% assumptions are preserved. No named public partner is enabled pending current applicability and disclosure authorization.

`VERIFIED PROGRAM MODE` ignores URL rate, agency, ISO and custom-plan overrides. The public exporter refuses verified schedules instead of relabeling them. The existing shared demonstration disclosures remain on standalone pages and reports; each plan also carries an explicit illustrative disclosure in the embed.

## Authoritative Configuration (`shared/config/commission-config.js`)
Every variant, the production root, exported reports, and automated tests import `COMMISSION_CONFIG` directly from `shared/config/commission-config.js`.

### Operating Modes
- **`DEMONSTRATION MODE`** (default): Clearly labels all figures as hypothetical planning estimates. Users may edit illustrative product rates and toggle optional features.
- **`VERIFIED PROGRAM MODE`**: Enable only after supplying an approved Moonshine Capital compensation schedule and setting `approvedSourceReference`.

### Replacing Illustrative Data Without Touching Theme Code
1. Open `shared/config/commission-config.js`.
2. Update each entry in `COMMISSION_CONFIG.products` (`compensationMethod`: `'percentage'` or `'fixed'`, `commissionRate`, `fixedFee`, `commissionableBasis`, `enabled`).
3. Update `COMMISSION_CONFIG.tiers` if official volume tiers specify explicit `tierRateBonus` values (defaults to `0`).
4. Update `bonusRules` and `recurringRules` according to written Partner Agreement terms.
5. Switch `verificationStatus` to `"VERIFIED PROGRAM MODE"` and update `effectiveDate` and `version`.
6. Run `npm test` and `npm run build`.

## Deterministic Formulas (`shared/lib/calculator-engine.js`)
- **Scenario Deal Flow**: `Modeled Deals = Monthly Funded Deals × Scenario Multiplier` (`0.60x` Conservative, `1.00x` Base Case, `1.40x` Optimistic).
- **Percentage Product**: `Gross Commission = (Allocated Deals × Avg Deal Size) × (Applicable Rate / 100)`.
- **Fixed-Fee Product**: `Gross Commission = Allocated Deals × Fixed Fee`.
- **Commissions Earned vs. Receipts**: Earned reflects the funding month; Receipts shifts cash inflow forward by `paymentDelayMonths`.
- **Pre-Tax Operating Income**: `Commission Receipts − Monthly Operating Expenses`.
- **12-, 24-, and 36-Month Cumulative Totals**: Exact sums of each month's projected results (accounting for growth rate, ramp-up, capacity cap, retention, and optional bonuses/recurring trails without double-counting).
