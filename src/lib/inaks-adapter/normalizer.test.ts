import { parseInAksAddressResponse } from "./normalizer";
import type { ProviderInAksResponseRaw, ProviderInAksAddressRaw } from "./types";

const INAKS_NORMALIZER_VERSION = "1";
const INAKS_RETRIEVED_AT = "2026-08-19T00:00:00Z";

const BASE_ADDRESS: ProviderInAksAddressRaw = {
  pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
  taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
  ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
  aadresstekst: "Mustamäe tee 51",
  old_aadresstekst: "",
  leitud_osa: "",
  unik: "1",
  onkort: "0",
  liik: "E",
  liikVal: "EHITISHOONE",
  tunnus: "120221727",
  ads_oid: "ME01087725",
  adob_id: "10439325",
  adr_id: "2105921",
  ehakmk: "37",
  maakond: "Harju maakond",
  ehakov: "784",
  omavalitsus: "Tallinn",
  ehak: "339",
  asustusyksus: "Kristiine linnaosa",
  kood4: "",
  vaikekoht: "",
  kood5: "03X2",
  liikluspind: "Mustamäe tee",
  kood6: "",
  nimi: "",
  kood7: "1G3Z",
  aadress_nr: "51",
  kood8: "",
  kort_nr: "",
  koodaadress: "377840339000003X200001G3Z00000000",
  asum: "Lilleküla asum",
  sihtnumber: "10621",
  viitepunkt_x: "539625.35",
  viitepunkt_y: "6587225.42",
  boundingbox:
    "539582.68,6587127.73 539668.50,6587127.73 539668.50,6587245.34 539582.68,6587245.34 539582.68,6587127.73",
  viitepunkt_l: "24.697966",
  viitepunkt_b: "59.421047",
  g_boundingbox:
    "59.4201805280,24.6972084304 59.4201805280,24.6987269644 59.4212227590,24.6987269644 59.4212227590,24.6972084304 59.4201805280,24.6972084304",
  poid: ["Lilleküla"],
  tehn_id2: "1152850",
  primary: "true",
  kvaliteet: "adrid",
  kaugus: "0",
  ietunnus: "0",
  olek: "K",
};

const BUILDING_AND_CADASTRAL_UNIT_RESPONSE: ProviderInAksResponseRaw = {
  addresses: [
    BASE_ADDRESS,
    {
      ...BASE_ADDRESS,
      liik: "4",
      liikVal: "KATASTRIYKSUS",
      tunnus: "78407:701:6840",
      ads_oid: "CU00473339",
      adob_id: "9681337",
      adr_id: "2105921",
      primary: "false",
      poid: [],
    } as ProviderInAksAddressRaw,
  ],
  host: "inaks-api-6bdb5787cb-crhvr",
};

const SINGLE_BUILDING_RESPONSE: ProviderInAksResponseRaw = {
  addresses: [
    {
      ...BASE_ADDRESS,
      pikkaadress: "Tartu maakond, Tartu, Kesklinn, Tartu mnt 1",
      taisaadress: "Tartu maakond, Tartu, Kesklinn, Tartu mnt 1",
      ipikkaadress: "Tartu mnt 1, Kesklinn, Tartu, Tartu maakond",
      aadresstekst: "Tartu mnt 1",
      maakond: "Tartu maakond",
      omavalitsus: "Tartu",
      asustusyksus: "Kesklinn",
      asum: "Kesklinn",
      tunnus: "123456789",
      ads_oid: "ME01087726",
      adob_id: "10439326",
      adr_id: "2105922",
      sihtnumber: "51005",
      viitepunkt_x: "650000.00",
      viitepunkt_y: "6600000.00",
      viitepunkt_l: "26.7090",
      viitepunkt_b: "58.3780",
      boundingbox:
        "649500.00,6599500.00 650500.00,6599500.00 650500.00,6600500.00 649500.00,6600500.00 649500.00,6599500.00",
      g_boundingbox:
        "58.3750,26.7060 58.3750,26.7120 58.3810,26.7120 58.3810,26.7060 58.3750,26.7060",
      poid: ["Tartu"],
      tehn_id2: "1152851",
    } as ProviderInAksAddressRaw,
  ],
  host: "inaks-api-6bdb5787cb-crhvr",
};

const BUILDING_WITH_EMPTY_TUNNUS_RESPONSE: ProviderInAksResponseRaw = {
  addresses: [
    {
      ...BASE_ADDRESS,
      liik: "E",
      liikVal: "EHITISHOONE",
      tunnus: "",
      ads_oid: "EE02678146",
      adob_id: "10439327",
      adr_id: "2105923",
    } as ProviderInAksAddressRaw,
  ],
  host: "inaks-api-6bdb5787cb-crhvr",
};

