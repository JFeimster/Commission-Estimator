#!/usr/bin/env node
/**
 * Variant Promotion Script (Section 21)
 * Promotes an authoritative variant from sites/<variant-id>/ to the production root.
 *
 * Usage:
 *   npm run promote -- variant-1
 *   node scripts/promote-variant.mjs variant-2
 */

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const requestedVariant = process.argv[2] || "variant-1";

const manifestPath = path.join(rootDir, "variants.json");
if (!fs.existsSync(manifestPath)) {
  console.error("ERROR: variants.json not found at repository root.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const target = manifest.variants.find((v) => v.variantId === requestedVariant);

if (!target) {
  console.error(
    `ERROR: Unknown variant '${requestedVariant}'. Available: ${manifest.variants.map((v) => v.variantId).join(", ")}`
  );
  process.exit(1);
}

const variantDir = path.join(rootDir, target.folderPath);
const requiredFiles = ["index.html", "style.css", "script.js", "theme.json"];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(variantDir, file))) {
    console.error(`ERROR: Missing required file '${file}' in ${target.folderPath}`);
    process.exit(1);
  }
}

// 1. Update variants.json strictly enforcing one default variant
manifest.defaultVariant = target.variantId;
manifest.variants = manifest.variants.map((v) => ({
  ...v,
  selectedForProduction: v.variantId === target.variantId,
}));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

// 2. Update project.json production metadata
const projectPath = path.join(rootDir, "project.json");
if (fs.existsSync(projectPath)) {
  const proj = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  proj.primaryTheme = target.themeName;
  proj.defaultVariant = target.variantId;
  fs.writeFileSync(projectPath, JSON.stringify(proj, null, 2) + "\n", "utf8");
}

// 3. Transform index.html for production root (remove noindex, ensure canonical SEO metadata)
let rootHtml = fs.readFileSync(path.join(variantDir, "index.html"), "utf8");
rootHtml = rootHtml.replace(/<meta\s+name="robots"\s+content="noindex[^"]*"\s*\/?>\s*/gi, "");
rootHtml = rootHtml.replace(
  /<title>[^<]*<\/title>/i,
  "<title>Broker Commission Calculator | Moonshine Capital Partner Program</title>"
);
// Ensure any ../../shared references in HTML resolve cleanly to ./shared
rootHtml = rootHtml.replace(/\.\.\/\.\.\/shared\//g, "./shared/");

// 4. Copy style.css verbatim
const rootCss = fs.readFileSync(path.join(variantDir, "style.css"), "utf8");

// 5. Transform script.js relative shared imports (../../shared/ -> ./shared/)
let rootJs = fs.readFileSync(path.join(variantDir, "script.js"), "utf8");
rootJs = rootJs.replace(/\.\.\/\.\.\/shared\//g, "./shared/");

// 6. Write root production files
fs.writeFileSync(path.join(rootDir, "index.html"), rootHtml, "utf8");
fs.writeFileSync(path.join(rootDir, "style.css"), rootCss, "utf8");
fs.writeFileSync(path.join(rootDir, "script.js"), rootJs, "utf8");

// 7. Sync variant assets to root ./assets/ if present
const variantAssetsDir = path.join(variantDir, "assets");
const rootAssetsDir = path.join(rootDir, "assets");
if (fs.existsSync(rootAssetsDir)) {
  fs.rmSync(rootAssetsDir, { recursive: true, force: true });
}
if (fs.existsSync(variantAssetsDir)) {
  const entries = fs.readdirSync(variantAssetsDir);
  if (entries.length > 0) {
    fs.cpSync(variantAssetsDir, rootAssetsDir, { recursive: true, force: true });
  }
}

// 8. Verify generated root references resolve
const importMatches = [...rootJs.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1]);
for (const imp of importMatches) {
  const resolved = path.resolve(rootDir, imp);
  if (!fs.existsSync(resolved)) {
    console.error(`ERROR: Unresolved root module import '${imp}' -> ${resolved}`);
    process.exit(1);
  }
}

const defaultCount = manifest.variants.filter((v) => v.selectedForProduction).length;
if (defaultCount !== 1) {
  console.error(`ERROR: Expected exactly 1 selected production variant, found ${defaultCount}`);
  process.exit(1);
}

console.log(`Promoted ${target.variantId} (${target.themeName}) to production root successfully.`);
console.log(`Verified ${importMatches.length} shared module imports and preserved all ${manifest.variants.length} variants.`);
