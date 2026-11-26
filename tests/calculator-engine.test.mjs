import assert from "node:assert/strict";
import test from "node:test";
import { COMMISSION_CONFIG, getEqualAllocations } from "../shared/config/commission-config.js";
import {
  calculateAllScenarios,
  calculateCommissions,
  calculateFiveLevelPay,
  calculateLeadershipOverride,
  calculateOverrideSpreads,
  calculatePlanComparison,
  createDefaultAgencyState,
  createDefaultCustomPlanState,
  createDefaultIsoState,
  determineIsoVolumeBracket,
  determinePartnerTier,
  evaluateAgencyLadderTier,
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

test("18-Tier Agency Performance Ladder advances cleanly and enforces QCB fallback & certification rules", () => {
  // Uncertified broker is strictly Tier 1 (RP 10%) with zero override eligibility
  const uncert = evaluateAgencyLadderTier({ startingTier: 14, isCertified: false, isQCB: false });
  assert.equal(uncert.effectiveTier.tier, 1);
  assert.equal(uncert.effectiveTier.rate, 10);
  assert.equal(uncert.overridesEligible, false);
  assert.equal(uncert.l1Eligible, false);

  // Certified + QCB starting at GA1 (Tier 2) advancing to MGA1 (Tier 10, 60%) at 7 clients & $50k TPBR
  const mga1 = evaluateAgencyLadderTier({
    startingTier: 2,
    cumulativeClients: 7,
    cumulativeTPBR: 50000,
    isCertified: true,
    isQCB: true,
    autoAdvanceLadder: true,
  });
  assert.equal(mga1.earnedTier.tier, 10);
  assert.equal(mga1.effectiveTier.rate, 60);
  assert.equal(mga1.qcbDropped, false);
  assert.equal(mga1.overridesEligible, true);

  // Losing QCB at MGA4 (Tier 13, 67.5%) falls back to MGA1 (Tier 10, 60%), stops overrides, keeps L1 active
  const droppedMga = evaluateAgencyLadderTier({
    startingTier: 13,
    isCertified: true,
    isQCB: false,
    autoAdvanceLadder: false,
  });
  assert.equal(droppedMga.earnedTier.tier, 13);
  assert.equal(droppedMga.effectiveTier.tier, 10);
  assert.equal(droppedMga.effectiveTier.rate, 60);
  assert.equal(droppedMga.qcbDropped, true);
  assert.equal(droppedMga.overridesEligible, false);
  assert.equal(droppedMga.l1Eligible, true);

  // Losing QCB at GA5 (Tier 6, 50%) falls back to GA1 (Tier 2, 40%)
  const droppedGa = evaluateAgencyLadderTier({
    startingTier: 6,
    isCertified: true,
    isQCB: false,
    autoAdvanceLadder: false,
  });
  assert.equal(droppedGa.effectiveTier.tier, 2);
  assert.equal(droppedGa.effectiveTier.rate, 40);
  assert.equal(droppedGa.qcbDropped, true);

  // Tier 18 (NA, 80%) reached at 20 clients & $300k TPBR unlocks leadership override
  const topTier = evaluateAgencyLadderTier({
    startingTier: 2,
    cumulativeClients: 20,
    cumulativeTPBR: 300000,
    isCertified: true,
    isQCB: true,
    autoAdvanceLadder: true,
  });
  assert.equal(topTier.effectiveTier.tier, 18);
  assert.equal(topTier.effectiveTier.rate, 80);
  assert.equal(topTier.leadershipEligible, true);
});

test("Differential Override Spread calculates exact spreads and QCB roll-up", () => {
  const res = calculateOverrideSpreads({
    userEffectiveRate: 60,
    isQCB: true,
    cohorts: [
      {
        id: "direct",
        label: "Direct GA1",
        activeBrokers: 1,
        avgMonthlyBR: 6000,
        brokerTierRate: 40,
        intermediateManagerRate: 0,
        intermediateIsQCB: true,
      },
      {
        id: "managed-qcb",
        label: "Managed QCB GA5",
        activeBrokers: 1,
        avgMonthlyBR: 6000,
        brokerTierRate: 40,
        intermediateManagerRate: 50,
        intermediateIsQCB: true,
      },
      {
        id: "managed-rollup",
        label: "Managed Non-QCB GA5 Roll-Up",
        activeBrokers: 1,
        avgMonthlyBR: 6000,
        brokerTierRate: 40,
        intermediateManagerRate: 50,
        intermediateIsQCB: false,
      },
    ],
  });

  // 60% - 40% = 20% of $6k = $1,200
  assert.equal(res.cohorts[0].spreadPercent, 20);
  assert.equal(res.cohorts[0].monthlyOverride, 1200);
  assert.equal(res.cohorts[0].rollUpTriggered, false);

  // 60% - 50% (active QCB manager) = 10% of $6k = $600
  assert.equal(res.cohorts[1].spreadPercent, 10);
  assert.equal(res.cohorts[1].monthlyOverride, 600);
  assert.equal(res.cohorts[1].rollUpTriggered, false);

  // Non-QCB intermediate manager skipped -> rolls up to 60% - 40% = 20% of $6k = $1,200
  assert.equal(res.cohorts[2].spreadPercent, 20);
  assert.equal(res.cohorts[2].monthlyOverride, 1200);
  assert.equal(res.cohorts[2].rollUpTriggered, true);

  assert.equal(res.totalSpreadCommission, 3000);

  // Losing QCB zeros all override spreads
  const lostQcb = calculateOverrideSpreads({
    userEffectiveRate: 60,
    isQCB: false,
    cohorts: [{ activeBrokers: 3, avgMonthlyBR: 6000, brokerTierRate: 40 }],
  });
  assert.equal(lostQcb.totalSpreadCommission, 0);
});

test("5-Level Downline Pay enforces frontline QCB unlock gates (0/3/6/10/20) and keeps L1 when Certified", () => {
  const levels = [
    { level: 1, brokers: 5, avgMonthlyBR: 10000 }, // $50k BR -> 4% = $2,000
    { level: 2, brokers: 5, avgMonthlyBR: 10000 }, // $50k BR -> 2% = $1,000
    { level: 3, brokers: 5, avgMonthlyBR: 10000 }, // $50k BR -> 2% = $1,000
    { level: 4, brokers: 5, avgMonthlyBR: 10000 }, // $50k BR -> 2% = $1,000
    { level: 5, brokers: 5, avgMonthlyBR: 10000 }, // $50k BR -> 2% = $1,000
  ];

  // With 6 frontline QCBs: L1, L2, L3 unlocked; L4 (10) & L5 (20) locked
  const sixQcb = calculateFiveLevelPay({ isCertified: true, isQCB: true, frontlineQCBs: 6, levels });
  assert.equal(sixQcb.unlockedLevels, 3);
  assert.equal(sixQcb.levels[0].monthlyPayout, 2000);
  assert.equal(sixQcb.levels[1].monthlyPayout, 1000);
  assert.equal(sixQcb.levels[2].monthlyPayout, 1000);
  assert.equal(sixQcb.levels[3].unlocked, false);
  assert.equal(sixQcb.levels[3].monthlyPayout, 0);
  assert.equal(sixQcb.levels[4].unlocked, false);
  assert.equal(sixQcb.totalFiveLevelCommission, 4000);

  // Certified but NOT QCB: L1 (4%) stays active, L2–L5 locked
  const lostQcb = calculateFiveLevelPay({ isCertified: true, isQCB: false, frontlineQCBs: 20, levels });
  assert.equal(lostQcb.unlockedLevels, 1);
  assert.equal(lostQcb.levels[0].unlocked, true);
  assert.equal(lostQcb.levels[0].monthlyPayout, 2000);
  assert.equal(lostQcb.levels[1].unlocked, false);
  assert.equal(lostQcb.totalFiveLevelCommission, 2000);
});

test("2-Gen Top-Tier Leadership Override unlocks at Tier 18 + QCB and hard-caps Gen 3+ at $0", () => {
  const locked = calculateLeadershipOverride({
    userEffectiveTier: 17,
    isQCB: true,
    gen1OpenlineBR: 100000,
    gen2OpenlineBR: 50000,
    gen3OpenlineBR: 25000,
  });
  assert.equal(locked.eligible, false);
  assert.equal(locked.totalLeadershipCommission, 0);

  const unlocked = calculateLeadershipOverride({
    userEffectiveTier: 18,
    isQCB: true,
    gen1OpenlineBR: 100000,
    gen2OpenlineBR: 50000,
    gen3OpenlineBR: 25000,
  });
  assert.equal(unlocked.eligible, true);
  assert.equal(unlocked.generations[0].payout, 2000); // 2% of $100k
  assert.equal(unlocked.generations[1].payout, 1000); // 2% of $50k
  assert.equal(unlocked.generations[2].payout, 0); // Gen 3+ strictly $0
  assert.equal(unlocked.totalLeadershipCommission, 3000);
});

test("Agency Override Plan integrates 18-tier 36-month auto-advance and +1 month 5-Level receipt lag", () => {
  const agencyState = {
    ...createDefaultState(COMMISSION_CONFIG),
    payPlanId: "agency-override",
    operatingMode: "agency",
    monthlyDeals: 10,
    averageDealSize: 50000,
    paymentDelayMonths: 0,
    agency: {
      ...createDefaultAgencyState(),
      startingTier: 2, // Start at GA1 (40%) and let 36 months of deals climb the ladder!
      autoAdvanceLadder: true,
      frontlineQCBs: 6,
    },
  };

  const res = calculateCommissions(agencyState, COMMISSION_CONFIG);
  assert.equal(res.validation.isValid, true);
  assert.equal(res.payPlan.id, "agency-override");
  assert.ok(res.commissionStreams.overrideSpread >= 0);
  assert.ok(res.commissionStreams.fiveLevel > 0);
  // Month 1 receipts exclude 5-Level Agency Pay due to +1 month lag (paid 15th of following month)
  const m1 = res.projections36[0];
  const m2 = res.projections36[1];
  assert.ok(m1.fiveLevelCommission > 0);
  assert.equal(m1.commissionReceipts < m1.commissionsEarned, true);
  assert.ok(m2.commissionReceipts > m1.commissionReceipts);

  // Over 36 months of steady production, tier auto-advances significantly above starting GA1 (Tier 2)
  assert.ok(res.agencySummary.month36Ladder.effectiveTier.tier > res.agencySummary.ladder.effectiveTier.tier);

  // CSV & HTML reports include active Pay Plan Name, Operating Mode, and Commission Streams
  const csv = generateReportCSV(agencyState, res);
  assert.ok(csv.includes("Agency Override & Downline Plan"));
  assert.ok(csv.includes("5-LEVEL DOWNLINE SCHEDULE"));
  assert.ok(csv.includes("Override Spread Commission"));
  assert.ok(csv.includes("5-Level Downline Pay"));

  const html = generatePrintableReportHTML(agencyState, res);
  assert.ok(html.includes("Agency Override &amp; Downline Plan") || html.includes("Agency Override & Downline Plan"));
  assert.ok(html.includes("Commission Streams"));
});

test("ISO Volume-Tiered Split Plan and Custom Partner Builder calculate deterministically + Plan Comparison", () => {
  assert.equal(determineIsoVolumeBracket(100000).brokerSplitPercent, 60);
  assert.equal(determineIsoVolumeBracket(250000).brokerSplitPercent, 70);
  assert.equal(determineIsoVolumeBracket(600000).brokerSplitPercent, 75);
  assert.equal(determineIsoVolumeBracket(1200000).brokerSplitPercent, 80);

  const isoState = {
    ...createDefaultState(COMMISSION_CONFIG),
    payPlanId: "iso-volume-split",
    operatingMode: "agency",
    monthlyDeals: 10,
    averageDealSize: 50000, // $500k volume -> 75% split bracket
    iso: {
      ...createDefaultIsoState(),
      markupPoints: 6.0, // $500k * 6% = $30k gross points * 75% split = $22,500 personal
      subBrokerCount: 2,
      subBrokerAvgMonthlyVolume: 100000, // $200k sub-broker volume * 1.5% = $3,000
      subBrokerOverridePercent: 1.5,
    },
  };
  const isoRes = calculateCommissions(isoState, COMMISSION_CONFIG);
  assert.equal(isoRes.commissionStreams.personal, 22500);
  assert.equal(isoRes.commissionStreams.isoSubBroker, 3000);
  assert.equal(isoRes.monthlyGrossCommission, 25500);

  const customState = {
    ...createDefaultState(COMMISSION_CONFIG),
    payPlanId: "custom-partner",
    operatingMode: "agency",
    monthlyDeals: 10,
    averageDealSize: 50000,
    customPlan: {
      ...createDefaultCustomPlanState(),
      baseType: "points-markup",
      markupPoints: 5.0, // $500k * 5% = $25k * 70% = $17,500
      personalSplitPercent: 70,
      spreadOverridePercent: 10,
      levelRates: [5, 2, 1, 0, 0],
    },
  };
  const customRes = calculateCommissions(customState, COMMISSION_CONFIG);
  assert.equal(customRes.commissionStreams.personal, 17500);
  assert.ok(customRes.commissionStreams.totalOverrides > 0);

  const comparison = calculatePlanComparison(isoState, COMMISSION_CONFIG);
  assert.equal(comparison.length, 4);
  for (const row of comparison) {
    assert.ok(Number.isFinite(row.monthlyGross));
    assert.ok(Number.isFinite(row.firstYearCumulative));
    assert.ok(Number.isFinite(row.threeYearCumulative));
  }
});

test("URL serialization round-trips payPlanId, operatingMode, agency, iso, and customPlan with zero PII", () => {
  const state = {
    ...createDefaultState(COMMISSION_CONFIG),
    payPlanId: "agency-override",
    operatingMode: "agency",
    agency: {
      ...createDefaultAgencyState(),
      startingTier: 14,
      isCertified: true,
      isQCB: true,
      autoAdvanceLadder: false,
      frontlineQCBs: 10,
    },
    iso: {
      ...createDefaultIsoState(),
      markupPoints: 7.5,
      subBrokerCount: 4,
    },
    customPlan: {
      ...createDefaultCustomPlanState(),
      personalSplitPercent: 75,
    },
    email: "private@example.com",
  };

  const qs = encodeScenarioToSearchParams(state, COMMISSION_CONFIG);
  assert.ok(qs.includes("plan=agency-override"));
  assert.ok(qs.includes("opmode=agency"));
  assert.equal(qs.includes("private@example.com"), false);

  const decoded = decodeScenarioFromSearch(qs, COMMISSION_CONFIG);
  assert.equal(decoded.payPlanId, "agency-override");
  assert.equal(decoded.operatingMode, "agency");
  assert.equal(decoded.agency.startingTier, 14);
  assert.equal(decoded.agency.autoAdvanceLadder, false);
  assert.equal(decoded.agency.frontlineQCBs, 10);
});
