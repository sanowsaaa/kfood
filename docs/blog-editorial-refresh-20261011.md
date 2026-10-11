# K-FOOD: editorial refresh of all 32 published articles

The existing published blog inventory is rewritten as useful Bulgarian articles in the current K-FOOD voice: warm, curious and concrete, with “Открий. Опитай. Сподели.” as the direction. Existing article IDs, slugs, photos, authors, categories and publication state are preserved. The change is restricted to editorial fields and the article reading screen.

## Search evidence

The owner's search analysis is used privately to choose topics and useful keyword directions. The export, traffic counts, query volumes and report date filters are not part of the public package. Recipe and product-choice intent takes priority over generic promotional summaries.

Query and URL tables are separate dimensions; an exact query-to-article mapping requires appropriate filters. Search visibility is distinct from orders, customer counts and revenue.

| Content family | Reader need and keyword direction |
| --- | --- |
| Ramen and Buldak | “корейски рамен рецепта”, “булдак карбонара”, “Buldak сос”; distinguish soup from drained sauce noodles |
| Kimchi | “кимчи рецепта”, “кимчи”, “kimchi”; fresh recipe, separate verified fermentation procedure and no medical promises |
| Sauces and snacks | “гочуджан”, “корейски снаксове”; explain composition, use, texture and choice |
| Purchase guide | “корейска храна”, “корейски магазин онлайн”, local shop queries; clear catalogue, address and delivery links |
| Culture | Korean New Year, K-drama and K-pop; useful context rather than invented Bulgarian audience figures |
| B2B | Wholesale and professional supply; application, administrator approval, activation and confirmed partner terms |
| Local travel | Keep existing URLs with differentiated trip, activity, place and transport intent; explicitly identify K-FOOD as a shop |
| Existing marketing articles | Replace unverified ranking, growth and sales claims with measurement methodology, clear definitions and verifiable tasks |

No physical branches outside Veliko Tarnovo, restaurant service, automatic B2B approval, guaranteed credit terms, unverified prices or delivery promises are invented. Marketing cooperation references are kept without asserting unsupported historical results. The three existing marketing articles explain methodology without disclosing private analytics; no additional off-topic marketing pages are created.

## Content and presentation

- 32 complete articles, approximately 22,400 words in total; individual articles have approximately 600–860 words. Word count is descriptive, not an SEO target.
- New titles, excerpts and tags correspond to the actual article. Reading time is calculated at 200 words/minute, rounded up.
- Recipes, examples, lists, comparison tables, related reading and relevant product/category links replace short promotional summaries.
- Official or primary sources support medical distinctions, fermentation, manufacturer instructions, cultural context, travel checks and food-business requirements.
- Numbered articles contain exactly the promised 10 foods, 15 activities, 12 places and 10 series. HTML is balanced and contains no repeated long paragraphs.
- Six product links were verified against production product slugs; related article links use the preserved 32-article inventory.
- The project has no Tailwind typography plugin. Scoped `.kfood-article` CSS supplies readable spacing, headings, lists, pink links, callouts and locally scrolling tables without adding a dependency.
- The cover section grows for long titles instead of clipping them inside a fixed-height absolute layer. Existing owned photos are retained.

## Article loading

The article body renders immediately after its primary read. The existing `sitemap-blog` counter request and optional related reading run independently. Their payload and once-per-session behavior are preserved. Storage restrictions cannot block the body. Route cleanup aborts outdated reads and prevents stale primary or related responses from replacing the current page. The Google inspection crawler is excluded from counting views.

The HTML sanitizer and its allowlist are unchanged. Payment, order, B2B/admin and email implementations are unchanged.

## Deployment and recovery

`content/blog/2026-10-11/originals.json` preserves the original public editorial content. `editorial.json` supplies new metadata, and `articles/*.html` holds each replacement. None of these are bundled into the frontend; the app continues to read Supabase.

Use `node scripts/blogEditorial.mjs --check` to validate the complete set. Generate a SQL package outside the repository with `--sql <destination>`; use `--rollback-sql <destination>` to generate recovery SQL. These are data updates, not schema migrations.

Each package locks the selected article rows, verifies the full expected editorial fingerprint and publication state, then updates all 32 in one atomic block. A missing row, changed slug, publication change or newer admin edit stops the entire update. View counts and photo edits do not prevent an editorial update and are never overwritten. Applying the same package twice is refused. Recovery similarly refuses to overwrite newer editorial changes.

Only `title`, `excerpt`, `content`, `tags`, `read_time` and `updated_at` are written. The production blog table has no user triggers; this write does not invoke order or email endpoints. Dates in the sitemap must come from actual deployed `updated_at` values, after the data update.

Database text changes become visible through the existing public reads. The compiled typography and loading improvement require **Readdy Pull from main, then Publish**. Keep these two deployment states distinct.

## Verification

- `npm run typecheck`, `npm run build`, `npm run test:seo`.
- Atomic update/recovery tests in `tests/blog-editorial-database.test.mjs`: all 32 rows, unrelated draft, live views, photo changes, concurrent admin edits, missing/unpublished row, mid-update write failure, repeated apply and guarded recovery.
- Compiled-app browser checks in `tests/blog-editorial-ui.test.mjs`: all 32 at 320, 390 and 1440px; one complete H1, matching description/canonical/Article data, readable typography, contained tables, blocked secondary requests, navigation races, session storage restrictions and inspection crawler.
- Existing `tests/html-security-ui.test.mjs` checks hostile HTML remains inert while permitted formatting survives.

Browser requests are fulfilled from local build files and fixtures. The tests do not create real orders, process payments or send emails. Optional browser runtime variables: `BLOG_PLAYWRIGHT_MODULE_PATH`, `BLOG_BROWSER_EXECUTABLE`, `BLOG_TEST_ASSET_MAP` and `BLOG_TEST_ARTIFACTS`.
