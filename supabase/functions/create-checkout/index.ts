import {
  bodyJson,
  checkRequest,
  type Dependencies,
  dependencies,
  failure,
  HttpError,
  json,
  limited,
  lineItems,
  type Payment,
  sha256,
  validateInput,
} from "../_shared/checkout.ts";

export async function createSession(deps: Dependencies, payment: Payment) {
  return await deps.stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: payment.customer_email,
    client_reference_id: payment.order_id,
    line_items: lineItems(payment.line_items),
    billing_address_collection: "required",
    shipping_address_collection: { allowed_countries: ["BG"] },
    phone_number_collection: { enabled: true },
    adaptive_pricing: { enabled: false },
    expires_at: Math.floor(new Date(payment.expires_at).getTime() / 1000),
    success_url:
      `${payment.return_origin}/order-success?session_id={CHECKOUT_SESSION_ID}&orderNumber=${
        encodeURIComponent(payment.order_number)
      }`,
    cancel_url: `${payment.return_origin}/cart`,
    integration_identifier: `kfood_checkout_${payment.integration_suffix}`,
    metadata: {
      checkout_version: "1",
      order_id: payment.order_id,
      order_number: payment.order_number,
      attempt_id: payment.attempt_id,
    },
    payment_intent_data: { metadata: { order_id: payment.order_id, checkout_version: "1" } },
  }, { idempotencyKey: `kfood-checkout-v1-${payment.attempt_id}` });
}

export async function handleCheckout(req: Request, deps: Dependencies): Promise<Response> {
  try {
    const early = checkRequest(req, deps.config);
    if (early) return early;
    await limited(req, deps, "create", 10);
    const input = validateInput(await bodyJson(req));
    const requestHash = await sha256(JSON.stringify({
      items: input.items,
      email: input.customerEmail,
      phone: input.customerPhone,
      expectedTotalMinor: input.expectedTotalMinor,
    }));
    const { data, error } = await deps.db.rpc("checkout_prepare", {
      p_attempt_id: input.attemptId,
      p_request_hash: requestHash,
      p_token_hash: await sha256(input.statusToken),
      p_items: input.items,
      p_email: input.customerEmail,
      p_phone: input.customerPhone,
      p_expected_total: input.expectedTotalMinor,
      p_livemode: deps.config.live,
      p_return_origin: deps.config.appUrl,
    });
    if (error) {
      const known: Record<string, string> = {
        PRICE_CHANGED: "Цената се е променила. Обновете количката и опитайте отново.",
        PRODUCT_UNAVAILABLE: "Някой от продуктите вече не е наличен.",
        INSUFFICIENT_STOCK: "Недостатъчна наличност. Намалете количеството или опитайте по-късно.",
        CHECKOUT_ATTEMPT_CONFLICT: "Опитът за плащане е променен. Започнете нова поръчка.",
        INVALID_TOTAL: "Минималната поръчка е €10, а максималната е €10 000.",
      };
      const message = known[error.message];
      if (message) throw new HttpError(409, message);
      throw new Error("Quote transaction failed");
    }
    const payment = data as Payment;
    if (payment.state !== "pending") {
      throw new HttpError(409, "Този опит вече е приключил. Проверете статуса на поръчката.");
    }
    if (new Date(payment.expires_at).getTime() <= Date.now()) {
      throw new HttpError(409, "Опитът за плащане е изтекъл. Започнете нова поръчка.");
    }
    let url = payment.stripe_url;
    if (!payment.session_id) {
      // Never recreate an old attempt after Stripe prunes its idempotency cache.
      if (new Date(payment.expires_at).getTime() - Date.now() < 35 * 60_000) {
        throw new HttpError(409, "Проверяваме предишния опит за плащане. Опитайте по-късно.");
      }
      const session = await createSession(deps, payment);
      if (session.livemode !== deps.config.live || !session.url || session.status !== "open") {
        throw new Error("Unexpected Stripe session");
      }
      const { error: attachError } = await deps.db.rpc("checkout_attach_session", {
        p_order_id: payment.order_id,
        p_session_id: session.id,
        p_url: session.url,
        p_livemode: session.livemode,
        p_amount: session.amount_total,
        p_currency: session.currency,
      });
      if (attachError) throw new Error("Session attachment failed");
      url = session.url;
    }
    if (!url || new URL(url).hostname !== "checkout.stripe.com") {
      throw new Error("Invalid checkout URL");
    }
    return json(
      {
        url,
        orderNumber: payment.order_number,
        totalAmountMinor: payment.total_minor,
        currency: "EUR",
        expiresAt: payment.expires_at,
      },
      200,
      req,
      deps.config,
    );
  } catch (error) {
    return failure(error, req, deps.config);
  }
}
export default {
  fetch: async (req: Request) => {
    try {
      return await handleCheckout(req, dependencies());
    } catch (error) {
      return failure(error);
    }
  },
};