const CADASTRAL_UNIT_WITH_EMPTY_TUNNUS_RESPONSE: ProviderInAksResponseRaw = {
  addresses: [
    {
      ...BASE_ADDRESS,
      liik: "4",
      liikVal: "KATASTRIYKSUS",
      tunnus: "",
      ads_oid: "CU00473340",
      adob_id: "9681338",
      adr_id: "2105924",
    } as ProviderInAksAddressRaw,
  ],
  host: "inaks-api-6bdb5787cb-crhvr",
};

const RAW_TEST_FIXTURE_ADRID_2105921: ProviderInAksResponseRaw = {
  addresses: [
    {
      pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
      aadresstekst: "Mustamäe tee 51",
      old_aadresstekst: "",
      leitud_osa: "",
      unik: "1",
      onkort: "0",
      liik: "E",
      liikVal: "EHITISHOONE",
      tunnus: "120221727",
      ads_oid: "ME01087725",
      adob_id: "10439325",
      adr_id: "2105921",
      ehakmk: "37",
      maakond: "Harju maakond",
      ehakov: "784",
      omavalitsus: "Tallinn",
      ehak: "339",
      asustusyksus: "Kristiine linnaosa",
      kood4: "",
      vaikekoht: "",
      kood5: "03X2",
      liikluspind: "Mustamäe tee",
      kood6: "",
      nimi: "",
      kood7: "1G3Z",
      aadress_nr: "51",
      kood8: "",
      kort_nr: "",
      koodaadress: "377840339000003X200001G3Z00000000",
      asum: "Lilleküla asum",
      sihtnumber: "10621",
      viitepunkt_x: "539625.35",
      viitepunkt_y: "6587225.42",
      boundingbox:
        "539582.68,6587127.73 539668.50,6587127.73 539668.50,6587245.34 539582.68,6587245.34 539582.68,6587127.73",
      viitepunkt_l: "24.697966",
      viitepunkt_b: "59.421047",
      g_boundingbox:
        "59.4201805280,24.6972084304 59.4201805280,24.6987269644 59.4212227590,24.6987269644 59.4212227590,24.6972084304 59.4201805280,24.6972084304",
      poid: ["Maa- ja Ruumiamet"],
      tehn_id2: "1152850",
      primary: "true",
      kvaliteet: "adrid",
      kaugus: "0",
      ietunnus: "0",
      olek: "K",
    },
    {
      pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
      aadresstekst: "Mustamäe tee 51",
      old_aadresstekst: "",
      leitud_osa: "",
      unik: "0",
      onkort: "0",
      liik: "4",
      liikVal: "KATASTRIYKSUS",
      tunnus: "78407:701:6840",
      ads_oid: "CU00473339",
      adob_id: "9681337",
      adr_id: "2105921",
      ehakmk: "37",
      maakond: "Harju maakond",
      ehakov: "784",
      omavalitsus: "Tallinn",
      ehak: "339",
      asustusyksus: "Kristiine linnaosa",
      kood4: "",
      vaikekoht: "",
      kood5: "03X2",
      liikluspind: "Mustamäe tee",
      kood6: "",
      nimi: "",
      kood7: "1G3Z",
      aadress_nr: "51",
      kood8: "",
      kort_nr: "",
      koodaadress: "377840339000003X200001G3Z00000000",
      asum: "Lilleküla asum",
      sihtnumber: "10621",
      viitepunkt_x: "539626.51",
      viitepunkt_y: "6587198.08",
      boundingbox:
        "539556.31,6587119.82 539694.13,6587119.82 539694.13,6587274.65 539556.31,6587274.65 539556.31,6587119.82",
      viitepunkt_l: "24.697996",
      viitepunkt_b: "59.420805",
      g_boundingbox:
        "59.4201112397,24.6967314275 59.4201112397,24.6991904130 59.4214896013,24.6991904130 59.4214896013,24.6967314275 59.4201112397,24.6967314275",
      poid: [],
      tehn_id2: "1042520",
      kvaliteet: "adrid",
      kaugus: "0",
      olek: "K",
    },
  ],
  host: "inaks-api-6bdb5787cb-crhvr",
};

// Raw fixture captured from aks-test.geoportaal.ee/inaks/inaadress/gazetteer?adrid=2105921
// Captured: 2026-08-19, In-AKS developer manual v3.3.0, test environment
// Observed liik values: E, 4

