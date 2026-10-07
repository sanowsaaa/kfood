import {
  bodyJson,
  checkRequest,
  type Dependencies,
  dependencies,
  failure,
  HttpError,
  json,
  limited,
  sha256,
  TOKEN,
} from "../_shared/checkout.ts";

export async function handleStatus(req: Request, deps: Dependencies): Promise<Response> {
  try {
    const early = checkRequest(req, deps.config);
    if (early) return early;
    await limited(req, deps, "status", 90);
    const body = await bodyJson(req);
    if (
      typeof body.orderNumber !== "string" || body.orderNumber.length > 100 ||
      typeof body.statusToken !== "string" || !TOKEN.test(body.statusToken)
    ) {
      throw new HttpError(400, "Невалидна заявка за статус");
    }
    const { data, error } = await deps.db.from("checkout_payments")
      .select("order_number,state,total_minor,livemode,expires_at")
      .eq("order_number", body.orderNumber).eq("status_token_hash", await sha256(body.statusToken))
      .eq("livemode", deps.config.live).maybeSingle();
    if (error) throw new Error("Status lookup failed");
    if (!data) throw new HttpError(404, "Нямате достъп до тази поръчка");
    return json(
      {
        orderNumber: data.order_number,
        paymentState: data.state,
        totalAmountMinor: data.total_minor,
        currency: "EUR",
        expiresAt: data.expires_at,
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
      return await handleStatus(req, dependencies());
    } catch (error) {
      return failure(error);
    }
  },
};
