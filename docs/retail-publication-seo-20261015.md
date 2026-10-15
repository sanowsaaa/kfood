# Retail publication and SEO verification — 15 October 2026

The owner's instruction was to include every current product with a positive retail price in the retail shop, while preserving independent B2B publication and all commercial values.

## Production data change

At 08:23 UTC, 291 products changed from `wholesale` to `retail`. All 837 products had a positive, cent-precise `price`; none depended on a missing/zero retail price or the legacy `price_euro` field. Retail publication is now 837; `b2b_enabled` remains enabled for the same 837 products.

This was a one-time, guarded data update. The administrator's separate retail and B2B checkboxes remain authoritative for later edits and new products. Prices do not automatically override an administrator's subsequent decision to hide a product.

Only `visibility` was assigned; the existing trigger advanced `updated_at` and `edit_version`. A repeatable-read transaction locked the target rows, rejected stale revisions/prices or unbacked candidates, and aborted if any other product field changed. Descriptions, SEO metadata, names, categories, URLs, inventory, SKU/EAN and every retail/B2B/carton/cost price remained unchanged. No schema, RLS, checkout, payment or email code changed.

Verification hashes across the same 837 IDs:

- All price fields and SKU: `e440ead38735e9a12dc07bc422cc8da1` before and after.
- Every product column except visibility and trigger timestamps/revisions: `3e2206b0a249241ee46f6946801f3e04` before and after.
- Orders before/after: 67; no test order or payment was created.

The source backup is [backup/pre-retail-publication-20261015](https://github.com/sanowsaaa/kfood/tree/backup/pre-retail-publication-20261015), based on `3cbf3a30d46b24a990045db29065a61f8de93823`. The owner has a private complete product snapshot and a visibility-only rollback that refuses subsequent product edits. Do not restore old prices or stock over later orders.

## SEO checks and correction

Anonymous REST access returned exactly 837 retail rows and no non-retail rows. Anonymous reads of wholesale price, carton price, MOQ and cost price were denied. The existing public SKU read permission was not changed.

All 837 public products have unique, valid slugs, unique nonempty SEO titles and unique nonempty meta descriptions. Every product image uses HTTPS on an allowed image host. The refreshed `public/sitemap-products.xml` contains exactly the 837 current retail canonical URLs and their 837 image entries, with no B2B or administrator routes. Its URL/image pairs were compared directly with the anonymous production inventory.

The live site's sitemap still served 546 URLs and zero image entries during the audit. This commit corrects the checked-in fallback used when publishing from Readdy; it needs Pull and Publish before that public XML changes. The live database publication itself is already effective.

Local verification: TypeScript compilation and production build passed; 26 SEO tests passed (one real-PostgreSQL concurrency case is reserved for CI), 18 catalog/admin channel tests passed, and 13 customer unit tests passed. An additional isolated browser check used all 837 public records at 1440 px and 390 px and verified all product links. It also checked a product in every category, the newly public Pepero example, numeric-to-slug navigation and a missing product: matching titles/descriptions, one canonical, correct Open Graph URL/image, one Product/Offer with the unchanged retail price and actual availability, and noindex without a stale Product schema for the missing page. These three browser scenarios passed without external writes.

## Remaining technical limitation

The live host returns a shared SPA HTML document for product paths: its initial title is the home title, and individual product canonical/metadata/content are supplied after JavaScript and the product request. A nonexistent product path also initially returns HTTP 200; the rendered application marks it noindex.

Google can render JavaScript, but this remains a limitation for initial HTML, non-rendering crawlers and social previews. It has not been solved by changing the sitemap or retail visibility. A subsequent rendering/hosting change should be evaluated separately and must preserve live price/stock reads and private B2B data rather than publish a full private catalogue snapshot.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps), [Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).

