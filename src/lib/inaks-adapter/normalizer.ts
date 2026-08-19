import type {
  AddressSearchResult,
  AddressCoordinates,
  AddressCoordinatesEpsg3301,
  AddressAdministrative,
  AddressObjectType,
  AddressObjectTypeCode,
  AddressObjectStatus,
} from "../../domain/address-search/types";
import { validateCadastralId } from "../../domain/parcel";
import type {
  InAksParseError,
  InAksParseErrorCode,
  InAksParseResult,
  InAksParseWarning,
  ValidatedInAksAddress,
  ProviderInAksAddressRaw,
  ProviderInAksResponseRaw,
} from "./types";

const SUPPORTED_OBJECT_TYPES = new Set(["1", "2", "B", "4", "E"]);
const VALID_STATUSES = new Set(["K", "O", "V", "T"]);

const OBJECT_TYPE_NAMES = {
  "1": "EHAK",
  "2": "TANAV",
  B: "VAIKEKOHT",
  "4": "KATASTRIYKSUS",
  E: "EHITISHOONE",
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInAksParseError(value: unknown): value is InAksParseError {
  return (
    isObject(value) &&
    typeof value.code === "string" &&
    typeof value.field === "string" &&
    typeof value.message === "string"
  );
}

function parseError(code: InAksParseErrorCode, field: string, message: string): InAksParseError {
  return { code, field, message };
}

function validateOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isString(value)) {
    throw parseError("INVALID_OPTIONAL_FIELD", field, `${field} must be a string when provided`);
  }
  return value;
}

function validateRequiredString(value: unknown, field: string): string {
  if (!isString(value)) {
    throw parseError("INVALID_REQUIRED_FIELD", field, `${field} must be a string`);
  }
  return value;
}

function validateOptionalStringArray(value: unknown, field: string): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw parseError("INVALID_OPTIONAL_FIELD", field, `${field} must be an array`);
  }
  for (let i = 0; i < value.length; i++) {
    if (!isString(value[i])) {
      throw parseError(
        "INVALID_OPTIONAL_FIELD",
        `${field}[${i}]`,
        `${field}[${i}] must be a string`
      );
    }
  }
  return value;
}

function validateStatus(value: unknown, field: string): string {
  const status = validateRequiredString(value, field);
  if (!VALID_STATUSES.has(status)) {
    throw parseError("INVALID_OPTIONAL_FIELD", field, `${field} has unsupported status`);
  }
  return status;
}

function validatePrimary(value: unknown, field: string): string {
  if (value == null) {
    return "false";
  }
  if (!isString(value) || (value !== "true" && value !== "false")) {
    throw parseError("INVALID_OPTIONAL_FIELD", field, `${field} must be true or false`);
  }
  return value;
}

function validateObjectTypeName(liik: string, liikVal: string, field: string): void {
  const expected = OBJECT_TYPE_NAMES[liik as keyof typeof OBJECT_TYPE_NAMES];
  if (expected !== liikVal) {
    throw parseError("INVALID_LIIK_VALUE", field, "liikVal does not match liik");
  }
}

const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isValidIsoTimestamp(value: string): boolean {
  const match = ISO_TIMESTAMP_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function parseCoordinatePair(
  rawX: unknown,
  rawY: unknown,
  fieldPrefix: string,
  xBounds?: { min: number; max: number },
  yBounds?: { min: number; max: number }
): InAksParseError | undefined {
  if (rawX == null || rawY == null) {
    return parseError("INVALID_COORDINATES", fieldPrefix, "both coordinate values are required");
  }
  if (!isString(rawX) || !isString(rawY)) {
    return parseError(
      "INVALID_COORDINATES",
      fieldPrefix,
      "coordinates must be numeric strings when provided"
    );
  }
  const x = Number(rawX);
  const y = Number(rawY);
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return parseError("NON_FINITE_NUMERIC", fieldPrefix, "coordinates must be finite numbers");
  }
  if (xBounds && (x < xBounds.min || x > xBounds.max)) {
    return parseError(
      "INVALID_COORDINATES",
      fieldPrefix,
      `x coordinate out of range [${xBounds.min}, ${xBounds.max}]`
    );
  }
  if (yBounds && (y < yBounds.min || y > yBounds.max)) {
    return parseError(
      "INVALID_COORDINATES",
      fieldPrefix,
      `y coordinate out of range [${yBounds.min}, ${yBounds.max}]`
    );
  }
  return undefined;
}

