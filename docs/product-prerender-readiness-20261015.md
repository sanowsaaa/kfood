# Public product render readiness

## Observed production behavior

The Readdy deployment serves the ordinary SPA HTML to a normal visitor. Requests carrying a Googlebot User-Agent can receive an already executed HTML document, with `Vary: Accept-Encoding, Crawler-Proxy`.

In the five-product check on 2026-10-15, four original product URLs returned their heading and Product/Offer data. The original `/product/buldak-nudli-lyuto-pile` returned the product loading spinner, generic product title and no Product schema. A new diagnostic query for that same product returned the completed document, while the original URL still returned the incomplete document. This points to a cached incomplete render; it does not prove the provider's exact cache policy or identify its rendering software. These are diagnostic User-Agent requests, not Google Search Console live inspections.

## Scope of this change

A wider pre-change sample covered 19 original URLs across nine non-alcohol categories, selecting available and unavailable products. Sixteen returned complete product HTML and three returned a loading view: `/product/buldak-nudli-lyuto-pile`, `/product/haitai-frenski-pay-yabalkov-192-g` and `/product/story-miks-morski-darove`. There were no failed HTTP requests in that sample. This is a sample, not proof for the entire catalog. The anonymous inventory contained 821 public products, including six alcohol products whose existing age verification is preserved.

The shared public `/product/:id` route now exposes `window.prerenderReady`:

- It is `false` early in the initial document and while the existing app is loading.
- It becomes `true` after the actual app view, product identity, unique canonical, title, description, social metadata and Product/Offer URL agree.
- A confirmed missing product becomes ready only with noindex and without stale Product data, preserving HTTP 200 on the current host.
- A failed or incomplete read stays unready. This signal alone cannot force an upstream HTTP status or prevent the provider's eventual timeout capture.
- Navigation resets the signal before updating metadata. Old product data cannot release a different product's snapshot. Leaving the product route restores any pre-existing renderer flag.
- The existing alcohol age gate releases this product-only signal and keeps its existing behavior. B2B, administrator, checkout and other routes do not acquire it.

This is a signal for supporting renderers, **not an activation of the separate Node SSR pilot**. Readdy support for this signal is still unverified. It neither delays the visible UI nor changes reads, prices, SKU/EAN, B2B prices, payment/email functions, cookies, permissions or database state. It cannot invalidate an already cached upstream document.

## Host capability probe

After the normal Readdy Pull/Publish workflow, compare raw responses for:

- `/seo-host-check/readiness.html?mode=control`
- `/seo-host-check/readiness.html?mode=wait`

Both are standalone noindex/nofollow diagnostic pages, without products, customer information, external requests or application code. They simulate content completion after six seconds. Only `mode=wait` sets the readiness flag. The final document has title `K-FOOD — диагностичното съдържание е готово` and `data-probe-state="complete"`.

If the control is captured pending while the wait variant is captured complete, that supports the provider honoring the readiness signal. If both are captured complete, a generic capture delay may explain the result; that alone does not prove flag support. If both are pending, the signal may be ignored or overridden by a timeout. Do not promise catalog-wide completeness from one successful sample.

Next verify the original affected product URLs after the provider has refreshed its render cache. Use the existing five-product set and a wider cross-category sample. Check body and metadata together, including out-of-stock products, hidden/missing products, navigation, age verification, mobile basket and API errors. Review stale cache invalidation when catalog publication or availability changes; a query-string success is diagnostic and is not a replacement product URL.

## Validation and rollback

Node tests exercise incomplete and stale metadata, numeric aliases, missing/noindex state and restoration outside public products. Compiled-app browser tests cover the ordinary CSR route beyond the original five products, delayed data, SPA transitions, basket preservation and the age gate. No live checkout or email is triggered by these tests.

The source before this change is preserved in `backup/pre-prerender-ready-20261015` at `e4fdb6c3d1ed9317a9855fdba67ea038a952d697`. Revert the readiness merge and Pull/Publish to undo it. There are no database migrations or writes to roll back. An upstream cached document may still need a provider-side refresh.

Readiness semantics are documented by Prerender.io at https://docs.prerender.io/docs/best-practices-for-crawler-ready-pages and https://docs.prerender.io/docs/25-empty-or-partially-rendered-pages. This does not establish that Readdy uses that vendor or supports those controls.
