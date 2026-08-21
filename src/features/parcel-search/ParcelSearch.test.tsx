import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import i18n from "../../lib/i18n";
import { getAddressSearchCache } from "../../lib/api/address-search";
import ParcelSearch from "./ParcelSearch";
import type { Parcel } from "../../domain/parcel/types";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

const MOCK_PARCEL: Parcel = {
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
};

describe("ParcelSearch", () => {
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

  function mockResolveOk(parcels: Parcel[], status: string = "resolved") {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status, candidates: parcels }),
    } as unknown as Response);
  }

  function mockResolveFailure(errorCode: string, status = 400) {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status,
      json: () => Promise.resolve({ error: errorCode, message: "test error" }),
    } as unknown as Response);
  }

  it("renders the label, input, search button and map button", () => {
    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    expect(screen.getByLabelText("Aadress või katastritunnus")).toBeDefined();
    expect(
      screen.getByPlaceholderText("Nt Pärnu mnt 10, Tallinn või 12345:678:9012")
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Otsi" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Vali krunt kaardilt" })).toBeDefined();
  });

  it("disables search button when input is empty", () => {
    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    expect(screen.getByRole("button", { name: "Otsi" })).toBeDisabled();
  });

  it("shows loading state while submitting", async () => {
    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.change(input, { target: { value: "12345:678:9012" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    expect(screen.getByRole("button", { name: "Otsin..." })).toBeDefined();
  });

  it("resolves a cadastral identifier directly", async () => {
    const onResolved = vi.fn();
    mockResolveOk([MOCK_PARCEL]);

    renderWithI18n(<ParcelSearch onParcelResolved={onResolved} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.change(input, { target: { value: "12345:678:9012" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(MOCK_PARCEL);
    });
  });

  it("shows no-match when parcel is not found", async () => {
    mockResolveFailure("PARCEL_NOT_FOUND", 404);

    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.change(input, { target: { value: "12345:678:9012" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Katastriüksust ei leitud")).toBeDefined();
    });
  });

  it("shows invalid for malformed cadastral input without making requests", async () => {
    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.change(input, { target: { value: "12345:678:90" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Vigane sisend. Kontrolli katastritunnuse vormingut.")).toBeDefined();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows invalid for cadastral input with invalid characters without making requests", async () => {
    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.change(input, { target: { value: "12345:678:9A" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Vigane sisend. Kontrolli katastritunnuse vormingut.")).toBeDefined();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows invalid for short address input without making requests", async () => {
    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Põ" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Vigane sisend. Kontrolli katastritunnuse vormingut.")).toBeDefined();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not issue address-search requests while typing", async () => {
    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Mustamäe" } });

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          addresses: [
            {
              adr_id: "1",
              aadresstekst: "Mustamäe tee 51",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221727",
              ads_oid: "ME01087725",
              adob_id: "10439325",
              sihtnumber: "10621",
              viitepunkt_x: "539625.35",
              viitepunkt_y: "6587225.42",
              viitepunkt_l: "24.697966",
              viitepunkt_b: "59.421047",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "1",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
          ],
          host: "inaks-api-test",
        }),
    } as unknown as Response);

    mockResolveOk([MOCK_PARCEL]);

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("ignores stale address-search response after editing input", async () => {
    const resolvePromise = new Promise<Response>((resolve) => {
      setTimeout(
        () =>
          resolve({
            ok: true,
            json: () => Promise.resolve({ addresses: [], host: "inaks-api-test" }),
          } as unknown as Response),
        100
      );
    });
    fetchSpy.mockReturnValueOnce(resolvePromise as unknown as Promise<Response>);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          addresses: [
            {
              adr_id: "1",
              aadresstekst: "Mustamäe tee 51",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221727",
              ads_oid: "ME01087725",
              adob_id: "10439325",
              sihtnumber: "10621",
              viitepunkt_x: "539625.35",
              viitepunkt_y: "6587225.42",
              viitepunkt_l: "24.697966",
              viitepunkt_b: "59.421047",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "1",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
          ],
          host: "inaks-api-test",
        }),
    } as unknown as Response);

    mockResolveOk([MOCK_PARCEL]);

    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Must" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Otsin..." })).toBeDefined();
    });

    fireEvent.change(input, { target: { value: "Mustamäe" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Otsi" })).toBeDefined();
    });

    await new Promise((r) => setTimeout(r, 200));

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByText("Katastriüksust ei leitud")).toBeNull();

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeDefined();
    });
  });

  it("ignores stale parcel resolve after editing input", async () => {
    const onResolved = vi.fn();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          addresses: [
            {
              adr_id: "1",
              aadresstekst: "Mustamäe tee 51",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221727",
              ads_oid: "ME01087725",
              adob_id: "10439325",
              sihtnumber: "10621",
              viitepunkt_x: "539625.35",
              viitepunkt_y: "6587225.42",
              viitepunkt_l: "24.697966",
              viitepunkt_b: "59.421047",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "1",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
            {
              adr_id: "2",
              aadresstekst: "Mustamäe tee 52",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 52",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 52",
              ipikkaadress: "Mustamäe tee 52, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221728",
              ads_oid: "ME01087726",
              adob_id: "10439326",
              sihtnumber: "10622",
              viitepunkt_x: "539625.36",
              viitepunkt_y: "6587225.43",
              viitepunkt_l: "24.697967",
              viitepunkt_b: "59.421048",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "2",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
          ],
          host: "inaks-api-test",
        }),
    } as unknown as Response);

    const resolvePromise = new Promise<Response>((resolve) => {
      setTimeout(
        () =>
          resolve({
            ok: true,
            json: () => Promise.resolve({ status: "resolved", candidates: [MOCK_PARCEL] }),
          } as unknown as Response),
        100
      );
    });
    fetchSpy.mockReturnValueOnce(resolvePromise as unknown as Promise<Response>);

    renderWithI18n(<ParcelSearch onParcelResolved={onResolved} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Must" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeDefined();
    });

    fireEvent.keyDown(input, { key: "ArrowDown", bubbles: true });
    fireEvent.keyDown(input, { key: "Enter", bubbles: true });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Otsin..." })).toBeDefined();
    });

    fireEvent.change(input, { target: { value: "Mustamäe" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Otsi" })).toBeDefined();
    });

    await new Promise((r) => setTimeout(r, 200));

    expect(onResolved).not.toHaveBeenCalled();
  });

  it("shows address candidates after submit and resolves on selection", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          addresses: [
            {
              adr_id: "1",
              aadresstekst: "Mustamäe tee 51",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221727",
              ads_oid: "ME01087725",
              adob_id: "10439325",
              sihtnumber: "10621",
              viitepunkt_x: "539625.35",
              viitepunkt_y: "6587225.42",
              viitepunkt_l: "24.697966",
              viitepunkt_b: "59.421047",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "1",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
            {
              adr_id: "2",
              aadresstekst: "Mustamäe tee 52",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 52",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 52",
              ipikkaadress: "Mustamäe tee 52, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221728",
              ads_oid: "ME01087726",
              adob_id: "10439326",
              sihtnumber: "10622",
              viitepunkt_x: "539625.36",
              viitepunkt_y: "6587225.43",
              viitepunkt_l: "24.697967",
              viitepunkt_b: "59.421048",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "2",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
          ],
          host: "inaks-api-test",
        }),
    } as unknown as Response);

    mockResolveOk([MOCK_PARCEL]);

    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Mustamäe" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeDefined();
    });

    fireEvent.keyDown(input, { key: "ArrowDown", bubbles: true });
    fireEvent.keyDown(input, { key: "Enter", bubbles: true });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("closes autocomplete on Escape", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          addresses: [
            {
              adr_id: "1",
              aadresstekst: "Mustamäe tee 51",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221727",
              ads_oid: "ME01087725",
              adob_id: "10439325",
              sihtnumber: "10621",
              viitepunkt_x: "539625.35",
              viitepunkt_y: "6587225.42",
              viitepunkt_l: "24.697966",
              viitepunkt_b: "59.421047",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "1",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
          ],
          host: "inaks-api-test",
        }),
    } as unknown as Response);

    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Mustamäe" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeDefined();
    });

    fireEvent.keyDown(input, { key: "Escape", bubbles: true });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  it("calls onMapSelectRequested when map button is clicked", async () => {
    const onMapSelect = vi.fn();

    renderWithI18n(
      <ParcelSearch
        onParcelResolved={() => {}}
        onAmbiguousResolve={() => {}}
        onMapSelectRequested={onMapSelect}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Vali krunt kaardilt" }));
    expect(onMapSelect).toHaveBeenCalledTimes(1);
  });

  it("shows unavailable when address-search returns UPSTREAM_ERROR and user submits", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: "UPSTREAM_ERROR", message: "upstream failed" }),
    } as unknown as Response);

    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Mustamäe" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Krundiandmeid ei õnnestunud praegu laadida. Proovi uuesti.")
      ).toBeDefined();
    });

    expect(screen.queryByText("Katastriüksust ei leitud")).toBeNull();
  });

  it("shows unavailable when parcel service is down", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: "SOURCE_TIMEOUT", message: "timeout" }),
    } as unknown as Response);

    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.change(input, { target: { value: "12345:678:9012" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Krundiandmeid ei õnnestunud praegu laadida. Proovi uuesti.")
      ).toBeDefined();
    });
  });

  it("shows multiple address candidates after submit and does not resolve without selection", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          addresses: [
            {
              adr_id: "1",
              aadresstekst: "Mustamäe tee 51",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
              ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221727",
              ads_oid: "ME01087725",
              adob_id: "10439325",
              sihtnumber: "10621",
              viitepunkt_x: "539625.35",
              viitepunkt_y: "6587225.42",
              viitepunkt_l: "24.697966",
              viitepunkt_b: "59.421047",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "1",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
            {
              adr_id: "2",
              aadresstekst: "Mustamäe tee 52",
              pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 52",
              taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 52",
              ipikkaadress: "Mustamäe tee 52, Kristiine linnaosa, Tallinn, Harju maakond",
              liik: "E",
              liikVal: "EHITISHOONE",
              tunnus: "120221728",
              ads_oid: "ME01087726",
              adob_id: "10439326",
              sihtnumber: "10622",
              viitepunkt_x: "539625.36",
              viitepunkt_y: "6587225.43",
              viitepunkt_l: "24.697967",
              viitepunkt_b: "59.421048",
              boundingbox: "0,0 1,0 1,1 0,1 0,0",
              g_boundingbox: "0,0 1,0 1,1 0,1 0,0",
              poid: [],
              primary: "true",
              kvaliteet: "adrid",
              olek: "K",
              ehakmk: "37",
              maakond: "Harju maakond",
              ehakov: "784",
              omavalitsus: "Tallinn",
              ehak: "339",
              asustusyksus: "Kristiine linnaosa",
              koodaadress: "",
              asum: "",
              old_aadresstekst: "",
              leitud_osa: "",
              unik: "2",
              onkort: "0",
              kood4: "",
              vaikekoht: "",
              kood5: "",
              liikluspind: "",
              kood6: "",
              nimi: "",
              kood7: "",
              aadress_nr: "",
              kood8: "",
              kort_nr: "",
              tehn_id2: "",
              kaugus: "0",
              ietunnus: "0",
            },
          ],
          host: "inaks-api-test",
        }),
    } as unknown as Response);

    renderWithI18n(<ParcelSearch onParcelResolved={() => {}} onAmbiguousResolve={() => {}} />);

    const input = screen.getByLabelText("Aadress või katastritunnus");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Mustamäe" } });

    const button = screen.getByRole("button", { name: "Otsi" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeDefined();
    });

    expect(screen.queryByText("Katastriüksust ei leitud")).toBeNull();
    expect(
      screen.queryByText("Krundiandmeid ei õnnestunud praegu laadida. Proovi uuesti.")
    ).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
