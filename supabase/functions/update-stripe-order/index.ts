// Retired: browser redirects must never fulfill or update an arbitrary order.
export default {
  fetch: () =>
    Response.json({
      error:
        "Този начин за потвърждение е прекратен. Проверете поръчката чрез checkout-status или се свържете с магазина.",
    }, { status: 410, headers: { "Cache-Control": "no-store" } }),
};
