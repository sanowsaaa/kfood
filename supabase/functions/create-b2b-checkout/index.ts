import {
  b2bAdmin,
  b2bBody,
  type B2BDependencies,
  b2bDependencies,
  b2bEmail,
  B2BError,
  b2bEscape,
  b2bFailure,
  b2bHash,
  b2bJson,
  b2bLimit,
  b2bMail,
  type B2BMailResult,
  b2bRequest,
  b2bText,
  b2bUser,
  UUID_PATTERN,
} from "../_shared/b2b.ts";

type SavedRequest = {
  order: {
    id: string;
    order_number: string;
    customer_email: string;
    customer_phone: string;
    total_amount: number;
    shipping_address: Record<string, string>;
    items: {
      name: string;
      quantity: number;
      price: number;
      line_total_minor: number;
      sku?: string;
      pieces_per_carton?: number;
    }[];
  };
  company_name: string;
  notification_snapshot: { order: SavedRequest["order"]; company_name: string };
  notification_sent_at: string | null;
  request_created_at: string;
};

export async function sendB2BNotification(
  deps: B2BDependencies,
  request: SavedRequest,
): Promise<B2BMailResult> {
  if (request.notification_sent_at) return { sent: true };
  if (Date.now() - new Date(request.request_created_at).getTime() > 20 * 60 * 60_000) {
    return {
      sent: false,
      reason: "Проверете ръчно дали известието е доставено преди повторно изпращане.",
    };
  }
  const { order, company_name: name } = request.notification_snapshot;
  const rows = order.items.map((item) => {
    const carton = item.pieces_per_carton && item.pieces_per_carton > 0
      ? ` (${item.quantity / item.pieces_per_carton} кашона)`
      : "";
    return `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb">${b2bEscape(item.name)}${
      item.sku ? `<br><small style="color:#6b7280">SKU: ${b2bEscape(item.sku)}</small>` : ""
    }</td>` +
      `<td style="padding:10px;border-bottom:1px solid #e5e7eb">${item.quantity} бр.${carton}</td>` +
      `<td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${
        (item.line_total_minor / 100).toFixed(2)
      } €</td></tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827">
<div style="max-width:600px;margin:24px auto;background:white;border-radius:12px;overflow:hidden">
<div style="background:#059669;padding:24px;color:white"><h1 style="margin:0;font-size:22px">K-FOOD · Нова B2B поръчка</h1>
<p>${b2bEscape(order.order_number)} · За преглед</p></div><div style="padding:24px">
<h2 style="font-size:18px">${b2bEscape(name)}</h2>
<p>Контакт: ${b2bEscape(order.shipping_address.full_name)}<br>Имейл: ${
    b2bEscape(order.customer_email)
  }<br>
Телефон: ${b2bEscape(order.customer_phone)}</p>
<p>Адрес: ${b2bEscape(order.shipping_address.city)}, ${b2bEscape(order.shipping_address.address)} ${
    b2bEscape(order.shipping_address.postal_code)
  }</p>
<p>Бележки: ${b2bEscape(order.shipping_address.notes)}</p>
<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Продукт</th>
<th style="text-align:left">Количество</th><th style="text-align:right">Сума</th></tr></thead><tbody>${rows}</tbody></table>
<p style="text-align:right;font-weight:bold;font-size:18px;color:#047857">Общо: ${
    Number(order.total_amount).toFixed(2)
  } €</p>
<p>Прегледайте запитването и изпратете персонализирана оферта на клиента.</p></div></div></body></html>`;
  const result = await b2bMail(
    deps,
    "kfood-b2b-order-" + order.id,
    deps.bossEmail,
    "🔔 Нова B2B поръчка! " + order.order_number + " - " + name,
    html,
  );
  if (result.sent) {
    const { error } = await deps.db.from("b2b_request_attempts")
      .update({ notification_sent_at: new Date().toISOString() }).eq("order_id", order.id);
    if (error) console.error("B2B notification accepted; receipt persistence failed");
  }
  return result;
}

export async function handleB2BCheckout(req: Request, deps: B2BDependencies): Promise<Response> {
  try {
    const early = b2bRequest(req);
    if (early) return early;
    const user = await b2bUser(req, deps);
    const body = await b2bBody(req);
    if (body.mode === "resend_notification") {
      if (!await b2bAdmin(user, deps)) {
        throw new B2BError(403, "Необходим е администраторски достъп.");
      }
      await b2bLimit(deps, "notification", user.id, 10);
      if (typeof body.order_id !== "string" || !UUID_PATTERN.test(body.order_id)) {
        throw new B2BError(400, "Невалидна поръчка.");
      }
      const { data, error } = await deps.db.from("b2b_request_attempts")
        .select("notification_snapshot,notification_sent_at,created_at").eq(
          "order_id",
          body.order_id,
        ).maybeSingle();
      if (error) throw new Error("Notification lookup failed");
      if (!data) throw new B2BError(404, "За тази поръчка няма ново B2B известие.");
      const result = await sendB2BNotification(deps, {
        order: data.notification_snapshot.order,
        company_name: data.notification_snapshot.company_name,
        notification_snapshot: data.notification_snapshot,
        notification_sent_at: data.notification_sent_at,
        request_created_at: data.created_at,
      });
      return b2bJson(req, {
        success: true,
        email_sent: result.sent,
        email_status: result.reason || "ok",
      });
    }
    await b2bLimit(deps, "order", user.id, 10);
    const { data: company, error: companyError } = await deps.db.from("b2b_companies")
      .select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (companyError) throw new Error("Company lookup failed");
    if (!company || (body.b2b_company_id && body.b2b_company_id !== company.id)) {
      throw new B2BError(403, "Нямате достъп до тази фирма.");
    }
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
      throw new B2BError(400, "Добавете от 1 до 50 продукта.");
    }
    const seen = new Set<number>();
    const items = body.items.map((raw: unknown) => {
      if (!raw || typeof raw !== "object") throw new B2BError(400, "Невалиден продукт.");
      const item = raw as Record<string, unknown>;
      if (
        !Number.isSafeInteger(item.id) || Number(item.id) <= 0 || seen.has(Number(item.id)) ||
        !Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1 ||
        Number(item.quantity) > 10000
      ) {
        throw new B2BError(400, "Невалидни продукти или количества.");
      }
      seen.add(Number(item.id));
      return { id: Number(item.id), quantity: Number(item.quantity) };
    }).sort((a, b) => a.id - b.id);
    const email = b2bEmail(body.customer_email);
    const phone = b2bText(body.customer_phone, "телефон", 30);
    if (!/^[+0-9 ()-]{6,30}$/.test(phone)) throw new B2BError(400, "Невалиден телефон.");
    const rawShipping = body.shipping_address;
    if (!rawShipping || typeof rawShipping !== "object" || Array.isArray(rawShipping)) {
      throw new B2BError(400, "Добавете адрес за доставка.");
    }
    const address = rawShipping as Record<string, unknown>;
    const shipping = {
      full_name: b2bText(address.full_name, "име", 120),
      address: b2bText(address.address, "адрес", 250),
      city: b2bText(address.city, "град", 100),
      postal_code: b2bText(address.postal_code ?? "", "пощенски код", 20, false),
      notes: b2bText(address.notes ?? body.notes ?? "", "бележки", 500, false),
    };
    // Compatibility with the old frontend during coordinated rollout.
    const attemptId = body.attemptId ?? crypto.randomUUID();
    if (typeof attemptId !== "string" || !UUID_PATTERN.test(attemptId)) {
      throw new B2BError(400, "Невалиден опит за поръчка.");
    }
    const hash = await b2bHash(JSON.stringify({ items, email, phone, shipping }));
    const { data, error } = await deps.db.rpc("b2b_create_request", {
      p_user_id: user.id,
      p_company_id: company.id,
      p_attempt_id: attemptId,
      p_request_hash: hash,
      p_items: items,
      p_email: email,
      p_phone: phone,
      p_shipping: shipping,
      p_notes: shipping.notes,
    });
    if (error) {
      const messages: Record<string, string> = {
        COMPANY_ACCESS_DENIED: "Фирменият достъп е прекратен. Влезте отново.",
        REQUEST_CONFLICT: "Запитването е променено. Изпратете го като ново запитване.",
        PRODUCT_UNAVAILABLE: "Някой от продуктите вече не е наличен. Обновете количката.",
        WHOLE_CARTONS_REQUIRED: "Поръчвайте цели кашони за продуктите с кашонна разфасовка.",
        INVALID_PRICE: "Цената на продукт изисква проверка от екипа.",
        INVALID_TOTAL: "Сумата на запитването изисква проверка от екипа.",
      };
      if (messages[error.message]) throw new B2BError(409, messages[error.message]);
      throw new Error("B2B order transaction failed");
    }
    const saved = data as SavedRequest;
    const notification = await sendB2BNotification(deps, saved);
    return b2bJson(req, {
      success: true,
      order_id: saved.order.id,
      order_number: saved.order.order_number,
      total_amount: saved.order.total_amount,
      email_sent: notification.sent,
      email_status: notification.reason || "ok",
      message: "Запитването е записано успешно. Екипът ще го прегледа и ще подготви оферта.",
    });
  } catch (error) {
    return b2bFailure(req, error);
  }
}
export default {
  fetch: async (req: Request) => {
    try {
      return await handleB2BCheckout(req, b2bDependencies());
    } catch (error) {
      return b2bFailure(req, error);
    }
  },
};
