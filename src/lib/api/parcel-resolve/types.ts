export type ParcelResolveErrorCode =
  | "INVALID_INPUT"
  | "PARCEL_NOT_FOUND"
  | "SOURCE_UNAVAILABLE"
  | "PARSE_ERROR"
  | "NETWORK_ERROR"
  | "CONFIG_ERROR";

export interface ParcelResolveError {
  code: ParcelResolveErrorCode;
  message: string;
}

export interface ParcelResolveCandidateSource {
  id: string;
  datasetVersionId: string;
  retrievedAt: string;
}

export interface ParcelResolveCandidate {
  cadastralId: string;
  address: string;
  areaM2: number;
  geometry: unknown;
  source: ParcelResolveCandidateSource;
}

export interface ParcelResolveSuccess {
  valid: true;
  status: "resolved" | "ambiguous";
  candidates: ParcelResolveCandidate[];
}

export interface ParcelResolveFailure {
  valid: false;
  error: ParcelResolveError;
}

export type ParcelResolveResponse = ParcelResolveSuccess | ParcelResolveFailure;

export interface ResolveParcelByCadastralIdInput {
  cadastralId: string;
}

export interface ResolveParcelByAddressResultInput {
  addressResultId: string;
  addressId: string;
}

export interface ResolveParcelByPointInput {
  point: {
    type: "Point";
    coordinates: [number, number];
  };
}

export type ResolveParcelInput =
  | ResolveParcelByCadastralIdInput
  | ResolveParcelByAddressResultInput
  | ResolveParcelByPointInput;
