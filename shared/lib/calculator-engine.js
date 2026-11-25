/**
 * Deterministic Financial Calculation Engine
 * Moonshine Capital Broker Commission Calculator
 *
 * Supports global AND per-product average funded deal sizes,
 * customizable per-product commission rates, fixed/percentage products,
 * scenarios, multi-horizon projections, payment delays, and income targets.
 */

import { COMMISSION_CONFIG, getDefaultAllocations, getEqualAllocations } from "../config/commission-config.js";

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Validate and sanitize raw calculator inputs.
 * Rejects negative/NaN values and verifies allocation totals equal 100%.
 */
export function validateInputs(rawInputs = {}, config = COMMISSION_CONFIG) {
  const errors = [];
  const warnings = [];
  const limits = config.limits;
  const enabledProducts = config.products.filter((p) => p.enabled !== false);

  const rawDeals = rawInputs.monthlyDeals;
  if (rawDeals !== undefined && (Number.isNaN(Number(rawDeals)) || Number(rawDeals) < 0)) {
    errors.push("Monthly funded deals cannot be negative or invalid.");
  }
  const monthlyDeals = clamp(
    Math.max(0, toFiniteNumber(rawDeals, config.defaultAssumptions.monthlyDeals)),
    limits.minMonthlyDeals,
    limits.maxMonthlyDeals
  );

  const rawDealSize = rawInputs.averageDealSize;
  if (rawDealSize !== undefined && (Number.isNaN(Number(rawDealSize)) || Number(rawDealSize) < 0)) {
    errors.push("Average funded deal size must be a valid positive dollar amount.");
  }
  const averageDealSize = clamp(
    Math.max(0, toFiniteNumber(rawDealSize, config.defaultAssumptions.averageDealSize)),
    0,
    limits.maxDealSize
  );

  const allocationMode = rawInputs.allocationMode === "equal" ? "equal" : "custom";
  const sourceAllocations =
    allocationMode === "equal"
      ? getEqualAllocations(config)
      : rawInputs.allocations || getDefaultAllocations(config);

  const allocations = {};
  let allocationTotal = 0;
  for (const product of enabledProducts) {
    const val = toFiniteNumber(sourceAllocations[product.id], product.defaultAllocation);
    if (val < 0) {
      errors.push(`Allocation for ${product.name} cannot be negative.`);
    }
    const cleanVal = clamp(Math.max(0, val), 0, 100);
    allocations[product.id] = cleanVal;
    allocationTotal += cleanVal;
  }

  allocationTotal = round2(allocationTotal);
  const allocationValid = Math.abs(allocationTotal - 100) < 0.01;
  if (!allocationValid) {
    errors.push(`Product allocations must total 100% (currently ${allocationTotal.toFixed(1)}%).`);
  }

  // Per-product custom commission rates (%)
  const customRates = {};
  if (rawInputs.customRates && typeof rawInputs.customRates === "object") {
    for (const product of enabledProducts) {
      if (rawInputs.customRates[product.id] !== undefined && rawInputs.customRates[product.id] !== "") {
        const rawRate = Number(rawInputs.customRates[product.id]);
        if (Number.isNaN(rawRate) || rawRate < 0) {
          errors.push(`Commission rate for ${product.name} cannot be negative or invalid.`);
        }
        const r = toFiniteNumber(rawInputs.customRates[product.id], product.commissionRate);
        if (r > 25) {
          warnings.push(`Rate for ${product.name} clamped to 0%–25% illustrative range.`);
        }
        customRates[product.id] = clamp(Math.max(0, r), 0, 25);
      }
    }
  }

  // Per-product custom average funded deal sizes (USD)
  const customDealSizes = {};
  if (rawInputs.customDealSizes && typeof rawInputs.customDealSizes === "object") {
    for (const product of enabledProducts) {
      if (rawInputs.customDealSizes[product.id] !== undefined && rawInputs.customDealSizes[product.id] !== "") {
        const rawSize = Number(rawInputs.customDealSizes[product.id]);
        if (Number.isNaN(rawSize) || rawSize < 0) {
          errors.push(`Average deal size for ${product.name} cannot be negative or invalid.`);
        }
        const cleanSize = clamp(Math.max(0, toFiniteNumber(rawSize, averageDealSize)), 0, limits.maxDealSize);
        customDealSizes[product.id] = cleanSize;
      }
    }
  }

  const scenarioKey =
    rawInputs.scenario && config.scenarios[rawInputs.scenario]
      ? rawInputs.scenario
      : config.defaultAssumptions.scenario;

  const customScenarioMultipliers = {
    conservative: clamp(
      toFiniteNumber(rawInputs.scenarioMultipliers?.conservative, config.scenarios.conservative.multiplier),
      0.1,
      3.0
    ),
    base: clamp(
      toFiniteNumber(rawInputs.scenarioMultipliers?.base, config.scenarios.base.multiplier),
      0.1,
      3.0
    ),
    optimistic: clamp(
      toFiniteNumber(rawInputs.scenarioMultipliers?.optimistic, config.scenarios.optimistic.multiplier),
      0.1,
      3.0
    ),
  };

  const monthlyGrowthRate = clamp(
    toFiniteNumber(rawInputs.monthlyGrowthRate, config.defaultAssumptions.monthlyGrowthRate),
    limits.minGrowthRate,
    limits.maxGrowthRate
  );

  const rampUpMonths = clamp(
    Math.round(toFiniteNumber(rawInputs.rampUpMonths, config.defaultAssumptions.rampUpMonths)),
    0,
    limits.maxRampUpMonths
  );

  const maxMonthlyCapacity = Math.max(
    0,
    toFiniteNumber(rawInputs.maxMonthlyCapacity, config.defaultAssumptions.maxMonthlyCapacity)
  );

  const customerRetentionRate = clamp(
    toFiniteNumber(rawInputs.customerRetentionRate, config.defaultAssumptions.customerRetentionRate),
    0,
    100
  );

  const rawExpenses = rawInputs.operatingExpenses;
  if (rawExpenses !== undefined && Number(rawExpenses) < 0) {
    errors.push("Operating expenses cannot be negative.");
  }
  const operatingExpenses = clamp(
    Math.max(0, toFiniteNumber(rawExpenses, config.defaultAssumptions.operatingExpenses)),
    0,
    limits.maxOperatingExpenses
  );

  const paymentDelayMonths = clamp(
    Math.round(toFiniteNumber(rawInputs.paymentDelayMonths, config.defaultAssumptions.paymentDelayMonths)),
    0,
    limits.maxPaymentDelayMonths
  );

  const projectionHorizon = config.projectionHorizons.includes(Number(rawInputs.projectionHorizon))
    ? Number(rawInputs.projectionHorizon)
    : config.defaultAssumptions.projectionHorizon;

  const enableBonuses = Boolean(rawInputs.enableBonuses && config.featureAvailability.qualifiedBonuses);
  const enableRecurring = Boolean(rawInputs.enableRecurring && config.featureAvailability.recurringCommissions);
  const enableCreditSubscription = Boolean(
    rawInputs.enableCreditSubscription && config.featureAvailability.businessCreditSubscriptionMode
  );
  const creditSubscriptionClientsPerMonth = Math.max(
    0,
    Math.round(toFiniteNumber(rawInputs.creditSubscriptionClientsPerMonth, 0))
  );

  const targetMonthlyIncome = Math.max(
    0,
    toFiniteNumber(rawInputs.targetMonthlyIncome, config.defaultAssumptions.targetMonthlyIncome)
  );

  return {
    isValid: errors.length === 0,
    allocationValid,
    allocationTotal,
    errors,
    warnings,
    sanitized: {
      monthlyDeals,
      averageDealSize,
      allocationMode,
      allocations,
      customRates,
      customDealSizes,
      scenario: scenarioKey,
      scenarioMultipliers: customScenarioMultipliers,
      monthlyGrowthRate,
      rampUpMonths,
      maxMonthlyCapacity,
      customerRetentionRate,
      operatingExpenses,
      paymentDelayMonths,
      projectionHorizon,
      enableBonuses,
      enableRecurring,
      enableCreditSubscription,
      creditSubscriptionClientsPerMonth,
      targetMonthlyIncome,
    },
  };
}

