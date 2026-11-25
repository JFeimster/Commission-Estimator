#!/usr/bin/env node
/**
 * Flash-UI Portfolio Export Script (Sections 22 & 23)
 * Exports a self-contained, nested-URL-compatible grouped portfolio project to:
 *   dist/portfolio/sites/moonshine-broker-commission-calculator/
 *
 * Rewrites shared module imports from ../../shared/ -> ../shared/ so all 4 variants
 * operate cleanly when copied into the Flash-UI Portfolio sites/ directory.
 */

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const slug = "moonshine-broker-commission-calculator";
const destDir = path.join(rootDir, "dist", "portfolio", "sites", slug);

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(destDir, { recursive: true });

// 1. Copy shared core & force DEMONSTRATION MODE in exported portfolio artifact
const sharedDest = path.join(destDir, "shared");
fs.cpSync(path.join(rootDir, "shared"), sharedDest, { recursive: true, force: true });
const exportedConfigPath = path.join(sharedDest, "config", "commission-config.js");
let configContent = fs.readFileSync(exportedConfigPath, "utf8");
configContent = configContent.replace(
  /verificationStatus:\s*["']VERIFIED PROGRAM MODE["']/,
  'verificationStatus: "DEMONSTRATION MODE"'
);
fs.writeFileSync(exportedConfigPath, configContent, "utf8");

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
galleryHtml = galleryHtml.replace(/href="\.\.\/index\.html"/g, 'href="./variant-1/index.html"');
fs.writeFileSync(path.join(destDir, "index.html"), galleryHtml, "utf8");

// 4. Copy metadata, previews, and README
fs.writeFileSync(path.join(destDir, "variants.json"), JSON.stringify(portfolioManifest, null, 2) + "\n", "utf8");
fs.cpSync(path.join(rootDir, "project.json"), path.join(destDir, "project.json"));
fs.cpSync(path.join(rootDir, "README.md"), path.join(destDir, "README.md"));
if (fs.existsSync(path.join(rootDir, "previews"))) {
  fs.cpSync(path.join(rootDir, "previews"), path.join(destDir, "previews"), { recursive: true, force: true });
}

// 5. Generate proposed Flash-UI Portfolio data/site-registry.json entry
const proposedRegistryEntry = {
  id: slug,
  slug,
  title: "Moonshine Capital Broker Commission Calculator",
  category: "Fintech / Financial Modeling",
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

console.log(`Flash-UI Portfolio export completed & verified at:\n  ${destDir}`);
