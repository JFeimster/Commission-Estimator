/**
 * Shared Financial Engine Type Contracts
 * Mirrors the runtime structures in /shared/config/commission-config.js
 * and /shared/lib/calculator-engine.js.
 */

export type VariantId = "variant-1" | "variant-2" | "variant-3" | "variant-4";
export type ScenarioKey = "conservative" | "base" | "optimistic";
export type CompensationMethod = "percentage" | "fixed";

export interface ProductDefinition {
  id: string;
  name: string;
  shortName: string;
  enabled: boolean;
  compensationMethod: CompensationMethod;
  commissionRate: number;
  fixedFee: number;
  subscriptionMonthlyFee?: number;
  commissionableBasis: string;
  defaultAllocation: number;
  defaultDealSize: number;
  description: string;
}

export interface CalculatorState {
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
}
