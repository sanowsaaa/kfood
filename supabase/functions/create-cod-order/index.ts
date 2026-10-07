import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const RESEND_API = Deno.env.get("RESEND_API");
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN");
const BOSS_EMAIL = "nasko1332@gmail.com";
const EUR_RATE = 0.51129;

function getCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
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
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

function sanitize(str: string): string {
  return str?.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, ...SECURITY_HEADERS } });
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: 'Неоторизиран източник' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 403 }
    );
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Твърде много заявки. Моля, изчакайте.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 429 }
    );
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Методът трябва да бъде POST' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 405 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Невалидно JSON тяло на заявката' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const { items, customer, promoDiscountPercent = 0, promoCode = null } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Няма продукти в поръчката' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    if (!customer || typeof customer !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Липсват данни за клиента' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const requiredFields = ['fullName', 'phone', 'email', 'city', 'address', 'postalCode'];
    for (const field of requiredFields) {
      if (!customer[field] || typeof customer[field] !== 'string') {
        return new Response(
          JSON.stringify({ error: `Липсва поле: ${field}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
    }

    if (typeof promoDiscountPercent !== 'number' || promoDiscountPercent < 0 || promoDiscountPercent > 50) {
      return new Response(
        JSON.stringify({ error: 'Невалидна промо отстъпка' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(customer.email) || customer.email.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Невалиден имейл адрес' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    for (const item of items) {
      if (!item.id || typeof item.id !== 'number') {
        return new Response(
          JSON.stringify({ error: 'Невалиден продукт ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
      if (!item.name || typeof item.name !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Невалидно име на продукт' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 100 || !Number.isInteger(item.quantity)) {
        return new Response(
          JSON.stringify({ error: 'Невалидно количество' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
      if (typeof item.price !== 'number' || item.price <= 0 || item.price > 10000) {
        return new Response(
          JSON.stringify({ error: 'Невалидна цена на продукт' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const itemIds = items.map((i: any) => i.id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, price, name')
      .in('id', itemIds);

    if (productsError || !products) {
      return new Response(
        JSON.stringify({ error: 'Грешка при валидация на продуктите' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
      );
    }

    const productMap = new Map();
    for (const p of products) productMap.set(p.id, p);

    let totalEur = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Продуктът не е намерен: ${item.name}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }

      if (Math.abs(product.price - item.price) > 0.01) {
        return new Response(
          JSON.stringify({ error: `Невалидна цена за ${item.name}. Актуална: €${(product.price * EUR_RATE).toFixed(2)}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }

      const priceEur = product.price * EUR_RATE;
      totalEur += priceEur * item.quantity;
      validatedItems.push({ name: item.name, priceEur: priceEur, priceBgn: product.price, quantity: item.quantity });
    }

    let volumeDiscountPercent = 0;
    if (totalEur >= 100) volumeDiscountPercent = 10;
    else if (totalEur >= 50) volumeDiscountPercent = 5;

    const effectiveVolumeDiscount = promoDiscountPercent > 0 ? 0 : volumeDiscountPercent;
    const volumeMultiplier = effectiveVolumeDiscount > 0 ? (1 - effectiveVolumeDiscount / 100) : 1;
    const afterVolumeDiscount = totalEur * volumeMultiplier;

    const promoMultiplier = promoDiscountPercent > 0 ? (1 - promoDiscountPercent / 100) : 1;
    const finalTotalEur = afterVolumeDiscount * promoMultiplier;

    const codFeeEur = 2 * EUR_RATE;
    const totalWithCODEur = finalTotalEur + codFeeEur;

    const now = new Date();
    const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;

    const { error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([{
        order_number: orderNumber,
        customer_email: customer.email,
        customer_phone: customer.phone,
        shipping_address: {
          full_name: customer.fullName,
          address: customer.address,
          city: customer.city,
          postal_code: customer.postalCode,
          notes: customer.notes || ''
        },
        items: validatedItems,
        total_amount: totalWithCODEur,
        currency: 'EUR',
        status: 'pending',
        promo_code: promoCode,
        promo_discount: promoDiscountPercent,
      }]);

    if (insertError) {
      throw new Error('Грешка при запис на поръчката: ' + insertError.message);
    }

    const productsList = validatedItems
      .map(p => `<tr><td style="padding:12px;border-bottom:1px solid #e5e7eb">${sanitize(p.name)}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center">${p.quantity}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">${(p.priceEur * p.quantity).toFixed(2)} €</td></tr>`)
      .join("");

    const adminEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f3f4f6;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:30px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:24px">Нова поръчка!</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0">Наложен платеж</p></div><div style="background:white;padding:30px;border-radius:0 0 12px 12px"><h2 style="color:#1f2937;margin-top:0;font-size:18px;border-bottom:2px solid #16a34a;padding-bottom:10px">Данни за клиента</h2><table style="width:100%;margin-bottom:25px"><tr><td style="padding:8px 0;color:#6b7280;width:40%">Име:</td><td style="padding:8px 0;color:#1f2937;font-weight:600">${sanitize(customer.fullName)}</td></tr><tr><td style="padding:8px 0;color:#6b7280">Телефон:</td><td style="padding:8px 0;color:#1f2937;font-weight:600">${sanitize(customer.phone)}</td></tr><tr><td style="padding:8px 0;color:#6b7280">Имейл:</td><td style="padding:8px 0;color:#1f2937">${sanitize(customer.email)}</td></tr><tr><td style="padding:8px 0;color:#6b7280">Град:</td><td style="padding:8px 0;color:#1f2937">${sanitize(customer.city)}</td></tr><tr><td style="padding:8px 0;color:#6b7280">Адрес:</td><td style="padding:8px 0;color:#1f2937">${sanitize(customer.address)}</td></tr><tr><td style="padding:8px 0;color:#6b7280">Пощенски код:</td><td style="padding:8px 0;color:#1f2937">${sanitize(customer.postalCode)}</td></tr>${customer.notes ? `<tr><td style="padding:8px 0;color:#6b7280">Бележки:</td><td style="padding:8px 0;color:#1f2937">${sanitize(customer.notes)}</td></tr>` : ""}</table><h2 style="color:#1f2937;font-size:18px;border-bottom:2px solid #16a34a;padding-bottom:10px">Поръчани продукти</h2><table style="width:100%;border-collapse:collapse;margin-bottom:25px"><thead><tr style="background:#f9fafb"><th style="padding:12px;text-align:left;color:#6b7280;font-weight:600">Продукт</th><th style="padding:12px;text-align:center;color:#6b7280;font-weight:600">Кол.</th><th style="padding:12px;text-align:right;color:#6b7280;font-weight:600">Цена</th></tr></thead><tbody>${productsList}</tbody></table><div style="background:#f9fafb;padding:20px;border-radius:8px"><table style="width:100%"><tr><td style="padding:5px 0;color:#6b7280">Междинна сума:</td><td style="padding:5px 0;text-align:right;color:#1f2937">${totalEur.toFixed(2)} €</td></tr>${effectiveVolumeDiscount > 0 ? `<tr><td style="padding:5px 0;color:#6b7280">Отстъпка ${effectiveVolumeDiscount}%:</td><td style="padding:5px 0;text-align:right;color:#1f2937">-${(totalEur - afterVolumeDiscount).toFixed(2)} €</td></tr>` : ""}${promoDiscountPercent > 0 ? `<tr><td style="padding:5px 0;color:#6b7280">Промо отстъпка ${promoDiscountPercent}%:</td><td style="padding:5px 0;text-align:right;color:#1f2937">-${(afterVolumeDiscount - finalTotalEur).toFixed(2)} €</td></tr>` : ""}<tr><td style="padding:5px 0;color:#6b7280">Такса наложен платеж:</td><td style="padding:5px 0;text-align:right;color:#1f2937">${codFeeEur.toFixed(2)} €</td></tr><tr><td style="padding:12px 0 5px;color:#1f2937;font-weight:700;font-size:18px;border-top:2px solid #e5e7eb">ОБЩО:</td><td style="padding:12px 0 5px;text-align:right;color:#16a34a;font-weight:700;font-size:18px;border-top:2px solid #e5e7eb">${totalWithCODEur.toFixed(2)} €</td></tr></table></div></div></div></body></html>`;

    const customerEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f3f4f6;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:30px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:24px">Поръчката е приета!</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0">Благодарим ви за поръчката</p></div><div style="background:white;padding:30px;border-radius:0 0 12px 12px"><p style="color:#1f2937;font-size:16px;line-height:1.6">Здравейте, <strong>${sanitize(customer.fullName)}</strong>!</p><p style="color:#6b7280;line-height:1.6">Вашата поръчка е приета успешно. Ще получите пратката на посочения адрес и ще платите на куриера при получаване.</p><h2 style="color:#1f2937;font-size:18px;border-bottom:2px solid #16a34a;padding-bottom:10px;margin-top:25px">Адрес за доставка</h2><p style="color:#1f2937;line-height:1.8;margin:15px 0">${sanitize(customer.address)}<br>${sanitize(customer.city)}, ${sanitize(customer.postalCode)}<br>Тел: ${sanitize(customer.phone)}</p><h2 style="color:#1f2937;font-size:18px;border-bottom:2px solid #16a34a;padding-bottom:10px">Вашата поръчка</h2><table style="width:100%;border-collapse:collapse;margin-bottom:25px"><thead><tr style="background:#f9fafb"><th style="padding:12px;text-align:left;color:#6b7280;font-weight:600">Продукт</th><th style="padding:12px;text-align:center;color:#6b7280;font-weight:600">Кол.</th><th style="padding:12px;text-align:right;color:#6b7280;font-weight:600">Цена</th></tr></thead><tbody>${productsList}</tbody></table><div style="background:#fef3c7;padding:20px;border-radius:8px;margin-bottom:20px"><p style="margin:0;color:#92400e;font-weight:600">Сума за плащане при доставка: <span style="font-size:20px">${totalWithCODEur.toFixed(2)} €</span></p></div><p style="color:#6b7280;font-size:14px;text-align:center;margin-top:30px">При въпроси, свържете се с нас!</p></div></div></body></html>`;

    const bossEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f3f4f6;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:25px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:22px">Нова B2C поръчка! (Наложен платеж)</h1><p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">${orderNumber}</p></div><div style="background:white;padding:25px;border-radius:0 0 12px 12px"><table style="width:100%;margin-bottom:20px"><tr><td style="padding:8px 12px;background:#f9fafb;border-radius:6px"><strong style="color:#374151">Статус:</strong> <span style="color:#d97706;font-weight:700">pending (наложен платеж)</span></td><td style="padding:8px 12px;background:#f9fafb;border-radius:6px"><strong style="color:#374151">Плащане:</strong> <span style="color:#1f2937">Наложен платеж</span></td></tr></table><h2 style="color:#1f2937;font-size:16px;border-bottom:2px solid #dc2626;padding-bottom:8px;margin-top:0">Клиент</h2><table style="width:100%;margin-bottom:20px"><tr><td style="padding:6px 0;color:#6b7280;width:35%">Име:</td><td style="padding:6px 0;color:#1f2937;font-weight:600">${sanitize(customer.fullName)}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Телефон:</td><td style="padding:6px 0;color:#1f2937;font-weight:600">${sanitize(customer.phone)}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Имейл:</td><td style="padding:6px 0;color:#1f2937">${sanitize(customer.email)}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Град:</td><td style="padding:6px 0;color:#1f2937">${sanitize(customer.city)}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Адрес:</td><td style="padding:6px 0;color:#1f2937">${sanitize(customer.address)}</td></tr></table><h2 style="color:#1f2937;font-size:16px;border-bottom:2px solid #dc2626;padding-bottom:8px">Продукти</h2><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><thead><tr style="background:#f9fafb"><th style="padding:10px;text-align:left;color:#6b7280;font-weight:600;font-size:13px">Продукт</th><th style="padding:10px;text-align:center;color:#6b7280;font-weight:600;font-size:13px">Кол.</th><th style="padding:10px;text-align:right;color:#6b7280;font-weight:600;font-size:13px">Цена</th></tr></thead><tbody>${productsList}</tbody></table><div style="background:#f9fafb;padding:15px;border-radius:8px;text-align:right"><span style="font-size:20px;font-weight:800;color:#dc2626">ОБЩО: ${totalWithCODEur.toFixed(2)} €</span></div></div></div></body></html>`;

    const emailResults = [];
    const fromAddress = RESEND_FROM_DOMAIN
      ? `K-FOOD Поръчки <noreply@${RESEND_FROM_DOMAIN}>`
      : "K-FOOD Поръчки <onboarding@resend.dev>";

    if (RESEND_API) {
      const adminResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API}` },
        body: JSON.stringify({
          from: fromAddress,
          to: ["kfoodstore.bg@gmail.com"],
          subject: `Нова поръчка с наложен платеж - ${sanitize(customer.fullName)}`,
          html: adminEmailHtml,
        }),
      });
      emailResults.push({ type: "admin", success: adminResponse.ok });

      const bossResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API}` },
        body: JSON.stringify({
          from: fromAddress,
          to: [BOSS_EMAIL],
          subject: `Нова B2C поръчка! ${orderNumber} - ${sanitize(customer.fullName)}`,
          html: bossEmailHtml,
        }),
      });
      emailResults.push({ type: "boss", success: bossResponse.ok });

      const customerResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API}` },
        body: JSON.stringify({
          from: fromAddress,
          to: [customer.email],
          subject: "Потвърждение на поръчка - Наложен платеж",
          html: customerEmailHtml,
        }),
      });
      emailResults.push({ type: "customer", success: customerResponse.ok });
    }

    return new Response(
      JSON.stringify({ success: true, orderNumber, totalWithCOD: totalWithCODEur.toFixed(2), emails: emailResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 200 }
    );

  } catch (error) {
    console.error('Error в create-cod-order:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Неизвестна грешка' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
    );
  }
});
