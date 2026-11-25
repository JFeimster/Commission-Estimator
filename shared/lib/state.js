/**
 * Shared Application State & URL Serialization
 * Includes per-product deal sizes and per-product commission rates.
 * Strictly omits any contact details or personal identifying information.
 */

import { COMMISSION_CONFIG, getDefaultAllocations, getEqualAllocations } from "../config/commission-config.js";

export function createDefaultState(config = COMMISSION_CONFIG) {
  return {
    monthlyDeals: config.defaultAssumptions.monthlyDeals,
    averageDealSize: config.defaultAssumptions.averageDealSize,
    allocationMode: config.defaultAssumptions.allocationMode,
    allocations: getDefaultAllocations(config),
    customRates: {},
    customDealSizes: {},
    scenario: config.defaultAssumptions.scenario,
    scenarioMultipliers: {
      conservative: config.scenarios.conservative.multiplier,
      base: config.scenarios.base.multiplier,
      optimistic: config.scenarios.optimistic.multiplier,
    },
    monthlyGrowthRate: config.defaultAssumptions.monthlyGrowthRate,
    rampUpMonths: config.defaultAssumptions.rampUpMonths,
    maxMonthlyCapacity: config.defaultAssumptions.maxMonthlyCapacity,
    customerRetentionRate: config.defaultAssumptions.customerRetentionRate,
    operatingExpenses: config.defaultAssumptions.operatingExpenses,
    paymentDelayMonths: config.defaultAssumptions.paymentDelayMonths,
    projectionHorizon: 36,
    enableBonuses: config.defaultAssumptions.enableBonuses,
    enableRecurring: config.defaultAssumptions.enableRecurring,
    enableCreditSubscription: config.defaultAssumptions.enableCreditSubscription,
    creditSubscriptionClientsPerMonth: config.defaultAssumptions.creditSubscriptionClientsPerMonth,
    targetMonthlyIncome: config.defaultAssumptions.targetMonthlyIncome,
  };
}

export function createBaselineDemoState(config = COMMISSION_CONFIG) {
  const base = createDefaultState(config);
  const customRates = {};
  for (const p of config.products) {
    customRates[p.id] = config.standardDemonstrationBaseline.uniformIllustrativeRate;
  }
  return {
    ...base,
    monthlyDeals: config.standardDemonstrationBaseline.monthlyDeals,
    averageDealSize: config.standardDemonstrationBaseline.averageDealSize,
    customRates,
    customDealSizes: {},
    monthlyGrowthRate: 0,
    operatingExpenses: 0,
    paymentDelayMonths: 0,
    rampUpMonths: 0,
    enableBonuses: false,
    enableRecurring: false,
  };
}

export function normalizeAllocationsTo100(allocations, config = COMMISSION_CONFIG) {
  const enabled = config.products.filter((p) => p.enabled !== false);
  const total = enabled.reduce((s, p) => s + Math.max(0, Number(allocations[p.id] || 0)), 0);
  if (total <= 0) return getEqualAllocations(config);

  const next = {};
  let running = 0;
  enabled.forEach((p, idx) => {
    if (idx === enabled.length - 1) {
      next[p.id] = Math.max(0, Math.round((100 - running) * 10) / 10);
    } else {
      const scaled = Math.round(((Math.max(0, Number(allocations[p.id] || 0)) / total) * 100) * 10) / 10;
      next[p.id] = scaled;
      running += scaled;
    }
  });
  return next;
}

