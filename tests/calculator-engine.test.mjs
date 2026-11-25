import assert from "node:assert/strict";
import test from "node:test";
import { COMMISSION_CONFIG, getEqualAllocations } from "../shared/config/commission-config.js";
import {
  calculateAllScenarios,
  calculateCommissions,
  determinePartnerTier,
  validateInputs,
} from "../shared/lib/calculator-engine.js";
import { generateReportCSV, generatePrintableReportHTML } from "../shared/lib/reporting.js";
import {
  createBaselineDemoState,
  createDefaultState,
  decodeScenarioFromSearch,
  encodeScenarioToSearchParams,
} from "../shared/lib/state.js";

test("Section 13 standardized demonstration baseline (10 deals x $50k x 3.0% uniform)", () => {
  const baseline = createBaselineDemoState(COMMISSION_CONFIG);
  const res = calculateCommissions(baseline, COMMISSION_CONFIG);

  assert.equal(res.validation.isValid, true);
  assert.equal(res.totalMonthlyFundedVolume, 500000);
  assert.equal(res.monthlyGrossCommission, 15000);
  assert.equal(res.annualizedGrossCommission, 180000);
  assert.equal(res.firstYearCumulativeCommission, 180000);
  assert.equal(res.threeYearCumulativeCommission, 540000);
});

test("Active COMMISSION_CONFIG preserves user-updated 4.0% rates for Business Capital & Revenue-Based", () => {
  const bc = COMMISSION_CONFIG.products.find((p) => p.id === "business-capital");
  const rb = COMMISSION_CONFIG.products.find((p) => p.id === "revenue-based");
  assert.equal(bc.commissionRate, 4.0);
  assert.equal(rb.commissionRate, 4.0);

  const state = createDefaultState(COMMISSION_CONFIG);
  const res = calculateCommissions(state, COMMISSION_CONFIG);
  // Weighted rate: 30%*4.0 + 25%*4.0 + 15%*2.5 + 20%*3.5 + 10%*2.8 = 1.2 + 1.0 + 0.375 + 0.7 + 0.28 = 3.555%
  // On $500,000 monthly funded volume = $17,775/mo
  assert.equal(res.totalMonthlyFundedVolume, 500000);
  assert.equal(res.monthlyGrossCommission, 17775);
  assert.equal(res.annualizedGrossCommission, 213300);
  assert.equal(res.firstYearCumulativeCommission, 213300);
  assert.equal(res.threeYearCumulativeCommission, 639900);
});

test("Fixed-fee product calculation works deterministically", () => {
  const customConfig = structuredClone(COMMISSION_CONFIG);
  customConfig.products = [
    {
      id: "flat-credit",
      name: "Fixed Business Credit",
      enabled: true,
      compensationMethod: "fixed",
      commissionRate: 0,
      fixedFee: 500,
      defaultAllocation: 100,
      commissionableBasis: "Per funded deal",
    },
  ];
  const res = calculateCommissions(
    { monthlyDeals: 12, averageDealSize: 50000, allocations: { "flat-credit": 100 } },
    customConfig
  );
  assert.equal(res.monthlyGrossCommission, 6000);
  assert.equal(res.annualizedGrossCommission, 72000);
});

test("Zero funded deals returns $0 earnings and Pre-production tier", () => {
  const state = { ...createDefaultState(COMMISSION_CONFIG), monthlyDeals: 0 };
  const res = calculateCommissions(state, COMMISSION_CONFIG);
  assert.equal(res.totalMonthlyFundedVolume, 0);
  assert.equal(res.monthlyGrossCommission, 0);
  assert.equal(res.firstYearCumulativeCommission, 0);
  assert.equal(res.threeYearCumulativeCommission, 0);
  assert.equal(res.tier.currentTier.name, "Pre-production");
});

test("Invalid inputs and non-100% allocations are rejected in validation", () => {
  const vNeg = validateInputs({ monthlyDeals: -5, averageDealSize: -1000, operatingExpenses: -50 });
  assert.equal(vNeg.isValid, false);
  assert.ok(vNeg.errors.length >= 3);
  assert.equal(vNeg.sanitized.monthlyDeals, 0);

  const vAlloc = validateInputs({
    monthlyDeals: 10,
    allocations: {
      "business-capital": 40,
      "revenue-based": 40,
      "asset-backed": 0,
      "saas-ecommerce": 0,
      "business-credit": 0,
    },
  });
  assert.equal(vAlloc.allocationValid, false);
  assert.equal(vAlloc.allocationTotal, 80);

  const eq = getEqualAllocations(COMMISSION_CONFIG);
  const eqSum = Object.values(eq).reduce((a, b) => a + b, 0);
  assert.equal(eqSum, 100);
});

