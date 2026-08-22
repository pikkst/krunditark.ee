import { test, expect } from "@playwright/test";
import { mockAddressSearchRoute } from "../mocks/address-search";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAddressSearchRoute(page);
    await page.goto("et/landing");
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

  test("switches locale via the header dropdown and updates the URL", async ({ page }) => {
    const localeSelect = page.getByLabel("Keel");
    await expect(localeSelect).toHaveValue("et");

    await localeSelect.selectOption("ru");
    await expect(page).toHaveURL(/\/ru\/landing/);
    await expect(localeSelect).toHaveValue("ru");
  });

  test("browser back returns to the previous locale route after a locale switch", async ({
    page,
  }) => {
    await page.goto("et/landing");

    const localeSelect = page.getByLabel("Keel");
    await localeSelect.selectOption("ru");
    await expect(page).toHaveURL(/\/ru\/landing/);

    await page.goBack();
    await expect(page).toHaveURL(/\/et\/landing/);
  });

  test("browser forward restores the next locale route after back", async ({ page }) => {
    await page.goto("et/landing");

    const localeSelect = page.getByLabel("Keel");
    await localeSelect.selectOption("ru");
    await expect(page).toHaveURL(/\/ru\/landing/);

    await page.goBack();
    await expect(page).toHaveURL(/\/et\/landing/);

    await page.goForward();
    await expect(page).toHaveURL(/\/ru\/landing/);
  });
});