/**
 * Determine partner tier using non-overlapping configured thresholds.
 */
export function determinePartnerTier(monthlyDeals, config = COMMISSION_CONFIG) {
  const deals = Math.max(0, toFiniteNumber(monthlyDeals, 0));
  const tiers = config.tiers;
  let currentTierIndex = 0;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const meetsMin = deals >= tier.minDeals;
    const meetsMax = tier.maxDeals === null ? true : deals <= tier.maxDeals;
    if (meetsMin && meetsMax) {
      currentTierIndex = i;
      break;
    }
    if (tier.maxDeals !== null && deals > tier.maxDeals) {
      currentTierIndex = Math.min(i + 1, tiers.length - 1);
    }
  }

  const currentTier = tiers[currentTierIndex];
  const nextTier = tiers[currentTierIndex + 1] || null;
  const dealsNeededForNextTier = nextTier ? Math.max(0, Math.ceil(nextTier.minDeals - deals)) : 0;

  return {
    currentTier,
    nextTier,
    dealsNeededForNextTier,
    tiersWithStatus: tiers.map((tier, idx) => ({
      ...tier,
      isCurrent: idx === currentTierIndex,
      isAchieved: idx <= currentTierIndex,
    })),
  };
}

/**
 * Calculate single-month product-level deal commission breakdown.
 * Each product uses customDealSizes[product.id] if set, otherwise global averageDealSize.
 */
