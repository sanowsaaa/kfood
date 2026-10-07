import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const CORS_METHODS = "POST, OPTIONS";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin || origin === "null") return true;
  const allowed = [
    "https://k-foodvelikotarnovo.com",
    "https://www.k-foodvelikotarnovo.com",
    "https://readdy.ai",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ];
  if (allowed.includes(origin)) return true;
  if (origin.endsWith(".readdy.ai")) return true;
  return false;
}

function getCorsHeaders(origin: string | null) {
  const safeOrigin = isAllowedOrigin(origin) ? (origin || "*") : "https://k-foodvelikotarnovo.com";
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": CORS_METHODS,
  };
}

const requestCounts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

const RESEND_API = Deno.env.get("RESEND_API");
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN");
const BOSS_EMAIL = "nasko1332@gmail.com";

function generateOrderNumber() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `B2B${y}${m}${d}-${rand}`;
}

function sanitize(str: string): string {
  return str?.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';
}

function calculateTotal(items: any[]): number {
  return items.reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 0), 0);
}

async function sendBossB2BOrderEmail(items: any[], customerEmail: string, customerPhone: string, orderNumber: string, totalAmount: number, companyName: string, shippingAddress: any) {
  if (!RESEND_API) return { sent: false, reason: "RESEND_API missing" };

  const safeTotal = typeof totalAmount === 'number' && !isNaN(totalAmount) ? totalAmount : calculateTotal(items);

  const fromAddress = RESEND_FROM_DOMAIN
    ? `K-FOOD B2B <noreply@${RESEND_FROM_DOMAIN}>`
    : "K-FOOD B2B <onboarding@resend.dev>";

  const productsList = items.map((i: any) => {
    const hasCarton = i.pieces_per_carton > 0;
    const skuInfo = i.sku
      ? `<br><span style="color:#94a3b8;font-size:11px;font-family:monospace">Кат. № ${sanitize(String(i.sku))}</span>`
      : '';
    const cartonInfo = hasCarton
      ? `<br><span style="color:#94a3b8;font-size:11px">📦 Кашон x${i.pieces_per_carton} бр. · ${i.carton_price > 0 ? i.carton_price.toFixed(2) + ' €' : 'цена според оферта'}/кашон</span>`
      : '';
    const qtyInfo = hasCarton
      ? `${i.quantity} бр. (${Math.floor(i.quantity / i.pieces_per_carton)} кашона)`
      : `${i.quantity}`;
    return `<tr><td style="padding:10px;border-bottom:1px solid #334155">${sanitize(i.name)}${skuInfo}${cartonInfo}</td><td style="padding:10px;border-bottom:1px solid #334155;text-align:center">${qtyInfo}</td><td style="padding:10px;border-bottom:1px solid #334155;text-align:right">${(i.price * i.quantity).toFixed(2)} €</td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#0f172a;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#059669,#047857);padding:25px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:22px">🔔 Нова B2B Поръчка!</h1><p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">${orderNumber}</p></div><div style="background:#1e293b;padding:25px;border-radius:0 0 12px 12px;color:#e2e8f0"><table style="width:100%;margin-bottom:20px"><tr><td style="padding:8px 12px;background:#334155;border-radius:6px"><strong style="color:#cbd5e1">Статус:</strong> <span style="color:#fbbf24;font-weight:700">За преглед</span></td><td style="padding:8px 12px;background:#334155;border-radius:6px"><strong style="color:#cbd5e1">Тип:</strong> <span style="color:#e2e8f0">B2B Поръчка</span></td></tr></table><h2 style="color:#f1f5f9;font-size:16px;border-bottom:2px solid #059669;padding-bottom:8px;margin-top:0">B2B Компания</h2><p style="color:#e2e8f0;font-size:15px;font-weight:600;margin:10px 0">${sanitize(companyName)}</p><table style="width:100%;margin-bottom:20px"><tr><td style="padding:6px 0;color:#94a3b8;width:35%">Имейл:</td><td style="padding:6px 0;color:#e2e8f0">${sanitize(customerEmail)}</td></tr><tr><td style="padding:6px 0;color:#94a3b8">Телефон:</td><td style="padding:6px 0;color:#e2e8f0;font-weight:600">${sanitize(customerPhone)}</td></tr>${shippingAddress?.city ? `<tr><td style="padding:6px 0;color:#94a3b8">Град:</td><td style="padding:6px 0;color:#e2e8f0">${sanitize(shippingAddress.city)}</td></tr>` : ""}${shippingAddress?.address ? `<tr><td style="padding:6px 0;color:#94a3b8">Адрес:</td><td style="padding:6px 0;color:#e2e8f0">${sanitize(shippingAddress.address)}</td></tr>` : ""}</table><h2 style="color:#f1f5f9;font-size:16px;border-bottom:2px solid #059669;padding-bottom:8px">Заявени продукти</h2><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><thead><tr style="background:#334155"><th style="padding:10px;text-align:left;color:#cbd5e1;font-weight:600;font-size:13px">Продукт</th><th style="padding:10px;text-align:center;color:#cbd5e1;font-weight:600;font-size:13px">Кол.</th><th style="padding:10px;text-align:right;color:#cbd5e1;font-weight:600;font-size:13px">Цена</th></tr></thead><tbody>${productsList}</tbody></table><div style="background:#334155;padding:15px;border-radius:8px;text-align:right"><span style="font-size:18px;font-weight:800;color:#34d399">ОБЩО: ${safeTotal.toFixed(2)} €</span></div><div style="margin-top:15px;padding:12px;background:#1a2e1a;border-radius:8px;border-left:3px solid #34d399"><p style="color:#34d399;font-size:13px;margin:0"><strong>💡 Действие:</strong> Прегледайте поръчката и изпратете персонализирана оферта на клиента.</p></div></div></div></body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API}` },
      body: JSON.stringify({
        from: fromAddress,
        to: [BOSS_EMAIL],
        subject: `🔔 Нова B2B поръчка! ${orderNumber} - ${sanitize(companyName)}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[BOSS EMAIL] Resend API error:", res.status, errText);
      return { sent: false, reason: `Resend API ${res.status}` };
    }

    const json = await res.json();
    return { sent: true, id: json?.id };
  } catch (e) {
    console.error("[BOSS EMAIL] Exception:", e);
    return { sent: false, reason: "Resend request failed" };
  }
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...SECURITY_HEADERS } });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ success: false, error: "Твърде много заявки. Моля, изчакайте малко." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 200 }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      items,
      b2b_company_id,
      customer_email,
      customer_phone,
      shipping_address,
      notes,
      total_amount,
    } = body;

    if (!items || !items.length) {
      return new Response(JSON.stringify({ success: false, error: "Няма продукти" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    if (!b2b_company_id || !customer_email || !customer_phone) {
      return new Response(JSON.stringify({ success: false, error: "Липсва информация" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - no token" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - invalid token" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const { data: companyData } = await supabase
      .from("b2b_companies")
      .select("company_name")
      .eq("id", b2b_company_id)
      .maybeSingle();

    const companyName = companyData?.company_name || body.company_name || "B2B Компания";

    // === PULL PRICES FROM DATABASE (server-side, not trusting frontend) ===
    const productIds = items.map((i: any) => i.id).filter((id: any) => typeof id === 'number');
    let priceMap = new Map<number, { price: number; carton_price: number; pieces_per_carton: number }>();

    if (productIds.length > 0) {
      const { data: productData } = await supabase
        .from("products")
        .select("id, wholesale_price, cost_price, carton_price, pieces_per_carton, price")
        .in("id", productIds);

      (productData || []).forEach((p: any) => {
        const cartonPrice = Number(p.carton_price) || Number(p.wholesale_price) || Number(p.price) || 0;
        const unitPrice = (p.pieces_per_carton && p.pieces_per_carton > 0)
          ? cartonPrice / p.pieces_per_carton
          : (Number(p.wholesale_price) || Number(p.price) || 0);
        priceMap.set(p.id, {
          price: unitPrice,
          carton_price: cartonPrice,
          pieces_per_carton: p.pieces_per_carton || 0,
        });
      });
    }

    // Enrich items with server-fetched prices
    const enrichedItems = items.map((i: any) => {
      const pricing = priceMap.get(i.id);
      return {
        ...i,
        price: pricing?.price ?? 0,
        carton_price: pricing?.carton_price ?? 0,
        pieces_per_carton: pricing?.pieces_per_carton ?? (i.pieces_per_carton || 0),
      };
    });

    // Calculate total from server-fetched prices
    const computedTotal = typeof total_amount === 'number' && !isNaN(total_amount)
      ? total_amount
      : calculateTotal(enrichedItems);

    const orderNumber = generateOrderNumber();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        b2b_company_id: b2b_company_id,
        customer_email: customer_email,
        customer_phone: customer_phone,
        status: "pending_review",
        total_amount: computedTotal,
        currency: "EUR",
        items: enrichedItems.map((i: any) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
          sku: i.sku || null,
          carton_price: i.carton_price || 0,
          pieces_per_carton: i.pieces_per_carton || 0,
        })),
        shipping_address: shipping_address || {},
        tracking_notes: notes || "",
        is_b2b_order: true,
        payment_method: "b2b_invoice",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return new Response(JSON.stringify({ success: false, error: "Грешка при записване: " + (orderError.message || "unknown") }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const emailResult = await sendBossB2BOrderEmail(enrichedItems, customer_email, customer_phone, orderNumber, computedTotal, companyName, shipping_address);

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      email_sent: emailResult.sent,
      email_status: emailResult.reason || "ok",
      message: "Поръчката е изпратена успешно. Ще получите оферта на посочения имейл.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
    });
  } catch (_err) {
    console.error("B2B Checkout error:", _err);
    return new Response(JSON.stringify({ success: false, error: "Възникна неочаквана грешка. Моля, опитайте отново." }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
    });
  }
});