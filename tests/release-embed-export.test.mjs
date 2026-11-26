import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { COMMISSION_CONFIG as config } from '../shared/config/commission-config.js';
import { PAY_PLANS } from '../shared/config/pay-plans/index.js';
import { decodeEmbedOptions, decodeScenarioFromSearch, createDefaultState, PUBLIC_PLAN_ALIASES } from '../shared/lib/state.js';
import { calculateCommissions } from '../shared/lib/calculator-engine.js';
import { assertPublicConfiguration, validatePublicTree } from '../scripts/public-export-safety.mjs';

test('public aliases use all existing plans and produce finite projections', () => {
  for (const [alias, id] of Object.entries(PUBLIC_PLAN_ALIASES)) {
    const { state } = decodeEmbedOptions(`plan=${alias}&deals=10&amount=50000&months=24&rate=3`);
    assert.equal(state.payPlanId, id);
    assert.equal(state.projectionHorizon, 24);
    const result = calculateCommissions(state);
    assert.ok(Number.isFinite(result.monthlyGrossCommission));
    assert.equal(result.validation.isValid, true);
    if (['direct-rate', 'custom'].includes(alias)) assert.equal(result.monthlyGrossCommission, 15000);
    else assert.deepEqual(state.customRates, {});
  }
});

test('embed parameters clamp numbers and ignore unsupported, nonfinite and unsafe input', () => {
  const { state, ...options } = decodeEmbedOptions('?deals=9999&amount=-20&growth=-90&rate=99&months=7&theme=javascript:alert(1)&plan=__proto__&partner=private&ref=user%40example.com&currency=EUR&compact=false&cta=false&redirect=https://evil.test');
  assert.equal(state.monthlyDeals, config.limits.maxMonthlyDeals);
  assert.equal(state.averageDealSize, 0);
  assert.equal(state.monthlyGrowthRate, config.limits.minGrowthRate);
  assert.equal(state.projectionHorizon, config.defaultAssumptions.projectionHorizon);
  assert.equal(state.payPlanId, 'direct-rate');
  assert.deepEqual(Object.values(state.customRates), config.products.map(() => 25));
  assert.deepEqual(options, { theme: 'auto', compact: false, cta: false, partner: null, ref: null, currency: 'USD' });
  for (const value of ['NaN', 'Infinity', '', 'abc']) {
    const decoded = decodeEmbedOptions(`deals=${value}&amount=${value}&growth=${value}&rate=${value}`);
    assert.equal(decoded.state.monthlyDeals, config.defaultAssumptions.monthlyDeals);
    assert.equal(decoded.state.averageDealSize, config.defaultAssumptions.averageDealSize);
    assert.deepEqual(decoded.state.customRates, {});
  }
  assert.equal(decodeEmbedOptions('partner=approved&ref=campaign_1', config, { approved: { publicDisclosureAuthorized: true } }).partner, 'approved');
  assert.equal(decodeEmbedOptions('partner=unapproved', config, { unapproved: {} }).partner, null);
});

test('verified rates resist both embed and legacy scenario query overrides', () => {
  const verified = structuredClone(config); verified.verificationStatus = 'VERIFIED PROGRAM MODE';
  for (const alias of Object.keys(PUBLIC_PLAN_ALIASES)) {
    const clean = decodeEmbedOptions(`plan=${alias}`, verified).state;
    const attack = decodeEmbedOptions(`plan=${alias}&rate=25&rates=business-capital:25&iso=25,1,1,25&cp=%7B%22s%22:100%7D`, verified).state;
    assert.deepEqual(attack, clean);
  }
  for (const id of Object.values(PUBLIC_PLAN_ALIASES)) {
    const query = `plan=${id}&rates=business-capital:25&iso=25,1,1,25&cp=%7B%22s%22:100%7D&ag=%7B%22br%22:99%7D`;
    const parsed = decodeScenarioFromSearch(query, verified);
    assert.deepEqual(parsed, decodeScenarioFromSearch(`plan=${id}`, verified));
  }
  const baseline = createDefaultState(verified);
  assert.equal(calculateCommissions({ ...baseline, customRates: { 'business-capital': 25 } }, verified).monthlyGrossCommission, calculateCommissions(baseline, verified).monthlyGrossCommission);
});

test('production build contains embed and excludes gallery, alternate variants and agreements', () => {
  assert.ok(fs.existsSync('dist/embed/index.html'), 'Run npm run build before npm test');
  assert.ok(fs.existsSync('dist/index.html'));
  assert.equal(fs.existsSync('dist/sites'), false);
  assert.equal(fs.existsSync('dist/assets/aistudio'), false);
  assert.equal(fs.readFileSync('dist/index.html', 'utf8').includes('sites/index'), false);
  const headers = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).headers;
  const embed = headers.find(rule => rule.source === '/embed/:path*');
  assert.ok(embed.headers.some(h => h.key === 'Content-Security-Policy' && h.value === 'frame-ancestors https: http:'));
  for (const route of ['/embed', '/embed/', '/embed/index.html']) {
    const rules = headers.filter(rule => rule.source !== '/embed/:path*' && new RegExp(`^${rule.source}$`).test(route));
    assert.equal(rules.flatMap(rule => rule.headers).some(h => h.key === 'X-Frame-Options'), false);
  }
  const main = headers.find(rule => rule.source === '/');
  assert.ok(new RegExp(`^${main.source}$`).test('/'));
  assert.ok(main.headers.some(h => h.key === 'X-Frame-Options'));
});

test('safe export preserves nested imports, four variants and disabled lead submission', () => {
  execFileSync(process.execPath, ['scripts/export-portfolio.mjs']);
  const root = 'dist/portfolio/sites/commission-estimator';
  validatePublicTree(root);
  const links = fs.readFileSync(`${root}/shared/config/partner-links.js`, 'utf8');
  assert.ok(links.includes('leadCaptureEndpoint:null'));
  assert.equal(links.includes('https:'), false);
  const entry = JSON.parse(fs.readFileSync(`${root}/proposed-site-registry-entry.json`, 'utf8'));
  assert.deepEqual(entry.variantNumbers, [1, 2, 3, 4]);
  assert.equal(entry.type, 'group-hub');
  for (let i = 1; i <= 4; i++) assert.ok(fs.readFileSync(`${root}/variant-${i}/script.js`, 'utf8').includes('../shared/lib/controller.js'));
});

test('public safeguards reject verified schedules, private fields and restricted files', () => {
  assertPublicConfiguration(config, PAY_PLANS);
  assert.throws(() => assertPublicConfiguration({ ...config, verificationStatus: 'VERIFIED PROGRAM MODE' }, PAY_PLANS));
  assert.throws(() => assertPublicConfiguration({ ...config, privatePartnerLink: 'private' }, PAY_PLANS));
  assert.throws(() => assertPublicConfiguration(config, { ...PAY_PLANS, restricted: { id: 'restricted' } }));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'commission-public-test-'));
  try {
    fs.writeFileSync(path.join(temp, 'agreement.pdf'), 'private agreement');
    assert.throws(() => validatePublicTree(temp));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
