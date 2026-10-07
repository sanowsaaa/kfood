import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const RESEND_API = Deno.env.get("RESEND_API");
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN");
const EUR_RATE = 0.51129;

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

// Rate limiter — 5 заявки/минута на IP
const requestCounts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

interface OrderProduct {
  name: string;
  quantity: number;
  price: number;
}

interface OrderData {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  postalCode: string;
  notes: string;
  subtotal: string;
  deliveryFee: string;
  codFee: string;
  total: string;
  products: OrderProduct[];
  adminEmail: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...SECURITY_HEADERS } });
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
    const orderData: OrderData = await req.json();

    if (!orderData.email || !orderData.fullName || !orderData.products?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(orderData.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }
    if (/[\r\n\x00-\x1f\x7f]/.test(orderData.email) || orderData.email.includes(',') || orderData.email.includes(';')) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let calculatedSubtotal = 0;
    for (const product of orderData.products) {
      if (!product.name || typeof product.price !== 'number' || product.price <= 0 || product.price > 10000) {
        return new Response(
          JSON.stringify({ error: 'Invalid product data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
      calculatedSubtotal += product.price * (product.quantity || 1);
    }

    const frontendSubtotal = parseFloat(orderData.subtotal?.replace(/[^0-9.]/g, '') || '0');
    if (Math.abs(calculatedSubtotal - frontendSubtotal) > 0.5) {
      return new Response(
        JSON.stringify({ error: 'Invalid order amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const sanitize = (str: string) => str?.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';

    const productsList = orderData.products
      .map(p => `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${sanitize(p.name)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${Number(p.quantity)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(Number(p.price) * Number(p.quantity) * EUR_RATE).toFixed(2)} €</td>
      </tr>`)
      .join("");

    const adminEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:sans-serif;background:#f3f4f6;margin:0;padding:0">
      <div style="max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:30px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">Нова поръчка!</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0">Наложен платеж</p>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 12px 12px">
          <h2 style="color:#1f2937;margin-top:0;font-size:18px;border-bottom:2px solid #16a34a;padding-bottom:10px">Данни за клиента</h2>
          <table style="width:100%;margin-bottom:25px">
            <tr><td style="padding:8px 0;color:#6b7280;width:40%">Име:</td><td style="padding:8px 0;color:#1f2937;font-weight:600">${sanitize(orderData.fullName)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Телефон:</td><td style="padding:8px 0;color:#1f2937;font-weight:600">${sanitize(orderData.phone)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Имейл:</td><td style="padding:8px 0;color:#1f2937">${sanitize(orderData.email)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Град:</td><td style="padding:8px 0;color:#1f2937">${sanitize(orderData.city)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Адрес:</td><td style="padding:8px 0;color:#1f2937">${sanitize(orderData.address)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Пощенски код:</td><td style="padding:8px 0;color:#1f2937">${sanitize(orderData.postalCode)}</td></tr>
            ${orderData.notes ? `<tr><td style="padding:8px 0;color:#6b7280">Бележки:</td><td style="padding:8px 0;color:#1f2937">${sanitize(orderData.notes)}</td></tr>` : ""}
          </table>
          <h2 style="color:#1f2937;font-size:18px;border-bottom:2px solid #16a34a;padding-bottom:10px">Поръчани продукти</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:25px">
            <thead><tr style="background:#f9fafb">
              <th style="padding:12px;text-align:left;color:#6b7280;font-weight:600">Продукт</th>
              <th style="padding:12px;text-align:center;color:#6b7280;font-weight:600">Кол.</th>
              <th style="padding:12px;text-align:right;color:#6b7280;font-weight:600">Цена</th>
            </tr></thead>
            <tbody>${productsList}</tbody>
          </table>
          <div style="background:#f9fafb;padding:20px;border-radius:8px">
            <table style="width:100%">
              <tr><td style="padding:5px 0;color:#6b7280">Междинна сума:</td><td style="padding:5px 0;text-align:right;color:#1f2937">${sanitize(orderData.subtotal)}</td></tr>
              <tr><td style="padding:5px 0;color:#6b7280">Доставка:</td><td style="padding:5px 0;text-align:right;color:#1f2937">${sanitize(orderData.deliveryFee)}</td></tr>
              <tr><td style="padding:5px 0;color:#6b7280">Такса наложен платеж:</td><td style="padding:5px 0;text-align:right;color:#1f2937">${sanitize(orderData.codFee)}</td></tr>
              <tr><td style="padding:12px 0 5px;color:#1f2937;font-weight:700;font-size:18px;border-top:2px solid #e5e7eb">ОБЩО:</td><td style="padding:12px 0 5px;text-align:right;color:#16a34a;font-weight:700;font-size:18px;border-top:2px solid #e5e7eb">${sanitize(orderData.total)}</td></tr>
            </table>
          </div>
        </div>
      </div>
    </body></html>`;

    const customerEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:sans-serif;background:#f3f4f6;margin:0;padding:0">
      <div style="max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:30px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">Поръчката е приета!</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0">Благодарим ви за поръчката</p>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 12px 12px">
          <p style="color:#1f2937;font-size:16px;line-height:1.6">Здравейте, <strong>${sanitize(orderData.fullName)}</strong>!</p>
          <p style="color:#6b7280;line-height:1.6">Вашата поръчка е приета успешно. Ще получите пратката на посочения адрес и ще платите на куриера при получаване.</p>
          <h2 style="color:#1f2937;font-size:18px;border-bottom:2px solid #16a34a;padding-bottom:10px;margin-top:25px">Адрес за доставка</h2>
          <p style="color:#1f2937;line-height:1.8;margin:15px 0">${sanitize(orderData.address)}<br>${sanitize(orderData.city)}, ${sanitize(orderData.postalCode)}<br>Тел: ${sanitize(orderData.phone)}</p>
          <h2 style="color:#1f2937;font-size:18px;border-bottom:2px solid #16a34a;padding-bottom:10px">Вашата поръчка</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:25px">
            <thead><tr style="background:#f9fafb">
              <th style="padding:12px;text-align:left;color:#6b7280;font-weight:600">Продукт</th>
              <th style="padding:12px;text-align:center;color:#6b7280;font-weight:600">Кол.</th>
              <th style="padding:12px;text-align:right;color:#6b7280;font-weight:600">Цена</th>
            </tr></thead>
            <tbody>${productsList}</tbody>
          </table>
          <div style="background:#fef3c7;padding:20px;border-radius:8px;margin-bottom:20px">
            <p style="margin:0;color:#92400e;font-weight:600">Сума за плащане при доставка: <span style="font-size:20px">${sanitize(orderData.total)}</span></p>
          </div>
          <p style="color:#6b7280;font-size:14px;text-align:center;margin-top:30px">При въпроси, свържете се с нас!</p>
        </div>
      </div>
    </body></html>`;

    const results = [];
    const fromAddress = RESEND_FROM_DOMAIN
      ? `K-FOOD Поръчки <noreply@${RESEND_FROM_DOMAIN}>`
      : "K-FOOD Поръчки <onboarding@resend.dev>";

    if (RESEND_API && orderData.adminEmail) {
      const adminResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API}` },
        body: JSON.stringify({
          from: fromAddress,
          to: [orderData.adminEmail],
          subject: `Нова поръчка с наложен платеж - ${sanitize(orderData.fullName)}`,
          html: adminEmailHtml,
        }),
      });
      results.push({ type: "admin", success: adminResponse.ok });
    }

    if (RESEND_API && orderData.email) {
      const customerResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API}` },
        body: JSON.stringify({
          from: fromAddress,
          to: [orderData.email],
          subject: "Потвърждение на поръчка - Наложен платеж",
          html: customerEmailHtml,
        }),
      });
      results.push({ type: "customer", success: customerResponse.ok });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 200 }
    );
  } catch (error) {
    console.error('Error in send-cod-order-notification:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
    );
  }
});
