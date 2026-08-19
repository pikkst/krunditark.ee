export type InAksParseErrorCode =
  | "PAYLOAD_NOT_OBJECT"
  | "MISSING_ADDRESSES"
  | "INVALID_ADDRESSES_ARRAY"
  | "MISSING_ADS_OID"
  | "MISSING_ADOB_ID"
  | "MISSING_ADR_ID"
  | "INVALID_ADR_ID"
  | "MISSING_AADRESS_TEKST"
  | "INVALID_LIIK"
  | "INVALID_LIIK_VALUE"
  | "MISSING_TUNNUS"
  | "INVALID_CADASTRAL_ID"
  | "INVALID_COORDINATES"
  | "NON_FINITE_NUMERIC"
  | "MISSING_HOST"
  | "INVALID_TIMESTAMP"
  | "INVALID_NORMALIZER_VERSION"
  | "INVALID_REQUIRED_FIELD"
  | "INVALID_OPTIONAL_FIELD"
  | "DOMAIN_VALIDATION_FAILED";

export interface InAksParseError {
  code: InAksParseErrorCode;
  field: string;
  message: string;
}

export interface ProviderInAksAddressRaw {
  adr_id: unknown;
  aadresstekst: unknown;
  pikkaadress: unknown;
  taisaadress: unknown;
  ipikkaadress: unknown;
  liik: unknown;
  liikVal: unknown;
  tunnus: unknown;
  ads_oid: unknown;
  adob_id: unknown;
  sihtnumber: unknown;
  viitepunkt_x: unknown;
  viitepunkt_y: unknown;
  viitepunkt_l: unknown;
  viitepunkt_b: unknown;
  boundingbox: unknown;
  g_boundingbox: unknown;
  poid: unknown;
  primary: unknown;
  kvaliteet: unknown;
  olek: unknown;
  ehakmk: unknown;
  maakond: unknown;
  ehakov: unknown;
  omavalitsus: unknown;
  ehak: unknown;
  asustusyksus: unknown;
  koodaadress: unknown;
  asum: unknown;
  old_aadresstekst: unknown;
  leitud_osa: unknown;
  unik: unknown;
  onkort: unknown;
  kood4: unknown;
  vaikekoht: unknown;
  kood5: unknown;
  liikluspind: unknown;
  kood6: unknown;
  nimi: unknown;
  kood7: unknown;
  aadress_nr: unknown;
  kood8: unknown;
  kort_nr: unknown;
  tehn_id2: unknown;
  kaugus: unknown;
  ietunnus: unknown;
}

export interface ProviderInAksResponseRaw {
  addresses: unknown;
  host: unknown;
}

export interface ValidatedInAksAddress {
  adrId: string;
  aadresstekst: string;
  pikkaadress: string;
  taisaadress: string;
  ipikkaadress: string;
  liik: "1" | "2" | "B" | "4" | "E";
  liikVal: string;
  tunnus: string;
  adsOid: string;
  adobId: string;
  sihtnumber: string;
  viitepunktX: string;
  viitepunktY: string;
  viitepunktL: string;
  viitepunktB: string;
  boundingbox: string;
  gBoundingbox: string;
  poid: string[];
  primary: string;
  kvaliteet: string;
  olek: "K" | "O" | "V" | "T";
  ehakmk: string;
  maakond: string;
  ehakov: string;
  omavalitsus: string;
  ehak: string;
  asustusyksus: string;
  koodaadress: string;
  asum: string;
  oldAadresstekst: string;
  leitudOsa: string;
  unik: string;
  onkort: string;
  kood4: string;
  vaikekoht: string;
  kood5: string;
  liikluspind: string;
  kood6: string;
  nimi: string;
  kood7: string;
  aadressNr: string;
  kood8: string;
  kortNr: string;
  tehnId2: string;
  kaugus: string;
  ietunnus: string;
}

export interface ValidatedInAksResponse {
  addresses: ValidatedInAksAddress[];
  host: string;
}

export type InAksParseWarningCode = "NON_CURRENT_OBJECT";

export interface InAksParseWarning {
  code: InAksParseWarningCode;
  field?: string;
  message: string;
}

export interface InAksParseSuccess {
  valid: true;
  results: import("./../../domain/address-search/types").AddressSearchResult[];
  warnings: InAksParseWarning[];
}

export interface InAksParseFailure {
  valid: false;
  errors: InAksParseError[];
}

export type InAksParseResult = InAksParseSuccess | InAksParseFailure;
