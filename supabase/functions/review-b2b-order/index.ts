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
  if (entry.count >= 15) return false;
  entry.count++;
  return true;
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
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 429 }
    );
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - no token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 401 }
      );
    }

    // Admin check
    const SUPER_ADMIN_EMAIL = "nasko1332@gmail.com";
    let isAdmin = user.email === SUPER_ADMIN_EMAIL;

    if (!isAdmin) {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      isAdmin = roleData?.role === "admin" || roleData?.role === "super_admin";
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - admin access required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 403 }
      );
    }

    const body = await req.json();
    const { order_id, action, discount_percent, discount_notes, line_items } = body;

    if (!order_id || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Липсва order_id или action" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Невалидно действие. Използвайте 'approve' или 'reject'." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 400 }
      );
    }

    // Fetch the order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, status, total_amount, is_b2b_order, b2b_company_id, order_number, customer_email, items, original_total_amount")
      .eq("id", order_id)
      .single();

    if (fetchError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Поръчката не е намерена." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 404 }
      );
    }

    if (!order.is_b2b_order) {
      return new Response(
        JSON.stringify({ success: false, error: "Тази поръчка не е B2B." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 400 }
      );
    }

    if (order.status !== "pending_review" && order.status !== "approved" && order.status !== "cancelled") {
      return new Response(
        JSON.stringify({ success: false, error: "Поръчката не може да бъде обработена в текущия си статус." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      // If custom line_item prices were provided, use them to recalculate total
      let orderItems = (order.items || []) as any[];
      let recalculatedTotal = 0;

      if (line_items && Array.isArray(line_items) && line_items.length > 0) {
        const overrideMap = new Map<number, { unit_price: number; carton_price: number }>();
        for (const li of line_items) {
          overrideMap.set(li.id, {
            unit_price: li.unit_price ?? 0,
            carton_price: li.carton_price ?? 0,
          });
        }

        orderItems = orderItems.map((item: any) => {
          const override = overrideMap.get(item.id);
          if (override) {
            return { ...item, price: override.unit_price, carton_price: override.carton_price };
          }
          return item;
        });

        recalculatedTotal = orderItems.reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 0), 0);
      }

      const discount = typeof discount_percent === "number" && discount_percent >= 0 && discount_percent <= 100
        ? discount_percent
        : 0;

      const originalTotal = order.original_total_amount
        ? Number(order.original_total_amount)
        : Number(order.total_amount);

      const hasCustomPrices = line_items && Array.isArray(line_items) && line_items.length > 0;
      const discountedTotal = hasCustomPrices
        ? recalculatedTotal
        : Math.round(originalTotal * (1 - discount / 100) * 100) / 100;

      const updatePayload: Record<string, unknown> = {
        status: "approved",
        original_total_amount: originalTotal,
        total_amount: discountedTotal,
        admin_discount_percent: hasCustomPrices ? 0 : discount,
        discount_notes: (discount_notes || "").substring(0, 500),
        approved_by: user.id,
        approved_at: now,
        updated_at: now,
      };

      if (hasCustomPrices) {
        updatePayload.items = orderItems;
      }

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update(updatePayload)
        .eq("id", order_id);

      if (updateError) {
        console.error("Order update error:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Грешка при обновяване на поръчката." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 500 }
        );
      }

      const displayTotal = discountedTotal;
      const convertedEUR = displayTotal.toFixed(2);

      return new Response(
        JSON.stringify({
          success: true,
          action: "approved",
          order_number: order.order_number,
          original_total: originalTotal,
          discounted_total: discountedTotal,
          discount_percent: hasCustomPrices ? 0 : discount,
          has_custom_prices: hasCustomPrices,
          message: hasCustomPrices
            ? `Поръчка ${order.order_number} е одобрена с персонализирани цени. Крайна сума: ${convertedEUR} €`
            : `Поръчка ${order.order_number} е одобрена с ${discount}% отстъпка. Крайна сума: ${convertedEUR} €`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    if (action === "reject") {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "cancelled",
          discount_notes: (discount_notes || "").substring(0, 500),
          approved_by: user.id,
          approved_at: now,
          updated_at: now,
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Order reject error:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Грешка при отказване на поръчката." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "rejected",
          order_number: order.order_number,
          message: `Поръчка ${order.order_number} е отказана.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Невалидно действие." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 400 }
    );
  } catch (_err) {
    console.error("review-b2b-order error:", _err);
    return new Response(
      JSON.stringify({ success: false, error: "Възникна неочаквана грешка. Моля, опитайте отново." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 500 }
    );
  }
});
