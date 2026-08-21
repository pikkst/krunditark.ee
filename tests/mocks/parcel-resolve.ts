import {
  getParcelResolveResolved,
  getParcelResolveNotFound,
  getParcelResolveAmbiguous,
} from "./fixtures";

export function mockParcelResolveRoute(page: import("@playwright/test").Page) {
  return page.route("**/functions/v1/parcel-resolve", async (route) => {
    let body: unknown;
    try {
      body = await route.request().postDataJSON();
    } catch {
      body = {};
    }

    const selector = (body as { selector?: unknown })?.selector;

    if (!selector || typeof selector !== "object") {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "INVALID_INPUT", message: "Invalid request body" }),
      });
      return;
    }

    const sel = selector as { type?: string; cadastralId?: string };

    if (sel.type === "cadastral" && sel.cadastralId === "9999999999999") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(getParcelResolveNotFound()),
      });
      return;
    }

    if (sel.type === "cadastral" && sel.cadastralId === "8888888888888") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(getParcelResolveAmbiguous()),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(getParcelResolveResolved()),
    });
  });
}