const RAW_PROD_FIXTURE_ADRID_2105921: ProviderInAksResponseRaw = {
  addresses: [
    {
      pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
      aadresstekst: "Mustamäe tee 51",
      old_aadresstekst: "",
      leitud_osa: "",
      unik: "1",
      onkort: "0",
      liik: "E",
      liikVal: "EHITISHOONE",
      tunnus: "120221727",
      ads_oid: "ME01087725",
      adob_id: "11500272",
      adr_id: "2105921",
      ehakmk: "37",
      maakond: "Harju maakond",
      ehakov: "784",
      omavalitsus: "Tallinn",
      ehak: "339",
      asustusyksus: "Kristiine linnaosa",
      kood4: "",
      vaikekoht: "",
      kood5: "03X2",
      liikluspind: "Mustamäe tee",
      kood6: "",
      nimi: "",
      kood7: "1G3Z",
      aadress_nr: "51",
      kood8: "",
      kort_nr: "",
      koodaadress: "377840339000003X200001G3Z00000000",
      asum: "Lilleküla asum",
      sihtnumber: "10621",
      viitepunkt_x: "539621.34",
      viitepunkt_y: "6587208.36",
      boundingbox:
        "539582.68,6587127.73 539668.50,6587127.73 539668.50,6587245.34 539582.68,6587245.34 539582.68,6587127.73",
      viitepunkt_l: "24.697892",
      viitepunkt_b: "59.420895",
      g_boundingbox:
        "59.4201805280,24.6972084304 59.4201805280,24.6987269644 59.4212227590,24.6987269644 59.4212227590,24.6972084304 59.4201805280,24.6972084304",
      poid: ["Maa- ja Ruumiamet"],
      tehn_id2: "1152850",
      primary: "true",
      kvaliteet: "adrid",
      kaugus: "0",
      ietunnus: "0",
      olek: "K",
    },
    {
      pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
      aadresstekst: "Mustamäe tee 51",
      old_aadresstekst: "",
      leitud_osa: "",
      unik: "1",
      onkort: "0",
      liik: "E",
      liikVal: "EHITISHOONE",
      tunnus: "121457620",
      ads_oid: "EE04269385",
      adob_id: "11500761",
      adr_id: "2105921",
      ehakmk: "37",
      maakond: "Harju maakond",
      ehakov: "784",
      omavalitsus: "Tallinn",
      ehak: "339",
      asustusyksus: "Kristiine linnaosa",
      kood4: "",
      vaikekoht: "",
      kood5: "03X2",
      liikluspind: "Mustamäe tee",
      kood6: "",
      nimi: "",
      kood7: "1G3Z",
      aadress_nr: "51",
      kood8: "",
      kort_nr: "",
      koodaadress: "377840339000003X200001G3Z00000000",
      asum: "Lilleküla asum",
      sihtnumber: "10621",
      viitepunkt_x: "539631.78",
      viitepunkt_y: "6587154.83",
      boundingbox:
        "539582.50,6587128.32 539667.95,6587128.32 539667.95,6587204.07 539582.50,6587204.07 539582.50,6587128.32",
      viitepunkt_l: "24.698076",
      viitepunkt_b: "59.420418",
      g_boundingbox:
        "59.4201806213,24.6971908178 59.4201806213,24.6987194419 59.4208547508,24.6987194419 59.4208547508,24.6971908178 59.4201806213,24.6971908178",
      poid: [],
      tehn_id2: "3813985",
      kvaliteet: "adrid",
      kaugus: "0",
      ietunnus: "0",
      olek: "O",
    },
    {
      pikkaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      taisaadress: "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51",
      ipikkaadress: "Mustamäe tee 51, Kristiine linnaosa, Tallinn, Harju maakond",
      aadresstekst: "Mustamäe tee 51",
      old_aadresstekst: "",
      leitud_osa: "",
      unik: "0",
      onkort: "0",
      liik: "4",
      liikVal: "KATASTRIYKSUS",
      tunnus: "78407:701:6840",
      ads_oid: "CU00473339",
      adob_id: "9681337",
      adr_id: "2105921",
      ehakmk: "37",
      maakond: "Harju maakond",
      ehakov: "784",
      omavalitsus: "Tallinn",
      ehak: "339",
      asustusyksus: "Kristiine linnaosa",
      kood4: "",
      vaikekoht: "",
      kood5: "03X2",
      liikluspind: "Mustamäe tee",
      kood6: "",
      nimi: "",
      kood7: "1G3Z",
      aadress_nr: "51",
      kood8: "",
      kort_nr: "",
      koodaadress: "377840339000003X200001G3Z00000000",
      asum: "Lilleküla asum",
      sihtnumber: "10621",
      viitepunkt_x: "539626.51",
      viitepunkt_y: "6587198.08",
      boundingbox:
        "539556.31,6587119.82 539694.13,6587119.82 539694.13,6587274.65 539556.31,6587274.65 539556.31,6587119.82",
      viitepunkt_l: "24.697996",
      viitepunkt_b: "59.420805",
      g_boundingbox:
        "59.4201112397,24.6967314275 59.4201112397,24.6991904130 59.4214896013,24.6991904130 59.4214896013,24.6967314275 59.4201112397,24.6967314275",
      poid: [],
      tehn_id2: "1042520",
      kvaliteet: "adrid",
      kaugus: "0",
      olek: "K",
    },
  ],
  host: "inaks-api-7b75796d8-ww9w4",
};

