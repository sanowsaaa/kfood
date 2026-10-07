import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const CORS_METHODS = "POST, OPTIONS";

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
    "Access-Control-Allow-Methods": CORS_METHODS,
  };
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
      JSON.stringify({ error: "Неоторизиран източник" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientIp = getClientIp(req);
    
    const { data: settings, error: settingsError } = await supabase
      .from("game_settings")
      .select("games_per_hour, is_active")
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ can_play: true, error: "Settings not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    if (!settings.is_active) {
      return new Response(
        JSON.stringify({ can_play: false, error: "Game is currently disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentGames, error: recentError } = await supabase
      .from("game_sessions")
      .select("created_at")
      .eq("ip_address", clientIp)
      .gte("created_at", oneHourAgo);

    if (recentError) {
      console.error("[check-game-limit] Rate limit query error:", recentError);
      return new Response(
        JSON.stringify({ can_play: true, error: "DB error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    const recentCount = recentGames?.length || 0;
    const gamesLeft = Math.max(0, settings.games_per_hour - recentCount);

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
          can_play: false,
          games_played: recentCount,
          games_limit: settings.games_per_hour,
          games_left: 0,
          minutes_left: minutesLeft,
          message: `Достигнат лимит от ${settings.games_per_hour} игри на час. Опитай след ${minutesLeft} минути.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({
        can_play: true,
        games_played: recentCount,
        games_limit: settings.games_per_hour,
        games_left: gamesLeft,
        minutes_left: 0,
        message: `Оставащи игри: ${gamesLeft} от ${settings.games_per_hour}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );

  } catch (_err) {
    console.error("[check-game-limit] Error:", _err);
    return new Response(
      JSON.stringify({ can_play: true, error: "Internal server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...SECURITY_HEADERS } }
    );
  }
});
