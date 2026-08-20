export type AddressSearchErrorCode =
  | "INVALID_INPUT"
  | "ADDRESS_SEARCH_UNAVAILABLE"
  | "UPSTREAM_ERROR"
  | "PARSE_ERROR"
  | "NETWORK_ERROR";

export interface AddressSearchError {
  code: AddressSearchErrorCode;
  message: string;
}

export type AddressSearchWarningCode = "NON_CURRENT_OBJECT";

export interface AddressSearchWarning {
  code: AddressSearchWarningCode;
  field?: string;
  message: string;
}

export interface AddressSearchSuccess {
  valid: true;
  results: import("../../../domain/address-search/types").AddressSearchResult[];
  warnings: AddressSearchWarning[];
}

export interface AddressSearchFailure {
  valid: false;
  error: AddressSearchError;
}

export type AddressSearchResponse = AddressSearchSuccess | AddressSearchFailure;

export interface SearchAddressOptions {
  debounceMs?: number;
  maxQueryLength?: number;
  signal?: AbortSignal;
  queryType?: "address" | "adrid";
}

export interface CachedEntry<T> {
  value: T;
  expiresAt: number;
}
