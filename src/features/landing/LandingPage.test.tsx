import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import i18n from "../../lib/i18n";
import { getAddressSearchCache } from "../../lib/api/address-search";
import LandingPage from "./LandingPage";
import { ProjectStateProvider } from "../../features/project-state";

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ProjectStateProvider>{ui}</ProjectStateProvider>
    </I18nextProvider>
  );
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
    vi.useRealTimers();
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
    await userEvent.type(input, "12345:678:9012");
    await userEvent.click(screen.getByRole("button", { name: "Otsi" }));

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
    await userEvent.type(input, "12345:678:9012");
    await userEvent.click(screen.getByRole("button", { name: "Otsi" }));

    expect(await screen.findByRole("heading", { name: "Test address" })).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Tagasi otsingusse" }));
    expect(screen.getByLabelText("Aadress või katastritunnus")).toBeDefined();
  });

  it("shows parcel overview after selecting address-search candidate", async () => {
    const rawInAksResponse = {
      addresses: [
        {
          adr_id: "2105921",
          aadresstekst: "Pärnu mnt 10",
          pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Pärnu mnt 10",
          taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Pärnu mnt 10",
          ipikkaadress: "Pärnu mnt 10, Kristiine linnaosa, Tallinn",
          liik: "4",
          liikVal: "KATASTRIYKSUS",
          tunnus: "123456789012",
          ads_oid: "CU00473339",
          adob_id: "9681337",
          sihtnumber: "10621",
          viitepunkt_x: "658000",
          viitepunkt_y: "6570000",
          viitepunkt_l: "24.7536",
          viitepunkt_b: "59.437",
          boundingbox: "657900,6569900 658100,6569900 658100,6570100 657900,6570100 657900,6569900",
          g_boundingbox:
            "59.436,24.7526 59.436,24.7546 59.438,24.7546 59.438,24.7526 59.436,24.7526",
          poid: [],
          primary: "true",
          kvaliteet: "adrid",
          olek: "K",
        },
        {
          adr_id: "2105921",
          aadresstekst: "Pärnu mnt 10",
          pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Pärnu mnt 10",
          taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Pärnu mnt 10",
          ipikkaadress: "Pärnu mnt 10, Kristiine linnaosa, Tallinn",
          liik: "4",
          liikVal: "KATASTRIYKSUS",
          tunnus: "987654321098",
          ads_oid: "CU00473340",
          adob_id: "9681338",
          sihtnumber: "10622",
          viitepunkt_x: "658100",
          viitepunkt_y: "6570100",
          viitepunkt_l: "24.7546",
          viitepunkt_b: "59.438",
          boundingbox: "658000,6570000 658200,6570000 658200,6570200 658000,6570200 658000,6570000",
          g_boundingbox:
            "59.437,24.7536 59.437,24.7556 59.439,24.7556 59.439,24.7536 59.437,24.7536",
          poid: [],
          primary: "true",
          kvaliteet: "adrid",
          olek: "K",
        },
      ],
      host: "test-host",
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(rawInAksResponse),
    } as unknown as Response);

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
    await userEvent.type(input, "Pärnu mnt 10");
    await userEvent.click(screen.getByRole("button", { name: "Otsi" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("listbox")).toBeDefined();
    });

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    vi.useRealTimers();

    expect(screen.getByRole("listbox")).toBeDefined();

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThanOrEqual(2);
    await userEvent.click(options[0]);

    expect(await screen.findByRole("heading", { name: "Test address" })).toBeDefined();
    expect(screen.getByText("Mida soovid selle krundiga teha?")).toBeDefined();
  });
});