function mapObjectType(liik: string): AddressObjectType {
  switch (liik) {
    case "1":
      return "ehak";
    case "2":
      return "street";
    case "B":
      return "small_place";
    case "4":
      return "cadastral_unit";
    case "E":
      return "building";
    default:
      return "building";
  }
}

function buildValidatedAddress(raw: ProviderInAksAddressRaw): ValidatedInAksAddress {
  const adrId = validateRequiredString(raw.adr_id, "adr_id");
  const aadresstekst = validateRequiredString(raw.aadresstekst, "aadresstekst");
  const pikkaadress = validateRequiredString(raw.pikkaadress, "pikkaadress");
  const taisaadress = validateRequiredString(raw.taisaadress, "taisaadress");
  const ipikkaadress = validateRequiredString(raw.ipikkaadress, "ipikkaadress");
  const liik = validateRequiredString(raw.liik, "liik");
  const liikVal = validateRequiredString(raw.liikVal, "liikVal");
  validateObjectTypeName(liik, liikVal, "liikVal");
  const tunnus = validateRequiredString(raw.tunnus, "tunnus");
  const adsOid = validateRequiredString(raw.ads_oid, "ads_oid");
  const adobId = validateRequiredString(raw.adob_id, "adob_id");
  const sihtnumber = validateRequiredString(raw.sihtnumber, "sihtnumber");
  const viitepunktX = validateRequiredString(raw.viitepunkt_x, "viitepunkt_x");
  const viitepunktY = validateRequiredString(raw.viitepunkt_y, "viitepunkt_y");
  const viitepunktL = validateRequiredString(raw.viitepunkt_l, "viitepunkt_l");
  const viitepunktB = validateRequiredString(raw.viitepunkt_b, "viitepunkt_b");
  const boundingbox = validateRequiredString(raw.boundingbox, "boundingbox");
  const gBoundingbox = validateRequiredString(raw.g_boundingbox, "g_boundingbox");

  const poid = validateOptionalStringArray(raw.poid, "poid");

  const primary = validatePrimary(raw.primary, "primary");
  const kvaliteet = validateOptionalString(raw.kvaliteet, "kvaliteet") ?? "";
  const olek = validateStatus(raw.olek, "olek");
  const ehakmk = validateOptionalString(raw.ehakmk, "ehakmk") ?? "";
  const maakond = validateOptionalString(raw.maakond, "maakond") ?? "";
  const ehakov = validateOptionalString(raw.ehakov, "ehakov") ?? "";
  const omavalitsus = validateOptionalString(raw.omavalitsus, "omavalitsus") ?? "";
  const ehak = validateOptionalString(raw.ehak, "ehak") ?? "";
  const asustusyksus = validateOptionalString(raw.asustusyksus, "asustusyksus") ?? "";
  const koodaadress = validateOptionalString(raw.koodaadress, "koodaadress") ?? "";
  const asum = validateOptionalString(raw.asum, "asum") ?? "";
  const oldAadresstekst = validateOptionalString(raw.old_aadresstekst, "old_aadresstekst") ?? "";
  const leitudOsa = validateOptionalString(raw.leitud_osa, "leitud_osa") ?? "";
  const unik = validateOptionalString(raw.unik, "unik") ?? "";
  const onkort = validateOptionalString(raw.onkort, "onkort") ?? "";
  const kood4 = validateOptionalString(raw.kood4, "kood4") ?? "";
  const vaikekoht = validateOptionalString(raw.vaikekoht, "vaikekoht") ?? "";
  const kood5 = validateOptionalString(raw.kood5, "kood5") ?? "";
  const liikluspind = validateOptionalString(raw.liikluspind, "liikluspind") ?? "";
  const kood6 = validateOptionalString(raw.kood6, "kood6") ?? "";
  const nimi = validateOptionalString(raw.nimi, "nimi") ?? "";
  const kood7 = validateOptionalString(raw.kood7, "kood7") ?? "";
  const aadressNr = validateOptionalString(raw.aadress_nr, "aadress_nr") ?? "";
  const kood8 = validateOptionalString(raw.kood8, "kood8") ?? "";
  const kortNr = validateOptionalString(raw.kort_nr, "kort_nr") ?? "";
  const tehnId2 = validateOptionalString(raw.tehn_id2, "tehn_id2") ?? "";
  const kaugus = validateOptionalString(raw.kaugus, "kaugus") ?? "";
  const ietunnus = validateOptionalString(raw.ietunnus, "ietunnus") ?? "";

  return {
    adrId,
    aadresstekst,
    pikkaadress,
    taisaadress,
    ipikkaadress,
    liik: liik as "1" | "2" | "B" | "4" | "E",
    liikVal,
    tunnus,
    adsOid,
    adobId,
    sihtnumber,
    viitepunktX,
    viitepunktY,
    viitepunktL,
    viitepunktB,
    boundingbox,
    gBoundingbox,
    poid,
    primary,
    kvaliteet,
    olek: olek as "K" | "O" | "V" | "T",
    ehakmk,
    maakond,
    ehakov,
    omavalitsus,
    ehak,
    asustusyksus,
    koodaadress,
    asum,
    oldAadresstekst,
    leitudOsa,
    unik,
    onkort,
    kood4,
    vaikekoht,
    kood5,
    liikluspind,
    kood6,
    nimi,
    kood7,
    aadressNr,
    kood8,
    kortNr,
    tehnId2,
    kaugus,
    ietunnus,
  };
}

