# Commission Model & Configuration Guide

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
