import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const RESEND_API = Deno.env.get("RESEND_API");
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN");
const BOSS_EMAIL = "nasko1332@gmail.com";

function getCorsHeaders(origin: string | null) {
  const safeOrigin = isAllowedOrigin(origin) ? (origin || "*") : "https://k-foodvelikotarnovo.com";
  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin || origin === 'null') return true;
  const allowed = [
    'https://k-foodvelikotarnovo.com',
    'https://www.k-foodvelikotarnovo.com',
    'https://readdy.ai',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];
  if (allowed.includes(origin)) return true;
  if (origin.endsWith('.readdy.ai')) return true;
  return false;
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

function sanitize(str: string): string {
  return str?.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';
}

async function sendBossOrderEmail(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  items: { name: string; quantity: number; price: number }[],
  totalEur: number,
  status: string,
  paymentMethod: string,
  shippingAddress: Record<string, string>,
  isB2B: boolean
) {
  if (!RESEND_API) return;

  const fromAddress = RESEND_FROM_DOMAIN
    ? `K-FOOD Поръчки <noreply@${RESEND_FROM_DOMAIN}>`
    : "K-FOOD Поръчки <onboarding@resend.dev>";

  const productsList = items.map(p =>
    `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb">${sanitize(p.name)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center">${p.quantity}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${(p.price * p.quantity).toFixed(2)} €</td></tr>`
  ).join("");

  const typeLabel = isB2B ? "B2B" : "B2C";
  const color = isB2B ? "#059669" : "#dc2626";
  const colorDark = isB2B ? "#047857" : "#b91c1c";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f3f4f6;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,${color},${colorDark});padding:25px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:22px">Нова ${typeLabel} поръчка!</h1><p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">${orderNumber}</p></div><div style="background:white;padding:25px;border-radius:0 0 12px 12px"><table style="width:100%;margin-bottom:20px"><tr><td style="padding:8px 12px;background:#f9fafb;border-radius:6px"><strong style="color:#374151">Статус:</strong> <span style="color:${color};font-weight:700">${status}</span></td><td style="padding:8px 12px;background:#f9fafb;border-radius:6px"><strong style="color:#374151">Плащане:</strong> <span style="color:#1f2937">${paymentMethod}</span></td></tr></table><h2 style="color:#1f2937;font-size:16px;border-bottom:2px solid ${color};padding-bottom:8px;margin-top:0">Данни за клиента</h2><table style="width:100%;margin-bottom:20px"><tr><td style="padding:6px 0;color:#6b7280;width:35%">Име:</td><td style="padding:6px 0;color:#1f2937;font-weight:600">${sanitize(customerName)}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Телефон:</td><td style="padding:6px 0;color:#1f2937;font-weight:600">${sanitize(customerPhone)}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Имейл:</td><td style="padding:6px 0;color:#1f2937">${sanitize(customerEmail)}</td></tr>${shippingAddress.city ? `<tr><td style="padding:6px 0;color:#6b7280">Град:</td><td style="padding:6px 0;color:#1f2937">${sanitize(shippingAddress.city)}</td></tr>` : ""}${shippingAddress.address ? `<tr><td style="padding:6px 0;color:#6b7280">Адрес:</td><td style="padding:6px 0;color:#1f2937">${sanitize(shippingAddress.address)}</td></tr>` : ""}</table><h2 style="color:#1f2937;font-size:16px;border-bottom:2px solid ${color};padding-bottom:8px">Продукти</h2><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><thead><tr style="background:#f9fafb"><th style="padding:10px;text-align:left;color:#6b7280;font-weight:600;font-size:13px">Продукт</th><th style="padding:10px;text-align:center;color:#6b7280;font-weight:600;font-size:13px">Кол.</th><th style="padding:10px;text-align:right;color:#6b7280;font-weight:600;font-size:13px">Цена</th></tr></thead><tbody>${productsList}</tbody></table><div style="background:#f9fafb;padding:15px;border-radius:8px;text-align:right"><span style="font-size:20px;font-weight:800;color:${color}">ОБЩО: €${totalEur.toFixed(2)}</span></div></div></div></body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API}` },
      body: JSON.stringify({
        from: fromAddress,
        to: [BOSS_EMAIL],
        subject: `Нова ${typeLabel} поръчка! ${orderNumber} - ${sanitize(customerName)}`,
        html,
      }),
    });
  } catch (e) {
    console.error("Boss email error:", e);
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, ...SECURITY_HEADERS } });
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 403 }
    );
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 429 }
    );
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const { sessionId, orderNumber } = body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid sessionId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }
    if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid orderNumber' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
      );
    }

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=customer_details&expand[]=line_items`,
      { headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` } }
    );

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error('Stripe error:', JSON.stringify(session));
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Stripe data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
      );
    }

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', payment_status: session.payment_status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const customerDetails = session.customer_details || {};
    const shippingDetails = session.shipping_details || session.shipping || {};
    const shippingAddress = shippingDetails.address || customerDetails.address || {};
    const metadata = session.metadata || {};

    const fullName = shippingDetails.name || customerDetails.name || metadata.customer_name || '';
    const email = customerDetails.email || metadata.customer_email || '';
    const phone = customerDetails.phone || metadata.customer_phone || '';

    const shippingAddressData = {
      full_name: fullName,
      address: [shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(', ') || metadata.shipping_address || '',
      city: shippingAddress.city || metadata.shipping_city || '',
      postal_code: shippingAddress.postal_code || metadata.shipping_postal || '',
      country: shippingAddress.country || 'BG',
      notes: metadata.shipping_notes || '',
    };

    let orderItems: { name: string; quantity: number; price: number }[] = [];

    // New format: each item stored as a separate metadata key (avoids Stripe's 500-char per-value limit)
    for (let i = 0; i < 50; i++) {
      const itemJson = metadata[`item_${i}`];
      if (!itemJson) break;
      try {
        const item = JSON.parse(itemJson);
        orderItems.push({
          name: item.name,
          quantity: item.quantity,
          price: (item.price || 0),
        });
      } catch {
        console.error('Failed to parse item metadata', i);
      }
    }

    // Legacy fallback: single items_json (older sessions)
    if (orderItems.length === 0 && metadata.items_json) {
      try {
        const parsed = JSON.parse(metadata.items_json);
        orderItems = parsed.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          price: (i.price || 0),
        }));
      } catch {
        console.error('Failed to parse items_json');
      }
    }

    const totalEur = parseFloat(metadata.total_eur || '0');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let dbSuccess = false;
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, customer_email, status')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (existingOrder) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          customer_email: email || existingOrder.customer_email,
          customer_phone: phone,
          shipping_address: shippingAddressData,
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('order_number', orderNumber);

      if (updateError) {
        console.error('Update error:', JSON.stringify(updateError));
        return new Response(
          JSON.stringify({ error: 'Failed to update order' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
        );
      }
      dbSuccess = true;
    } else {
      const { error: insertError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          customer_email: email,
          customer_phone: phone,
          shipping_address: shippingAddressData,
          items: orderItems,
          total_amount: totalEur,
          currency: 'EUR',
          status: 'confirmed',
          stripe_session_id: sessionId,
          payment_method: 'stripe',
        }]);

      if (insertError) {
        console.error('Insert error:', JSON.stringify(insertError));
        return new Response(
          JSON.stringify({ error: 'Failed to create order' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
        );
      }
      dbSuccess = true;
    }

    if (dbSuccess) {
      sendBossOrderEmail(
        orderNumber,
        fullName,
        email,
        phone,
        orderItems,
        totalEur,
        'confirmed',
        'Stripe (карта)',
        shippingAddressData,
        false
      );
    }

    return new Response(
      JSON.stringify({ success: true, orderNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
    );
  }
});