export function encodeScenarioToSearchParams(state, config = COMMISSION_CONFIG) {
  const params = new URLSearchParams();
  params.set("deals", String(state.monthlyDeals));
  params.set("size", String(state.averageDealSize));
  params.set("scenario", String(state.scenario));
  params.set("mode", String(state.allocationMode));
  params.set("horizon", String(state.projectionHorizon));

  if (state.monthlyGrowthRate !== 0) params.set("growth", String(state.monthlyGrowthRate));
  if (state.operatingExpenses > 0) params.set("expenses", String(state.operatingExpenses));
  if (state.paymentDelayMonths > 0) params.set("delay", String(state.paymentDelayMonths));
  if (state.rampUpMonths > 0) params.set("ramp", String(state.rampUpMonths));
  if (state.maxMonthlyCapacity > 0) params.set("cap", String(state.maxMonthlyCapacity));
  if (state.enableBonuses) params.set("bonuses", "1");
  if (state.enableRecurring) {
    params.set("recurring", "1");
    params.set("retention", String(state.customerRetentionRate));
  }
  if (state.enableCreditSubscription && state.creditSubscriptionClientsPerMonth > 0) {
    params.set("csub", String(state.creditSubscriptionClientsPerMonth));
  }
  if (state.targetMonthlyIncome > 0) params.set("target", String(state.targetMonthlyIncome));

  const allocParts = config.products
    .filter((p) => p.enabled !== false)
    .map((p) => `${p.id}:${state.allocations[p.id] ?? p.defaultAllocation}`);
  params.set("alloc", allocParts.join(","));

  if (state.customRates && Object.keys(state.customRates).length > 0) {
    const rateParts = Object.entries(state.customRates)
      .filter(([, val]) => val !== undefined && val !== "")
      .map(([id, val]) => `${id}:${val}`);
    if (rateParts.length > 0) params.set("rates", rateParts.join(","));
  }

  if (state.customDealSizes && Object.keys(state.customDealSizes).length > 0) {
    const sizeParts = Object.entries(state.customDealSizes)
      .filter(([, val]) => val !== undefined && val !== "")
      .map(([id, val]) => `${id}:${val}`);
    if (sizeParts.length > 0) params.set("dsizes", sizeParts.join(","));
  }

  return params.toString();
}

export function buildShareableUrl(state, currentLocation = typeof window !== "undefined" ? window.location : null) {
  const query = encodeScenarioToSearchParams(state);
  if (!currentLocation) return `?${query}`;
  return `${currentLocation.origin}${currentLocation.pathname}?${query}`;
}

export function decodeScenarioFromSearch(searchString = "", config = COMMISSION_CONFIG) {
  const base = createDefaultState(config);
  if (!searchString) return base;
  const params = new URLSearchParams(searchString.startsWith("?") ? searchString.slice(1) : searchString);

  if (params.has("deals")) base.monthlyDeals = Number(params.get("deals"));
  if (params.has("size")) base.averageDealSize = Number(params.get("size"));
  if (params.has("scenario") && config.scenarios[params.get("scenario")]) {
    base.scenario = params.get("scenario");
  }
  if (params.get("mode") === "equal") {
    base.allocationMode = "equal";
    base.allocations = getEqualAllocations(config);
  }
  if (params.has("horizon")) base.projectionHorizon = Number(params.get("horizon"));
  if (params.has("growth")) base.monthlyGrowthRate = Number(params.get("growth"));
  if (params.has("expenses")) base.operatingExpenses = Number(params.get("expenses"));
  if (params.has("delay")) base.paymentDelayMonths = Number(params.get("delay"));
  if (params.has("ramp")) base.rampUpMonths = Number(params.get("ramp"));
  if (params.has("cap")) base.maxMonthlyCapacity = Number(params.get("cap"));
  if (params.get("bonuses") === "1") base.enableBonuses = true;
  if (params.get("recurring") === "1") base.enableRecurring = true;
  if (params.has("retention")) base.customerRetentionRate = Number(params.get("retention"));
  if (params.has("csub")) {
    base.enableCreditSubscription = true;
    base.creditSubscriptionClientsPerMonth = Number(params.get("csub"));
  }
  if (params.has("target")) base.targetMonthlyIncome = Number(params.get("target"));

  if (params.has("alloc") && base.allocationMode !== "equal") {
    const parsed = { ...base.allocations };
    params
      .get("alloc")
      .split(",")
      .forEach((pair) => {
        const [id, val] = pair.split(":");
        if (id && parsed[id] !== undefined && Number.isFinite(Number(val))) {
          parsed[id] = Number(val);
        }
      });
    base.allocations = parsed;
  }

  if (params.has("rates")) {
    const customRates = {};
    params
      .get("rates")
      .split(",")
      .forEach((pair) => {
        const [id, val] = pair.split(":");
        if (id && Number.isFinite(Number(val))) {
          customRates[id] = Number(val);
        }
      });
    base.customRates = customRates;
  }

  if (params.has("dsizes")) {
    const customDealSizes = {};
    params
      .get("dsizes")
      .split(",")
      .forEach((pair) => {
        const [id, val] = pair.split(":");
        if (id && Number.isFinite(Number(val))) {
          customDealSizes[id] = Number(val);
        }
      });
    base.customDealSizes = customDealSizes;
  }

  return base;
}
