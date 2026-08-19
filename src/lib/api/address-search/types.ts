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

export interface AddressSearchSuccess {
  valid: true;
  results: import("../../../domain/address-search/types").AddressSearchResult[];
  warnings: import("../../../lib/inaks-adapter/types").InAksParseWarning[];
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
