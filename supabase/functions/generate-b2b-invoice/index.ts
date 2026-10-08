// Retired endpoint: invoice issuance is not part of this website.
export default {
  fetch: (_req: Request) =>
    new Response(
      JSON.stringify({
        success: false,
        error: "Сайтът не издава фактури.",
      }),
      { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
    ),
};
