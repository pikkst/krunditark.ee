import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAddressSearch } from "../../lib/api/address-search/useAddressSearch";
import {
  resolveParcelByAddressResult,
  resolveParcelByCadastralId,
  type ParcelResolveError,
  type ParcelResolveSuccess,
  type ParcelResolveFailure,
} from "../../lib/api/parcel-resolve";
import type { Parcel } from "../../domain/parcel/types";
import type { AddressSearchResult } from "../../domain/address-search/types";
import { validateCadastralId } from "../../domain/parcel/types";
import "./ParcelSearch.css";

export interface ParcelSearchProps {
  onParcelResolved: (parcel: Parcel) => void;
  onAmbiguousResolve: (candidates: Parcel[]) => void;
  onMapSelectRequested?: () => void;
}

type ResolveStatus = "idle" | "resolved" | "ambiguous" | "not_found" | "unavailable" | "invalid";

interface CadastralValidation {
  isCadastral: boolean;
  isInvalidCadastral: boolean;
  normalized: string;
  validationError?: { code: string; message: string };
}

export default function ParcelSearch({
  onParcelResolved,
  onAmbiguousResolve,
  onMapSelectRequested,
}: ParcelSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState<ParcelResolveError | null>(null);
  const [resolveStatus, setResolveStatus] = useState<ResolveStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);

  const {
    results: addressResults,
    error: addressError,
    isLoading: isAddressLoading,
    clear: clearAddressSearch,
  } = useAddressSearch(query, { debounceMs: 300 });

  const listboxRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cadastralValidation = useMemo((): CadastralValidation => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return { isCadastral: false, isInvalidCadastral: false, normalized: "" };
    }
    const result = validateCadastralId(trimmed);
    if (result.valid && result.normalized && result.normalized.length === 12) {
      return { isCadastral: true, isInvalidCadastral: false, normalized: result.normalized };
    }
    if (/^[0-9:\-\.\s]+$/.test(trimmed)) {
      return {
        isCadastral: false,
        isInvalidCadastral: true,
        normalized: "",
        validationError: result.errors[0],
      };
    }
    return { isCadastral: false, isInvalidCadastral: false, normalized: "" };
  }, [query]);

  const showAutocomplete = useMemo(() => {
    return (
      isFocused &&
      !cadastralValidation.isCadastral &&
      !cadastralValidation.isInvalidCadastral &&
      query.trim().length > 0
    );
  }, [isFocused, cadastralValidation.isCadastral, cadastralValidation.isInvalidCadastral, query]);

  const displayAddressResults = useMemo(() => {
    if (!showAutocomplete) return [];
    return addressResults.filter(
      (r) => r.objectType === "cadastral_unit" || r.objectType === "building"
    );
  }, [showAutocomplete, addressResults]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const handleResolveResult = useCallback(
    (result: ParcelResolveSuccess | ParcelResolveFailure) => {
      if (result.valid) {
        if (result.response.status === "resolved" && result.response.candidates.length === 1) {
          setResolveStatus("resolved");
          onParcelResolved(result.response.candidates[0]);
        } else if (result.response.status === "ambiguous") {
          setResolveStatus("ambiguous");
          onAmbiguousResolve(result.response.candidates);
        } else if (result.response.status === "not_found") {
          setResolveStatus("not_found");
        } else if (result.response.status === "unavailable") {
          setResolveStatus("unavailable");
        } else if (result.response.status === "invalid_source") {
          setResolveStatus("unavailable");
        } else {
          setResolveStatus("not_found");
        }
      } else {
        if (result.error.code === "INVALID_CADASTRAL_ID" || result.error.code === "INVALID_INPUT") {
          setResolveStatus("invalid");
        } else if (
          result.error.code === "SOURCE_TIMEOUT" ||
          result.error.code === "PARCEL_UNAVAILABLE" ||
          result.error.code === "NETWORK_ERROR" ||
          result.error.code === "CONFIG_ERROR" ||
          result.error.code === "UPSTREAM_ERROR" ||
          result.error.code === "PARSE_ERROR"
        ) {
          setResolveStatus("unavailable");
        } else {
          setResolveStatus("not_found");
        }
        setResolveError({ ...result.error, message: t(`parcelSearch.error.${result.error.code}`) });
      }
    },
    [onParcelResolved, onAmbiguousResolve, t]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length === 0) return;

      setIsSubmitting(true);
      setResolveError(null);
      setResolveStatus("idle");
      setActiveIndex(-1);

      const currentAddressError = addressError;
      const currentDisplayResults = displayAddressResults;

      clearAddressSearch();

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (cadastralValidation.isCadastral) {
          const result = await resolveParcelByCadastralId(cadastralValidation.normalized);
          handleResolveResult(result);
        } else if (cadastralValidation.isInvalidCadastral) {
          setResolveStatus("invalid");
          setResolveError({
            code: "INVALID_INPUT",
            message: t("parcelSearch.invalid"),
          });
        } else {
          if (currentDisplayResults[0]) {
            const result = await resolveParcelByAddressResult(
              currentDisplayResults[0].id,
              currentDisplayResults[0].addressId
            );
            handleResolveResult(result);
          } else if (currentAddressError !== null) {
            if (currentAddressError.code === "INVALID_INPUT") {
              setResolveStatus("invalid");
              setResolveError({
                code: "INVALID_INPUT",
                message: t("parcelSearch.invalid"),
              });
            } else {
              setResolveStatus("unavailable");
              setResolveError({
                code: "PARCEL_UNAVAILABLE",
                message: t("parcelSearch.unavailable"),
              });
            }
          } else {
            setResolveStatus("not_found");
          }
        }
      } catch {
        setResolveStatus("unavailable");
        setResolveError({
          code: "PARCEL_UNAVAILABLE",
          message: t("parcelSearch.resolutionUnavailable"),
        });
      } finally {
        setIsSubmitting(false);
        abortRef.current = null;
      }
    },
    [
      query,
      cadastralValidation,
      displayAddressResults,
      addressError,
      clearAddressSearch,
      handleResolveResult,
      t,
    ]
  );

  const handleAddressSelect = useCallback(
    async (address: AddressSearchResult) => {
      setQuery(address.label);
      setIsFocused(false);
      setResolveError(null);
      setResolveStatus("idle");
      setActiveIndex(-1);
      clearAddressSearch();

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSubmitting(true);

      try {
        const result = await resolveParcelByAddressResult(address.id, address.addressId);
        handleResolveResult(result);
      } catch {
        setResolveStatus("unavailable");
        setResolveError({
          code: "PARCEL_UNAVAILABLE",
          message: t("parcelSearch.resolutionUnavailable"),
        });
      } finally {
        setIsSubmitting(false);
        abortRef.current = null;
      }
    },
    [clearAddressSearch, handleResolveResult, t]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showAutocomplete || displayAddressResults.length === 0) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev < displayAddressResults.length - 1 ? prev + 1 : 0;
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev > 0 ? prev - 1 : displayAddressResults.length - 1;
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < displayAddressResults.length) {
          handleAddressSelect(displayAddressResults[activeIndex]);
        } else {
          handleSubmit(e);
        }
      } else if (e.key === "Escape") {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    },
    [showAutocomplete, displayAddressResults, activeIndex, handleAddressSelect, handleSubmit]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setResolveError(null);
    setResolveStatus("idle");
    setActiveIndex(-1);
  }, []);

  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      if (!listboxRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 150);
  }, []);

  const handleMapSelect = useCallback(() => {
    onMapSelectRequested?.();
  }, [onMapSelectRequested]);

  const showResults = showAutocomplete && !isAddressLoading && displayAddressResults.length > 0;
  const showNoMatch = !isSubmitting && resolveStatus === "not_found" && query.trim().length > 0;
  const showUnavailable =
    !isSubmitting && resolveStatus === "unavailable" && query.trim().length > 0;
  const showInvalid = !isSubmitting && resolveStatus === "invalid" && query.trim().length > 0;
  const showAddressUnavailable =
    showAutocomplete &&
    !isAddressLoading &&
    addressError !== null &&
    addressError.code !== "INVALID_INPUT";
  const showAddressInvalid =
    showAutocomplete &&
    !isAddressLoading &&
    addressError !== null &&
    addressError.code === "INVALID_INPUT";

  const listboxId = "parcel-search-listbox";
  const activeId = activeIndex >= 0 ? `parcel-search-option-${activeIndex}` : undefined;

  return (
    <form className="parcel-search" onSubmit={handleSubmit} noValidate>
      <label className="parcel-search__label" htmlFor="parcel-search-input">
        {t("parcelSearch.label")}
      </label>
      <div className="parcel-search__input-wrap">
        <input
          ref={inputRef}
          id="parcel-search-input"
          type="text"
          className="parcel-search__input"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={t("parcelSearch.placeholder")}
          role="combobox"
          aria-autocomplete={showAutocomplete ? "list" : "none"}
          aria-expanded={showAutocomplete && displayAddressResults.length > 0}
          aria-controls={
            showAutocomplete && displayAddressResults.length > 0 ? listboxId : undefined
          }
          aria-activedescendant={activeId}
          aria-describedby={
            showNoMatch
              ? "parcel-search-no-match"
              : showUnavailable
                ? "parcel-search-unavailable"
                : showInvalid
                  ? "parcel-search-invalid"
                  : showAddressUnavailable
                    ? "parcel-search-address-unavailable"
                    : showAddressInvalid
                      ? "parcel-search-address-invalid"
                      : undefined
          }
          autoComplete="off"
        />
        <button
          type="submit"
          className="parcel-search__button"
          disabled={isSubmitting || query.trim().length === 0}
        >
          {isSubmitting ? t("parcelSearch.loading") : t("parcelSearch.searchButton")}
        </button>
      </div>

      {showResults && (
        <ul ref={listboxRef} id={listboxId} className="parcel-search__listbox" role="listbox">
          {displayAddressResults.map((result: AddressSearchResult, index: number) => (
            <li
              key={result.id}
              id={`parcel-search-option-${index}`}
              className="parcel-search__option"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddressSelect(result);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="parcel-search__option-label">{result.label}</span>
              {result.cadastralId && (
                <span className="parcel-search__option-meta">{result.cadastralId}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {showNoMatch && (
        <p
          id="parcel-search-no-match"
          className="parcel-search__status parcel-search__status--error"
        >
          {t("parcelSearch.noMatch")}
        </p>
      )}

      {showUnavailable && (
        <p
          id="parcel-search-unavailable"
          className="parcel-search__status parcel-search__status--error"
        >
          {resolveError?.message ?? t("parcelSearch.unavailable")}
        </p>
      )}

      {showInvalid && (
        <p
          id="parcel-search-invalid"
          className="parcel-search__status parcel-search__status--error"
        >
          {resolveError?.message ?? t("parcelSearch.invalid")}
        </p>
      )}

      {showAddressUnavailable && (
        <p
          id="parcel-search-address-unavailable"
          className="parcel-search__status parcel-search__status--error"
        >
          {t("parcelSearch.addressSearchUnavailable")}
        </p>
      )}

      {showAddressInvalid && (
        <p
          id="parcel-search-address-invalid"
          className="parcel-search__status parcel-search__status--error"
        >
          {t("parcelSearch.invalid")}
        </p>
      )}

      <button type="button" className="parcel-search__map-button" onClick={handleMapSelect}>
        {t("parcelSearch.mapSelect")}
      </button>
    </form>
  );
}
