import { test, expect } from "@playwright/test";
import { mockAddressSearchRoute } from "../mocks/address-search";
import { mockParcelResolveRoute } from "../mocks/parcel-resolve";

test.describe("Address search and keyboard focus", () => {
  test.beforeEach(async ({ page }) => {
    await mockAddressSearchRoute(page);
    await mockParcelResolveRoute(page);
  });

  test("types address and reaches overview", async ({ page }) => {
    await page.goto("/et/landing");

    const input = page.getByLabel("Aadress või katastritunnus");
    await expect(input).toBeVisible();
    await input.focus();

    await input.fill("Pärnu mnt 10");
    await page.getByRole("button", { name: "Otsi" }).click();

    await expect(page.getByText("12345:678:9012")).toBeVisible();
  });

  test("submits cadastral ID with Enter", async ({ page }) => {
    await page.goto("/et/landing");

    const input = page.getByLabel("Aadress või katastritunnus");
    await input.focus();
    await input.fill("12345:678:9012");

    await page.keyboard.press("Enter");

    await expect(page.getByText("12345:678:9012")).toBeVisible();
  });

  test("tab sequence reaches search controls", async ({ page }) => {
    await page.goto("/et/landing");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Keel")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Aadress või katastritunnus")).toBeFocused();

    await page.getByLabel("Aadress või katastritunnus").fill("12345:678:9012");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Otsi" })).toBeFocused();
  });
});
