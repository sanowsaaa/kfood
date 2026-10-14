# Independent retail and B2B publication

The admin editor now controls retail and B2B separately while preserving product IDs, slugs, all prices, package quantities and order history. Public access still uses exactly `visibility = 'retail'`; B2B access still requires the existing confirmed active company check.

| Retail | B2B | Stored visibility | b2b_enabled |
| --- | --- | --- | --- |
| on | on | retail | true |
| on | off | retail | false |
| off | on | wholesale | true |
| off | off | hidden | false |

## Backup before any production change

Source baseline: `c7a7e76278553761739b5e487e89ff35d8839a73`.
Permanent remote ref: `backup/pre-catalog-channels-20261014`.
A private owner archive holds the actual application schema/ACLs, every public application table and all 22 deployed Edge Function bundles/configurations. A local isolated restore verified all 31 public tables (1,242 rows) with typed comparisons and non-FK constraints. Managed Auth passwords/sessions, platform secrets and external image files were not exported. Do not describe this archive as a complete Supabase platform/PITR backup.

## Rollout order

1. Verify the tested commit, backup and current product visibility counts. Apply **only** `20261014130805_catalog_channels_and_admin_concurrency.sql` through the migration tool. This additive phase retains the previous defaults and direct admin privileges so the currently published Readdy build still works. Existing rows receive B2B=true and revision=0 without changing stock, prices or visibility.
2. Merge the verified frontend into main. Pull and publish main through Readdy. Confirm that the published admin assets contain `admin_update_product`, `admin_delete_product` and the independent channel controls. A GitHub merge alone is not evidence that Readdy is published.
3. After the new build is confirmed published, apply `20261014131812_finalize_catalog_admin_writes.sql`. This changes defaults for **future** inserts to unpublished/zero stock and revokes unchecked product UPDATE/DELETE access. Old editor tabs then fail safely. Reload the admin page after publication; no customer checkout change is required.
4. Verify public product IDs/slugs and sitemap inventory, denied guest B2B/private-column access, admin role checks, product revisions, active notification cron and unchanged Edge Function versions. Test writes only against synthetic isolated databases; do not create real paid orders or replay production outboxes for smoke checks.

Do not use a blanket `db push` across both phases before Readdy publication. Phase 1 alone does not close the legacy direct-update path; the finalization step is required to protect old open editor tabs. The new frontend uses checked writes immediately after publication.

## Write and order compatibility

- Admin saves a whitelist patch of changed fields with the revision originally displayed. A row lock and revision comparison reject concurrent edits with HTTP 409. Every product update, including existing payment/COD stock movements, advances the server revision and timestamp. Direct old editor writes are disabled only in the final phase.
- A quantity/availability change remains an explicit admin action. The existing stock-hold trigger still prevents reducing below active holds or deleting a held product. An unrelated description edit does not resend inventory, alternate EUR price or other old fields.
- B2B catalog queries and **new** request creation both enforce publication. Replaying a previously persisted B2B attempt still returns its frozen quote/notification snapshot. B2B preorder requests continue to require admin review without changing stock.
- Existing pending Stripe quotes remain valid if the product is hidden later. Card/COD order type remains determined by its checkout path; publication does not convert an order to B2B. Public checkout, amount/currency checks, payment proof, webhook verification and notification queues are otherwise unchanged.
- New UI products start with both channel controls off and require actual quantity entry. Existing products are not automatically republished, repriced, merged, renamed or put in stock. A zero/missing B2B price still follows the existing pricing fallback and needs owner review before additional products are published in B2B.
- The invoice endpoint stays retired. Existing payment/email code, templates, recipients and Stripe configuration are not changed by this release.

## Targeted rollback

Review `ops/catalog-channels/rollback.sql` before execution. It restores the prior two B2B SQL function definitions, previous insert defaults and checked-by-RLS legacy admin editing rights, and removes the new mutation endpoints/revision trigger. It keeps both additive columns and all data. Pair it with publishing the backup source ref. The rollback is a manual operational script, not an automatically executed migration.

Do **not** restore historical stock, orders, payments or outboxes from the backup to undo a frontend/database deployment. The isolated rollback regression compares every order, product, payment, hold and notification before and after to prove this script does not rewind them. After rollback, the former B2B catalog behavior applies; review any channel choices made since this release before republishing.

## Verification

`npm run test:catalog` covers preservation/backfill, all four states, request retries and exact carton totals, unauthorized calls, stale full editor rejection after finalization, concurrent admin revisions, paid stock consumption, active holds, defaults, COD recipient queue idempotency, a pending card quote after hiding, and targeted rollback. The existing security suites also run both new migrations and use the checked product mutation API.

The CI workflow runs the new suite on the existing disposable PostgreSQL 17 service as well as all previous payment, B2B, security, TypeScript, client, SEO and build checks. Local PGlite results do not substitute for real multi-connection PostgreSQL checks. Browser checks use synthetic session/API fixtures and intercept all external calls; they send no production writes or email.
