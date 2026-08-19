import { useEffect, useRef, useState, useCallback } from "react";
import { createDebouncedSearch } from "./index";
import type { AddressSearchSuccess, AddressSearchFailure } from "./index";

export interface UseAddressSearchOptions {
  debounceMs?: number;
  maxQueryLength?: number;
}

export interface UseAddressSearchResult {
  results: AddressSearchSuccess["results"];
  error: AddressSearchFailure["error"] | null;
  isLoading: boolean;
  clear: () => void;
}

export function useAddressSearch(
  query: string,
  options: UseAddressSearchOptions = {}
): UseAddressSearchResult {
  const debounceMs = options.debounceMs ?? 300;
  const maxQueryLength = options.maxQueryLength ?? 256;

  const trimmed = query.trim();
  const isEmpty = trimmed.length === 0;
  const isTooLong = trimmed.length > maxQueryLength;

  const [state, setState] = useState<{
    results: AddressSearchSuccess["results"];
    error: AddressSearchFailure["error"] | null;
    isLoading: boolean;
  }>({
    results: [],
    error: null,
    isLoading: false,
  });

  const debouncedRef = useRef(createDebouncedSearch({ debounceMs }));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    debouncedRef.current = createDebouncedSearch({ debounceMs });
  }, [debounceMs]);

  useEffect(() => {
    if (isEmpty || isTooLong) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const controller = new AbortController();
    abortRef.current = controller;

    const debounced = debouncedRef.current;
    debounced.search(trimmed, controller.signal).then(
      (response) => {
        if (response.valid) {
          setState({
            results: response.results,
            error: null,
            isLoading: false,
          });
        } else {
          setState({
            results: [],
            error: response.error,
            isLoading: false,
          });
        }
      },
      () => {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    );

    return () => {
      controller.abort();
    };
  }, [query, trimmed, isEmpty, isTooLong]);

  const clear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setState({ results: [], error: null, isLoading: false });
  }, []);

  if (isEmpty) {
    return { results: [], error: null, isLoading: false, clear };
  }

  if (isTooLong) {
    return {
      results: [],
      error: {
        code: "INVALID_INPUT",
        message: `Query exceeds maximum length of ${maxQueryLength} characters`,
      },
      isLoading: false,
      clear,
    };
  }

  return { ...state, clear };
}