function toAddressSearchResult(
  address: ValidatedInAksAddress,
  normalizerVersion: string,
  retrievedAt: string
): AddressSearchResult {
  const coordinates: AddressCoordinates = {
    lat: Number(address.viitepunktB),
    lon: Number(address.viitepunktL),
  };

  const coordinatesEpsg3301: AddressCoordinatesEpsg3301 = {
    x: Number(address.viitepunktX),
    y: Number(address.viitepunktY),
  };

  const administrative: AddressAdministrative = {
    county: address.maakond || undefined,
    municipality: address.omavalitsus || undefined,
    settlement: address.asustusyksus || undefined,
    subdistrict: address.asum || undefined,
  };

  let cadastralId: string | undefined;
  if (address.liik === "4" && address.tunnus.trim().length > 0) {
    const cadastral = validateCadastralId(address.tunnus);
    if (cadastral.valid && cadastral.normalized) {
      cadastralId = cadastral.normalized;
    }
  }

  const objectType: AddressObjectType = mapObjectType(address.liik);
  const objectTypeCode: AddressObjectTypeCode = address.liik as AddressObjectTypeCode;
  const status: AddressObjectStatus = address.olek as AddressObjectStatus;

  return {
    id: address.adsOid,
    addressId: address.adrId,
    label: address.aadresstekst || address.pikkaadress,
    objectType,
    objectTypeCode,
    coordinates,
    coordinatesEpsg3301,
    source: {
      id: "maru.inaks",
      authority: "Maa- ja Ruumiamet",
    },
    cadastralId,
    postalCode: address.sihtnumber || undefined,
    administrative,
    addressCode: address.koodaadress || undefined,
    status,
    primary: address.primary === "true",
    provenance: {
      sourceId: "maru.inaks",
      sourceObjectId: address.adsOid,
      normalizerVersion,
      retrievedAt,
    },
  };
}

