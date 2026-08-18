export type ParcelParseErrorCode =
  | "PAYLOAD_NOT_OBJECT"
  | "MISSING_CADASTRAL_NUMBER"
  | "INVALID_CADASTRAL_NUMBER"
  | "MISSING_GEOMETRY"
  | "INVALID_GEOMETRY_TYPE"
  | "MISSING_COORDINATES"
  | "INVALID_COORDINATES"
  | "MISSING_CRS"
  | "UNSUPPORTED_CRS"
  | "NON_FINITE_NUMERIC"
  | "MISSING_SOURCE"
  | "MISSING_SOURCE_ID"
  | "MISSING_DATASET_VERSION"
  | "MISSING_SYNC_RUN"
  | "MISSING_NORMALIZER_VERSION"
  | "MISSING_RETRIEVED_AT"
  | "INVALID_TIMESTAMP"
  | "INVALID_FRESHNESS"
  | "DOMAIN_VALIDATION_FAILED";

export interface ParcelParseError {
  code: ParcelParseErrorCode;
  field: string;
  message: string;
}

export interface ProviderParcelGeometryRaw {
  type: unknown;
  coordinates: unknown;
}

export interface ProviderParcelSourceRaw {
  id: unknown;
  datasetVersion: unknown;
  syncRun: unknown;
  objectId?: unknown;
  normalizerVersion: unknown;
  retrievedAt: unknown;
  effectiveAt?: unknown;
}

export interface ProviderParcelDTO {
  cadastralNumber: unknown;
  geometry: ProviderParcelGeometryRaw;
  crs?: unknown;
  areaSqm?: unknown;
  addressText?: unknown;
  landUseData?: unknown;
  source: ProviderParcelSourceRaw;
  freshness?: unknown;
  contentHash?: unknown;
}

export interface ParcelParseSuccess {
  valid: true;
  parcel: import("../../domain/parcel/types").Parcel;
  warnings: import("../../domain/parcel/types").ParcelValidationError[];
}

export interface ParcelParseFailure {
  valid: false;
  errors: ParcelParseError[];
}

export type ParcelParseResult = ParcelParseSuccess | ParcelParseFailure;
