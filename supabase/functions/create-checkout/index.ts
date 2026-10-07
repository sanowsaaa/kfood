import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

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

// Rate limiter — 10 заявки/минута на IP
const requestCounts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
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

  // Rate limit
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Твърде много заявки. Моля, изчакайте малко.' }),
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

    const { items, promoDiscountPercent = 0, customerEmail, customerPhone } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Няма продукти за плащане' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.id || typeof item.id !== 'number') {
        return new Response(
          JSON.stringify({ error: `Липсва продукт ID за: ${item.name || 'неизвестен'}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
      if (!item.name || typeof item.name !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Невалидно наименование на продукт' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 100) {
        return new Response(
          JSON.stringify({ error: `Невалидно количество за продукт: ${item.name}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }
    }

    // === BACKEND PRICE VALIDATION (single query) ===
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const itemIds = items.map((item: any) => item.id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, price, name')
      .in('id', itemIds);

    if (productsError || !products) {
      console.error('DB error fetching products:', JSON.stringify(productsError));
      return new Response(
        JSON.stringify({ error: 'Грешка при валидация на продуктите' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
      );
    }

    const productMap = new Map();
    for (const p of products) {
      productMap.set(p.id, p);
    }

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

      const realPriceEur = product.price;
      const frontendPriceEur = item.price;

      // Allow tiny floating point differences
      if (Math.abs(realPriceEur - frontendPriceEur) > 0.01) {
        return new Response(
          JSON.stringify({ error: `Невалидна цена за ${item.name}. Очаквана: ${realPriceEur}, получена: ${frontendPriceEur}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 400 }
        );
      }

      // price in the DB is already in EUR — charge it directly (no conversion)
      const priceEur = realPriceEur;
      const itemTotalEur = priceEur * item.quantity;
      totalEur += itemTotalEur;

      validatedItems.push({
        name: item.name,
        priceEur: priceEur,
        price: realPriceEur,
        quantity: item.quantity,
        image: item.image,
      });
    }

    // === DISCOUNT VALIDATION (server-side) ===
    let discountPercent = 0;
    if (totalEur >= 100) discountPercent = 10;
    else if (totalEur >= 50) discountPercent = 5;

    // If promo code is used, volume discount is NOT applied (mutually exclusive)
    const effectiveDiscountPercent = promoDiscountPercent > 0 ? 0 : discountPercent;
    const discountMultiplier = effectiveDiscountPercent > 0 ? (1 - effectiveDiscountPercent / 100) : 1;
    const discountedTotalEur = totalEur * discountMultiplier;

    // Apply promo discount on the original total
    const promoMultiplier = promoDiscountPercent > 0 ? (1 - promoDiscountPercent / 100) : 1;
    const finalTotalEur = discountedTotalEur * promoMultiplier;

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe не е конфигуриран правилно' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
      );
    }

    const now = new Date();
    const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;

    const lineItems = validatedItems.map((item: any) => {
      const itemTotalEur = item.priceEur * item.quantity;
      const itemShare = totalEur > 0 ? itemTotalEur / totalEur : 0;
      const itemDiscountedEur = finalTotalEur * itemShare;
      const unitAmount = Math.round((itemDiscountedEur / item.quantity) * 100);

      const priceData: Record<string, unknown> = {
        currency: 'eur',
        product_data: { name: item.name.substring(0, 127) },
        unit_amount: Math.max(1, unitAmount),
      };

      if (item.image && typeof item.image === 'string' && item.image.startsWith('https://')) {
        (priceData.product_data as Record<string, unknown>).images = [item.image];
      }

      return { price_data: priceData, quantity: item.quantity };
    });

    let requestOrigin = origin || '';
    if (!requestOrigin) {
      const referer = req.headers.get('referer');
      if (referer) {
        try {
          const url = new URL(referer);
          requestOrigin = `${url.protocol}//${url.host}`;
        } catch {
          requestOrigin = 'https://readdy.ai';
        }
      } else {
        requestOrigin = 'https://readdy.ai';
      }
    }

    const isLocalhost = requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1');
    const stripeRedirectBase = isLocalhost ? 'https://readdy.ai' : requestOrigin;

    const itemsSummary = validatedItems.map((i: any) => `${i.name} x${i.quantity}`).join(', ').substring(0, 500);

    const params = new URLSearchParams({
      'mode': 'payment',
      'success_url': `${stripeRedirectBase}/order-success?session_id={CHECKOUT_SESSION_ID}&orderNumber=${encodeURIComponent(orderNumber)}`,
      'cancel_url': `${stripeRedirectBase}/cart`,
      'billing_address_collection': 'required',
      'shipping_address_collection[allowed_countries][0]': 'BG',
      'phone_number_collection[enabled]': 'true',
      'payment_method_types[0]': 'card',
      'locale': 'en',
      'metadata[order_number]': orderNumber,
      'metadata[total_eur]': finalTotalEur.toFixed(2),
      'metadata[items_count]': items.length.toString(),
      'metadata[items_summary]': itemsSummary,
      'metadata[discount_percent]': effectiveDiscountPercent.toString(),
      'metadata[promo_discount_percent]': promoDiscountPercent.toString(),
      'metadata[customer_phone]': customerPhone || '',
    });

    // Store each item as a separate metadata key to stay under Stripe's 500-char per-value limit
    validatedItems.forEach((item: any, index: number) => {
      params.append(`metadata[item_${index}]`, JSON.stringify({ name: item.name, quantity: item.quantity, price: item.price }));
    });

    // Pass customer email to Stripe for prefilling and customer lookup
    if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
      params.append('customer_email', customerEmail.trim());
    }

    lineItems.forEach((item: any, index: number) => {
      const pd = item.price_data;
      const productData = pd.product_data as Record<string, unknown>;
      params.append(`line_items[${index}][price_data][currency]`, pd.currency as string);
      params.append(`line_items[${index}][price_data][product_data][name]`, productData.name as string);
      params.append(`line_items[${index}][price_data][unit_amount]`, pd.unit_amount!.toString());
      params.append(`line_items[${index}][quantity]`, item.quantity.toString());

      const images = productData.images as string[] | undefined;
      if (images && images.length > 0) {
        params.append(`line_items[${index}][price_data][product_data][images][0]`, images[0]);
      }
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe API error:', JSON.stringify(session));
      throw new Error(session.error?.message || `Stripe API грешка: ${response.status}`);
    }

    if (!session.url) {
      throw new Error('Stripe не върна URL за плащане');
    }

    return new Response(
      JSON.stringify({ url: session.url, orderNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 200 }
    );
  } catch (error) {
    console.error('Error в create-checkout функцията:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестна грешка';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }, status: 500 }
    );
  }
});
