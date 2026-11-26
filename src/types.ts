/**
 * Shared Financial Engine Type Contracts
 * Mirrors the runtime structures in /shared/config/commission-config.js,
 * /shared/config/pay-plans/, and /shared/lib/calculator-engine.js.
 */

export type VariantId = "variant-1" | "variant-2" | "variant-3" | "variant-4";
export type ScenarioKey = "conservative" | "base" | "optimistic";
export type CompensationMethod = "percentage" | "fixed";
export type PayPlanId = "direct-rate" | "agency-override" | "iso-volume-split" | "custom-partner";
export type OperatingMode = "solo" | "agency";

export interface ProductDefinition {
  id: string;
  name: string;
  shortName: string;
  enabled: boolean;
  compensationMethod: CompensationMethod;
  commissionRate: number;
  defaultBRRate?: number;
  fixedFee: number;
  subscriptionMonthlyFee?: number;
  commissionableBasis: string;
  defaultAllocation: number;
  defaultDealSize: number;
  description: string;
}

export interface AgencySpreadCohort {
  id: string;
  label: string;
  activeBrokers: number;
  avgMonthlyBR: number;
  brokerTierRate: number;
  intermediateManagerRate: number;
  intermediateIsQCB: boolean;
}

export interface AgencyFiveLevelRow {
  level: number;
  brokers: number;
  avgMonthlyBR: number;
}

export interface AgencyLeadershipInputs {
  gen1OpenlineBR: number;
  gen2OpenlineBR: number;
  gen3OpenlineBR: number;
}

export interface AgencyState {
  startingTier: number;
  isCertified: boolean;
  isQCB: boolean;
  autoAdvanceLadder: boolean;
  uniqueClientRatioPercent: number;
  frontlineQCBs: number;
  customBRRates: Record<string, number>;
  spreadCohorts: AgencySpreadCohort[];
  fiveLevels: AgencyFiveLevelRow[];
  leadership: AgencyLeadershipInputs;
}

export interface IsoState {
  markupPoints: number;
  subBrokerCount: number;
  subBrokerAvgMonthlyVolume: number;
  subBrokerOverridePercent: number;
}

export interface CustomPlanState {
  baseType: "direct-percent" | "bonus-revenue" | "points-markup";
  personalSplitPercent: number;
  markupPoints: number;
  bonusRevenuePercent: number;
  spreadOverridePercent: number;
  levelRates: number[];
}

export interface CalculatorState {
  payPlanId: PayPlanId;
  operatingMode: OperatingMode;
  monthlyDeals: number;
  averageDealSize: number;
  allocationMode: "equal" | "custom";
  allocations: Record<string, number>;
  customRates: Record<string, number>;
  customDealSizes: Record<string, number>;
  scenario: ScenarioKey;
  scenarioMultipliers: Record<ScenarioKey, number>;
  monthlyGrowthRate: number;
  rampUpMonths: number;
  maxMonthlyCapacity: number;
  customerRetentionRate: number;
  operatingExpenses: number;
  paymentDelayMonths: number;
  projectionHorizon: 12 | 24 | 36;
  enableBonuses: boolean;
  enableRecurring: boolean;
  enableCreditSubscription: boolean;
  creditSubscriptionClientsPerMonth: number;
  targetMonthlyIncome: number;
  agency: AgencyState;
  iso: IsoState;
  customPlan: CustomPlanState;
}
