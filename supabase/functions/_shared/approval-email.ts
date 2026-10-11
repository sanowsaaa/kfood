export function getApprovalEmail(companyName: string, firstName: string, companyId: string, siteUrl: string) {
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