test("Scenarios recalculate underlying deal volume (0.60x / 1.00x / 1.40x)", () => {
  const baseline = createBaselineDemoState(COMMISSION_CONFIG);
  const all = calculateAllScenarios(baseline, COMMISSION_CONFIG);

  assert.equal(all.conservative.modeledMonthlyDeals, 6);
  assert.equal(all.conservative.monthlyGrossCommission, 9000);
  assert.equal(all.base.modeledMonthlyDeals, 10);
  assert.equal(all.base.monthlyGrossCommission, 15000);
  assert.equal(all.optimistic.modeledMonthlyDeals, 14);
  assert.equal(all.optimistic.monthlyGrossCommission, 21000);
  // Tier should recalculate with volume: 14 deals enters Silver (11-25)
  assert.equal(all.optimistic.tier.currentTier.name, "Silver");
});

test("Non-overlapping partner tier thresholds and zero automatic rate inflation", () => {
  assert.equal(determinePartnerTier(0).currentTier.name, "Pre-production");
  assert.equal(determinePartnerTier(1).currentTier.name, "Bronze");
  assert.equal(determinePartnerTier(10).currentTier.name, "Bronze");
  assert.equal(determinePartnerTier(11).currentTier.name, "Silver");
  assert.equal(determinePartnerTier(25).currentTier.name, "Silver");
  assert.equal(determinePartnerTier(26).currentTier.name, "Gold");
  assert.equal(determinePartnerTier(50).currentTier.name, "Gold");
  assert.equal(determinePartnerTier(51).currentTier.name, "Platinum");
  for (const tier of COMMISSION_CONFIG.tiers) {
    assert.equal(tier.tierRateBonus, 0);
  }
});

test("Optional bonuses and recurring trail are disabled by default and do not double-count when enabled", () => {
  const baseline = createBaselineDemoState(COMMISSION_CONFIG);
  const off = calculateCommissions(baseline, COMMISSION_CONFIG);
  assert.equal(off.monthlyQualifiedBonus, 0);
  assert.equal(off.projections12[0].recurringCommission, 0);
  assert.equal(off.projections12[1].recurringCommission, 0);

  const onBonus = calculateCommissions({ ...baseline, enableBonuses: true }, COMMISSION_CONFIG);
  assert.equal(onBonus.monthlyQualifiedBonus, 1250); // 0.25% of $500k
  assert.equal(onBonus.monthlyGrossCommission, 16250);

  const onRec = calculateCommissions({ ...baseline, enableRecurring: true }, COMMISSION_CONFIG);
  // Month 1 has zero prior retained cohort -> no double-counting current month deals
  assert.equal(onRec.projections12[0].recurringCommission, 0);
  assert.ok(onRec.projections12[1].recurringCommission > 0);
});

test("Payment delay distinguishes earned vs receipts and expenses yield pre-tax operating income", () => {
  const baseline = createBaselineDemoState(COMMISSION_CONFIG);
  const res = calculateCommissions(
    { ...baseline, paymentDelayMonths: 2, operatingExpenses: 3000 },
    COMMISSION_CONFIG
  );

  assert.equal(res.projections12[0].commissionsEarned, 15000);
  assert.equal(res.projections12[0].commissionReceipts, 0);
  assert.equal(res.projections12[0].estimatedPreTaxOperatingIncome, -3000);
  assert.equal(res.projections12[1].commissionReceipts, 0);
  assert.equal(res.projections12[2].commissionReceipts, 15000);
  assert.equal(res.projections12[2].estimatedPreTaxOperatingIncome, 12000);
  assert.equal(res.firstYearCumulativeCommission, 180000);
  assert.equal(res.firstYearCumulativeReceipts, 150000);
});

test("12-month and 36-month cumulative totals equal exact sum of monthly projections with growth", () => {
  const baseline = createBaselineDemoState(COMMISSION_CONFIG);
  const res = calculateCommissions(
    { ...baseline, monthlyGrowthRate: 5, rampUpMonths: 3, maxMonthlyCapacity: 25 },
    COMMISSION_CONFIG
  );

  const sum12 = Number(res.projections12.reduce((s, r) => s + r.commissionsEarned, 0).toFixed(2));
  const sum36 = Number(res.projections36.reduce((s, r) => s + r.commissionsEarned, 0).toFixed(2));
  assert.equal(res.firstYearCumulativeCommission, sum12);
  assert.equal(res.threeYearCumulativeCommission, sum36);
  // Capacity cap respected
  for (const row of res.projections36) {
    assert.ok(row.deals <= 25);
  }
});

