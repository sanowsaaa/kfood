import Stripe from "stripe";
import {
  applySession,
  boundedText,
  type Dependencies,
  dependencies,
  failure,
  HttpError,
  json,
  retrieveSession,
  SUPPORTED_EVENTS,
} from "../_shared/checkout.ts";

export async function handleWebhook(req: Request, deps: Dependencies): Promise<Response> {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new HttpError(400, "Missing Stripe signature");
    const raw = await boundedText(req, 1_048_576);
    let event: Stripe.Event;
    try {
      event = await deps.stripe.webhooks.constructEventAsync(
        raw,
        signature,
        deps.config.webhookSecret,
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
    } catch {
      throw new HttpError(400, "Invalid Stripe signature");
    }
    if (event.livemode !== deps.config.live || event.account) {
      throw new HttpError(400, "Stripe event mode/account mismatch");
    }
    if (!SUPPORTED_EVENTS.has(event.type)) return json({ received: true, ignored: true });
    const object = event.data.object as Stripe.Checkout.Session;
    if (object.object !== "checkout.session" || !object.id.startsWith("cs_")) {
      throw new HttpError(400, "Invalid Stripe session event");
    }
    const session = await retrieveSession(deps, object.id);
    const result = await applySession(deps, session, event.id, event.type);
    console.info(JSON.stringify({ event_id: event.id, decision: result.decision }));
    // ACK only after committing the order transition, event and notification job.
    return json({ received: true });
  } catch (error) {
    return failure(error);
  }
}
export default {
  fetch: async (req: Request) => {
    try {
      return await handleWebhook(req, dependencies());
    } catch (error) {
      return failure(error);
    }
  },
};
