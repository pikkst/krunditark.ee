import type { Parcel } from "../../../domain/parcel/types";

export type ParcelResolveSelector =
  | { type: "cadastral"; cadastralId: string }
  | { type: "address"; addressResultId: string; addressId: string }
  | { type: "point"; point: { lat: number; lng: number } };

export interface ParcelResolveRequest {
  selector: ParcelResolveSelector;
}

export type ParcelResolveStatus =
  "resolved" | "ambiguous" | "not_found" | "unavailable" | "invalid_source";

export interface ParcelResolveResponse {
  status: ParcelResolveStatus;
  candidates: Parcel[];
}

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
  | "CONFIG_ERROR"
  | "INVALID_SOURCE";

export interface ParcelResolveError {
  code: ParcelResolveErrorCode;
  message: string;
}

export interface ParcelResolveSuccess {
  valid: true;
  response: ParcelResolveResponse;
}

export interface ParcelResolveFailure {
  valid: false;
  error: ParcelResolveError;
}

export type ParcelResolveClientResult = ParcelResolveSuccess | ParcelResolveFailure;
