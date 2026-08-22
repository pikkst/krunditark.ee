import { test, expect } from "@playwright/test";
import { mockAddressSearchRoute } from "../mocks/address-search";
import { mockParcelResolveRoute } from "../mocks/parcel-resolve";

test.describe("CI gate", () => {
  test.beforeEach(async ({ page }) => {
    await mockAddressSearchRoute(page);
    await mockParcelResolveRoute(page);
  });

  test("critical parcel search form exists on landing", async ({ page }) => {
    await page.goto("et/landing");
    await expect(page.getByLabel("Aadress või katastritunnus")).toBeVisible();
    await expect(page.getByRole("button", { name: "Otsi" })).toBeVisible();
  });

  test("parcel overview shows resolved parcel details", async ({ page }) => {
    await page.goto("et/landing");
    await page.getByLabel("Aadress või katastritunnus").fill("12345:678:9012");
    await page.getByRole("button", { name: "Otsi" }).click();

    await expect(page.getByText("12345:678:9012")).toBeVisible();
    await expect(page.getByText("Pindala", { exact: true })).toBeVisible();
  });

  test("intent buttons are present after parcel selection", async ({ page }) => {
    await page.goto("et/landing");
    await page.getByLabel("Aadress või katastritunnus").fill("12345:678:9012");
    await page.getByRole("button", { name: "Otsi" }).click();

    await expect(page.getByText("Mida soovid selle krundiga teha?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Uue hoone ehitus" })).toBeVisible();
  });
});
