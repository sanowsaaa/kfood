# Administrator payment status

The order list previously displayed a green card-method badge and a generic
successful refresh message for unpaid Stripe sessions. Fulfillment status and
payment status are now shown separately.

Only a server-recorded `paid` payment with a confirmation timestamp and
`livemode=true` is displayed as **Платена** and enables administrator fulfillment.
Pending, asynchronous, failed, expired, review and test payments have distinct
labels. Historical card orders without a verified checkout payment are marked
**Непотвърдено плащане**, even if their fulfillment status is confirmed or delivered.
Existing historical statuses are preserved.

`public.admin_orders()` calls a private, checked administrator function. It returns
order data and only the payment state, mode and confirmation time. Checkout
tokens, Stripe URLs and the underlying payment table remain server-only. Verified
administrators may read this projection; visitors and partners cannot.

The database trigger blocks approval, confirmation, processing, shipping and
delivery of unpaid card orders through direct administrator updates. It also
prevents shipping test payments. The webhook can still confirm a verified test
payment for integration testing. Notes, cancellation, COD fulfillment, B2B review
and their notification contracts remain available.

The visible admin tab refreshes stored data every 30 seconds and on focus. Manual
Stripe refresh reports the actual saved payment result rather than a generic
green success. The manual action retains the existing reconciliation contract.

## Deployment

Production Supabase: `quqlovoiwgqfmgjumpgd`.
Applied migration: `20261011190834_admin_payment_truth.sql`.
Deploy the database migration before the frontend. After merging the frontend,
Pull and Publish in Readdy, then reload the administrator tab.

## Validation

- TypeScript checks and production build.
- Database authorization and direct-update rejection for all unpaid states.
- Verified live payment, single stock consumption and single notification row.
- Sandbox confirmation and rejection of administrator test-order fulfillment.
- COD and B2B approval compatibility, existing notification handler contracts.
- Desktop and mobile compiled UI checks for ten payment-proof combinations.
- Manual refresh of unpaid/paid sessions and automatic refresh on tab focus.
- Existing administrator operations and payment/tracking handler regressions.

Tests use synthetic offline data. No real payment, fulfillment or email was
initiated by these checks. The actual live order inspected during diagnosis was
still unpaid; successful end-to-end live delivery requires a paid Stripe event.
