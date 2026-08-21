import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { searchAddress } from "../../lib/api/address-search";
import {
  resolveParcelByAddressResult,
  resolveParcelByCadastralId,
  type ParcelResolveError,
  type ParcelResolveSuccess,
  type ParcelResolveFailure,
} from "../../lib/api/parcel-resolve";
import type { Parcel } from "../../domain/parcel/types";
import type { AddressSearchResult } from "../../domain/address-search/types";
import type { AddressSearchError } from "../../lib/api/address-search/types";
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

const AUTOCOMPLETE_MIN_LENGTH = 3;

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

  const [addressResults, setAddressResults] = useState<AddressSearchResult[]>([]);
  const [addressError, setAddressError] = useState<AddressSearchError | null>(null);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listboxRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const addressGenerationRef = useRef(0);

  const trimmedQuery = query.trim();
  const cadastralValidation = useMemo((): CadastralValidation => {
    if (trimmedQuery.length === 0) {
      return { isCadastral: false, isInvalidCadastral: false, normalized: "" };
    }
    const result = validateCadastralId(trimmedQuery);
    if (result.valid && result.normalized && result.normalized.length === 12) {
      return { isCadastral: true, isInvalidCadastral: false, normalized: result.normalized };
    }
    const looksLikeCadastralAttempt = /^\d{5}[:\.\-]/.test(trimmedQuery);
    if (looksLikeCadastralAttempt && !result.valid) {
      return {
        isCadastral: false,
        isInvalidCadastral: true,
        normalized: "",
        validationError: result.errors[0],
      };
    }
    return { isCadastral: false, isInvalidCadastral: false, normalized: "" };
  }, [trimmedQuery]);

  const showAutocomplete = useMemo(() => {
    return (
      isFocused &&
      !cadastralValidation.isCadastral &&
      !cadastralValidation.isInvalidCadastral &&
      trimmedQuery.length >= AUTOCOMPLETE_MIN_LENGTH &&
      addressResults.length > 0
    );
  }, [
    isFocused,
    cadastralValidation.isCadastral,
    cadastralValidation.isInvalidCadastral,
    trimmedQuery,
    addressResults.length,
  ]);

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
      if (trimmedQuery.length === 0) return;

      const currentGeneration = ++generationRef.current;
      const currentAddressGeneration = ++addressGenerationRef.current;

      setIsSubmitting(true);
      setResolveError(null);
      setResolveStatus("idle");
      setActiveIndex(-1);
      setAddressResults([]);
      setAddressError(null);

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (cadastralValidation.isCadastral) {
          if (currentGeneration !== generationRef.current) return;
          const result = await resolveParcelByCadastralId(cadastralValidation.normalized);
          if (currentGeneration !== generationRef.current) return;
          handleResolveResult(result);
        } else if (cadastralValidation.isInvalidCadastral) {
          setResolveStatus("invalid");
          setResolveError({
            code: "INVALID_INPUT",
            message: t("parcelSearch.invalid"),
          });
        } else if (trimmedQuery.length < AUTOCOMPLETE_MIN_LENGTH) {
          setResolveStatus("invalid");
          setResolveError({
            code: "INVALID_INPUT",
            message: t("parcelSearch.invalid"),
          });
        } else {
          setIsAddressLoading(true);
          const response = await searchAddress(trimmedQuery, { signal: controller.signal });
          if (currentAddressGeneration !== addressGenerationRef.current) {
            setIsAddressLoading(false);
            return;
          }
          setIsAddressLoading(false);

          if (!response.valid) {
            if (response.error.code === "INVALID_INPUT") {
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
            return;
          }

          const filtered = response.results.filter(
            (r) => r.objectType === "cadastral_unit" || r.objectType === "building"
          );
          setAddressResults(filtered);

          if (filtered.length === 0) {
            setResolveStatus("not_found");
          } else if (filtered.length === 1) {
            if (currentGeneration !== generationRef.current) return;
            const result = await resolveParcelByAddressResult(
              filtered[0].id,
              filtered[0].addressId
            );
            if (currentGeneration !== generationRef.current) return;
            handleResolveResult(result);
          } else {
            setResolveStatus("idle");
            inputRef.current?.focus();
          }
        }
      } catch {
        setIsAddressLoading(false);
        setResolveStatus("unavailable");
        setResolveError({
          code: "PARCEL_UNAVAILABLE",
          message: t("parcelSearch.resolutionUnavailable"),
        });
      } finally {
        if (currentGeneration === generationRef.current) {
          setIsSubmitting(false);
          abortRef.current = null;
        }
      }
    },
    [trimmedQuery, cadastralValidation, handleResolveResult, t]
  );

  const handleAddressSelect = useCallback(
    async (address: AddressSearchResult) => {
      const currentGeneration = ++generationRef.current;

      setQuery(address.label);
      setIsFocused(false);
      setResolveError(null);
      setResolveStatus("idle");
      setActiveIndex(-1);
      setAddressResults([]);

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSubmitting(true);

      try {
        const result = await resolveParcelByAddressResult(address.id, address.addressId);
        if (currentGeneration !== generationRef.current) return;
        handleResolveResult(result);
      } catch {
        setResolveStatus("unavailable");
        setResolveError({
          code: "PARCEL_UNAVAILABLE",
          message: t("parcelSearch.resolutionUnavailable"),
        });
      } finally {
        if (currentGeneration === generationRef.current) {
          setIsSubmitting(false);
          abortRef.current = null;
        }
      }
    },
    [handleResolveResult, t]
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
    const value = e.target.value;
    setQuery(value);
    setResolveError(null);
    setResolveStatus("idle");
    setActiveIndex(-1);
    setAddressResults([]);
    setAddressError(null);

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    ++generationRef.current;
    ++addressGenerationRef.current;

    setIsSubmitting(false);
    setIsAddressLoading(false);
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
      </div>

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
