import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { COMMISSION_CONFIG } from "../shared/config/commission-config.js";
import { calculateCommissions } from "../shared/lib/calculator-engine.js";
import { createDefaultState } from "../shared/lib/state.js";

const rootDir = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "variants.json"), "utf8"));

test("Manifest designates strictly one production default (variant-1) and preserves all 4 variants", () => {
  assert.equal(manifest.defaultVariant, "variant-1");
  assert.equal(manifest.variants.length, 4);
  const selected = manifest.variants.filter((v) => v.selectedForProduction);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].variantId, "variant-1");
});

test("All four variants exist independently, import shared engine, and have valid relative paths", () => {
  const requiredSemanticIds = [
    "input-monthly-deals",
    "input-monthly-deals-slider",
    "input-avg-deal-size",
    "input-target-income",
    "projection-chart-container",
    "scenario-chart-container",
    "tiers-grid",
    "methodology-list",
    "faq-list",
  ];

  for (const variant of manifest.variants) {
    const dir = path.join(rootDir, variant.folderPath);
    for (const file of ["index.html", "style.css", "script.js", "theme.json"]) {
      assert.ok(fs.existsSync(path.join(dir, file)), `Missing ${file} in ${variant.variantId}`);
    }

    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
    const theme = JSON.parse(fs.readFileSync(path.join(dir, "theme.json"), "utf8"));

    assert.equal(theme.themeId, variant.themeId);
    assert.ok(js.includes("../../shared/lib/controller.js"), `${variant.variantId} must import shared controller`);
    assert.ok(js.includes("../../shared/config/commission-config.js"), `${variant.variantId} must import shared config`);
    assert.ok(js.includes("data-product-dsize"), `${variant.variantId} must expose per-product deal size inputs`);
    assert.ok(js.includes("data-product-rate"), `${variant.variantId} must expose per-product commission rate inputs`);

    // Verify all local relative imports resolve
    for (const match of js.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
      const resolved = path.resolve(dir, match[1]);
      assert.ok(fs.existsSync(resolved), `Broken import ${match[1]} in ${variant.variantId}`);
    }

    // Verify all local img assets exist
    for (const match of html.matchAll(/src="(\.\/assets\/[^"]+)"/g)) {
      const resolved = path.resolve(dir, match[1]);
      assert.ok(fs.existsSync(resolved), `Missing image asset ${match[1]} in ${variant.variantId}`);
    }

    // Verify semantic input/output IDs exist for cross-variant parity
    for (const id of requiredSemanticIds) {
      assert.ok(html.includes(`id="${id}"`), `Missing semantic ID #${id} in ${variant.variantId}`);
    }

    // Review variants must carry noindex
    assert.ok(html.includes('name="robots" content="noindex'), `${variant.variantId} should carry noindex meta`);
  }
});

test("Production root matches Variant 1, has zero theme gallery links, and works without sites/ folder", () => {
  const rootHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const rootCss = fs.readFileSync(path.join(rootDir, "style.css"), "utf8");
  const rootJs = fs.readFileSync(path.join(rootDir, "script.js"), "utf8");
  const v1Css = fs.readFileSync(path.join(rootDir, "sites/variant-1/style.css"), "utf8");

  assert.equal(rootCss, v1Css, "Root style.css must match authoritative Variant 1 source");
  assert.ok(rootHtml.includes("Broker Commission Calculator | Moonshine Capital Partner Program"));
  assert.ok(rootHtml.includes("CALCULATE YOUR"), "Root must render Variant 1 Punk Utility Brutalism");
  assert.ok(rootJs.includes("data-product-dsize"), "Production root must expose per-product deal size inputs");
  assert.ok(rootJs.includes("data-product-rate"), "Production root must expose per-product commission rate inputs");
  assert.equal(rootHtml.includes("noindex"), false, "Production root must NOT carry noindex");
  assert.equal(rootHtml.includes("sites/index.html"), false, "Production root must NOT link to review gallery");
  assert.equal(rootJs.includes("sites/"), false, "Production root must NOT depend on sites/ folder");

  // Verify every root JS import resolves cleanly
  for (const match of rootJs.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const resolved = path.resolve(rootDir, match[1]);
    assert.ok(fs.existsSync(resolved), `Broken root import ${match[1]}`);
  }
});

test("Cross-variant financial calculation parity across root and all 4 variants", async () => {
  const sharedInputs = {
    ...createDefaultState(COMMISSION_CONFIG),
    monthlyDeals: 14,
    averageDealSize: 85000,
    monthlyGrowthRate: 2.5,
    operatingExpenses: 1800,
    paymentDelayMonths: 1,
    scenario: "optimistic",
  };

  // All variants and production root import the exact same shared engine module
  const expected = calculateCommissions(sharedInputs, COMMISSION_CONFIG);
  const pathsToCheck = [
    "./shared/lib/calculator-engine.js",
    "./sites/variant-1/../../shared/lib/calculator-engine.js",
    "./sites/variant-2/../../shared/lib/calculator-engine.js",
    "./sites/variant-3/../../shared/lib/calculator-engine.js",
    "./sites/variant-4/../../shared/lib/calculator-engine.js",
  ];

  for (const relPath of pathsToCheck) {
    const mod = await import(path.resolve(rootDir, relPath));
    const result = mod.calculateCommissions(sharedInputs, COMMISSION_CONFIG);
    assert.deepEqual(result, expected);
  }
});
