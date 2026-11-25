#!/usr/bin/env node
/**
 * Review Deployment Builder (Section 24)
 * Generates dist/review/ containing production root + all 4 variants + gallery + shared core.
 * Ensures review variant pages and gallery carry noindex controls.
 */

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "dist", "review");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const copyTargets = [
  "index.html",
  "style.css",
  "script.js",
  "variants.json",
  "project.json",
  "shared",
  "sites",
];

for (const item of copyTargets) {
  const src = path.join(rootDir, item);
  const dest = path.join(outDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, force: true });
  }
}

if (fs.existsSync(path.join(rootDir, "assets"))) {
  fs.cpSync(path.join(rootDir, "assets"), path.join(outDir, "assets"), { recursive: true, force: true });
}

// Add robots.txt discouraging indexing of review deployment
fs.writeFileSync(path.join(outDir, "robots.txt"), "User-agent: *\nDisallow: /sites/\n", "utf8");

console.log(`Review deployment artifact generated at ${outDir}`);
