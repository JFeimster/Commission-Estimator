#!/usr/bin/env node
/**
 * Flash-UI Portfolio Export Script (Sections 22 & 23)
 * Exports a self-contained, nested-URL-compatible grouped portfolio project to:
 *   dist/portfolio/sites/commission-estimator/
 *
 * Rewrites shared module imports from ../../shared/ -> ../shared/ so all 4 variants
 * operate cleanly when copied into the Flash-UI Portfolio sites/ directory.
 */

import fs from "node:fs";
import path from "node:path";
import { COMMISSION_CONFIG } from "../shared/config/commission-config.js";
import { PAY_PLANS } from "../shared/config/pay-plans/index.js";
import { assertPublicConfiguration, validatePublicTree } from "./public-export-safety.mjs";
assertPublicConfiguration(COMMISSION_CONFIG, PAY_PLANS);

const rootDir = process.cwd();
const slug = "commission-estimator";
const finalDir = path.join(rootDir, "dist", "portfolio", "sites", slug);
const destDir = `${finalDir}.staging`;

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(destDir, { recursive: true });

// Copy only runtime modules; never source agreements, registries or private links.
const sharedDest = path.join(destDir, "shared");
for (const file of [
  "lib/calculator-engine.js", "lib/charts.js", "lib/controller.js", "lib/faq-data.js",
  "lib/pay-plan-ui.js", "lib/reporting.js", "lib/state.js",
  "config/pay-plans/index.js", "config/pay-plans/direct-rate.js", "config/pay-plans/agency-override.js",
  "config/pay-plans/iso-volume-split.js", "config/pay-plans/custom-partner.js",
]) {
  fs.mkdirSync(path.dirname(path.join(sharedDest, file)), { recursive: true });
  fs.copyFileSync(path.join(rootDir, "shared", file), path.join(sharedDest, file));
}
fs.copyFileSync(path.join(rootDir, "shared/config/commission-config.js"), path.join(sharedDest, "config/commission-config.js"));
fs.writeFileSync(path.join(sharedDest, "config/partner-links.js"), `export const PARTNER_LINKS = {becomePartnerUrl:null,speakWithRecruiterUrl:null,partnerBrochureUrl:null,leadCaptureEndpoint:null,canonicalBaseUrl:null,supportEmailDisplay:null};\nexport const APPROVED_PUBLIC_PARTNERS = {};\n`);

// 2. Copy all 4 variants and rewrite ../../shared/ -> ../shared/ for nested portfolio layout
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "variants.json"), "utf8"));
const portfolioManifest = {
  ...manifest,
  variants: manifest.variants.map((v) => ({
    ...v,
    folderPath: `${v.variantId}/`,
    themeDefinitionPath: `${v.variantId}/theme.json`,
  })),
};

for (const v of manifest.variants) {
  const srcVariantDir = path.join(rootDir, v.folderPath);
  const destVariantDir = path.join(destDir, v.variantId);
  fs.cpSync(srcVariantDir, destVariantDir, { recursive: true, force: true });

  const jsPath = path.join(destVariantDir, "script.js");
  let jsContent = fs.readFileSync(jsPath, "utf8");
  jsContent = jsContent.replace(/\.\.\/\.\.\/shared\//g, "../shared/");
  fs.writeFileSync(jsPath, jsContent, "utf8");

  const htmlPath = path.join(destVariantDir, "index.html");
  fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, "utf8").replaceAll("../../shared/", "../shared/"));

  // Verify rewritten imports resolve inside portfolio export
  const imports = [...jsContent.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1]);
  for (const imp of imports) {
    const resolved = path.resolve(destVariantDir, imp);
    if (!fs.existsSync(resolved)) {
      console.error(`ERROR: Portfolio export broken import in ${v.variantId}/script.js: ${imp}`);
      process.exit(1);
    }
  }
}

// 3. Copy portable gallery as index.html (adjusting Production Site button to ./variant-1/index.html)
let galleryHtml = fs.readFileSync(path.join(rootDir, "sites", "index.html"), "utf8");
galleryHtml = galleryHtml.replace(/\.\.\/previews\/commission-estimator/g, '/assets/previews/commission-estimator');
fs.writeFileSync(path.join(destDir, "index.html"), galleryHtml, "utf8");

// 4. Copy metadata, previews, and README
fs.writeFileSync(path.join(destDir, "variants.json"), JSON.stringify(portfolioManifest, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(destDir, "package.json"), JSON.stringify({ name: "commission-estimator-portfolio", private: true, type: "module" }, null, 2) + "\n");
fs.cpSync(path.join(rootDir, "project.json"), path.join(destDir, "project.json"));
fs.writeFileSync(path.join(destDir, "README.md"), "# Commission Estimator\nFunding Partner & Agency Revenue Simulator\nFour visual variants share one calculator engine. All schedules are illustrative and unverified. Lead submission and external partner recruitment links are disabled.\n");
if (fs.existsSync(path.join(rootDir, "previews"))) {
  fs.cpSync(path.join(rootDir, "previews"), path.join(destDir, "previews"), { recursive: true, force: true });
}

// 5. Generate proposed Flash-UI Portfolio data/site-registry.json entry
const proposedRegistryEntry = {
  id: slug,
  slug,
  title: "Commission Estimator",
  subtitle: "Funding Partner & Agency Revenue Simulator",
  category: "Funding Tools",
  subcategory: "Commission Modeling",
  productType: "Calculator",
  industry: "Financial Services",
  type: "group-hub",
  status: "portfolio-site",
  source: "curated-canonical-registry",
  path: `sites/${slug}`,
  livePath: `/sites/${slug}/`,
  hasIndex: true,
  variantNumbers: [1, 2, 3, 4],
  visualStyles: ["Punk Utility Brutalism", "Broker's Manifesto", "Lime Precision Fintech", "Pastel Intelligence"],
  lifecycle: "active-development",
  repositoryUrl: "https://github.com/JFeimster/Commission-Estimator",
  productionUrl: "https://commission-estimator-six.vercel.app/",
  distribution: ["standalone", "embed", "portfolio-preview"],
  version: manifest.version,
  grouped: true,
  variants: [1, 2, 3, 4],
  defaultVariant: 1,
  selectedProductionVariant: "variant-1",
  entryPath: `sites/${slug}/index.html`,
  productionEntryPath: `sites/${slug}/variant-1/index.html`,
  variantEntries: manifest.variants.map((v) => ({
    number: v.variantNumber,
    id: v.variantId,
    themeId: v.themeId,
    name: v.themeName,
    selected: v.selectedForProduction,
    path: `sites/${slug}/${v.variantId}/index.html`,
  })),
  description:
    "Four independently designed visual themes (Punk Utility Brutalism, Broker's Manifesto, Lime Precision Fintech, Pastel Intelligence) powered by one shared deterministic financial calculation engine.",
};

fs.writeFileSync(
  path.join(destDir, "proposed-site-registry-entry.json"),
  JSON.stringify(proposedRegistryEntry, null, 2) + "\n",
  "utf8"
);

validatePublicTree(destDir);
fs.rmSync(finalDir, { recursive: true, force: true });
fs.renameSync(destDir, finalDir);
console.log(`Flash-UI Portfolio export completed & verified at:\n  ${finalDir}`);
