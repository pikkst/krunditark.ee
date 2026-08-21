import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import i18n from "../../lib/i18n";
import { getAddressSearchCache } from "../../lib/api/address-search";
import LandingPage from "./LandingPage";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("LandingPage", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_URL =
      "http://127.0.0.1:54321";
    fetchSpy = vi.spyOn(globalThis, "fetch");
    getAddressSearchCache().clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the product name and tagline", () => {
    renderWithI18n(<LandingPage />);
    expect(screen.getByRole("heading", { name: "Krunditark" })).toBeDefined();
    expect(screen.getByText("Tea enne, kui ehitad.")).toBeDefined();
  });

  it("renders the combined parcel search input", () => {
    renderWithI18n(<LandingPage />);
    expect(screen.getByLabelText("Aadress või katastritunnus")).toBeDefined();
    expect(
      screen.getByPlaceholderText("Nt Pärnu mnt 10, Tallinn või 12345:678:9012")
    ).toBeDefined();
  });

  it("renders the search button", () => {
    renderWithI18n(<LandingPage />);
    expect(screen.getByRole("button", { name: "Otsi" })).toBeDefined();
  });

  it("renders the secondary map selection button", () => {
    renderWithI18n(<LandingPage />);
    expect(screen.getByRole("button", { name: "Vali krunt kaardilt" })).toBeDefined();
  });

  it("shows parcel overview after parcel is resolved via cadastral id", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "resolved",
          candidates: [
            {
              id: "CP:12345:678:9012",
              cadastralId: "123456789012",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 1],
                    [0, 0],
                  ],
                ],
              },
              geometryCrs: "EPSG:3301",
              facts: {
                areaM2Computed: 10000,
                addressText: "Test address",
              },
              source: {
                sourceId: "maru.cadastre.parcels.inspire",
                sourceDatasetVersionId: "2026-08-16",
                sourceSyncRunId: "sync-1",
                sourceObjectId: "obj-1",
                normalizerVersion: "1",
                retrievedAt: "2026-08-16T00:00:00Z",
              },
              freshnessState: "fresh",
              contentHash: "hash-1",
            },
          ],
        }),
    } as unknown as Response);

    renderWithI18n(<LandingPage />);
    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.change(input, { target: { value: "12345:678:9012" } });
    fireEvent.click(screen.getByRole("button", { name: "Otsi" }));

    expect(await screen.findByRole("heading", { name: "Test address" })).toBeDefined();
    expect(screen.getByText("12345:678:9012")).toBeDefined();
    expect(screen.getByText("Mida soovid selle krundiga teha?")).toBeDefined();
  });

  it("allows returning to search from parcel overview", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "resolved",
          candidates: [
            {
              id: "CP:12345:678:9012",
              cadastralId: "123456789012",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 1],
                    [0, 0],
                  ],
                ],
              },
              geometryCrs: "EPSG:3301",
              facts: {
                areaM2Computed: 10000,
                addressText: "Test address",
              },
              source: {
                sourceId: "maru.cadastre.parcels.inspire",
                sourceDatasetVersionId: "2026-08-16",
                sourceSyncRunId: "sync-1",
                sourceObjectId: "obj-1",
                normalizerVersion: "1",
                retrievedAt: "2026-08-16T00:00:00Z",
              },
              freshnessState: "fresh",
              contentHash: "hash-1",
            },
          ],
        }),
    } as unknown as Response);

    renderWithI18n(<LandingPage />);
    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.change(input, { target: { value: "12345:678:9012" } });
    fireEvent.click(screen.getByRole("button", { name: "Otsi" }));

    expect(await screen.findByRole("heading", { name: "Test address" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Tagasi otsingusse" }));
    expect(screen.getByLabelText("Aadress või katastritunnus")).toBeDefined();
  });
});
