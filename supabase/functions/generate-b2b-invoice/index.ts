import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const CORS_METHODS = "POST, GET, OPTIONS";

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

// K-FOOD company data
const KF_COMPANY = {
  name: "К-ФУУД ЕООД",
  nameLatin: "K-FOOD EOOD",
  bulstat: "208540947",
  vat: "BG208540947",
  address: 'ул. "Велчо Джамджията", 6',
  city: "Велико Търново",
  postalCode: "5000",
  district: "жк. Варуша-юг",
  mol: "АТАНАС ВЕСЕЛИНОВ АТАНАСОВ",
  iban: "",
  bank: "",
};

// Bulgarian number to words for invoice totals (EUR)
const ones = ["", "едно", "две", "три", "четири", "пет", "шест", "седем", "осем", "девет"];
const teens = ["десет", "единадесет", "дванадесет", "тринадесет", "четиринадесет", "петнадесет", "шестнадесет", "седемнадесет", "осемнадесет", "деветнадесет"];
const tens = ["", "", "двадесет", "тридесет", "четиридесет", "петдесет", "шестдесет", "седемдесет", "осемдесет", "деветдесет"];
const hundreds = ["", "сто", "двеста", "триста", "четиристотин", "петстотин", "шестстотин", "седемстотин", "осемстотин", "деветстотин"];

function numberToWordsBg(n: number): string {
  if (n === 0) return "нула";
  if (n < 0) return "минус " + numberToWordsBg(Math.abs(n));

  const euros = Math.floor(n);
  const cents = Math.round((n - euros) * 100);

  let result = "";

  if (euros >= 1000000) {
    const millions = Math.floor(euros / 1000000);
    result += numberToWordsBg(millions) + " милиона ";
    return result + numberToWordsBg(euros % 1000000) + " евро" + (cents > 0 ? " и " + cents + " цента" : "");
  }

  if (euros >= 1000) {
    const thousands = Math.floor(euros / 1000);
    if (thousands === 1) result += "хиляда ";
    else if (thousands === 2) result += "две хиляди ";
    else result += numberToWordsBg(thousands) + " хиляди ";
    if (euros % 1000 !== 0) result += numberToWordsBgSmall(euros % 1000) + " ";
  } else {
    result += numberToWordsBgSmall(euros) + " ";
  }

  result += "евро";

  if (cents > 0) {
    result += " и " + cents + " цента";
  }

  return result;
}

function numberToWordsBgSmall(n: number): string {
  if (n === 0) return "";
  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o > 0 ? " и " + ones[o] : "");
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return hundreds[h] + (rest > 0 ? " " + numberToWordsBgSmall(rest) : "");
}

function generateInvoiceNumber(existingCount: number): string {
  const next = existingCount + 1;
  return String(next).padStart(10, "0");
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric" });
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
      JSON.stringify({ success: false, error: "Твърде много заявки." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 429 }
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").filter(Boolean);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const SUPER_ADMIN_EMAIL = "nasko1332@gmail.com";

    // POST: Generate invoice (admin only)
    if (req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 401 }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 401 }
        );
      }

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
          JSON.stringify({ success: false, error: "Forbidden" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 403 }
        );
      }

      const body = await req.json();
      const { order_id } = body;

      if (!order_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Липсва order_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 400 }
        );
      }

      // Check existing invoice
      const { data: existingInvoice } = await supabaseAdmin
        .from("b2b_invoices")
        .select("id, invoice_number")
        .eq("order_id", order_id)
        .maybeSingle();

      if (existingInvoice) {
        return new Response(
          JSON.stringify({
            success: true,
            already_exists: true,
            invoice_number: existingInvoice.invoice_number,
            message: "Търговски документ вече съществува за тази поръчка.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      // Fetch order
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ success: false, error: "Поръчката не е намерена." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 404 }
        );
      }

      if (order.status !== "approved") {
        return new Response(
          JSON.stringify({ success: false, error: "Поръчката трябва да е одобрена преди генериране на търговски документ." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 400 }
        );
      }

      // Fetch company info
      let companyData = null;
      if (order.b2b_company_id) {
        const { data: comp } = await supabaseAdmin
          .from("b2b_companies")
          .select("company_name, bulstat, vat_number, mol, address, city, postal_code, email, phone")
          .eq("id", order.b2b_company_id)
          .maybeSingle();
        companyData = comp;
      }

      // Get next invoice number
      const { count } = await supabaseAdmin
        .from("b2b_invoices")
        .select("*", { count: "exact", head: true });

      const invoiceNumber = generateInvoiceNumber(count || 0);

      const originalTotal = order.original_total_amount
        ? Number(order.original_total_amount)
        : Number(order.total_amount);
      const totalAmount = Number(order.total_amount);
      const discountPercent = order.admin_discount_percent
        ? Number(order.admin_discount_percent)
        : 0;

      const discountedTotal = Math.round(totalAmount * 100) / 100;
      const vatPercent = 20;
      const vatAmount = Math.round(discountedTotal * vatPercent / (100 + vatPercent) * 100) / 100;
      const baseAmount = Math.round((discountedTotal - vatAmount) * 100) / 100;
      const totalWithVat = Math.round((baseAmount + vatAmount) * 100) / 100;
      const totalInWords = numberToWordsBg(totalWithVat);

      const items = (order.items || []) as any[];

      const invoiceData = {
        order_id,
        invoice_number: invoiceNumber,
        company_name: companyData?.company_name || "B2B Клиент",
        company_bulstat: companyData?.bulstat || null,
        company_vat: companyData?.vat_number || null,
        company_address: companyData?.address || null,
        company_city: companyData?.city || null,
        company_postal_code: companyData?.postal_code || null,
        company_mol: companyData?.mol || null,
        company_email: companyData?.email || order.customer_email,
        company_phone: companyData?.phone || order.customer_phone,
        items: order.items,
        original_total: originalTotal,
        discount_percent: discountPercent,
        discounted_total: baseAmount,
        vat_percent: vatPercent,
        vat_amount: vatAmount,
        total_with_vat: totalWithVat,
        total_in_words: totalInWords,
        payment_method: "bank_transfer",
        notes: order.discount_notes || null,
        created_by: user.id,
      };

      const { data: savedInvoice, error: insertError } = await supabaseAdmin
        .from("b2b_invoices")
        .insert(invoiceData)
        .select("id, invoice_number")
        .single();

      if (insertError) {
        console.error("Invoice insert error:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Грешка при запис на търговския документ." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          invoice_number: invoiceNumber,
          invoice_id: savedInvoice.id,
          message: `Търговски документ ${invoiceNumber} е генериран успешно.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    // GET: Fetch invoice data by number
    if (req.method === "GET") {
      const invoiceNumber = path[path.length - 1];

      if (!invoiceNumber) {
        return new Response(
          JSON.stringify({ success: false, error: "Липсва номер на търговски документ." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 400 }
        );
      }

      const { data: invoice, error: fetchError } = await supabaseAdmin
        .from("b2b_invoices")
        .select("*")
        .eq("invoice_number", invoiceNumber)
        .maybeSingle();

      if (fetchError || !invoice) {
        return new Response(
          JSON.stringify({ success: false, error: "Търговският документ не е намерен." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 404 }
        );
      }

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("order_number, created_at, shipping_address")
        .eq("id", invoice.order_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          invoice,
          seller: KF_COMPANY,
          order_info: order || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 405 }
    );
  } catch (_err) {
    console.error("generate-b2b-invoice error:", _err);
    return new Response(
      JSON.stringify({ success: false, error: "Възникна неочаквана грешка." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 500 }
    );
  }
});
