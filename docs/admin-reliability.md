# Admin reliability package — 8 October 2026

This package strengthens the existing administration screens. It does not introduce a business operation, route, Supabase Edge Function, migration, database policy, email template or recipient. Product fields, order statuses, B2B review choices and pricing calculations retain their existing meaning. The Stripe method label reads “Онлайн плащане”; a session ID alone is not proof of payment.

The reviewed base is main commit `1882277cb37a4cd4ecbb2e67c1767aee2da667e4`, tree `d069b7d0dc76115014e24874f811005a307f0e57`.

## Existing administrator actions

| Screen | Existing actions | Dependencies |
| --- | --- | --- |
| `/admin` | Search and sort products; filter missing/duplicate SKU; add/edit/delete; switch availability | `products` |
| `/admin/orders` | Filter/search; view order; change status; save tracking notes; B2B approve/reject and current price/discount controls; existing Stripe reconciliation and manual notification buttons | `orders`, `b2b_companies`, `review-b2b-order`, `reconcile-checkouts`, `create-b2b-checkout` |
| `/admin/b2b` | Review applications; approve/request information/reject; suspend/restore companies; add/delete existing order/payment rules | `b2b_applications`, `b2b_companies`, `b2b_order_rules`, `b2b_payment_rules`, `b2b_notifications`, `approve-b2b` |
| `/admin/b2b/companies/:id` | Edit existing company information, pricing fields and internal notes; add/delete contacts and addresses | `b2b_companies`, `b2b_pricing_tiers`, `b2b_company_contacts`, `b2b_company_addresses` |
| `/admin/b2b/documents` | Upload file and document metadata; view/delete existing document listing | Existing `public` Storage bucket and `b2b_documents`; company/tier selectors |
| `/admin/blog` | Add/edit/delete; publish/hide; existing preview | `blog_posts`, existing HTML sanitizer |
| `/admin/reviews` | Filter pending/approved/all; approve/delete | `reviews` |
| `/admin/b2b/pricing` | Existing redirect to `/admin/b2b` | Unchanged route |

The products screen had a link to `/admin/game`, but no registered route exists for it in this base. That dead shortcut is removed. The new common navigation points only to the existing registered sections. Game backend functions are untouched.

## Reliability changes

- Single-record writes request their existing record ID with `.select('id').single()`. Success requires a returned matching ID. A zero-row result or RLS rejection cannot produce optimistic success or close a form.
- Each screen/modal acquires a synchronous lock before its first asynchronous submission. Controls disable while the action is pending; there are no automatic write or email retries.
- Read errors are visible and differ from successfully empty results. Parallel reads are checked as a group before applying screen state. Stale responses cannot replace a newer request.
- Company profile saves include only the existing editable fields in the active section. Fetched `id`, ownership, account and creation fields are never sent back with an unrelated edit.
- Blog editing now loads the existing full body, author, cover image and tags. The former summary-only read could leave the editor without these fields.
- Document forms reset only after both file upload and metadata acknowledgment. A metadata failure after upload is reported separately; the code does not delete a possibly referenced file after an ambiguous result.
- Administrator access retains server verification through `check-user`. A true 401/403 denial differs from temporary network/server failure. A malformed or truthy string claim cannot grant UI access. Sign-out/token changes invalidate the previous check; a declarative route guard handles a rapid return to an administrator URL after logout. This is UI gating; server authorization and RLS remain authoritative.
- Navigation, active sections, mobile scrolling, keyboard focus, dialog focus/Escape handling, error/status messages and reduced-motion behavior are consistent across the existing screens.

## Email contracts preserved

| Action | Existing request contract | Handling |
| --- | --- | --- |
| Approve B2B application | POST `approve-b2b`, Bearer token, `{application_id, review_notes}` | One submission per action; approval and email acceptance are reported separately |
| Review B2B order | POST `review-b2b-order`, Bearer token, `{order_id, action, discount_notes, discount_percent}` or existing `line_items` payload | Existing approval/rejection and price rules preserved |
| Existing manual notification resend | Invoke `create-b2b-checkout`, `{mode: 'resend_notification', order_id}` | Remains explicitly manual; no automatic retry |

Existing function names, email templates, recipient selection, secrets and deployed function versions are unchanged. “Accepted for sending” does not claim delivery to an inbox. Database rejection and incomplete reads do not trigger approval or notification calls.

## Verification

Completed locally: **74 passing checks** (13 administrator operations, 15 offline browser tests including all seven routes at desktop/mobile widths, and 46 payment/B2B regressions). Administrator typecheck and complete Vite build pass. The browser tests also verify failed upload preservation, denied access on every administrator route, sign-out, stale filter responses and the existing email request bodies. No real email, order, payment or user was created by these tests.

`npm run check:admin` typechecks all administrator pages and their imported dependencies under the existing strict compiler options. `npm run test:admin` checks real Supabase client request construction against fake PostgREST responses, zero-row/rejected writes, all-or-nothing reads, double-submission locks and administrator access responses. Both run in the existing GitHub Actions workflow.

`npm run test:payments` and `npm run test:b2b` retain the existing database/handler regressions. `npm run build` builds the complete application. At the time of this administrator package, full-project typecheck had 25 remaining errors in public/partner pages (the reviewed base had 36, including 11 administrator errors resolved here). The subsequent [customer reliability package](customer-reliability.md) resolves those remaining errors: the current full-project `npm run typecheck` passes. This does not remove the backend rollout prerequisites below.

Optional `tests/admin-ui.test.mjs` exercises the **compiled** administration screens in Playwright with synthetic data and fully intercepted traffic. It serves local build files through interception and intercepts every remote request; it does not contact production or send emails. Build first, then run `node --test tests/admin-ui.test.mjs` in an environment with Playwright/browser installed. `ADMIN_PLAYWRIGHT_MODULE_PATH` and `ADMIN_BROWSER_EXECUTABLE` support an existing QA runtime without adding site dependencies. `ADMIN_BROWSER_SINGLE_PROCESS=1` supports a restricted headless runtime. `ADMIN_TEST_ARTIFACTS` optionally saves desktop/mobile screenshots; cached existing Remix Icon assets may be supplied with `ADMIN_TEST_FONT_CSS` and `ADMIN_TEST_FONT_WOFF2`.

## Deployment boundary

No Supabase deployment is part of this package. On 8 October the current main frontend and production functions already have outstanding compatibility gaps from the earlier payment/B2B changes: production lacks the new checkout status/reconciliation functions and still has older checkout/B2B handlers. Publishing the whole main client or asking Readdy to pull and publish it requires those earlier rollout steps to be resolved separately. This frontend package does not resolve that mismatch.

Existing production RLS blocks some blog/review moderation writes, and document upload depends on the existing bucket configuration. This package reports those failures honestly; it does not broaden permissions or create storage. Client-side locks are not server idempotency and do not prevent another administrator or another browser from changing the same record. Existing quote arithmetic/payment-status semantics remain an independent server review item.

Review the administrator-only diff and green CI before merging. Do not publish the entire main frontend against an incompatible backend. Preserve the existing payment/B2B rollout documents as the deployment prerequisites.
