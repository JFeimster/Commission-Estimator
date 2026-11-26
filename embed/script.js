import { COMMISSION_CONFIG as config } from '../shared/config/commission-config.js';
import { APPROVED_PUBLIC_PARTNERS } from '../shared/config/partner-links.js';
import { calculateCommissions, formatCurrency } from '../shared/lib/calculator-engine.js';
import { decodeEmbedOptions, encodeScenarioToSearchParams, PUBLIC_PLAN_ALIASES, sanitizeScenarioState } from '../shared/lib/state.js';

const options = decodeEmbedOptions(location.search, config, APPROVED_PUBLIC_PARTNERS);
let state = options.state;
const $ = id => document.getElementById(id);
document.body.dataset.theme = options.theme;
document.body.dataset.compact = String(options.compact);
$('cta').hidden = !options.cta;
const fields = { deals: 'monthlyDeals', amount: 'averageDealSize', growth: 'monthlyGrowthRate', months: 'projectionHorizon' };
for (const [id, min, max] of [['deals', config.limits.minMonthlyDeals, config.limits.maxMonthlyDeals], ['amount', 0, config.limits.maxDealSize], ['growth', config.limits.minGrowthRate, config.limits.maxGrowthRate]]) {
  $(id).min = min; $(id).max = max;
}
$('plan').value = Object.keys(PUBLIC_PLAN_ALIASES).find(key => PUBLIC_PLAN_ALIASES[key] === state.payPlanId);
if (new URLSearchParams(location.search).has('rate') && Object.keys(state.customRates).length) $('rate').value = Object.values(state.customRates)[0];
function render() {
  state = sanitizeScenarioState(state, config);
  for (const [id, key] of Object.entries(fields)) $(id).value = state[key];
  $('rate-field').hidden = config.verificationStatus === 'VERIFIED PROGRAM MODE' || !['direct-rate', 'custom-partner'].includes(state.payPlanId);
  const result = calculateCommissions(state, config);
  $('monthly').textContent = formatCurrency(result.monthlyGrossCommission);
  const total = result.projections36.slice(0, state.projectionHorizon).reduce((sum, row) => sum + row.commissionsEarned, 0);
  $('projection').textContent = `${state.projectionHorizon}-month estimated earned commissions: ${formatCurrency(total)}`;
  $('basis').textContent = `${result.payPlan.name}. ${result.payPlan.disclosure}`;
  if (config.verificationStatus === 'VERIFIED PROGRAM MODE') $('disclosure').textContent = 'Approved program schedule. Estimates depend on funding, qualification and executed agreement terms. No income guarantee.';
}
$('calculator').addEventListener('submit', event => event.preventDefault());
$('calculator').addEventListener('input', event => {
  const id = event.target.id;
  if (fields[id] && event.target.value.trim() && Number.isFinite(Number(event.target.value))) state[fields[id]] = Number(event.target.value);
  if (id === 'plan') { state.payPlanId = PUBLIC_PLAN_ALIASES[$('plan').value]; state.customRates = {}; $('rate').value = ''; }
  if (id === 'rate' && !$('rate-field').hidden) {
    const value = event.target.value;
    state.customRates = value.trim() && Number.isFinite(Number(value)) ? Object.fromEntries(config.products.map(p => [p.id, Math.min(25, Math.max(0, Number(value)))])) : {};
    if (state.payPlanId === 'custom-partner') state.customPlan = { ...state.customPlan, baseType: 'direct-percent', personalSplitPercent: 100 };
  }
  render();
});
$('share').addEventListener('click', async () => {
  const url = new URL('https://commission-estimator-six.vercel.app/');
  url.search = encodeScenarioToSearchParams(state, config);
  try { await navigator.clipboard.writeText(url.href); $('feedback').textContent = 'Scenario link copied'; }
  catch { $('feedback').textContent = 'Copy is unavailable in this browser.'; }
});
// One-way, height-only contract. No wildcard destination or incoming commands.
let parentOrigin = null;
try { const url = new URL(document.referrer); if (['https:', 'http:'].includes(url.protocol)) parentOrigin = url.origin; } catch {}
let lastHeight = 0;
new ResizeObserver(() => {
  const height = Math.ceil(document.body.getBoundingClientRect().height);
  if (parentOrigin && parent !== window && height >= 200 && height <= 4000 && height !== lastHeight) {
    parent.postMessage({ type: 'commission-estimator:resize', version: 1, height }, parentOrigin);
    lastHeight = height;
  }
}).observe(document.body);
render();