export function calculateMonthlyDealBreakdown(
  dealsCount,
  averageDealSize,
  allocations,
  customRates = {},
  tierRateBonus = 0,
  config = COMMISSION_CONFIG,
  customDealSizes = {}
) {
  const enabledProducts = config.products.filter((p) => p.enabled !== false);
  const rawTotal = enabledProducts.reduce((sum, p) => sum + (allocations[p.id] ?? p.defaultAllocation), 0);

  let totalFundedVolume = 0;
  let totalDealCommission = 0;

  const productResults = enabledProducts.map((product) => {
    const rawPct = allocations[product.id] ?? product.defaultAllocation;
    const effectiveAllocationPct = rawTotal > 0 ? (rawPct / rawTotal) * 100 : 0;
    const allocatedDeals = dealsCount * (effectiveAllocationPct / 100);
    const productDealSize =
      customDealSizes[product.id] !== undefined ? customDealSizes[product.id] : averageDealSize;
    const eligibleFundedVolume = allocatedDeals * productDealSize;

    const baseRate = customRates[product.id] !== undefined ? customRates[product.id] : product.commissionRate;
    const applicableRate = baseRate + (tierRateBonus || 0);

    let grossCommission = 0;
    if (product.compensationMethod === "fixed") {
      grossCommission = allocatedDeals * toFiniteNumber(product.fixedFee, 0);
    } else {
      grossCommission = eligibleFundedVolume * (applicableRate / 100);
    }

    totalFundedVolume += eligibleFundedVolume;
    totalDealCommission += grossCommission;

    return {
      productId: product.id,
      productName: product.name,
      shortName: product.shortName || product.name,
      compensationMethod: product.compensationMethod,
      commissionableBasis: product.commissionableBasis,
      allocationPercentage: round2(rawPct),
      effectiveAllocationPercentage: round2(effectiveAllocationPct),
      allocatedDeals: round2(allocatedDeals),
      dealSize: round2(productDealSize),
      hasCustomDealSize: customDealSizes[product.id] !== undefined,
      fundedVolume: round2(eligibleFundedVolume),
      commissionRate: round2(applicableRate),
      hasCustomRate: customRates[product.id] !== undefined,
      fixedFee: round2(product.fixedFee || 0),
      grossCommission: round2(grossCommission),
    };
  });

  const weightedAverageDealSize = dealsCount > 0 ? round2(totalFundedVolume / dealsCount) : round2(averageDealSize);

  return {
    productResults,
    totalFundedVolume: round2(totalFundedVolume),
    totalDealCommission: round2(totalDealCommission),
    weightedAverageDealSize,
  };
}