test("Per-product average funded deal sizes and custom commission rates compute exact weighted volume and gross commission", () => {
  const state = {
    ...createDefaultState(COMMISSION_CONFIG),
    monthlyDeals: 10,
    averageDealSize: 50000,
    allocations: {
      "business-capital": 50,
      "revenue-based": 30,
      "asset-backed": 20,
      "saas-ecommerce": 0,
      "business-credit": 0,
    },
    customDealSizes: {
      "business-capital": 100000, // 5 deals * $100k = $500,000
      "revenue-based": 40000, // 3 deals * $40k = $120,000
      "asset-backed": 250000, // 2 deals * $250k = $500,000
    },
    customRates: {
      "business-capital": 4.5, // $500,000 * 4.5% = $22,500
      "revenue-based": 5.0, // $120,000 * 5.0% = $6,000
      "asset-backed": 2.0, // $500,000 * 2.0% = $10,000
    },
  };

  const res = calculateCommissions(state, COMMISSION_CONFIG);
  assert.equal(res.validation.isValid, true);
  assert.equal(res.totalMonthlyFundedVolume, 1120000);
  assert.equal(res.weightedAverageDealSize, 112000);
  assert.equal(res.monthlyGrossCommission, 38500);
  assert.equal(res.annualizedGrossCommission, 462000);
  assert.equal(res.threeYearCumulativeCommission, 1386000);

  const ab = res.productResults.find((p) => p.productId === "asset-backed");
  assert.equal(ab.dealSize, 250000);
  assert.equal(ab.commissionRate, 2.0);
  assert.equal(ab.grossCommission, 10000);
  assert.equal(ab.hasCustomDealSize, true);
  assert.equal(ab.hasCustomRate, true);

  // Invalid negative per-product deal size or rate is caught
  const vInvalid = validateInputs({
    ...state,
    customDealSizes: { "business-capital": -1000 },
    customRates: { "revenue-based": -2 },
  });
  assert.equal(vInvalid.isValid, false);
  assert.ok(vInvalid.errors.length >= 2);
});

test("URL serialization omits contact data and round-trips per-product deal sizes and custom rates", () => {
  const state = {
    ...createDefaultState(COMMISSION_CONFIG),
    monthlyDeals: 18,
    averageDealSize: 75000,
    customDealSizes: { "business-capital": 120000, "asset-backed": 300000 },
    customRates: { "business-capital": 4.5, "business-credit": 3.2 },
    scenario: "optimistic",
    operatingExpenses: 2500,
    email: "should-never-appear@example.com",
    phone: "555-1234",
  };
  const query = encodeScenarioToSearchParams(state, COMMISSION_CONFIG);
  assert.equal(query.includes("email"), false);
  assert.equal(query.includes("phone"), false);
  assert.equal(query.includes("should-never-appear"), false);
  assert.ok(query.includes("dsizes="));
  assert.ok(query.includes("rates="));

  const decoded = decodeScenarioFromSearch(query, COMMISSION_CONFIG);
  assert.equal(decoded.monthlyDeals, 18);
  assert.equal(decoded.averageDealSize, 75000);
  assert.equal(decoded.customDealSizes["business-capital"], 120000);
  assert.equal(decoded.customDealSizes["asset-backed"], 300000);
  assert.equal(decoded.customRates["business-capital"], 4.5);
  assert.equal(decoded.customRates["business-credit"], 3.2);
  assert.equal(decoded.scenario, "optimistic");
  assert.equal(decoded.operatingExpenses, 2500);
});

test("Exported CSV and HTML reports contain required assumptions, Avg Deal Size, version, status, and disclosures", () => {
  const baseline = createBaselineDemoState(COMMISSION_CONFIG);
  const res = calculateCommissions(baseline, COMMISSION_CONFIG);

  const csv = generateReportCSV(baseline, res);
  assert.ok(csv.includes("DEMONSTRATION MODE"));
  assert.ok(csv.includes(COMMISSION_CONFIG.version));
  assert.ok(csv.includes("Avg Deal Size"));
  assert.ok(csv.includes("15000"));
  assert.ok(csv.includes("EARNINGS DISCLOSURE"));

  const html = generatePrintableReportHTML(baseline, res);
  assert.ok(html.includes("Hypothetical gross commission estimates"));
  assert.ok(html.includes("Avg Deal Size"));
  assert.ok(html.includes("$15,000"));
  assert.ok(html.includes("Calculation Methodology"));
});
