import { parseInAksAddressResponse } from "../../inaks-adapter/normalizer";
import type {
  AddressSearchResponse,
  AddressSearchSuccess,
  AddressSearchFailure,
  SearchAddressOptions,
  CachedEntry,
} from "./types";

const INAKS_NORMALIZER_VERSION = "1";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function buildCacheKey(query: string, kind: "address" | "adrid" | "empty"): string {
  const normalized = query.trim().toLowerCase();
  return `inaks:${kind}:${simpleHash(normalized)}`;
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
  const cacheKey = buildCacheKey(trimmed, isAdrid ? "adrid" : "address");
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetUrl = buildEdgeFunctionUrl(trimmed, isAdrid);

  try {
    const response = await fetch(targetUrl, {
      signal: options.signal,
    });

    if (!response.ok) {
      const failure: AddressSearchFailure = {
        valid: false,
        error: {
          code: "UPSTREAM_ERROR",
          message: `Address search returned status ${response.status}`,
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
  let latestResolve: ((value: AddressSearchResponse) => void) | null = null;
  let latestReject: ((reason: unknown) => void) | null = null;

  return {
    search: (query: string, signal?: AbortSignal): Promise<AddressSearchResponse> => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        latestReject?.(new Error("Debounced search cancelled by new query"));
      }

      return new Promise<AddressSearchResponse>((resolve, reject) => {
        latestResolve = resolve;
        latestReject = reject;

        timeoutId = setTimeout(async () => {
          try {
            const result = await searchAddress(query, { signal });
            latestResolve?.(result);
          } catch (err) {
            latestReject?.(err);
          } finally {
            timeoutId = null;
            latestResolve = null;
            latestReject = null;
          }
        }, debounceMs);
      });
    },
    cancel: (): void => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        latestReject?.(new Error("Debounced search cancelled"));
        timeoutId = null;
        latestResolve = null;
        latestReject = null;
      }
    },
  };
}
