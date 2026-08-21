import { test, expect } from "@playwright/test";
import { mockAddressSearchRoute } from "../mocks/address-search";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAddressSearchRoute(page);
    await page.goto("/et/landing");
  });

  test("loads the built app and locale route", async ({ page }) => {
    await expect(page).toHaveURL(/\/et\/landing/);
  });

  test("shows the app title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Krunditark" })).toBeVisible();
  });

  test("shows the search input and button", async ({ page }) => {
    await expect(page.getByLabel("Aadress või katastritunnus")).toBeVisible();
    await expect(page.getByRole("button", { name: "Otsi" })).toBeVisible();
  });

  test("shows the map select button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Vali krunt kaardilt" })).toBeVisible();
  });
});