export function parseInAksAddressResponse(
  payload: unknown,
  normalizerVersion: string,
  retrievedAt: string
): InAksParseResult {
  const errors: InAksParseError[] = [];

  if (!isObject(payload)) {
    return {
      valid: false,
      errors: [parseError("PAYLOAD_NOT_OBJECT", "", "payload must be a non-null object")],
    };
  }

  if (!isString(normalizerVersion) || normalizerVersion.trim().length === 0) {
    errors.push(
      parseError(
        "INVALID_NORMALIZER_VERSION",
        "normalizerVersion",
        "normalizerVersion is required and must be a non-empty string"
      )
    );
  }

  if (!isString(retrievedAt) || retrievedAt.trim().length === 0) {
    errors.push(
      parseError(
        "INVALID_TIMESTAMP",
        "retrievedAt",
        "retrievedAt is required and must be a non-empty string"
      )
    );
  } else if (!isValidIsoTimestamp(retrievedAt)) {
    errors.push(
      parseError("INVALID_TIMESTAMP", "retrievedAt", "retrievedAt must be a valid ISO timestamp")
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const raw = payload as unknown as ProviderInAksResponseRaw;

  const rawAddresses = raw.addresses;
  if (rawAddresses === undefined || rawAddresses === null) {
    errors.push(parseError("MISSING_ADDRESSES", "addresses", "addresses is required"));
  } else if (!Array.isArray(rawAddresses)) {
    errors.push(parseError("INVALID_ADDRESSES_ARRAY", "addresses", "addresses must be an array"));
  }

  const rawHost = raw.host;
  if (!isString(rawHost) || rawHost.trim().length === 0) {
    errors.push(
      parseError("MISSING_HOST", "host", "host is required and must be a non-empty string")
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const addresses = rawAddresses as unknown[];
  const validatedAddresses: ValidatedInAksAddress[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const rawAddress = addresses[i];
    const candidateErrors: InAksParseError[] = [];

    if (!isObject(rawAddress)) {
      candidateErrors.push(
        parseError(
          "INVALID_ADDRESSES_ARRAY",
          `addresses[${i}]`,
          "each address must be a non-null object"
        )
      );
      errors.push(...candidateErrors);
      continue;
    }

    const typedAddress = rawAddress as unknown as ProviderInAksAddressRaw;

    const rawAdsOid = typedAddress.ads_oid;
    if (!isString(rawAdsOid) || rawAdsOid.trim().length === 0) {
      candidateErrors.push(
        parseError("MISSING_ADS_OID", `addresses[${i}].ads_oid`, "ads_oid is required")
      );
    }

    const rawAdobId = typedAddress.adob_id;
    if (!isString(rawAdobId) || rawAdobId.trim().length === 0) {
      candidateErrors.push(
        parseError("MISSING_ADOB_ID", `addresses[${i}].adob_id`, "adob_id is required")
      );
    }

    const rawAdrId = typedAddress.adr_id;
    if (!isString(rawAdrId) || rawAdrId.trim().length === 0) {
      candidateErrors.push(
        parseError("MISSING_ADR_ID", `addresses[${i}].adr_id`, "adr_id is required")
      );
    }

    const rawAadresstekst = typedAddress.aadresstekst;
    if (!isString(rawAadresstekst)) {
      candidateErrors.push(
        parseError(
          "MISSING_AADRESS_TEKST",
          `addresses[${i}].aadresstekst`,
          "aadresstekst is required"
        )
      );
    }

    const rawLiik = typedAddress.liik;
    if (!isString(rawLiik) || !SUPPORTED_OBJECT_TYPES.has(rawLiik)) {
      candidateErrors.push(
        parseError(
          "INVALID_LIIK",
          `addresses[${i}].liik`,
          "liik must be a supported object type code"
        )
      );
    }

    const rawTunnus = typedAddress.tunnus;
    if (!isString(rawTunnus)) {
      candidateErrors.push(
        parseError("INVALID_OPTIONAL_FIELD", `addresses[${i}].tunnus`, "tunnus must be a string")
      );
    } else if (rawLiik === "4" && rawTunnus.trim().length > 0) {
      const cadastral = validateCadastralId(rawTunnus);
      if (!cadastral.valid) {
        candidateErrors.push({
          code: "INVALID_CADASTRAL_ID",
          field: `addresses[${i}].tunnus`,
          message: cadastral.errors[0]?.message ?? "invalid cadastral identifier",
        });
      }
    } else if (rawLiik === "4" && rawTunnus.trim().length === 0) {
      candidateErrors.push(
        parseError(
          "MISSING_TUNNUS",
          `addresses[${i}].tunnus`,
          "tunnus is required for cadastral units"
        )
      );
    }

    const coord3301Error = parseCoordinatePair(
      typedAddress.viitepunkt_x,
      typedAddress.viitepunkt_y,
      `addresses[${i}].viitepunkt_x_y`,
      { min: 200000, max: 900000 },
      { min: 6300000, max: 7800000 }
    );
    if (coord3301Error) {
      candidateErrors.push(coord3301Error);
    }

    const coord4326Error = parseCoordinatePair(
      typedAddress.viitepunkt_l,
      typedAddress.viitepunkt_b,
      `addresses[${i}].viitepunkt_l_b`,
      { min: -180, max: 180 },
      { min: -90, max: 90 }
    );
    if (coord4326Error) {
      candidateErrors.push(coord4326Error);
    }

    if (candidateErrors.length > 0) {
      errors.push(...candidateErrors);
      continue;
    }

    try {
      const validated = buildValidatedAddress(typedAddress);
      validatedAddresses.push(validated);
    } catch (err) {
      if (isInAksParseError(err)) {
        errors.push({
          ...err,
          field: `addresses[${i}].${err.field}`,
        });
      } else {
        errors.push(
          parseError(
            "DOMAIN_VALIDATION_FAILED",
            `addresses[${i}]`,
            "unexpected address validation failure"
          )
        );
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const results = validatedAddresses.map((address) =>
    toAddressSearchResult(address, normalizerVersion, retrievedAt)
  );

  const warnings: InAksParseWarning[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status !== "K") {
      warnings.push({
        code: "NON_CURRENT_OBJECT",
        field: `results[${i}].status`,
        message: `object status is ${results[i].status}`,
      });
    }
  }

  return {
    valid: true,
    results,
    warnings,
  };
}
