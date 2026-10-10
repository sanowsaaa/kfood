# Customer loading review — 10 October 2026

## Changes

The home page previously downloaded every public product, sorted them by rating
and displayed eight. It now requests eight rows ordered by descending rating and
ascending id, retaining the same selection and public field list. A read-only
anonymous API comparison against the 839 current products confirmed that all
eight returned rows exactly match the previous selection. Availability still
uses the existing stock validation. Every home visit makes a fresh request;
prices, stock and customer data are not cached by this change.

The startup import of the unused translation bootstrap has been removed. No
component consumes translations, and all existing Bulgarian copy remains in
place. The translation files and package dependencies are retained.

The existing high-priority home hero preload now runs only for direct home
navigation. Other routes no longer download an unused 41,498-byte home image.
The home image itself and its high loading priority are unchanged.

## Measured bytes

These are file and API response sizes, not visitor loading times. Gzip sizes
were calculated locally for a consistent comparison; actual delivery depends
on the hosting provider and response encoding.

| Resource | Before | After |
| --- | ---: | ---: |
| Home product JSON, decoded | 513,384 B / 839 rows | 5,479 B / 8 rows |
| Home product JSON, gzip | 85,651 B | 2,128 B |
| Main entry JavaScript, decoded | 91,162 B | 41,089 B |
| Main entry JavaScript, gzip | 28,767 B | 13,277 B |
| Startup JavaScript including static dependencies, decoded | 568,778 B | 518,705 B |
| Startup JavaScript including static dependencies, gzip | 165,584 B | 150,094 B |
| Unused home hero on direct shopping/payment routes | 41,498 B | 0 B |

The home product response is 97.5% smaller with gzip. Startup JavaScript is
9.4% smaller with gzip. Neither percentage describes the speed of the whole site.
React, Router and Supabase retain their existing versions and chunks. Admin,
B2B and checkout pages retain their existing lazy loading.

## Browser measurements and limits

Six isolated runs per build used a 390px viewport, Chrome CPU slowdown of 4x,
the current 839 public products and local request fixtures. Product pictures
were replaced with deterministic fixtures, existing cached font assets were
used, marketing consent was declined, and all network requests stayed local.
This measures rendering in the compiled app; it excludes real hosting, CDN,
database latency and mobile network transfer.

| Median observed value | Home before | Home after | Catalog before | Catalog after |
| --- | ---: | ---: | ---: | ---: |
| First contentful paint | 592 ms | 564 ms | 1,040 ms | 572 ms |
| Last observed largest contentful paint | 1,288 ms | 1,472 ms | 5,988 ms | 5,512 ms |
| Sum of observed layout shifts without recent input | 0.203 | 0.203 | 0.005 | 0.005 |
| Sum of observed long tasks | 676 ms | 533 ms | 2,018 ms | 1,395 ms |

These small samples vary and are not a Lighthouse score or a Core Web Vitals
pass. In particular, the home LCP sample did not improve. Only the byte savings
and removed requests are deterministic results of this change. The layout-shift
sum is a diagnostic observation, not a production field CLS measurement.

The catalog still mounts 833 visible product cards after the existing alcohol
filter, creating 15,516 DOM elements. Its rendering remains the main performance
concern under CPU slowdown. The home layout-shift trace also needs a separate
review of loading placeholders and font transitions. Neither is declared fixed
by this change.

An attempted read-only browser navigation to the public domain returned
`net::ERR_EMPTY_RESPONSE` in this environment. HTTP reads were available, but
their proxy/network timing is not a valid measurement of a Bulgarian visitor's
experience. No production LCP, INP or CLS verdict is available from this review.
The public stylesheet also lacks the `.customer-product-image` rule introduced
by the previous main merge; it does not represent the latest product-card build.
This work does not publish the site or change its payment mode.

Google's real-user targets are LCP ≤2.5 seconds, INP ≤200 ms and CLS ≤0.1 at the
75th percentile, separately for mobile and desktop:
[Web Vitals](https://web.dev/articles/vitals). Lighthouse does not measure field
INP. Measure the published customer pages before claiming a speed pass.

## Verification

Three new compiled-browser regressions verify the existing highest-rated
selection with ties, refreshed prices/stock after returning home, denied-read
retry, and home-only hero loading. The local REST fixture now respects ordering
and limits so these checks exercise realistic responses.

Release verification results are recorded in the pull request. The change does
not modify checkout validation, cart calculations, payment proof, tracking,
email handlers, B2B approval, authentication, database schema or access rules.

## Next performance work

1. Measure the current published home, catalog, product, cart and checkout on
   mobile and desktop; separate hosting response time, transfer and rendering.
2. Reduce catalog rendering work while preserving search, filters, all product
   links, stock states, age checks, quick view and scroll position. Compare the
   existing customer flows before merging that separate change.
3. Identify the home layout-shift sources and stabilize the affected loading
   placeholders/font metrics without changing the established design.
4. Review the font/icon request waterfall and actual response compression and
   caching. Preserve icon appearance, keyboard controls and text contrast.

Fresh stock/prices at checkout and network-only private/payment endpoints remain
required. Aggressive caching of these endpoints is not a speed optimization.
