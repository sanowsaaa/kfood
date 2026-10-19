# Console and loading fixes — 2026-10-19

The production HTML blocked its hosting analytics script and Meta Pixel transports with CSP, repeated an unsupported `frame-ancestors` meta directive, and fetched two external render-blocking stylesheets. The original Inter/Playfair Display typography and Remix Icon 4.0.0 are now bundled with the application.

## Observed production baseline

PageSpeed report, 2026-10-19: https://pagespeed.web.dev/analysis/https-k-foodvelikotarnovo-com/s531kmjj4i?form_factor=mobile

- Mobile performance 71; FCP 3.4 s; LCP 5.9 s; TBT 0 ms; CLS 0; SEO 100.
- Render-blocking resources: site CSS 500 ms, jsDelivr icon CSS 1,050 ms, Google Fonts CSS 750 ms. Estimated savings 1,560 ms are Lighthouse's estimate, not a promised improvement.
- The separate 28-day real-user results were LCP 3.0 s, INP 221 ms, CLS 0.17. They describe older visits as well and do not update immediately after a deployment.

## Changes

- Keep hosting analytics auto-initialization disabled (`EventReportingConfig.autoInit=false`, `enabled=false`). The inspected library automatically sends full URLs and persistent identifiers otherwise; allowing its script must not newly enable that behavior on guest order/auth URLs. Existing Meta consent handling remains.
- Permit only the injected `https://public.readdy.ai/analysis/event-reporting.min.js` script path, alongside existing script sources. Permit Meta's `https://www.facebook.com/tr/` fetch/form transports without allowing arbitrary Facebook form destinations or arbitrary Readdy scripts.
- Remove the ineffective `frame-ancestors` meta directive. Browsers support it only as an HTTP response header. Production returned neither a CSP response header nor X-Frame-Options during this audit; embedding protection still requires a supported hosting header configuration. No unsupported `_headers` file is presented as an effective fix.
- Add `mobile-web-app-capable` and retain the Apple-specific metadata.
- Serve the same Google Fonts WOFF2 files locally, keeping all original language subsets, normal/italic styles and used weight ranges. Keep the complete original Remix Icon font and glyph map. Licenses and sources are in `src/assets/fonts/THIRD-PARTY-NOTICES.md`.
- Give decorative icon glyphs an empty CSS text alternative, with the original declaration as an older-browser fallback. Visible glyphs remain unchanged; screen readers use a button's text instead of an extra private-use character.
- Preload the two used Inter subsets and connect to the actual hero host. Preserve the homepage-only hero preload, product prerender readiness and existing Meta consent/sensitive-URL safeguards.
- Register the existing service worker after the load event. Genuine registration failures remain visible as warnings; the success-only console message is removed. API/private-response caching rules are unchanged.

No database, Edge Function, checkout, webhook, price, SKU/EAN, wholesale-price or email code changes are included.

## Validation

- TypeScript and production build passed with the existing lockfile.
- Offline compiled-app browser tests: 64 customer tests passed; two optional contrast tests skipped; 31 B2B tests passed; 23 administrator tests passed. Requests were fulfilled locally, including checkout and email-related workflows; these were not real payments or emails.
- Seven browser-policy regressions exercise allowed hosting/Meta transports, denied/no consent, sensitive query parameters and blocking a different script on the same hosting origin. Actual font files and icon glyphs load in the compiled build.
- Client/service-worker unit tests: 13 passed. Admin operations: 15 passed. SEO: 26 passed and one database-dependent test skipped locally. Product HTML/prerender: 17 passed. The PR's full existing workflow must pass before merging.
- Three cold local contexts per version at 390 × 844 with identical offline API/image/font fixtures: external stylesheets dropped from two to zero; both versions had no JavaScript exceptions or horizontal overflow and CLS below 0.001. Median local FCP was 88 ms before/84 ms after; median LCP 456/448 ms. This unthrottled local comparison verifies regressions and request removal, not a new production speed score.

## Publish and rollback

1. After the checked PR is merged, Pull `main` in Readdy and publish.
2. Check home, a product, cart, checkout, guest order tracking, B2B login and the approved-partner workspace. Check console in a clean browser with both consent choices.
3. Run a fresh mobile and desktop PageSpeed report against the published build. Only this establishes the production result after the change.

Original source is preserved in `backup/pre-console-performance-20261019` at `0eb2d0f03bf7b5c9210cd0ed421f15eef88ae55e`. If rollback is needed, revert this PR's commit through a new PR, then Pull and publish that revision. No database rollback is needed. Do not reset main over unrelated later work.
