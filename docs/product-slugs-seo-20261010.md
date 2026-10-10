# Product slugs and SEO — 10 October 2026

The owner's requirement is a descriptive, unique slug for every existing product, with that address used in product SEO and the sitemap. This change covers the existing 839 products, including the records already available through the public catalog. It does not change catalog visibility, prices, stock, orders, partner approval, email functions or Stripe configuration.

## Database

`20261010060218_product_slugs_and_seo.sql` fills the 396 missing slugs, preserving the 443 existing valid addresses. Bulgarian names are transliterated; brands, flavours and package sizes remain in the address. Existing collisions use a product-ID suffix and, when necessary, an additional suffix. No generated product IDs are hardcoded into the migration.

An invoker trigger assigns slugs to future inserts, including the existing admin form and imports. A name edit preserves the current URL, and clearing an existing slug restores it. Explicit invalid/numeric slugs are rejected. The existing unique constraint remains; a format check and NOT NULL ensure products cannot lose their address. Advisory locking serializes slug allocation for concurrent inserts; ordinary stock/price updates do not invoke this trigger. Table permissions and RLS policies are unchanged, and both new functions have a fixed empty search path.

The migration refuses a long lock wait. Its transaction verifies that all columns except `slug`/`updated_at` remain identical, and that every pre-existing slug is unchanged. Production changes must be preceded by the tests and followed by a complete inventory check.

## Frontend and sitemap

The common URL helper accepts relative and absolute inputs without duplicating the domain. Canonical, `og:url`, Product Offer URL and the last breadcrumb use the same slug address. The generic canonical to `/` is removed from the initial SPA document; each public page supplies its own existing metadata. The existing `/product/:id` route still resolves old numeric links and replaces the browser location with the product's slug. Existing retail and B2B product links already prefer `slug` and retain their ID fallback.

The checked-in `sitemap-products.xml` contains all 839 verified product addresses exactly once. The index links to local XML files, avoiding the observed deployment rewrite of Supabase URLs into HTML routes. The 33 current blog URLs are preserved in a local snapshot. That blog snapshot is separate from the product refresh and must be regenerated when the article inventory changes.

On each Vite production build, the product sitemap refreshes from the same public Supabase configuration as the frontend. It requests only ID, slug and timestamps using the existing public key. Exact counts and pagination handle API row limits; duplicates, missing slugs, changing counts, empty inventories and errors cannot overwrite the checked-in snapshot. An unsuccessful refresh produces a build warning and retains the last complete file. New products added after publication require a subsequent build/publication to enter this static sitemap; the existing dynamic Supabase generator also reads their slugs.

## Validation and rollout

- SQL tests cover backfill, unchanged business data, existing URLs, admin inserts, renaming, duplicate names and reserved suffixes, invalid values, permissions and simultaneous PostgreSQL inserts.
- The 839-row production inventory is also replayed into an isolated PGlite database before applying the migration; the resulting slug map is compared after production application.
- Sitemap tests cover all rows, invalid/partial responses, exact counts, pagination below the requested API limit and retention during a failure.
- Compiled browser tests verify slug and numeric entry paths against canonical, Open Graph, Offer and breadcrumb, without production writes. Existing customer/B2B/admin tests remain applicable.
- GitHub runs the existing payment/B2B/admin/customer checks plus `test:seo`. Its disposable PostgreSQL database verifies concurrency; the local PGlite run explicitly skips that single concurrency test.
- Apply the checked migration, verify 839 nonempty distinct valid slugs and unchanged old addresses, then merge the checked code into `main`.
- The owner performs Readdy pull and publication. Verify the actual public XML and rendered canonical after that publication. This PR does not perform Readdy publication, change the current maintenance response or request Google indexing.

Prepared on branch `codex/product-slugs-seo-20261010` from main `7f24a1dedafff2e309ce6cd8e3b0463e6d86dfc5`.

## Verified result

Production migration version: `20261010060218` (the committed filename matches the Supabase history). Its SQL content was unchanged from the tested migration: SHA-256 `b6388bdea5a65a0ce62b75349bb8e70e1b111d1fe9dcd94ced8b5db396003fd2`.

Production verification found 839 nonempty, valid, distinct slugs, no changed pre-existing address, and a complete match with the isolated 839-product replay. Of the 396 filled addresses, 278 are retail and 118 wholesale. The existing dynamic product generator also returns 839 URLs. The fresh production build XML matches every live slug and the checked-in fallback. Security advisor findings are identical apart from their observation timestamps.

Local browser validation passed 63 existing customer/B2B/admin checks and two added product SEO checks (slug and numeric entry), with all browser requests fulfilled locally. TypeScript, build, customer operations and the local SEO suite passed. The concurrency test passed in GitHub disposable PostgreSQL, alongside the existing payment/B2B/admin/customer workflow. Readdy publication remains pending.
