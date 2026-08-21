import { test, expect } from "@playwright/test";
import { mockAddressSearchRoute } from "../mocks/address-search";
import { mockParcelResolveRoute } from "../mocks/parcel-resolve";

const CAD_ASTRAL_ID = "12345:678:9012";

test.describe("Parcel discovery journey", () => {
  test.beforeEach(async ({ page }) => {
    await mockAddressSearchRoute(page);
    await mockParcelResolveRoute(page);
  });

  test("resolves a parcel by cadastral ID and reaches free overview", async ({ page }) => {
    await page.goto("/et/landing");

    const searchInput = page.getByLabel("Aadress või katastritunnus");
    await expect(searchInput).toBeVisible();
    await searchInput.fill(CAD_ASTRAL_ID);

    await page.getByRole("button", { name: "Otsi" }).click();

    await expect(page.getByText("12345:678:9012")).toBeVisible();
    await expect(page.getByText("Pindala", { exact: true })).toBeVisible();
    await expect(page.getByText("Mida soovid selle krundiga teha?")).toBeVisible();
  });

  test("selects a supported intent from parcel overview", async ({ page }) => {
    await page.goto("/et/landing");

    const searchInput = page.getByLabel("Aadress või katastritunnus");
    await searchInput.fill(CAD_ASTRAL_ID);
    await page.getByRole("button", { name: "Otsi" }).click();

    await expect(page.getByText("12345:678:9012")).toBeVisible();

    await page.getByRole("button", { name: "Uue hoone ehitus" }).click();

    await expect(page.getByText("12345:678:9012")).toBeVisible();
  });
});
