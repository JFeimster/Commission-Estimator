# Commission Estimator release and embeds

Variant 1 (Punk Utility Brutalism) is the exclusive standalone design. All four source variants remain under `sites/`. Production includes `/` and `/embed/`, without a gallery. The repository and production domain remain unchanged.

## Validate and prepare

```powershell
npm ci
npm run build
npm run lint
npm test
npm run export:portfolio
```

Tests inspect build artifacts, so build first. Export writes `dist/portfolio/sites/commission-estimator/`. The Vercel build runs `npm run build` afresh and cleans that package from the standalone output. Do not manually publish the post-export `dist` folder. Vite's public-directory copying is disabled to exclude agreements and unreviewed uploads; required runtime assets are bundled.

## Embed example

Paste into Wix's HTML iframe component, a static website or a portal:

```html
<iframe id="commission-estimator" title="Commission Estimator"
  src="https://commission-estimator-six.vercel.app/embed/?theme=auto&amp;plan=direct-rate&amp;compact=true&amp;deals=10&amp;amount=50000&amp;rate=3&amp;growth=0&amp;months=12&amp;currency=USD&amp;cta=true"
  style="width:100%;height:1150px;border:0" loading="lazy"
  referrerpolicy="origin"></iframe>
```

Optional responsive resizing on parent pages that allow JavaScript:

```html
<script>
const frame = document.getElementById('commission-estimator');
const estimatorOrigin = 'https://commission-estimator-six.vercel.app';
window.addEventListener('message', event => {
  if (event.origin !== estimatorOrigin || event.source !== frame.contentWindow) return;
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  if (Object.keys(data).sort().join(',') !== 'height,type,version') return;
  if (data.type !== 'commission-estimator:resize' || data.version !== 1) return;
  if (!Number.isInteger(data.height) || data.height < 200 || data.height > 4000) return;
  frame.style.height = data.height + 'px';
});
</script>
```

The child sends height-only messages to the referrer's exact HTTP(S) origin and accepts no incoming commands. Without a referrer, use fixed sizing. In Wix, use component sizing controls if parent scripts are unavailable.

| Parameter | Behavior |
| --- | --- |
| theme | dark, light, auto (default) |
| plan | direct-rate (default), agency maps to agency-override, iso to iso-volume-split, custom to custom-partner |
| compact | true (default), false |
| partner | Approved public slug from the existing partner-links module. The allowlist is empty pending schedule approval; unknown values are ignored. |
| ref | Optional opaque campaign ID, 1-48 letters, digits, underscores or hyphens. Never put names, contacts, credentials or private identifiers in URLs. Retained in memory only; not sent to destinations. |
| cta | true (default), false; fixed destination is the full simulator |
| deals | 0-250 |
| amount | 0-10000000 USD; shared engine's existing zero-volume boundary |
| rate | 0-25%, illustrative Direct or Custom only; verified schedules ignore overrides |
| growth | -25 to 25% monthly |
| months | 12, 24, 36; unsupported values use the configured default |
| currency | USD only |

Numeric validation uses the shared engine. Unsupported/nonfinite inputs are ignored. Sharing uses the existing serializer and opens the full simulator. Agency and ISO use the existing defaults; advanced controls remain available in the full simulator. The embed has no lead submission.

Only `/embed` and descendants permit external framing. Other routes retain SAMEORIGIN and `frame-ancestors 'self'`. No X-Frame-Options rule applies to embed. Vite preview does not apply Vercel headers; deployed-header verification remains a release step.

## Release after authorization

Review and commit the focused files first. A push can trigger Vercel's Git integration, so obtain release authorization before pushing.

```powershell
git push -u origin codex/batch-01-release-embed-portfolio
# Confirm the existing linked Vercel project before deploying:
npx vercel deploy --prod
curl.exe -I https://commission-estimator-six.vercel.app/
curl.exe -I https://commission-estimator-six.vercel.app/embed/
```

Confirm standalone framing protection, embed CSP without X-Frame-Options, working calculations, and 404s for alternate design galleries. No merge or deployment was performed by this batch.
