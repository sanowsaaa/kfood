import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export class B2BError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type B2BDependencies = {
  db: SupabaseClient;
  auth: SupabaseClient;
  mail: typeof fetch;
  resendKey: string;
  resendDomain: string;
  bossEmail: string;
};
export function b2bDependencies(): B2BDependencies {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !service || !anon) throw new Error("Missing B2B configuration");
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url: RequestInfo | URL, init?: RequestInit) =>
        fetch(url, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(12_000)])
            : AbortSignal.timeout(12_000),
        }),
    },
  };
  return {
    db: createClient(url, service, options),
    auth: createClient(url, anon, options),
    mail: fetch,
    resendKey: Deno.env.get("RESEND_API") || Deno.env.get("RESEND_API_KEY") || "",
    resendDomain: Deno.env.get("RESEND_FROM_DOMAIN") || "",
    bossEmail: Deno.env.get("B2B_NOTIFICATION_EMAIL") || "nasko1332@gmail.com",
  };
}
export function b2bHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const allowed = [
    "https://k-foodvelikotarnovo.com",
    "https://www.k-foodvelikotarnovo.com",
    "https://readdy.ai",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    ...(Deno.env.get("B2B_ALLOWED_ORIGINS") || "").split(",").map((v) => v.trim()).filter(Boolean),
  ];
  const permitted = origin &&
    (allowed.includes(origin) || /^https:\/\/[a-z0-9-]+\.readdy\.ai$/i.test(origin));
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    ...(permitted
      ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      }
      : {}),
  };
}
export function b2bJson(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: b2bHeaders(req) });
}
export function b2bRequest(req: Request): Response | undefined {
  const origin = req.headers.get("origin");
  if (origin && !("Access-Control-Allow-Origin" in b2bHeaders(req))) {
    throw new B2BError(403, "Неразрешен адрес на сайта.");
  }
  if (req.method === "OPTIONS") return b2bJson(req, {});
  if (req.method !== "POST") throw new B2BError(405, "Използвайте POST.");
}
export async function b2bBody(req: Request): Promise<Record<string, unknown>> {
  if (Number(req.headers.get("content-length")) > 65536) {
    throw new B2BError(413, "Заявката е прекалено голяма.");
  }
  const reader = req.body?.getReader();
  if (!reader) throw new B2BError(400, "Липсва заявка.");
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    length += next.value.length;
    if (length > 65536) {
      await reader.cancel();
      throw new B2BError(413, "Заявката е прекалено голяма.");
    }
    parts.push(next.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  try {
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new B2BError(400, "Невалидна заявка.");
  }
}
export function b2bText(value: unknown, label: string, max: number, required = true): string {
  if (
    typeof value !== "string" || (required && !value.trim()) || value.length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)
  ) {
    throw new B2BError(400, `Невалидно поле: ${label}.`);
  }
  return value.trim();
}
export function b2bEmail(value: unknown): string {
  const email = b2bText(value, "имейл", 200).toLowerCase();
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) throw new B2BError(400, "Невалиден имейл.");
  return email;
}
export function b2bPassword(value: unknown): string {
  if (typeof value !== "string" || !value.length || value.length > 1024) {
    throw new B2BError(400, "Невалидна парола.");
  }
  return value;
}
export async function b2bHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
export async function b2bLimit(
  deps: B2BDependencies,
  scope: string,
  actor: string,
  limit: number,
): Promise<void> {
  const { data, error } = await deps.db.rpc("b2b_rate_limit", {
    p_scope: scope,
    p_actor: await b2bHash(actor),
    p_limit: limit,
  });
  if (error) throw new Error("B2B rate limiter unavailable");
  if (!data) throw new B2BError(429, "Твърде много опити. Опитайте след 15 минути.");
}
export async function b2bUser(req: Request, deps: B2BDependencies): Promise<User> {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new B2BError(401, "Моля, влезте в акаунта си.");
  const { data, error } = await deps.auth.auth.getUser(token);
  if (error || !data.user || !data.user.email_confirmed_at) {
    throw new B2BError(401, "Сесията е невалидна. Влезте отново.");
  }
  return data.user;
}
export async function b2bAdmin(user: User, deps: B2BDependencies): Promise<boolean> {
  if (user.email_confirmed_at && user.email === "nasko1332@gmail.com") return true;
  const { data, error } = await deps.db.from("user_roles").select("role").eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Role lookup failed");
  return data?.role === "admin" || data?.role === "super_admin";
}
export function b2bEscape(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
export type B2BMailResult = { sent: boolean; reason?: string; id?: string };
export async function b2bMail(
  deps: B2BDependencies,
  key: string,
  to: string,
  subject: string,
  html: string,
): Promise<B2BMailResult> {
  if (!deps.resendKey) return { sent: false, reason: "Липсва настройка за имейлите." };
  try {
    const response = await deps.mail("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deps.resendKey}`,
        "Idempotency-Key": key,
      },
      body: JSON.stringify({
        from: deps.resendDomain
          ? `K-FOOD <noreply@${deps.resendDomain}>`
          : "K-FOOD <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { sent: false, reason: `Имейл услугата върна ${response.status}.` };
    }
    const result = await response.json();
    return { sent: true, id: typeof result.id === "string" ? result.id : undefined };
  } catch {
    return { sent: false, reason: "Имейл услугата е временно недостъпна." };
  }
}
export function b2bFailure(req: Request, error: unknown): Response {
  if (error instanceof B2BError) {
    return b2bJson(req, { success: false, error: error.message }, error.status);
  }
  console.error("B2B request failed");
  return b2bJson(req, { success: false, error: "Временен проблем. Опитайте отново." }, 503);
}
