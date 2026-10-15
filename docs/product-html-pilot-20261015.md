# Five-product HTML pilot

This is an opt-in renderer and a neutral hosting probe. A normal Readdy `npm run build` continues to build the existing client application. Merging these files does **not** activate server rendering on the public product URLs.

## Scope

| Product ID | Public slug |
| --- | --- |
| 28 | `buldak-nudli-lyuto-pile` |
| 48 | `samyang-lyut-sos-buldak-karbonara-200-g` |
| 103 | `shokoladova-biskvitka-pepero-32-gr` |
| 243 | `pepero-snezhen-badem-32-g-x-40` |
| 470 | `ramen-buldak-chasha-karbonara-80-g-x-6` |

The renderer uses the existing React product view, shared SEO helpers and current anonymous Supabase reads. It neither forwards a visitor session nor uses a service-role key. Only explicitly selected public columns are serialized. Existing visible catalog ratings are retained in the view; the shared SEO helper continues to omit unverified aggregate ratings from structured data. B2B, administrator, basket, checkout and tracking routes stay outside the renderer. Prices, identifiers, publication flags and database contents are never written by this pilot.

Each request rechecks the product ID, slug and `visibility=retail`. HTML and CDN caching are disabled. A confirmed hidden or missing product returns **200 with noindex**, respecting the hosting constraint. An upstream failure, timeout or invalid product returns **503 with noindex and Retry-After**, without a saved price or offer. Alcohol products are excluded to preserve the existing age verification.

The preview is noindex by default. The handler accepts an explicit `indexable: true` only for a subsequently verified hosting integration. It returns the same content to crawlers and visitors. Numeric URLs use the public slug as canonical.

The server view is outside the normal React root. With JavaScript, the existing application loads its basket and public data before taking over. The bridge prevents buying from the temporary server view. Without JavaScript, the product content and metadata remain readable; the existing interactive checkout still requires JavaScript.

## Local verification

```sh
npm ci
npm run typecheck
npm run test:seo-html
npm run build
npm run preview:seo-html -- --public-config /private/public-api.json
```

The private JSON file contains `{ "url": "https://PROJECT.supabase.co", "key": "PUBLIC_ANON_OR_PUBLISHABLE_KEY" }`. Do not commit environment configuration or use a server secret. The preview binds only to `127.0.0.1` and remains noindex.

The optional browser suite needs a built `dist`, the SSR build and Playwright:

```sh
CUSTOMER_PLAYWRIGHT_MODULE_PATH=/path/to/playwright/index.mjs \
CUSTOMER_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell \
CUSTOMER_BROWSER_SINGLE_PROCESS=1 \
node --test tests/product-html-ui.test.mjs
```

All browser traffic is intercepted. Tests cover desktop/mobile, JavaScript disabled, basket preservation, a hidden product and a public API error. No actual checkout, order or email is triggered. The nine renderer tests run in the existing CI workflow alongside the repository's payment, B2B, security, catalog, client and SEO checks.

## Readdy hosting check and activation gate

1. Pull the merged `main` into Readdy and publish using the existing workflow.
2. Fetch `/seo-host-check/index.html` as raw HTML. It must contain `kfood-static-html-pilot-20261015-v1` and its own title, rather than the generic SPA shell. The probe is noindex and contains no product or customer data.
3. This proves only that an independent static HTML file is served. It does **not** prove a server runtime, per-request rendering or route rewrites. Verify those capabilities in the actual Readdy project before connecting the renderer.
4. If a compatible runtime and routing are available, build both targets and connect the handler only to the five allowlisted products and their numeric aliases. Other requests must fall through to the existing application. Keep pilot responses noindex during host verification.
5. On the actual host, verify raw HTML, one canonical, matching title/description/Product/Offer, image access, missing/hidden 200+noindex, outage 503, cache headers, fresh stock/price reads, the original basket and mobile purchase controls. Measure response latency there; local timings do not establish production performance.
6. Enable indexing for the verified five URLs only after those checks pass. Expansion to the rest of the catalog is a separate step. If Readdy cannot run the handler, do not publish stored product/price snapshots as a substitute or claim that SSR is live.

## Catalog and rollback

The checked-in product sitemap is refreshed from the current anonymous retail catalog. Administrator publication choices remain authoritative; a retail price does not force a hidden product back into the store.

Pre-pilot source is preserved in `backup/pre-product-html-pilot-20261015` at `8ce5f4346eed7d04531380f38b4ebfb9c1a1d220`. To undo this opt-in pilot, revert its merge commit and use the existing Readdy Pull/Publish workflow. No database rollback is needed because this pilot performs no database writes. If a server route has subsequently been connected, remove that routing first and restore the ordinary SPA fallback.