// Raw fixture captured from aks.geoportaal.ee/inaks/inaadress/gazetteer?adrid=2105921
// Captured: 2026-08-19, In-AKS developer manual v3.3.0, production environment
// Observed liik values: E, 4

describe("parseInAksAddressResponse (KT-031 In-AKS integration contract)", () => {
  describe("success path", () => {
    test("normalizes a valid In-AKS response with building and cadastral unit", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results).toHaveLength(2);

        const building = result.results[0];
        expect(building.id).toBe("ME01087725");
        expect(building.addressId).toBe("2105921");
        expect(building.label).toBe("Mustamäe tee 51");
        expect(building.objectType).toBe("building");
        expect(building.objectTypeCode).toBe("E");
        expect(building.coordinates.lat).toBeCloseTo(59.421047, 6);
        expect(building.coordinates.lon).toBeCloseTo(24.697966, 6);
        expect(building.coordinatesEpsg3301.x).toBeCloseTo(539625.35, 2);
        expect(building.coordinatesEpsg3301.y).toBeCloseTo(6587225.42, 2);
        expect(building.source.id).toBe("maru.inaks");
        expect(building.source.authority).toBe("Maa- ja Ruumiamet");
        expect(building.cadastralId).toBeUndefined();
        expect(building.postalCode).toBe("10621");
        expect(building.administrative.county).toBe("Harju maakond");
        expect(building.administrative.municipality).toBe("Tallinn");
        expect(building.administrative.settlement).toBe("Kristiine linnaosa");
        expect(building.administrative.subdistrict).toBe("Lilleküla asum");
        expect(building.addressCode).toBe("377840339000003X200001G3Z00000000");
        expect(building.status).toBe("K");
        expect(building.primary).toBe(true);
        expect(building.provenance.sourceId).toBe("maru.inaks");
        expect(building.provenance.sourceObjectId).toBe("ME01087725");
        expect(building.provenance.normalizerVersion).toBe(INAKS_NORMALIZER_VERSION);
        expect(building.provenance.retrievedAt).toBe(INAKS_RETRIEVED_AT);

        const cadastralUnit = result.results[1];
        expect(cadastralUnit.id).toBe("CU00473339");
        expect(cadastralUnit.addressId).toBe("2105921");
        expect(cadastralUnit.label).toBe("Mustamäe tee 51");
        expect(cadastralUnit.objectType).toBe("cadastral_unit");
        expect(cadastralUnit.objectTypeCode).toBe("4");
        expect(cadastralUnit.cadastralId).toBe("784077016840");
        expect(cadastralUnit.primary).toBe(false);
        expect(cadastralUnit.source.id).toBe("maru.inaks");
        expect(cadastralUnit.source.authority).toBe("Maa- ja Ruumiamet");
      }
    });

    test("normalizes a single building response", () => {
      const result = parseInAksAddressResponse(
        SINGLE_BUILDING_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results).toHaveLength(1);
        expect(result.results[0].id).toBe("ME01087726");
        expect(result.results[0].addressId).toBe("2105922");
        expect(result.results[0].objectType).toBe("building");
        expect(result.results[0].coordinatesEpsg3301.x).toBeCloseTo(650000.0, 2);
        expect(result.results[0].coordinatesEpsg3301.y).toBeCloseTo(6600000.0, 2);
        expect(result.results[0].postalCode).toBe("51005");
      }
    });

    test("extracts cadastralId from cadastral unit tunnus", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "4",
            liikVal: "KATASTRIYKSUS",
            tunnus: "601230010123",
            ads_oid: "CU00473340",
            adob_id: "9681338",
            adr_id: "2105923",
            primary: "false",
            poid: [],
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].cadastralId).toBe("601230010123");
      }
    });

    test("does not extract cadastralId for non-cadastral-unit types", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, tunnus: "not-a-cadastral-id" } as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].cadastralId).toBeUndefined();
      }
    });

    test("falls back to pikkaadress when aadresstekst is empty", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, aadresstekst: "" } as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].label).toBe(
          "Harju maakond, Tallinn, Kristiine linnaosa, Mustamäe tee 51"
        );
      }
    });

    test("uses fixed Maa- ja Ruumiamet authority regardless of poid", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        const cadastralUnit = result.results[1];
        expect(cadastralUnit.source.authority).toBe("Maa- ja Ruumiamet");
      }
    });

    test("preserves poid as POI data, not source authority", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          { ...BASE_ADDRESS, poid: ["Lilleküla", "Mustamäe"] } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].source.authority).toBe("Maa- ja Ruumiamet");
      }
    });
  });

  describe("top-level malformed payloads", () => {
    test("rejects null payload", () => {
      const result = parseInAksAddressResponse(null, INAKS_NORMALIZER_VERSION, INAKS_RETRIEVED_AT);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });

    test("rejects undefined payload", () => {
      const result = parseInAksAddressResponse(
        undefined,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });

    test("rejects array payload", () => {
      const result = parseInAksAddressResponse([], INAKS_NORMALIZER_VERSION, INAKS_RETRIEVED_AT);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });

    test("rejects string payload", () => {
      const result = parseInAksAddressResponse(
        "not-an-object",
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0].code).toBe("PAYLOAD_NOT_OBJECT");
      }
    });

    test("rejects missing addresses", () => {
      const payload = { host: "inaks-api-test" };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_ADDRESSES")).toBe(true);
      }
    });

    test("rejects non-array addresses", () => {
      const payload = { addresses: "not-array", host: "inaks-api-test" };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_ADDRESSES_ARRAY")).toBe(true);
      }
    });

    test("rejects missing host", () => {
      const payload = { addresses: [] };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_HOST")).toBe(true);
      }
    });
  });

  describe("missing required fields in address", () => {
    test("rejects missing adr_id", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, adr_id: undefined } as unknown as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_ADR_ID")).toBe(true);
      }
    });

    test("rejects missing ads_oid", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, ads_oid: undefined } as unknown as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_ADS_OID")).toBe(true);
      }
    });

    test("rejects missing adob_id", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, adob_id: undefined } as unknown as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_ADOB_ID")).toBe(true);
      }
    });

    test("rejects missing adr_id", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, adr_id: undefined } as unknown as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_ADR_ID")).toBe(true);
      }
    });

    test("rejects missing aadresstekst", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          { ...BASE_ADDRESS, aadresstekst: undefined } as unknown as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_AADRESS_TEKST")).toBe(true);
      }
    });

    test("rejects invalid liik", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, liik: "X" } as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_LIIK")).toBe(true);
      }
    });

    test("rejects non-string tunnus for cadastral unit", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          { ...BASE_ADDRESS, liik: "4", tunnus: undefined } as unknown as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_OPTIONAL_FIELD")).toBe(true);
      }
    });
  });

  describe("wrong runtime types", () => {
    test("rejects adr_id as number", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, adr_id: 12345 } as unknown as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_ADR_ID")).toBe(true);
      }
    });

    test("rejects liik as number", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [{ ...BASE_ADDRESS, liik: 4 } as unknown as ProviderInAksAddressRaw],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_LIIK")).toBe(true);
      }
    });

    test("rejects non-string coordinates", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_x: 539625.35,
            viitepunkt_y: 6587225.42,
          } as unknown as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field.startsWith("addresses[0].viitepunkt"))).toBe(true);
      }
    });

    test("rejects missing EPSG:3301 x coordinate", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_x: undefined,
            viitepunkt_y: "6587225.42",
          } as unknown as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field.startsWith("addresses[0].viitepunkt_x_y"))).toBe(
          true
        );
      }
    });

    test("rejects missing EPSG:4326 lon coordinate", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_l: undefined,
            viitepunkt_b: "59.421047",
          } as unknown as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field.startsWith("addresses[0].viitepunkt_l_b"))).toBe(
          true
        );
      }
    });
  });

  describe("coordinate domain validation", () => {
    test("rejects WGS84 longitude outside [-180, 180]", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_l: "999",
            viitepunkt_b: "59.421047",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field.startsWith("addresses[0].viitepunkt_l_b"))).toBe(
          true
        );
      }
    });

    test("rejects WGS84 latitude outside [-90, 90]", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_l: "24.697966",
            viitepunkt_b: "999",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field.startsWith("addresses[0].viitepunkt_l_b"))).toBe(
          true
        );
      }
    });

    test("rejects EPSG:3301 x outside Estonia bounds", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_x: "999999",
            viitepunkt_y: "6587225.42",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field.startsWith("addresses[0].viitepunkt_x_y"))).toBe(
          true
        );
      }
    });

    test("rejects EPSG:3301 y outside Estonia bounds", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_x: "539625.35",
            viitepunkt_y: "9999999",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field.startsWith("addresses[0].viitepunkt_x_y"))).toBe(
          true
        );
      }
    });
  });

  describe("liik mapping", () => {
    test("maps B to small_place, not poi", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "B",
            liikVal: "VAIKEKOHT",
            tunnus: "123456789",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].objectType).toBe("small_place");
        expect(result.results[0].objectTypeCode).toBe("B");
      }
    });
  });

  describe("liik/liikVal pair validation", () => {
    test("rejects mismatched liik=4 with liikVal=EHITISHOONE", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "4",
            liikVal: "EHITISHOONE",
            tunnus: "784077016840",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_LIIK_VALUE")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].liikVal")).toBe(true);
      }
    });

    test("rejects mismatched liik=E with liikVal=KATASTRIYKSUS", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "E",
            liikVal: "KATASTRIYKSUS",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_LIIK_VALUE")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].liikVal")).toBe(true);
      }
    });
  });

  describe("poid validation", () => {
    test("rejects non-array poid", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            poid: "not-an-array" as unknown as string[],
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_OPTIONAL_FIELD")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].poid")).toBe(true);
      }
    });

    test("rejects mixed array poid with non-string elements", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            poid: ["valid", 123, null] as unknown as string[],
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_OPTIONAL_FIELD")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].poid[1]")).toBe(true);
      }
    });

    test("accepts valid string array poid", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            poid: ["Maa- ja Ruumiamet", "Mustamäe"],
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].source.authority).toBe("Maa- ja Ruumiamet");
      }
    });
  });

  describe("tunnus conditional validation", () => {
    test("allows empty tunnus for building (liik=E)", () => {
      const result = parseInAksAddressResponse(
        BUILDING_WITH_EMPTY_TUNNUS_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].objectType).toBe("building");
        expect(result.results[0].cadastralId).toBeUndefined();
      }
    });

    test("rejects empty tunnus for cadastral unit (liik=4)", () => {
      const result = parseInAksAddressResponse(
        CADASTRAL_UNIT_WITH_EMPTY_TUNNUS_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "MISSING_TUNNUS")).toBe(true);
      }
    });
  });

  describe("runtime string validation in buildValidatedAddress", () => {
    test("rejects non-string pikkaadress when aadresstekst is empty", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            aadresstekst: "",
            pikkaadress: 123 as unknown as string,
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_REQUIRED_FIELD")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].pikkaadress")).toBe(true);
      }
    });

    test("rejects non-string sihtnumber", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            sihtnumber: 12345 as unknown as string,
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_REQUIRED_FIELD")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].sihtnumber")).toBe(true);
      }
    });

    test("rejects non-string boundingbox", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            boundingbox: 123 as unknown as string,
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_REQUIRED_FIELD")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].boundingbox")).toBe(true);
      }
    });
  });

  describe("olek and primary validation", () => {
    test("rejects unsupported olek value", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            olek: "garbage",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_OPTIONAL_FIELD")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].olek")).toBe(true);
      }
    });

    test("accepts valid olek values K, O, V, T", () => {
      const cases = [
        { olek: "K" as const, status: "K" },
        { olek: "O" as const, status: "O" },
        { olek: "V" as const, status: "V" },
        { olek: "T" as const, status: "T" },
      ];
      for (const c of cases) {
        const payload: ProviderInAksResponseRaw = {
          addresses: [{ ...BASE_ADDRESS, olek: c.olek } as ProviderInAksAddressRaw],
          host: "inaks-api-test",
        };
        const result = parseInAksAddressResponse(
          payload,
          INAKS_NORMALIZER_VERSION,
          INAKS_RETRIEVED_AT
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.results[0].status).toBe(c.status);
        }
      }
    });

    test("accepts production observed olek=O", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            olek: "O",
            ads_oid: "EE04269385",
            adob_id: "11500761",
            adr_id: "2105921",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].status).toBe("O");
      }
    });

    test("rejects non-string primary", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            primary: "yes",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_OPTIONAL_FIELD")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[0].primary")).toBe(true);
      }
    });

    test("accepts primary=true and primary=false", () => {
      const cases = [
        { primary: "true", expected: true },
        { primary: "false", expected: false },
      ];
      for (const c of cases) {
        const payload: ProviderInAksResponseRaw = {
          addresses: [{ ...BASE_ADDRESS, primary: c.primary } as ProviderInAksAddressRaw],
          host: "inaks-api-test",
        };
        const result = parseInAksAddressResponse(
          payload,
          INAKS_NORMALIZER_VERSION,
          INAKS_RETRIEVED_AT
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.results[0].primary).toBe(c.expected);
        }
      }
    });
  });

  describe("per-candidate error tracking", () => {
    test("reports errors from multiple candidates independently", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            ads_oid: "",
          } as ProviderInAksAddressRaw,
          {
            ...BASE_ADDRESS,
            aadresstekst: "",
            pikkaadress: 123 as unknown as string,
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === "addresses[0].ads_oid")).toBe(true);
        expect(result.errors.some((e) => e.field === "addresses[1].pikkaadress")).toBe(true);
      }
    });
  });

  describe("non-finite numeric input", () => {
    test("rejects Infinity coordinate", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_x: "Infinity",
            viitepunkt_y: "6587225.42",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "NON_FINITE_NUMERIC")).toBe(true);
      }
    });

    test("rejects NaN coordinate", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            viitepunkt_x: "NaN",
            viitepunkt_y: "6587225.42",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "NON_FINITE_NUMERIC")).toBe(true);
      }
    });
  });

  describe("invalid timestamps", () => {
    test("rejects invalid retrievedAt", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        "not-a-date"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_TIMESTAMP")).toBe(true);
      }
    });

    test("rejects empty normalizerVersion with INVALID_NORMALIZER_VERSION", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        "",
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_NORMALIZER_VERSION")).toBe(true);
        expect(result.errors.some((e) => e.field === "normalizerVersion")).toBe(true);
      }
    });

    test("rejects invalid UTC offset +25:00", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        "2026-08-19T21:33:33+25:00"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_TIMESTAMP")).toBe(true);
      }
    });

    test("rejects invalid UTC offset +02:60", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        "2026-08-19T21:33:33+02:60"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_TIMESTAMP")).toBe(true);
      }
    });

    test("rejects impossible calendar date 2026-02-30", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        "2026-02-30T12:00:00Z"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_TIMESTAMP")).toBe(true);
      }
    });

    test("rejects impossible calendar date 2026-04-31", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        "2026-04-31T12:00:00Z"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_TIMESTAMP")).toBe(true);
      }
    });

    test("accepts valid leap-day date 2024-02-29", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        "2024-02-29T12:00:00Z"
      );
      expect(result.valid).toBe(true);
    });

    test("rejects invalid leap-day date 2023-02-29", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        "2023-02-29T12:00:00Z"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_TIMESTAMP")).toBe(true);
      }
    });
  });

  describe("cadastral ID validation via canonical validator", () => {
    test("rejects tunnus with letters for cadastral unit (liik=4)", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "4",
            liikVal: "KATASTRIYKSUS",
            tunnus: "78407:70A:6840",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_CADASTRAL_ID")).toBe(true);
      }
    });

    test("rejects 11-digit tunnus for cadastral unit (liik=4)", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "4",
            liikVal: "KATASTRIYKSUS",
            tunnus: "78407701684",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_CADASTRAL_ID")).toBe(true);
      }
    });

    test("rejects 13-digit tunnus for cadastral unit (liik=4)", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "4",
            liikVal: "KATASTRIYKSUS",
            tunnus: "7840770168400",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_CADASTRAL_ID")).toBe(true);
      }
    });

    test("accepts valid colon-delimited tunnus for cadastral unit (liik=4)", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "4",
            liikVal: "KATASTRIYKSUS",
            tunnus: "78401:004:0110",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results[0].cadastralId).toBe("784010040110");
      }
    });
  });

  describe("raw upstream fixture parsing", () => {
    test("parses captured test gazetteer response for adrid=2105921 unchanged", () => {
      const result = parseInAksAddressResponse(
        RAW_TEST_FIXTURE_ADRID_2105921,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results).toHaveLength(2);
        expect(result.results[0].id).toBe("ME01087725");
        expect(result.results[0].objectType).toBe("building");
        expect(result.results[1].id).toBe("CU00473339");
        expect(result.results[1].objectType).toBe("cadastral_unit");
        expect(result.results[1].cadastralId).toBe("784077016840");
      }
    });

    test("parses captured production gazetteer response for adrid=2105921 unchanged", () => {
      const result = parseInAksAddressResponse(
        RAW_PROD_FIXTURE_ADRID_2105921,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.results).toHaveLength(3);
        expect(result.results[0].id).toBe("ME01087725");
        expect(result.results[0].objectType).toBe("building");
        expect(result.results[1].id).toBe("EE04269385");
        expect(result.results[1].objectType).toBe("building");
        expect(result.results[1].status).toBe("O");
        expect(result.results[2].id).toBe("CU00473339");
        expect(result.results[2].objectType).toBe("cadastral_unit");
        expect(result.results[2].cadastralId).toBe("784077016840");
      }
    });
  });

  describe("warnings for non-current objects", () => {
    test("produces NON_CURRENT_OBJECT warning for status O", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            olek: "O",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe("NON_CURRENT_OBJECT");
        expect(result.warnings[0].field).toBe("results[0].status");
        expect(result.warnings[0].message).toBe("object status is O");
      }
    });

    test("produces NON_CURRENT_OBJECT warning for status V", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            olek: "V",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe("NON_CURRENT_OBJECT");
        expect(result.warnings[0].message).toBe("object status is V");
      }
    });

    test("produces NON_CURRENT_OBJECT warning for status T", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            olek: "T",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe("NON_CURRENT_OBJECT");
        expect(result.warnings[0].message).toBe("object status is T");
      }
    });

    test("produces no warning for status K", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            olek: "K",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings).toHaveLength(0);
      }
    });

    test("production fixture O candidate produces NON_CURRENT_OBJECT warning", () => {
      const result = parseInAksAddressResponse(
        RAW_PROD_FIXTURE_ADRID_2105921,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        const oWarnings = result.warnings.filter((w) => w.code === "NON_CURRENT_OBJECT");
        expect(oWarnings).toHaveLength(1);
        expect(oWarnings[0].field).toBe("results[1].status");
        expect(oWarnings[0].message).toBe("object status is O");
      }
    });
  });

  describe("unsupported liik policy (fail-closed)", () => {
    test("unsupported liik fails the whole parse without UNSUPPORTED_CANDIDATE warning", () => {
      const payload: ProviderInAksResponseRaw = {
        addresses: [
          {
            ...BASE_ADDRESS,
            liik: "X",
            liikVal: "UNKNOWN",
          } as ProviderInAksAddressRaw,
        ],
        host: "inaks-api-test",
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.code === "INVALID_LIIK")).toBe(true);
      }
    });
  });

  describe("extras / unknown fields policy", () => {
    test("unknown top-level fields do not appear in canonical result", () => {
      const payload = {
        ...BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        providerSecret: "secret-value",
        internalFlag: true,
      };
      const result = parseInAksAddressResponse(
        payload,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        const serialized = JSON.stringify(result.results[0]);
        expect(serialized).not.toContain("providerSecret");
        expect(serialized).not.toContain("internalFlag");
      }
    });
  });

  describe("no uncaught exceptions", () => {
    test("never throws on any input", () => {
      const malformedInputs: unknown[] = [
        null,
        undefined,
        123,
        "string",
        true,
        false,
        [],
        {},
        { addresses: null },
        { addresses: [null, undefined, 123] },
        { addresses: [{}], host: null },
      ];
      for (const input of malformedInputs) {
        expect(() =>
          parseInAksAddressResponse(input, INAKS_NORMALIZER_VERSION, INAKS_RETRIEVED_AT)
        ).not.toThrow();
      }
    });
  });

  describe("canonical contract isolation", () => {
    test("successful parse returns only canonical AddressSearchResult shape", () => {
      const result = parseInAksAddressResponse(
        BUILDING_AND_CADASTRAL_UNIT_RESPONSE,
        INAKS_NORMALIZER_VERSION,
        INAKS_RETRIEVED_AT
      );
      expect(result.valid).toBe(true);
      if (result.valid) {
        const keys = Object.keys(result.results[0]);
        expect(keys).toEqual([
          "id",
          "addressId",
          "label",
          "objectType",
          "objectTypeCode",
          "coordinates",
          "coordinatesEpsg3301",
          "source",
          "cadastralId",
          "postalCode",
          "administrative",
          "addressCode",
          "status",
          "primary",
          "provenance",
        ]);
        expect((result.results[0] as unknown as Record<string, unknown>).adr_id).toBeUndefined();
        expect(
          (result.results[0] as unknown as Record<string, unknown>).viitepunkt_x
        ).toBeUndefined();
        expect((result.results[0] as unknown as Record<string, unknown>).poid).toBeUndefined();
      }
    });
  });
});
