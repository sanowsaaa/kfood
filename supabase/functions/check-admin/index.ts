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
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
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
      JSON.stringify({ isAdmin: false, error: "Too many requests" }),
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
        JSON.stringify({ isAdmin: false, error: "No authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 401 }
      );
    }

    const SUPER_ADMIN_EMAIL = "nasko1332@gmail.com";

    if (user.email === SUPER_ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ isAdmin: true, role: "super_admin", source: "hardcoded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Database error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 500 }
      );
    }

    const isAdmin = roleData?.role === "admin" || roleData?.role === "super_admin";

    return new Response(
      JSON.stringify({
        isAdmin,
        role: roleData?.role || null,
        userId: user.id,
        email: user.email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ isAdmin: false, error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS }, status: 500 }
    );
  }
});
