import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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

// Rate limiter — 15 заявки/минута на IP
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

const RESEND_API = Deno.env.get("RESEND_API");
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN");
const BOSS_EMAIL = "nasko1332@gmail.com";

function sanitize(str: string): string {
  return str?.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';
}

async function sendBossRegistrationEmail(companyName: string, email: string, companyId: string) {
  if (!RESEND_API) return;

  const fromAddress = RESEND_FROM_DOMAIN
    ? `K-FOOD B2B <noreply@${RESEND_FROM_DOMAIN}>`
    : "K-FOOD B2B <onboarding@resend.dev>";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#0f172a;margin:0;padding:0"><div style="max-width:500px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#059669,#047857);padding:25px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:22px">Нова B2B регистрация!</h1><p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">Компанията активира своя акаунт</p></div><div style="background:#1e293b;padding:25px;border-radius:0 0 12px 12px;color:#e2e8f0"><table style="width:100%"><tr><td style="padding:10px 0;color:#94a3b8;width:35%">Компания:</td><td style="padding:10px 0;color:#e2e8f0;font-weight:700;font-size:16px">${sanitize(companyName)}</td></tr><tr><td style="padding:10px 0;color:#94a3b8">Имейл:</td><td style="padding:10px 0;color:#e2e8f0">${sanitize(email)}</td></tr><tr><td style="padding:10px 0;color:#94a3b8">Company ID:</td><td style="padding:10px 0;color:#34d399;font-family:monospace;font-weight:600">${sanitize(companyId)}</td></tr></table><div style="background:#334155;padding:15px;border-radius:8px;margin-top:20px;text-align:center"><p style="color:#cbd5e1;margin:0;font-size:14px">Партньорът вече има достъп до B2B портала и може да разглежда продукти с персонални цени.</p></div></div></div></body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API}` },
      body: JSON.stringify({
        from: fromAddress,
        to: [BOSS_EMAIL],
        subject: `Нова B2B регистрация - ${sanitize(companyName)}`,
        html,
      }),
    });
  } catch (e) {
    console.error("Boss registration email error:", e);
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...SECURITY_HEADERS } });
  }

  // Rate limit
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

    const { mode, companyId, email, password } = await req.json();

    if (!mode || !email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Липсват задължителни полета." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Паролата трябва да е поне 6 символа." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    if (mode === "register") {
      if (!companyId) {
        return new Response(
          JSON.stringify({ success: false, error: "Company ID е задължителен за регистрация." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      const { data: company, error: companyErr } = await supabaseAdmin
        .from("b2b_companies")
        .select("id, company_name, email, status, user_id")
        .eq("id", companyId)
        .eq("email", email)
        .maybeSingle();

      if (companyErr || !company) {
        return new Response(
          JSON.stringify({ success: false, error: "Грешен Company ID или имейл. Проверете одобрителния имейл." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      if (company.status !== "active") {
        return new Response(
          JSON.stringify({ success: false, error: "Този акаунт не е активен. Свържете се с администратор." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      if (company.user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Този Company ID вече е активиран. Моля, влезте през страницата за вход.", already_registered: true }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      // Check if email already exists in auth via getUserByEmail (much more reliable than listUsers)
      try {
        const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
        const existingByEmail = existingAuth?.users?.find((u: any) => u.email === email);
        if (existingByEmail) {
          return new Response(
            JSON.stringify({ success: false, error: "Този имейл вече има акаунт. Моля, влезте през страницата за вход.", already_registered: true }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
          );
        }
      } catch (_listErr) {
        // If listUsers fails, let createUser handle the duplicate email error
      }

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          company_name: company.company_name,
          company_id: companyId,
          role: "b2b",
        },
      });

      if (createErr || !newUser?.user) {
        console.error("Failed to create user:", createErr);
        if (createErr?.message?.includes("already") || createErr?.message?.includes("taken") || createErr?.message?.includes("exists")) {
          return new Response(
            JSON.stringify({ success: false, error: "Този имейл вече има акаунт. Моля, влезте през страницата за вход.", already_registered: true }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
          );
        }
        return new Response(
          JSON.stringify({ success: false, error: "Грешка при създаване на акаунт. Опитайте отново." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      const userId = newUser.user.id;

      await supabaseAdmin
        .from("b2b_companies")
        .update({ user_id: userId })
        .eq("id", companyId);

      sendBossRegistrationEmail(company.company_name, email, companyId);

      const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInErr || !signInData?.session) {
        return new Response(
          JSON.stringify({ success: false, error: "Регистрацията е успешна, но входът не успя. Моля, отидете на страницата за вход." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          company_id: companyId,
          company_name: company.company_name,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    if (mode === "login") {
      const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInErr || !signInData?.user) {
        return new Response(
          JSON.stringify({ success: false, error: "Грешен имейл или парола." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      const { data: company, error: companyErr } = await supabaseAdmin
        .from("b2b_companies")
        .select("id, company_name, status")
        .eq("user_id", signInData.user.id)
        .maybeSingle();

      if (companyErr || !company) {
        return new Response(
          JSON.stringify({ success: false, error: "Този акаунт няма B2B достъп. Свържете се с администратор." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      if (company.status !== "active") {
        return new Response(
          JSON.stringify({ success: false, error: "B2B акаунтът е суспендиран. Свържете се с администратор." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          company_id: company.id,
          company_name: company.company_name,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Невалиден режим на работа." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );

  } catch (err: any) {
    console.error("b2b-auth error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Възникна неочаквана грешка. Моля, опитайте отново по-късно." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  }
});
