import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

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

function getCorsHeaders(origin: string | null) {
  const safeOrigin = isAllowedOrigin(origin) ? (origin || "*") : "https://k-foodvelikotarnovo.com";
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function isValidIp(ip: string): boolean {
  if (!ip || ip === "unknown" || ip === "client") return false;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  if (/^[0-9a-fA-F:]+$/.test(ip) && ip.includes(":")) return true;
  return false;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map(p => p.trim()).filter(p => p && p !== "unknown" && p !== "client");
    for (const part of parts) {
      if (isValidIp(part)) return part;
    }
  }
  const realIp = req.headers.get("x-real-ip");
  if (isValidIp(realIp)) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip");
  if (isValidIp(cfIp)) return cfIp;
  return "unknown";
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...SECURITY_HEADERS } });
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  }

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { session_id, score, level, play_duration_ms } = await req.json();

    if (!session_id || typeof score !== "number") {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    const { data: settings, error: settingsError } = await supabase
      .from("game_settings")
      .select("*")
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Game settings not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    if (!settings.is_active) {
      return new Response(
        JSON.stringify({ error: "Game is currently disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentGames, error: recentError } = await supabase
      .from("game_sessions")
      .select("id, score, created_at")
      .eq("ip_address", clientIp)
      .gte("created_at", oneHourAgo);

    if (recentError) {
      console.error("Rate limit query error:", recentError);
    }

    const recentCount = recentGames?.length || 0;

    if (recentCount >= settings.games_per_hour) {
      const sorted = recentGames?.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const oldestGame = sorted?.[0];
      const resetAt = oldestGame
        ? new Date(new Date(oldestGame.created_at).getTime() + 60 * 60 * 1000)
        : new Date(Date.now() + 60 * 60 * 1000);
      const minutesLeft = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60000));

      return new Response(
        JSON.stringify({
          error: "rate_limited",
          message: `Достигнат лимит от ${settings.games_per_hour} игри на час. Опитай след ${minutesLeft} минути.`,
          retry_after_minutes: minutesLeft,
          promo_code: null,
          discount_percent: 0,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    const MIN_PLAY_MS = 10_000;
    if (typeof play_duration_ms === "number" && play_duration_ms < MIN_PLAY_MS) {
      return new Response(
        JSON.stringify({
          error: "too_fast",
          message: "Играта приключи твърде бързо. Опитай отново!",
          promo_code: null,
          discount_percent: 0,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    const MAX_PTS_PER_SECOND = 600;
    if (typeof play_duration_ms === "number" && play_duration_ms > 0) {
      const playSeconds = play_duration_ms / 1000;
      const maxPossibleScore = playSeconds * MAX_PTS_PER_SECOND;
      if (score > maxPossibleScore) {
        return new Response(
          JSON.stringify({
            error: "suspicious_score",
            message: "Резултатът изглежда нереалистичен. Опитай отново!",
            promo_code: null,
            discount_percent: 0,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }
    }

    const { data: existingSession } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("session_id", session_id)
      .eq("code_used", false)
      .gt("code_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let promoCode: string;
    let discountPercent: number;
    let expiresAt: Date;
    let isExisting = false;

    if (existingSession) {
      promoCode = existingSession.promo_code;
      discountPercent = existingSession.discount_percent;
      expiresAt = new Date(existingSession.code_expires_at);
      isExisting = true;
    } else {
      discountPercent = 0;
      if (score >= settings.score_50_percent) {
        if (settings.jackpot_enabled && Math.random() < settings.jackpot_probability) {
          discountPercent = 50;
        } else {
          discountPercent = settings.max_discount;
        }
      } else if (score >= settings.score_10_percent) {
        discountPercent = 10;
      } else if (score >= settings.score_5_percent) {
        discountPercent = 5;
      }

      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      promoCode = `KFOOD-${discountPercent}-${timestamp}${random}`;
      expiresAt = new Date(Date.now() + settings.code_expiry_minutes * 60 * 1000);
    }

    const { error: insertError } = await supabase
      .from("game_sessions")
      .insert([{
        session_id,
        ip_address: clientIp,
        score,
        level: level || 1,
        discount_percent: discountPercent,
        promo_code: promoCode,
        code_used: false,
        code_expires_at: expiresAt.toISOString(),
        player_name: "Анонимен",
      }]);

    if (insertError) {
      console.error("[generate-promo-code] Error saving game session:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save game session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    if (isExisting) {
      return new Response(
        JSON.stringify({
          promo_code: promoCode,
          discount_percent: discountPercent,
          expires_at: expiresAt.toISOString(),
          score,
          message: "Вече имаш активен промо код!",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({
        promo_code: promoCode,
        discount_percent: discountPercent,
        expires_at: expiresAt.toISOString(),
        score,
        level,
        message: discountPercent > 0
          ? `Поздравления! Спечели ${discountPercent}% отстъпка!`
          : "Добър опит! Играй отново за по-голяма отстъпка!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );

  } catch (error) {
    console.error("[generate-promo-code] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  }
});
