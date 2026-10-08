import {
  b2bAdmin,
  b2bBody,
  type B2BDependencies,
  b2bDependencies,
  b2bEmail,
  B2BError,
  b2bEscape,
  b2bFailure,
  b2bJson,
  b2bLimit,
  b2bMail,
  b2bPassword,
  b2bRequest,
  b2bText,
  b2bUser,
  UUID_PATTERN,
} from "../_shared/b2b.ts";

const PROFILE_FIELDS =
  "id,company_name,email,phone,city,address,postal_code,business_type,status,credit_limit,pricing_tier_id,created_at,user_id";
async function activeCompany(deps: B2BDependencies, companyId: string, email: string) {
  const { data, error } = await deps.db.from("b2b_companies")
    .select("id,company_name,email,status,user_id").eq("id", companyId).maybeSingle();
  if (error) throw new Error("Company lookup failed");
  if (!data || data.status !== "active" || data.email?.trim().toLowerCase() !== email) {
    throw new B2BError(401, "Проверете фирмения идентификатор и имейла от одобрението.");
  }
  return data;
}

export async function handleB2BAuth(req: Request, deps: B2BDependencies): Promise<Response> {
  try {
    const early = b2bRequest(req);
    if (early) return early;
    const body = await b2bBody(req);
    if (body.mode === "profile") {
      const user = await b2bUser(req, deps);
      const isAdmin = await b2bAdmin(user, deps);
      const { data: company, error } = await deps.db.from("b2b_companies")
        .select(PROFILE_FIELDS).eq("user_id", user.id).eq("status", "active").maybeSingle();
      if (error) throw new Error("Profile lookup failed");
      return b2bJson(req, { success: true, isAdmin, company: company || null });
    }
    if (!["login", "request_activation", "register"].includes(String(body.mode))) {
      throw new B2BError(400, "Невалидно действие.");
    }
    const email = b2bEmail(body.email);
    await b2bLimit(deps, String(body.mode), email, body.mode === "request_activation" ? 3 : 10);
    if (body.mode === "login") {
      // Existing partners keep their existing passwords, including legacy lengths.
      const password = b2bPassword(body.password);
      const { data, error } = await deps.auth.auth.signInWithPassword({ email, password });
      if (error || !data.user?.email_confirmed_at || !data.session) {
        throw new B2BError(401, "Грешен имейл или парола.");
      }
      const { data: company, error: companyError } = await deps.db.from("b2b_companies")
        .select("id,company_name,status").eq("user_id", data.user.id).maybeSingle();
      if (companyError) throw new Error("Company lookup failed");
      if (!company || company.status !== "active") {
        throw new B2BError(403, "Акаунтът няма активен B2B достъп.");
      }
      return b2bJson(req, {
        success: true,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        company_id: company.id,
        company_name: company.company_name,
      });
    }
    const companyId = b2bText(body.companyId, "фирмен идентификатор", 36);
    if (!UUID_PATTERN.test(companyId)) throw new B2BError(400, "Невалиден фирмен идентификатор.");
    const company = await activeCompany(deps, companyId, email);
    if (company.user_id) {
      return b2bJson(req, {
        success: false,
        already_registered: true,
        error: "Този акаунт вече е активиран. Влезте с имейл и парола.",
      }, 409);
    }
    if (body.mode === "request_activation") {
      if (!deps.resendKey) throw new B2BError(503, "Изпращането на кодове е временно недостъпно.");
      // Supabase owns token generation, expiry, verification and single use.
      // No password or company ownership is assigned by merely requesting a code.
      const { data, error } = await deps.db.auth.admin.generateLink({ type: "magiclink", email });
      const code = data?.properties?.email_otp;
      if (error || !code || !/^\d{6}$/.test(code)) {
        throw new Error("Verification code generation failed");
      }
      const mail = await b2bMail(
        deps,
        "kfood-b2b-activation-" + crypto.randomUUID(),
        company.email,
        "Код за активиране на B2B акаунт — K-FOOD",
        "<h1>Активиране на B2B акаунт</h1><p>Фирма: " + b2bEscape(company.company_name) +
          '</p><p>Вашият еднократен код е:</p><p style="font-size:32px;font-weight:700">' + code +
          "</p><p>Въведете го на страницата за регистрация. Ако не сте поискали този код, пренебрегнете писмото.</p>",
      );
      if (!mail.sent) {
        throw new B2BError(503, mail.reason || "Кодът не беше изпратен. Опитайте отново.");
      }
      return b2bJson(req, { success: true, verification_required: true });
    }
    const code = b2bText(body.code, "код от имейла", 6);
    if (!/^\d{6}$/.test(code)) throw new B2BError(400, "Въведете шестцифрения код от имейла.");
    const password = b2bPassword(body.password);
    if (password.length < 8) throw new B2BError(400, "Новата парола трябва да е поне 8 символа.");
    const { data, error } = await deps.auth.auth.verifyOtp({ email, token: code, type: "email" });
    if (
      error || !data.user?.email_confirmed_at || !data.session ||
      data.user.email?.toLowerCase() !== email
    ) {
      throw new B2BError(401, "Кодът е невалиден или е изтекъл. Поискайте нов код.");
    }
    const { error: passwordError } = await deps.auth.auth.updateUser({ password });
    if (passwordError) {
      throw new B2BError(400, "Паролата не беше запазена. Поискайте нов код и опитайте отново.");
    }
    const { error: bindError } = await deps.db.rpc("b2b_activate_company", {
      p_company_id: company.id,
      p_user_id: data.user.id,
    });
    if (bindError) {
      throw new B2BError(409, "Активацията не завърши. Опитайте вход или се свържете с екипа.");
    }
    const notification = await b2bMail(
      deps,
      "kfood-b2b-registration-" + company.id,
      deps.bossEmail,
      "Нова B2B регистрация - " + company.company_name,
      "<h1>Нова B2B регистрация</h1><p>" + b2bEscape(company.company_name) +
        "</p><p>" + b2bEscape(email) + "</p><p>Фирмен идентификатор: " + b2bEscape(company.id) +
        "</p>",
    );
    return b2bJson(req, {
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      company_id: company.id,
      company_name: company.company_name,
      email_sent: notification.sent,
    });
  } catch (error) {
    return b2bFailure(req, error);
  }
}
export default {
  fetch: async (req: Request) => {
    try {
      return await handleB2BAuth(req, b2bDependencies());
    } catch (error) {
      return b2bFailure(req, error);
    }
  },
};