/**
 * Compute qualified bonus for a given month (only when explicitly enabled).
 */
export function calculateQualifiedBonus(dealsCount, fundedVolume, enableBonuses, config = COMMISSION_CONFIG) {
  if (!enableBonuses || !config.bonusRules.availableInConfig) return 0;
  if (dealsCount <= 0 || fundedVolume <= 0) return 0;
  const qualifiesVolume = fundedVolume >= config.bonusRules.minMonthlyVolume;
  const qualifiesDeals = dealsCount >= config.bonusRules.minMonthlyDeals;
  if (!qualifiesVolume || !qualifiesDeals) return 0;
  return round2(fundedVolume * (config.bonusRules.bonusPercentOfVolume / 100));
}

/**
 * Main deterministic calculation entry point.
 */
export function calculateCommissions(rawInputs = {}, config = COMMISSION_CONFIG) {
  const validation = validateInputs(rawInputs, config);
  const inputs = validation.sanitized;

  const scenarioMultiplier = inputs.scenarioMultipliers[inputs.scenario] ?? 1.0;
  const modeledMonthlyDeals = inputs.monthlyDeals * scenarioMultiplier;

  const tierInfo = determinePartnerTier(modeledMonthlyDeals, config);
  const tierRateBonus = tierInfo.currentTier.tierRateBonus || 0;

  const breakdown = calculateMonthlyDealBreakdown(
    modeledMonthlyDeals,
    inputs.averageDealSize,
    inputs.allocations,
    inputs.customRates,
    tierRateBonus,
    config,
    inputs.customDealSizes
  );

  const creditProduct = config.products.find((p) => p.id === "business-credit");
  const creditMonthlyFee = creditProduct?.subscriptionMonthlyFee || 0;
  const steadyCreditSubscriptionCommission = inputs.enableCreditSubscription
    ? round2(inputs.creditSubscriptionClientsPerMonth * creditMonthlyFee)
    : 0;

  const monthlyQualifiedBonus = calculateQualifiedBonus(
    modeledMonthlyDeals,
    breakdown.totalFundedVolume,
    inputs.enableBonuses,
    config
  );

  const monthlyTrailRate = (config.recurringRules.annualizedTrailRatePercent || 0) / 100;
  const monthlyRetentionFactor = Math.pow(inputs.customerRetentionRate / 100, 1 / 12);

  const monthlyGrossCommission = round2(
    breakdown.totalDealCommission + steadyCreditSubscriptionCommission + monthlyQualifiedBonus
  );

  const annualizedGrossCommission = round2(monthlyGrossCommission * 12);
  const effectiveCommissionRatePercent =
    breakdown.totalFundedVolume > 0
      ? round2((breakdown.totalDealCommission / breakdown.totalFundedVolume) * 100)
      : 0;

  // 36-Month Deterministic Projection Engine
  const growthDecimal = inputs.monthlyGrowthRate / 100;
  const earnedQueue = [];
  const projections36 = [];

  let cumulativeEarned = 0;
  let cumulativeReceipts = 0;
  let cumulativeOperatingIncome = 0;
  let activeRetainedVolume = 0;
  let activeCreditSubscribers = 0;

  for (let m = 1; m <= 36; m++) {
    let projectedDeals = modeledMonthlyDeals * Math.pow(1 + growthDecimal, m - 1);
    if (inputs.rampUpMonths > 0 && m <= inputs.rampUpMonths) {
      projectedDeals = projectedDeals * (m / inputs.rampUpMonths);
    }
    if (inputs.maxMonthlyCapacity > 0) {
      projectedDeals = Math.min(projectedDeals, inputs.maxMonthlyCapacity);
    }
    projectedDeals = Math.max(0, projectedDeals);

    const monthTier = determinePartnerTier(projectedDeals, config).currentTier;
    const monthBreakdown = calculateMonthlyDealBreakdown(
      projectedDeals,
      inputs.averageDealSize,
      inputs.allocations,
      inputs.customRates,
      monthTier.tierRateBonus || 0,
      config,
      inputs.customDealSizes
    );

    const monthBonus = calculateQualifiedBonus(
      projectedDeals,
      monthBreakdown.totalFundedVolume,
      inputs.enableBonuses,
      config
    );

    let monthRecurring = 0;
    if (inputs.enableRecurring && activeRetainedVolume > 0) {
      monthRecurring = round2(activeRetainedVolume * monthlyTrailRate);
    }
    activeRetainedVolume = activeRetainedVolume * monthlyRetentionFactor + monthBreakdown.totalFundedVolume;

    let monthCreditSub = 0;
    if (inputs.enableCreditSubscription && inputs.creditSubscriptionClientsPerMonth > 0) {
      activeCreditSubscribers =
        activeCreditSubscribers * monthlyRetentionFactor + inputs.creditSubscriptionClientsPerMonth;
      monthCreditSub = round2(activeCreditSubscribers * creditMonthlyFee);
    }

    const commissionsEarned = round2(
      monthBreakdown.totalDealCommission + monthBonus + monthRecurring + monthCreditSub
    );
    earnedQueue.push(commissionsEarned);

    const receiptIndex = m - 1 - inputs.paymentDelayMonths;
    const commissionReceipts = receiptIndex >= 0 ? earnedQueue[receiptIndex] : 0;
    const estimatedPreTaxOperatingIncome = round2(commissionReceipts - inputs.operatingExpenses);

    cumulativeEarned = round2(cumulativeEarned + commissionsEarned);
    cumulativeReceipts = round2(cumulativeReceipts + commissionReceipts);
    cumulativeOperatingIncome = round2(cumulativeOperatingIncome + estimatedPreTaxOperatingIncome);

    projections36.push({
      month: m,
      deals: round2(projectedDeals),
      fundedVolume: monthBreakdown.totalFundedVolume,
      dealCommission: monthBreakdown.totalDealCommission,
      recurringCommission: monthRecurring,
      qualifiedBonus: monthBonus,
      creditSubscriptionCommission: monthCreditSub,
      commissionsEarned,
      commissionReceipts,
      operatingExpenses: round2(inputs.operatingExpenses),
      estimatedPreTaxOperatingIncome,
      cumulativeEarned,
      cumulativeReceipts,
      cumulativeOperatingIncome,
      tierName: monthTier.name,
    });
  }

  const projections12 = projections36.slice(0, 12);
  const projections24 = projections36.slice(0, 24);

  const firstYearCumulativeEarned = round2(projections12.reduce((s, r) => s + r.commissionsEarned, 0));
  const firstYearCumulativeReceipts = round2(projections12.reduce((s, r) => s + r.commissionReceipts, 0));
  const twentyFourMonthCumulativeEarned = round2(projections24.reduce((s, r) => s + r.commissionsEarned, 0));
  const threeYearCumulativeEarned = round2(projections36.reduce((s, r) => s + r.commissionsEarned, 0));
  const threeYearCumulativeReceipts = round2(projections36.reduce((s, r) => s + r.commissionReceipts, 0));
  const firstYearNetOperatingIncome = round2(
    projections12.reduce((s, r) => s + r.estimatedPreTaxOperatingIncome, 0)
  );

  const month1 = projections36[0];
  const monthlyNetOperatingIncome = round2(monthlyGrossCommission - inputs.operatingExpenses);

  // Income Target Reverse Calculation using weighted per-product deal size & rates
  const unitDealBreakdown = calculateMonthlyDealBreakdown(
    1,
    inputs.averageDealSize,
    inputs.allocations,
    inputs.customRates,
    tierRateBonus,
    config,
    inputs.customDealSizes
  );
  const commissionPerDeal = unitDealBreakdown.totalDealCommission;
  const weightedDealSizePerUnit = unitDealBreakdown.totalFundedVolume;
  const targetRemainingAfterSub = Math.max(0, inputs.targetMonthlyIncome - steadyCreditSubscriptionCommission);
  const dealsForTargetIncome =
    commissionPerDeal > 0 && targetRemainingAfterSub > 0
      ? Math.ceil(targetRemainingAfterSub / commissionPerDeal)
      : 0;
  const exactDealsForTargetIncome =
    commissionPerDeal > 0 && targetRemainingAfterSub > 0
      ? round2(targetRemainingAfterSub / commissionPerDeal)
      : 0;
  const volumeForTargetIncome = round2(dealsForTargetIncome * weightedDealSizePerUnit);
  const targetGapMonthly = round2(monthlyGrossCommission - inputs.targetMonthlyIncome);
  const targetAttainmentPercent =
    inputs.targetMonthlyIncome > 0
      ? round2((monthlyGrossCommission / inputs.targetMonthlyIncome) * 100)
      : 100;

  return {
    meta: {
      programName: config.programName,
      version: config.version,
      effectiveDate: config.effectiveDate,
      verificationStatus: config.verificationStatus,
      approvedSourceReference: config.approvedSourceReference,
      currency: config.currency,
    },
    validation,
    inputs,
    scenario: {
      id: inputs.scenario,
      label: config.scenarios[inputs.scenario].label,
      multiplier: scenarioMultiplier,
    },
    modeledMonthlyDeals: round2(modeledMonthlyDeals),
    weightedAverageDealSize: breakdown.weightedAverageDealSize,
    totalMonthlyFundedVolume: breakdown.totalFundedVolume,
    effectiveCommissionRatePercent,
    dealBasedMonthlyCommission: breakdown.totalDealCommission,
    creditSubscriptionMonthlyCommission: steadyCreditSubscriptionCommission,
    monthlyQualifiedBonus,
    monthlyGrossCommission,
    month1CommissionReceipts: month1 ? month1.commissionReceipts : 0,
    monthlyOperatingExpenses: round2(inputs.operatingExpenses),
    monthlyNetOperatingIncome,
    annualizedGrossCommission,
    firstYearCumulativeCommission: firstYearCumulativeEarned,
    firstYearCumulativeReceipts,
    firstYearNetOperatingIncome,
    twentyFourMonthCumulativeCommission: twentyFourMonthCumulativeEarned,
    threeYearCumulativeCommission: threeYearCumulativeEarned,
    threeYearCumulativeReceipts,
    productResults: breakdown.productResults,
    tier: tierInfo,
    projections12,
    projections24,
    projections36,
    incomeTarget: {
      targetMonthlyIncome: round2(inputs.targetMonthlyIncome),
      commissionPerDeal: round2(commissionPerDeal),
      dealsNeeded: dealsForTargetIncome,
      exactDealsNeeded: exactDealsForTargetIncome,
      volumeNeeded: volumeForTargetIncome,
      monthlyGap: targetGapMonthly,
      attainmentPercent: targetAttainmentPercent,
      isTargetMet: monthlyGrossCommission >= inputs.targetMonthlyIncome && inputs.targetMonthlyIncome > 0,
    },
  };
}

export function calculateAllScenarios(rawInputs = {}, config = COMMISSION_CONFIG) {
  const keys = ["conservative", "base", "optimistic"];
  const map = {};
  for (const key of keys) {
    map[key] = calculateCommissions({ ...rawInputs, scenario: key }, config);
  }
  return map;
}

export function formatCurrency(value, compact = false) {
  const num = Number.isFinite(Number(value)) ? Number(value) : 0;
  if (compact && Math.abs(num) >= 1000000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value, decimals = 1) {
  const num = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
