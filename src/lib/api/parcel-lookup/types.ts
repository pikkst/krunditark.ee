export type ParcelLookupErrorCode =
  | "INVALID_INPUT"
  | "INVALID_CADASTRAL_ID"
  | "PARCEL_NOT_FOUND"
  | "AMBIGUOUS_RESULT"
  | "UPSTREAM_ERROR"
  | "PARSE_ERROR"
  | "SOURCE_TIMEOUT"
  | "PARCEL_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "CONFIG_ERROR";

export interface ParcelLookupError {
  code: ParcelLookupErrorCode;
  message: string;
}

export interface ParcelGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface ParcelFacts {
  areaM2Computed: number;
  addressText?: string;
  landUseData?: Record<string, unknown>;
}

export interface ParcelSource {
  sourceId: string;
  sourceDatasetVersionId: string;
  sourceSyncRunId: string;
  sourceObjectId?: string;
  normalizerVersion: string;
  retrievedAt: string;
  sourceEffectiveAt?: string;
}

export interface ParcelLookupParcel {
  id: string;
  cadastralId: string;
  geometry: ParcelGeometry;
  geometryCrs: string;
  facts: ParcelFacts;
  source: ParcelSource;
  freshnessState: string;
  contentHash: string;
}

export interface ParcelLookupSuccess {
  valid: true;
  parcel: ParcelLookupParcel;
  retrievedAt: string;
  sourceVersion: string;
}

export interface ParcelLookupFailure {
  valid: false;
  error: ParcelLookupError;
}

export type ParcelLookupResponse = ParcelLookupSuccess | ParcelLookupFailure;
