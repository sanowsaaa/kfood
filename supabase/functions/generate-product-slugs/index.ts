import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

function generateSlug(name: string): string {
  const map: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ж':'zh','з':'z','и':'i','й':'y',
    'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
    'ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sht','ъ':'a','ь':'y','ю':'yu','я':'ya',
    'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ж':'Zh','З':'Z','И':'I','Й':'Y',
    'К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U',
    'Ф':'F','Х':'H','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Sht','Ъ':'A','Ь':'Y','Ю':'Yu','Я':'Ya',
    'ё':'yo','Ё':'Yo','э':'e','Э':'E','ы':'y','Ы':'Y',
  };

  let s = name.split('').map(c => map[c] || c).join('');
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9\s-]/g, '');
  s = s.replace(/\s+/g, '-').replace(/-+/g, '-');
  s = s.replace(/^-|-$/g, '');

  s = s.replace(/-\d+\s*(г|гр|мл|kg|g|ml|oz|lb|pcs|бр|броя|бр\.)/g, '');
  s = s.replace(/-\d+\s*x\s*\d+/g, '');
  s = s.replace(/-x\d+/g, '');
  s = s.replace(/-\d+\s*(гр\.?|g|ml|gr|pcs)/g, '');
  s = s.replace(/-\d+\s*ml/g, '');
  s = s.replace(/-promotsiya/g, '');
  s = s.replace(/-promo/g, '');

  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s || 'product';
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: { ...corsHeaders, ...SECURITY_HEADERS } });
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }
    });
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }
      });
    }

    const SUPER_ADMIN_EMAIL = "nasko1332@gmail.com";
    let isAdmin = false;
    if (user.email === SUPER_ADMIN_EMAIL) {
      isAdmin = true;
    } else {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      isAdmin = roleData?.role === "admin" || roleData?.role === "super_admin";
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS }
      });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, slug');

    if (error) throw error;

    let updated = 0;
    let skipped = 0;

    for (const product of products || []) {
      if (product.slug) { skipped++; continue; }

      let slug = generateSlug(product.name);
      if (!slug) slug = `product-${product.id}`;

      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .neq('id', product.id)
        .maybeSingle();

      if (existing) slug = `${slug}-${product.id}`;

      const { error: updateError } = await supabase
        .from('products')
        .update({ slug, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Failed ${product.id}:`, updateError);
        skipped++;
      } else {
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, skipped, total: (products || []).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS } }
    );
  } catch (err) {
    console.error('Slug generation error:', err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...SECURITY_HEADERS } }
    );
  }
});
