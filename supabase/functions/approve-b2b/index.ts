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

function getApprovalEmail(companyName: string, firstName: string, companyId: string, siteUrl: string) {
  const registerLink = `${siteUrl}/b2b/register`;
  const loginLink = `${siteUrl}/b2b/login`;

  return `<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>B2B Апликация Одобрена</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#059669 100%);padding:40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">K-FOOD</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Велико Търново · Корейска храна на едро</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;">
                Здравейте, ${firstName}!
              </h2>
              <p style="margin:0 0 8px;color:#4b5563;font-size:16px;line-height:1.6;">
                Вашата B2B апликация за <strong style="color:#059669;">${companyName}</strong> беше <strong style="color:#059669;">одобрена</strong>!
              </p>
              <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.6;">
                Вече имате достъп до нашия B2B портал с продукти на едро, специални цени и бързи поръчки.
              </p>

              <div style="background:#ecfdf5;border-radius:12px;padding:28px;margin-bottom:24px;border:1px solid #a7f3d0;text-align:center;">
                <p style="margin:0 0 8px;color:#065f46;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                  Вашият Company ID
                </p>
                <p style="margin:0;font-size:36px;font-weight:800;color:#059669;letter-spacing:3px;font-family:'Courier New',monospace;">
                  ${companyId}
                </p>
                <p style="margin:12px 0 0;color:#374151;font-size:13px;">
                  Запазете този ID — ще ви трябва при първоначална активация на акаунта.
                </p>
              </div>

              <div style="background:#f0fdf4;border-radius:12px;padding:24px;margin-bottom:12px;border:1px solid #bbf7d0;">
                <p style="margin:0 0 4px;color:#065f46;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                  Стъпка 1 — Активирайте акаунта си (еднократно)
                </p>
                <p style="margin:8px 0 16px;color:#374151;font-size:13px;line-height:1.5;">
                  Отидете на страницата за активация, въведете Company ID, имейл адреса и създайте парола.
                </p>
                <div style="text-align:center;">
                  <a href="${registerLink}" style="display:inline-block;background:linear-gradient(135deg,#0d9488 0%,#059669 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                    Активирайте акаунта
                  </a>
                </div>
              </div>

              <div style="background:#f9fafb;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid #e5e7eb;">
                <p style="margin:0 0 4px;color:#4b5563;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                  Стъпка 2 — Влизайте с имейл и парола
                </p>
                <p style="margin:8px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
                  След активацията влизате само с имейл и парола на:
                  <br>
                  <a href="${loginLink}" style="color:#059669;word-break:break-all;">${loginLink}</a>
                </p>
              </div>

              <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:24px;">
                <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">
                  <strong style="color:#6b7280;">Важно:</strong> Паролата се задава еднократно. При забравена парола се свържете с вашия акаунт мениджър.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:24px 30px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                K-FOOD Велико Търново<br>
                Тел: 089 494 4413 · Email: info@k-food.bg<br>
                <a href="${siteUrl}" style="color:#6b7280;">k-foodvelikotarnovo.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...SECURITY_HEADERS } });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const SUPER_ADMIN_EMAIL = "nasko1332@gmail.com";
    let isAdmin = false;
    if (user.email === SUPER_ADMIN_EMAIL) {
      isAdmin = true;
    } else {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      isAdmin = roleData?.role === "admin" || roleData?.role === "super_admin";
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const { application_id, review_notes } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "application_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const { data: app, error: appError } = await supabaseAdmin
      .from("b2b_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    if (app.status === "approved") {
      return new Response(JSON.stringify({ error: "Application already approved" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const userEmail = app.contact_email || app.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email found in application" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://k-foodvelikotarnovo.com";

    const { data: company, error: companyErr } = await supabaseAdmin
      .from("b2b_companies")
      .insert({
        company_name: app.company_name,
        bulstat: app.bulstat,
        vat_number: app.vat_number,
        mol: app.mol,
        address: app.address,
        city: app.city,
        postal_code: app.postal_code,
        country: app.country || "България",
        phone: app.phone,
        email: app.email,
        website: app.website,
        business_type: app.business_type,
        years_in_business: app.years_in_business,
        number_of_locations: app.number_of_locations,
        estimated_monthly_value: app.estimated_monthly_value,
        status: "active",
      })
      .select("id")
      .single();

    if (companyErr) {
      return new Response(JSON.stringify({ error: "Failed to create company" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS },
      });
    }

    const newCompanyId = company.id;

    if (app.contact_first_name) {
      await supabaseAdmin.from("b2b_company_contacts").insert({
        company_id: newCompanyId,
        first_name: app.contact_first_name,
        last_name: app.contact_last_name,
        position: app.contact_position,
        email: app.contact_email,
        mobile: app.contact_mobile,
        is_primary: true,
      });
    }

    if (app.address) {
      await supabaseAdmin.from("b2b_company_addresses").insert({
        company_id: newCompanyId,
        type: "shipping",
        address: app.address,
        city: app.city,
        postal_code: app.postal_code,
        country: app.country || "България",
        is_default: true,
      });
    }

    await supabaseAdmin
      .from("b2b_applications")
      .update({
        status: "approved",
        company_id: newCompanyId,
        reviewer_id: user.id,
        review_notes: review_notes || "",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", app.id);

    await supabaseAdmin.from("b2b_notifications").insert({
      type: "new_application",
      title: `Одобрена B2B апликация: ${app.company_name}`,
      message: `Компанията ${app.company_name} е одобрена за B2B партньорство.`,
      related_id: newCompanyId,
    });

    const resendApiKey = Deno.env.get("RESEND_API") || Deno.env.get("RESEND_API_KEY");
    const resendDomain = Deno.env.get("RESEND_FROM_DOMAIN") || "k-foodvelikotarnovo.com";

    let emailSent = false;
    let emailError = "";

    if (!resendApiKey) {
      emailError = "RESEND_API key not found in Supabase secrets";
    } else {
      try {
        const emailHtml = getApprovalEmail(
          app.company_name,
          app.contact_first_name || "Партньор",
          newCompanyId,
          siteUrl
        );

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `K-FOOD <noreply@${resendDomain}>`,
            to: [userEmail],
            subject: `Вашата B2B апликация е одобрена! Company ID: ${newCompanyId}`,
            html: emailHtml,
          }),
        });

        if (resendRes.ok) {
          emailSent = true;
        } else {
          emailError = `Resend API error: ${resendRes.status}`;
        }
      } catch (_err) {
        emailError = "Resend request failed";
      }
    }

    const resultMessage = emailSent
      ? "Application approved, company created, email sent successfully"
      : `Application approved and company created, but email was NOT sent: ${emailError}`;

    return new Response(
      JSON.stringify({
        success: true,
        company_id: newCompanyId,
        email_sent: emailSent,
        email_error: emailError,
        message: resultMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  }
});