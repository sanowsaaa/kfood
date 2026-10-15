# Product editorial SEO — 15 October 2026

## Scope and coverage

The production inventory has 837 products, not 900: 546 retail and 291 wholesale-only.
All 837 descriptions, page titles and search descriptions were populated. The
546 public page titles are distinct. IDs, product names, existing slugs, images,
categories, stock, publication channels, every price field and SKU values were
preserved. There is no separate EAN column; the preservation check covers every
existing product column except the three editorial fields and the automatic
revision/timestamp.

The before-state is preserved on `backup/pre-product-seo-20261015` and in a
separate private product backup. The full editorial payload, source provenance,
31 identity-review notes and guarded data rollback stay outside this repository:
they include B2B-only identities and must never enter the public app bundle.

## Content and search presentation

The Bulgarian descriptions identify the product and explain its use in two
readable paragraphs. Product families share relevant preparation/serving
guidance; this is not a claim that every regional package or ingredient list was
independently verified. Individual copy is added where reliable product context
is available. Manufacturer sites and the supplier catalogue were used alongside
the store's product records and images. Conflicting names, pack sizes, codes and
categories are recorded privately for label review, without changing those fields.
No ingredient declarations, nutritional amounts, medical effects or prep times
were invented to fill missing evidence.

The detail page reads `seo_title` and `seo_description` only on its existing
retail-filtered request. Null metadata falls back to the current name/description.
An ordinary admin name/description edit clears obsolete editorial metadata;
price/stock/SKU/channel edits leave it alone. Existing checkout, price arithmetic,
inventory holds, partner approval, mail outboxes and Edge Functions are unchanged.

The description follows the desktop buy controls and uses plain React text
paragraphs. The mobile buy bar remains accessible. The unsupported hardcoded
claim that every product originates in South Korea was removed; no replacement
country was guessed. Product structured data still uses the actual retail price
and availability, without invented manufacturer, reviews or price expiry.

The product sitemap contains exactly 546 retail URLs and their 546 public HTTPS
images. B2B products are excluded through the existing anonymous RLS and explicit
retail filter. Stable product URLs and numeric-to-slug navigation are retained.

## Deployment and rendering limit

The additive metadata migration is applied in Supabase as
`20261015073731_product_editorial_metadata`. The data transaction completed with
837 rows and zero protected-field differences. All 837 deployed editorial values
were compared with the prepared content, and all 546 retail rows were independently
read back through the anonymous REST API. Wholesale-only metadata stays unreadable
to that API role.

The current hosting remains a Vite/React SPA. This change does not implement
server rendering: initial HTML still starts with the shared shell, and product
metadata/schema are populated after the product request. Google can render
JavaScript, but this is a remaining technical SEO limitation, especially for
non-rendering crawlers and social previews. A separate hosting-supported dynamic
rendering step is needed to put current product content in the initial HTML.
Do not solve this by publishing a full private catalogue snapshot or stale static
copies of prices and availability.

After the code is merged, Readdy Pull and Publish deploy the new presentation
and checked-in image sitemap. Product descriptions are already active in the
database. Search engines choose their own snippets and rankings; no position is
guaranteed by this update.

## Validation and rollback

The new tests cover additive migration, row/column access, full-field preservation,
concurrent editorial edits, all-or-nothing rollback, accidental trigger changes,
metadata invalidation and plain-text rendering. The catalog integration suite also
runs real checkout stock consumption and a B2B request after the SEO migration.
Browser checks cover canonical/social/schema consistency, long descriptions,
unchanged prices and visible buy controls at mobile and desktop sizes.

`scripts/productEditorial.mjs` accepts an explicit private JSON file and emits
data-only SQL outside the repository. Both apply and rollback lock rows, verify
the expected identity/content and compare every protected field inside the same
transaction. Rollback restores only the prior description/SEO; it refuses newer
editorial changes and never restores historical prices, inventory or orders.
The nullable columns are safe to retain if the previous frontend is restored.

## Primary references

- [Google product markup](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- [Google JavaScript structured data](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript)
- [Google image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
- [Readdy SEO configuration](https://docs.readdy.ai/features/seo)
- [Supabase column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Supplier catalogue](https://home.orderpanasia.com/wp-content/uploads/2025/04/KATALOG-2025-for-web.pdf)

Product-specific source mappings are in the private editorial record.
