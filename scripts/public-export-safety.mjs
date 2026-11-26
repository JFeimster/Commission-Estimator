import fs from 'node:fs';
import path from 'node:path';

export function assertPublicConfiguration(config, plans) {
  if (config.verificationStatus !== 'DEMONSTRATION MODE' || config.publicExportAllowed !== true ||
      !config.approvedSourceReference.startsWith('Illustrative Demonstration Schedule')) {
    throw new Error('Public export refused: restricted or verified schedules require an independently reviewed public configuration.');
  }
  for (const plan of Object.values(plans)) {
    if (plan.verificationStatus !== 'illustrative' || plan.publicExportAllowed !== true) throw new Error(`Public export refused: restricted plan ${plan.id}`);
  }
  const check = (value, key = '') => {
    if (/secret|credential|password|token|private|internal|agreement|endpoint/i.test(key)) throw new Error(`Public export refused: restricted field ${key}`);
    if (typeof value === 'string' && /https?:\/\/|BEGIN .*PRIVATE KEY|sk-[a-zA-Z0-9]{20}/.test(value)) throw new Error('Public export refused: unreviewed source link or credential.');
    if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) check(v, k);
  };
  check(config); check(plans);
}

export function validatePublicTree(root, boundary = path.resolve(root)) {
  for (const item of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, item.name);
    if (item.isSymbolicLink()) throw new Error(`Public export refused: symbolic link ${file}`);
    if (item.isDirectory()) { validatePublicTree(file, boundary); continue; }
    if (!/\.(html|css|js|json|md|png|jpe?g|webp|svg)$/i.test(file)) throw new Error(`Public export refused: unexpected file ${file}`);
    if (!/\.(html|css|js|json|md)$/i.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (/BEGIN .*PRIVATE KEY|sk-[a-zA-Z0-9]{20}|https?:\/\/[^\s"'<>]*(?:notion\.so|notion\.com)|DAC_Pay_Plan_Chart|leadCaptureEndpoint:\s*["']/i.test(content)) throw new Error(`Public export refused: restricted content in ${file}`);
    for (const match of content.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']|(?:src|href)=["'](\.[^"'#?]+)["']/g)) {
      const target = path.resolve(path.dirname(file), match[1] || match[2]);
      if (!target.startsWith(boundary + path.sep) || !fs.existsSync(target)) throw new Error(`Broken or escaping public asset: ${file} -> ${target}`);
    }
  }
}
