import { getAddressSearchSuccess } from "./fixtures";

export function mockAddressSearchRoute(
  page: import("@playwright/test").Page,
  onRequest?: () => void
) {
  return page.route(/\/functions\/v1\/address-search/, async (route) => {
    onRequest?.();
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q");
    const queryType = url.searchParams.get("queryType") || "address";

    if (queryType === "adrid") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(getAddressSearchSuccess()),
      });
      return;
    }

    if (!q || q.trim().length === 0) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "INVALID_INPUT", message: "Query must not be empty" }),
      });
      return;
    }

    if (q === "not_found") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ addresses: [], host: "aks-test.geoportaal.ee" }),
      });
      return;
    }

    if (q === "unavailable") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "ADDRESS_SEARCH_UNAVAILABLE",
          message: "Service unavailable",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(getAddressSearchSuccess()),
    });
  });
}
