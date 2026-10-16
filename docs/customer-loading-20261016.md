# Customer journey, category artwork and loading review

Reviewed production source: `59ef093a50d535ec8bedf0508fb27b5d0c3bc4f5`. Backup: `backup/pre-category-speed-20261016`. No database writes or migrations, protected product edits, payment-mode changes or email sends are part of this work.

## Published-site baseline

The public PageSpeed UI successfully produced the report below after the API endpoint refused an initial request because of its shared daily quota. This is the **published version before this pull request**, not a measurement of the new code.

[Mobile report](https://pagespeed.web.dev/analysis/https-k-foodvelikotarnovo-com/q414yexx5a?form_factor=mobile) · [Desktop report](https://pagespeed.web.dev/analysis/https-k-foodvelikotarnovo-com/q414yexx5a?form_factor=desktop)

| Lighthouse measurement | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 57/100 | 94/100 |
| Accessibility | 92/100 | 95/100 |
| SEO checks | 100/100 | 100/100 |
| First contentful paint | 4.7 s | 0.8 s |
| Largest contentful paint | 8.3 s | 1.2 s |
| Total blocking time | 0 ms | 0 ms |
| Layout shift | 0.147 | 0.086 |

The report's separate mobile real-user section fails Core Web Vitals: LCP 3.1 s, INP 207 ms and CLS 0.17 over the preceding 28 days. These field values are not today's individual load or a result of this unpublished change. Google's good thresholds are LCP <=2.5 s, INP <=200 ms and CLS <=0.1 at the 75th percentile, separately by device. See https://web.dev/articles/vitals.

The mobile diagnostic identifies render-blocking stylesheets from the site, jsDelivr Remix Icon and Google Fonts; its estimated opportunity is 3,540 ms, not a promised saving. The LCP element is the existing hero image. The measured layout-shift culprit is the first product section's container. Existing font identities, icon assets, security policy and hero image are retained in this change.

## Changes and equivalence

- The ten supplied artworks are copied byte-for-byte into versioned Vite assets. They retain their entire 1920 x 1080 frame, with readable HTML captions and badges below the image. The first banner loads eagerly; the remaining nine use native lazy loading. The original uploads remain unchanged.
- The directory requests only public category names with exact totals, rather than the complete product records. It follows the server's actual page size and refuses incomplete or changing counts. Unavailable public products still count; hidden and wholesale-only products remain excluded.
- Each category requests only its own retail products. A read-only anonymous comparison against all 821 current public products proved identical records, prices and ordering for all ten category selections. Visits continue to fetch fresh data; no catalog, price, stock, private or payment response cache is introduced.
- The directory's contact link now uses the same `+359899897566` phone as the existing header/footer, replacing a placeholder number.
- The first product section no longer switches to `content-visibility:auto` after its data arrives. This section is already visible on mobile. Its product selection, contents and buy actions are unchanged. The same eight products and 580 DOM nodes remain in the controlled home sample.

| Upload | Category |
| --- | --- |
| 1.webp | Корейска козметика |
| 2.webp | Нудъли и Рамен |
| 3.webp | Продукти за готвене |
| 4.webp | Десерти |
| 5.webp | Сосове и Масла |
| 6.webp | Замразени продукти |
| 7.webp | Напитки |
| 8.webp | Нехранителни стоки |
| 9.webp | Снакс и Чай |
| 10.webp | Алкохол |

## Measured payloads and rendering limits

Anonymous live API reads of the same 821 public records gave these payloads. Gzip is computed locally for comparison; actual hosting compression can differ.

| Request | Decoded bytes | Local gzip bytes |
| --- | ---: | ---: |
| Full public inventory, previously used by both category screens | 1,000,340 | 126,026 |
| Directory category-name projection | 37,410 | 701 |
| Cosmetics category, the same 22 products | 30,605 | 6,730 |
| Noodles category, the same 89 products | 108,202 | 13,394 |
| Largest category, the same 248 cooking products | 300,690 | 35,338 |

The ten original WebP images total 1,175,002 bytes; individual files are 102,716–169,280 bytes. Deferred loading avoids treating this full collection as startup transfer. It is not a claim that the new images are smaller than the previous generated images, or that the whole site is faster by the payload reduction percentage.

Controlled compiled-app runs used a 390 px viewport, Chrome CPU slowdown 4x, current public product fixtures, locally intercepted requests and substitute remote images/fonts. These exclude real mobile transfer, hosting, database latency and field INP. Three initial runs per version showed the expected directory reduction and unchanged full-catalog geometry. A subsequent alternating catalog comparison found medians of 3,564 ms before and 3,482 ms after, with 815 cards and 15,256 DOM elements in both versions. This is small-sample laboratory variation, not a demonstrated catalog speed improvement.

The original home sample repeatedly recorded a layout-shift sum of 0.148. Attribution located the same product-section container as the public report. After removing its deferred-rendering switch, three separate home runs recorded zero observed shifts. This is local evidence for that fix, not a production CLS pass; repeat PageSpeed after Pull/Publish and allow the real-user reporting window to update.

## Customer journey and reliability

The published guest path was exercised through home -> categories -> noodles -> Buldak product -> quantity four -> cart -> checkout -> empty-contact validation. The expected EUR 13.20 total and fresh stock/price checks appeared; invalid contacts stopped progress and focused the email field. The test cart item was removed afterwards, returning the basket to its initial empty state. The guest tracking form loaded without login. No live checkout session, payment, order, review, subscription or email was submitted by this browser check.

Compiled-app regressions intercept all traffic locally. They cover mobile/desktop navigation, search/reload, filters, product slugs and metadata, quick view/focus, uncropped images and titles, age verification, corrupt drafts, saved items, minimum order, price/stock changes, failed requests/retry, duplicate submits, unsafe redirects, paid/pending/failed/review results, newer basket preservation, tracking errors and credential privacy, consent, newsletter/review failure retention, and private channel exclusion. New cases cover all ten artworks at 320/360/1440 px, exact category totals beyond 1000 records under a smaller API page limit, failed-count fallback, category switching/sorting and fresh prices, plus the first product section's layout stability with a delayed response. Optional external contrast-audit cases require their separate engine; they must not be represented as executed when skipped.

## Remaining priorities and release

1. Verify this exact build after Readdy Pull/Publish, including all ten category images, counts, an available and unavailable product, mobile basket and the first product section. Repeat the public PageSpeed mobile/desktop report. The current published score remains the baseline until then.
2. Address the observed mobile render-blocking font/icon stylesheet chain while preserving typefaces, Cyrillic glyphs, icon controls and CSP. Test font loading/fallback geometry before changing delivery.
3. Plan a separately reviewed reduction of the full catalog's 815 simultaneously mounted cards. Preserve all search/filter/sort results, product URLs, stock/age checks, focus and return-scroll behavior. This request does not introduce pagination or virtualization.
4. Review the public report's accessible-name, heading-order and touch-target findings; retain the established buying flow. No real-user speed pass or completed live Stripe payment is claimed by this frontend review.

Rollback: revert this merge and Pull/Publish from the recorded backup. There are no database or function deployments to roll back.
