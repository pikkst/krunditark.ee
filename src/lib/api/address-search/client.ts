import { parseInAksAddressResponse } from "../../inaks-adapter/normalizer";
import type {
  AddressSearchErrorCode,
  AddressSearchResponse,
  AddressSearchSuccess,
  AddressSearchFailure,
  SearchAddressOptions,
  CachedEntry,
  AddressSearchWarning,
} from "./types";
import type { InAksParseWarning } from "../../inaks-adapter/types";

const INAKS_NORMALIZER_VERSION = "1";

function getEnvironment(): string {
  return import.meta.env.VITE_APP_ENV ?? "local";
}

async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildCacheKey(
  environment: string,
  query: string,
  kind: "address" | "adrid" | "empty"
): Promise<string> {
  const normalized = query.trim().toLowerCase();
  const queryHash = await sha256(normalized);
  return `inaks:${environment}:${INAKS_NORMALIZER_VERSION}:${kind}:${queryHash}`;
}

class AddressSearchCache {
  private cache = new Map<string, CachedEntry<AddressSearchResponse>>();

  get(key: string): AddressSearchResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: AddressSearchResponse, ttlMs: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new AddressSearchCache();

export function getAddressSearchCache(): AddressSearchCache {
  return cache;
}

function buildEdgeFunctionUrl(query: string, queryType: "address" | "adrid"): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("VITE_SUPABASE_URL is not configured");
  }
  const url = new URL(`${baseUrl}/functions/v1/address-search`);
  if (queryType === "adrid") {
    url.searchParams.set("adrid", query);
  } else {
    url.searchParams.set("q", query);
  }
  return url.toString();
}

function mapEdgeErrorCode(edgeError: string | undefined): AddressSearchErrorCode | undefined {
  if (edgeError === "ADDRESS_SEARCH_UNAVAILABLE") return "ADDRESS_SEARCH_UNAVAILABLE";
  if (edgeError === "INVALID_INPUT") return "INVALID_INPUT";
  return undefined;
}

class RequestBudget {
  private timestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }

  reset(): void {
    this.timestamps = [];
  }
}

const requestBudget = new RequestBudget(60 * 1000, 20);

function mapInAksWarning(warning: InAksParseWarning): AddressSearchWarning {
  return {
    code: warning.code,
    field: warning.field,
    message: warning.message,
  };
}

export async function searchAddress(
  query: string,
  options: SearchAddressOptions = {}
): Promise<AddressSearchResponse> {
  const trimmed = query.trim();
  const maxLength = options.maxQueryLength ?? 256;
  const queryType = options.queryType ?? "address";

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: { code: "INVALID_INPUT", message: "Query must not be empty" },
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: {
        code: "INVALID_INPUT",
        message: `Query exceeds maximum length of ${maxLength} characters`,
      },
    };
  }

  const environment = getEnvironment();
  const cacheKey = await buildCacheKey(environment, trimmed, queryType);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!requestBudget.check()) {
    return {
      valid: false,
      error: {
        code: "REQUEST_BUDGET_EXCEEDED",
        message: "Too many requests. Please wait a moment before searching again.",
      },
    };
  }

  const targetUrl = buildEdgeFunctionUrl(trimmed, queryType);

  try {
    const response = await fetch(targetUrl, {
      signal: options.signal,
    });

    if (!response.ok) {
      let edgeErrorCode: AddressSearchErrorCode | undefined;
      let errorBody: { error?: string; message?: string } = {};
      try {
        errorBody = (await response.json()) as { error?: string; message?: string };
        edgeErrorCode = mapEdgeErrorCode(errorBody.error);
      } catch {
        // ignore parse error, fall through to UPSTREAM_ERROR
      }

      const failure: AddressSearchFailure = {
        valid: false,
        error: {
          code: edgeErrorCode ?? "UPSTREAM_ERROR",
          message: edgeErrorCode
            ? (errorBody.message ?? "Address search service is unavailable")
            : `Address search returned status ${response.status}`,
        },
      };
      cache.set(cacheKey, failure, 60 * 1000);
      return failure;
    }

    const raw = await response.json();

    if (!raw.addresses || !Array.isArray(raw.addresses)) {
      const failure: AddressSearchFailure = {
        valid: false,
        error: {
          code: "PARSE_ERROR",
          message: "In-AKS response missing addresses array",
        },
      };
      cache.set(cacheKey, failure, 60 * 1000);
      return failure;
    }

    if (raw.addresses.length === 0) {
      const success: AddressSearchSuccess = {
        valid: true,
        results: [],
        warnings: [],
      };
      cache.set(cacheKey, success, 5 * 60 * 1000);
      return success;
    }

    const parsed = parseInAksAddressResponse(
      raw,
      INAKS_NORMALIZER_VERSION,
      new Date().toISOString()
    );

    if (!parsed.valid) {
      const failure: AddressSearchFailure = {
        valid: false,
        error: {
          code: "PARSE_ERROR",
          message: `In-AKS parse failed with ${parsed.errors.length} error(s)`,
        },
      };
      cache.set(cacheKey, failure, 60 * 1000);
      return failure;
    }

    const success: AddressSearchSuccess = {
      valid: true,
      results: parsed.results,
      warnings: parsed.warnings.map(mapInAksWarning),
    };

    const ttl = queryType === "adrid" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    cache.set(cacheKey, success, ttl);
    return success;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        valid: false,
        error: { code: "NETWORK_ERROR", message: "Request was cancelled" },
      };
    }
    const failure: AddressSearchFailure = {
      valid: false,
      error: {
        code: "ADDRESS_SEARCH_UNAVAILABLE",
        message: "Address search service is unavailable",
      },
    };
    cache.set(cacheKey, failure, 60 * 1000);
    return failure;
  }
}

export async function searchAddressByAdrid(
  adrid: string,
  options: Omit<SearchAddressOptions, "queryType"> = {}
): Promise<AddressSearchResponse> {
  return searchAddress(adrid, { ...options, queryType: "adrid" });
}

export function createDebouncedSearch(options: { debounceMs?: number } = {}) {
  const debounceMs = options.debounceMs ?? 300;
  let generation = 0;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingReject: ((reason: unknown) => void) | null = null;
  let activeGeneration = 0;
  let inFlightReject: ((reason: unknown) => void) | null = null;

  function cancelPending() {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    if (pendingReject) {
      pendingReject(new Error("Debounced search aborted"));
      pendingReject = null;
    }
  }

  function cancelInFlight() {
    if (inFlightReject) {
      inFlightReject(new Error("Debounced search aborted"));
      inFlightReject = null;
    }
    activeGeneration = 0;
  }

  return {
    search: (query: string, signal?: AbortSignal): Promise<AddressSearchResponse> => {
      const currentGeneration = ++generation;

      cancelPending();
      cancelInFlight();

      return new Promise<AddressSearchResponse>((resolve, reject) => {
        pendingReject = reject;

        const timerId = setTimeout(async () => {
          pendingTimer = null;
          pendingReject = null;
          activeGeneration = currentGeneration;
          inFlightReject = reject;

          try {
            const result = await searchAddress(query, { signal });
            if (currentGeneration === activeGeneration) {
              inFlightReject = null;
              resolve(result);
            }
          } catch (err) {
            if (currentGeneration === activeGeneration) {
              inFlightReject = null;
              reject(err);
            }
          }
        }, debounceMs);

        pendingTimer = timerId;

        if (signal) {
          signal.addEventListener(
            "abort",
            () => {
              if (currentGeneration === generation && pendingTimer === timerId) {
                cancelPending();
              }
            },
            { once: true }
          );
        }
      });
    },
  };
}
