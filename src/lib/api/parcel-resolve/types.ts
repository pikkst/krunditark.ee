export type ParcelResolveErrorCode =
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

export interface ParcelResolveError {
  code: ParcelResolveErrorCode;
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

export interface ParcelResolveParcel {
  id: string;
  cadastralId: string;
  geometry: ParcelGeometry;
  geometryCrs: string;
  facts: ParcelFacts;
  source: ParcelSource;
  freshnessState: string;
  contentHash: string;
}

export interface ParcelResolveSuccess {
  valid: true;
  parcel: ParcelResolveParcel;
  retrievedAt: string;
  sourceVersion: string;
}

export interface ParcelResolveFailure {
  valid: false;
  error: ParcelResolveError;
}

export type ParcelResolveResponse = ParcelResolveSuccess | ParcelResolveFailure;
