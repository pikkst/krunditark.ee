import { parseInAksAddressResponse } from "../../inaks-adapter/normalizer";
import type {
  AddressSearchErrorCode,
  AddressSearchResponse,
  AddressSearchSuccess,
  AddressSearchFailure,
  SearchAddressOptions,
  CachedEntry,
} from "./types";

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

function buildEdgeFunctionUrl(query: string, isAdrid: boolean): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("VITE_SUPABASE_URL is not configured");
  }
  const url = new URL(`${baseUrl}/functions/v1/address-search`);
  if (isAdrid) {
    url.searchParams.set("adrid", query);
  } else {
    url.searchParams.set("q", query);
  }
  return url.toString();
}

export async function searchAddress(
  query: string,
  options: SearchAddressOptions = {}
): Promise<AddressSearchResponse> {
  const trimmed = query.trim();
  const maxLength = options.maxQueryLength ?? 256;

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

  const isAdrid = /^\d+$/.test(trimmed);
  const environment = getEnvironment();
  const cacheKey = await buildCacheKey(environment, trimmed, isAdrid ? "adrid" : "address");
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetUrl = buildEdgeFunctionUrl(trimmed, isAdrid);

  try {
    const response = await fetch(targetUrl, {
      signal: options.signal,
    });

    if (!response.ok) {
      let edgeErrorCode: AddressSearchErrorCode | undefined;
      try {
        const errorBody = (await response.json()) as { error?: { code?: string } };
        if (errorBody.error?.code && errorBody.error.code === "ADDRESS_SEARCH_UNAVAILABLE") {
          edgeErrorCode = "ADDRESS_SEARCH_UNAVAILABLE";
        }
      } catch {
        // ignore parse error, fall through to UPSTREAM_ERROR
      }

      const failure: AddressSearchFailure = {
        valid: false,
        error: {
          code: edgeErrorCode ?? "UPSTREAM_ERROR",
          message: edgeErrorCode
            ? "Address search service is unavailable"
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
      warnings: parsed.warnings,
    };

    const ttl = isAdrid ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
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

export function createDebouncedSearch(options: { debounceMs?: number } = {}) {
  const debounceMs = options.debounceMs ?? 300;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let currentReject: ((reason: unknown) => void) | null = null;

  return {
    search: (query: string, signal?: AbortSignal): Promise<AddressSearchResponse> => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        currentReject?.(new Error("Debounced search aborted"));
      }

      return new Promise<AddressSearchResponse>((resolve, reject) => {
        currentReject = reject;

        timeoutId = setTimeout(async () => {
          timeoutId = null;
          currentReject = null;

          try {
            const result = await searchAddress(query, { signal });
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }, debounceMs);

        if (signal) {
          signal.addEventListener(
            "abort",
            () => {
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              currentReject = null;
              reject(new Error("Debounced search aborted"));
            },
            { once: true }
          );
        }
      });
    },
  };
}
