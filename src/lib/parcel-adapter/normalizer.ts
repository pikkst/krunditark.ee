import type { Parcel, FreshnessState, ParcelGeometry } from "../../domain/parcel/types";
import {
  normalizeCadastralId,
  isValidCadastralId,
  validateParcel,
} from "../../domain/parcel/types";
import type { ParcelParseError, ParcelParseErrorCode, ParcelParseResult } from "./types";

const SUPPORTED_CRS = new Set(["EPSG:3301", "EPSG:4326"]);

const VALID_FRESHNESS_STATES = new Set<FreshnessState>(["fresh", "warning", "stale", "unknown"]);

interface CoordinateBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const SUPPORTED_CRS_BOUNDS: Record<string, CoordinateBounds> = {
  "EPSG:4326": { minX: -180, maxX: 180, minY: -90, maxY: 90 },
  "EPSG:3301": { minX: 200000, maxX: 900000, minY: 6300000, maxY: 7800000 },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseError(code: ParcelParseErrorCode, field: string, message: string): ParcelParseError {
  return { code, field, message };
}

function validatePosition(
  position: unknown,
  path: string,
  bounds: CoordinateBounds
): ParcelParseError | undefined {
  if (!Array.isArray(position) || position.length < 2) {
    return parseError("INVALID_COORDINATES", path, "position must have at least x and y");
  }
  if (!isFiniteNumber(position[0])) {
    return parseError("INVALID_COORDINATES", `${path}[0]`, "coordinate must be a finite number");
  }
  if (!isFiniteNumber(position[1])) {
    return parseError("INVALID_COORDINATES", `${path}[1]`, "coordinate must be a finite number");
  }
  if (position[0] < bounds.minX || position[0] > bounds.maxX) {
    return parseError(
      "INVALID_COORDINATES",
      `${path}[0]`,
      `coordinate x out of valid range [${bounds.minX}, ${bounds.maxX}]`
    );
  }
  if (position[1] < bounds.minY || position[1] > bounds.maxY) {
    return parseError(
      "INVALID_COORDINATES",
      `${path}[1]`,
      `coordinate y out of valid range [${bounds.minY}, ${bounds.maxY}]`
    );
  }
  return undefined;
}

function validateRing(
  ring: unknown,
  path: string,
  bounds: CoordinateBounds
): ParcelParseError | undefined {
  if (!Array.isArray(ring) || ring.length < 4) {
    return parseError("INVALID_COORDINATES", path, "ring must have at least 4 positions");
  }
  for (let i = 0; i < ring.length; i++) {
    const positionError = validatePosition(ring[i], `${path}[${i}]`, bounds);
    if (positionError) {
      return positionError;
    }
  }
  const first = ring[0] as number[];
  const last = ring[ring.length - 1] as number[];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return parseError("INVALID_COORDINATES", path, "ring is not closed");
  }
  return undefined;
}

function validatePolygonCoordinates(
  coordinates: unknown,
  path: string,
  bounds: CoordinateBounds
): ParcelParseError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return parseError("INVALID_COORDINATES", path, "coordinates must not be empty");
  }
  for (let i = 0; i < coordinates.length; i++) {
    const ringError = validateRing(coordinates[i], `${path}[${i}]`, bounds);
    if (ringError) {
      return ringError;
    }
  }
  return undefined;
}

function validateMultiPolygonCoordinates(
  coordinates: unknown,
  path: string,
  bounds: CoordinateBounds
): ParcelParseError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return parseError("INVALID_COORDINATES", path, "coordinates must not be empty");
  }
  for (let i = 0; i < coordinates.length; i++) {
    const polygon = coordinates[i];
    if (!Array.isArray(polygon) || polygon.length === 0) {
      return parseError(
        "INVALID_COORDINATES",
        `${path}[${i}]`,
        "polygon must have at least one ring"
      );
    }
    for (let j = 0; j < polygon.length; j++) {
      const ringError = validateRing(polygon[j], `${path}[${i}][${j}]`, bounds);
      if (ringError) {
        return ringError;
      }
    }
  }
  return undefined;
}

function validateCoordinates(
  coordinates: unknown,
  geometryType: string,
  crs: string
): ParcelParseError | undefined {
  const bounds = SUPPORTED_CRS_BOUNDS[crs];
  if (!bounds) {
    return undefined;
  }

  if (geometryType === "Polygon") {
    return validatePolygonCoordinates(coordinates, "geometry.coordinates", bounds);
  }
  if (geometryType === "MultiPolygon") {
    return validateMultiPolygonCoordinates(coordinates, "geometry.coordinates", bounds);
  }
  return undefined;
}

function isValidTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function parseProviderParcel(payload: unknown): ParcelParseResult {
  const errors: ParcelParseError[] = [];

  if (!isObject(payload)) {
    return {
      valid: false,
      errors: [parseError("PAYLOAD_NOT_OBJECT", "", "payload must be a non-null object")],
    };
  }

  const raw = payload as Record<string, unknown>;

  const rawCadastral = raw.cadastralNumber;
  if (!isString(rawCadastral) || rawCadastral.trim().length === 0) {
    errors.push(
      parseError(
        "MISSING_CADASTRAL_NUMBER",
        "cadastralNumber",
        "cadastralNumber is required and must be a non-empty string"
      )
    );
  } else {
    const normalizedCadastral = normalizeCadastralId(rawCadastral);
    if (!isValidCadastralId(normalizedCadastral)) {
      errors.push(
        parseError(
          "INVALID_CADASTRAL_NUMBER",
          "cadastralNumber",
          "cadastralNumber has invalid format"
        )
      );
    }
  }

  const rawGeometry = raw.geometry;
  if (!isObject(rawGeometry)) {
    errors.push(parseError("MISSING_GEOMETRY", "geometry", "geometry is required"));
  } else {
    const typedGeometry = rawGeometry as Record<string, unknown>;
    const rawType = typedGeometry.type;
    if (!isString(rawType) || (rawType !== "Polygon" && rawType !== "MultiPolygon")) {
      errors.push(
        parseError(
          "INVALID_GEOMETRY_TYPE",
          "geometry.type",
          "geometry type must be Polygon or MultiPolygon"
        )
      );
    }
    const rawCoordinates = typedGeometry.coordinates;
    if (!isObject(rawCoordinates) && !Array.isArray(rawCoordinates)) {
      errors.push(
        parseError(
          "MISSING_COORDINATES",
          "geometry.coordinates",
          "geometry.coordinates is required"
        )
      );
    }
  }

  const rawCrs = raw.crs;
  if (!isString(rawCrs) || rawCrs.trim().length === 0) {
    errors.push(parseError("MISSING_CRS", "crs", "crs is required and must be a non-empty string"));
  } else if (!SUPPORTED_CRS.has(rawCrs as string)) {
    errors.push(parseError("UNSUPPORTED_CRS", "crs", "crs is not a supported CRS"));
  }

  if (raw.areaSqm !== undefined && raw.areaSqm !== null && !isFiniteNumber(raw.areaSqm)) {
    errors.push(parseError("NON_FINITE_NUMERIC", "areaSqm", "areaSqm must be a finite number"));
  }

  const rawSource = raw.source;
  if (!isObject(rawSource)) {
    errors.push(parseError("MISSING_SOURCE", "source", "source is required"));
  } else {
    const typedSource = rawSource as Record<string, unknown>;
    const rawSourceId = typedSource.id;
    if (!isString(rawSourceId) || rawSourceId.trim().length === 0) {
      errors.push(
        parseError(
          "MISSING_SOURCE_ID",
          "source.id",
          "source.id is required and must be a non-empty string"
        )
      );
    }

    const rawDatasetVersion = typedSource.datasetVersion;
    if (!isString(rawDatasetVersion) || rawDatasetVersion.trim().length === 0) {
      errors.push(
        parseError(
          "MISSING_DATASET_VERSION",
          "source.datasetVersion",
          "source.datasetVersion is required and must be a non-empty string"
        )
      );
    }

    const rawSyncRun = typedSource.syncRun;
    if (!isString(rawSyncRun) || rawSyncRun.trim().length === 0) {
      errors.push(
        parseError(
          "MISSING_SYNC_RUN",
          "source.syncRun",
          "source.syncRun is required and must be a non-empty string"
        )
      );
    }

    const rawNormalizerVersion = typedSource.normalizerVersion;
    if (!isString(rawNormalizerVersion) || rawNormalizerVersion.trim().length === 0) {
      errors.push(
        parseError(
          "MISSING_NORMALIZER_VERSION",
          "source.normalizerVersion",
          "source.normalizerVersion is required and must be a non-empty string"
        )
      );
    }

    const rawRetrievedAt = typedSource.retrievedAt;
    if (!isString(rawRetrievedAt) || rawRetrievedAt.trim().length === 0) {
      errors.push(
        parseError(
          "MISSING_RETRIEVED_AT",
          "source.retrievedAt",
          "source.retrievedAt is required and must be a non-empty string"
        )
      );
    } else if (!isValidTimestamp(rawRetrievedAt)) {
      errors.push(
        parseError(
          "INVALID_TIMESTAMP",
          "source.retrievedAt",
          "source.retrievedAt must be a valid ISO timestamp"
        )
      );
    }

    const rawEffectiveAt = typedSource.effectiveAt;
    if (rawEffectiveAt !== undefined && rawEffectiveAt !== null) {
      if (!isString(rawEffectiveAt) || rawEffectiveAt.trim().length === 0) {
        errors.push(
          parseError(
            "INVALID_TIMESTAMP",
            "source.effectiveAt",
            "source.effectiveAt must be a valid ISO timestamp when provided"
          )
        );
      } else if (!isValidTimestamp(rawEffectiveAt)) {
        errors.push(
          parseError(
            "INVALID_TIMESTAMP",
            "source.effectiveAt",
            "source.effectiveAt must be a valid ISO timestamp"
          )
        );
      }
    }
  }

  const rawFreshness = raw.freshness;
  if (isString(rawFreshness) && rawFreshness.trim().length > 0) {
    if (!VALID_FRESHNESS_STATES.has(rawFreshness as FreshnessState)) {
      errors.push(
        parseError("INVALID_FRESHNESS", "freshness", "freshness must be a valid FreshnessState")
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const cadastralId = normalizeCadastralId(raw.cadastralNumber as string);
  const typedGeometry = rawGeometry as Record<string, unknown>;
  const geometryType = typedGeometry.type as string;
  const coordinates = typedGeometry.coordinates;
  const crs = rawCrs as string;

  const coordinateError = validateCoordinates(coordinates, geometryType, crs);
  if (coordinateError) {
    return { valid: false, errors: [coordinateError] };
  }

  const geometry: ParcelGeometry =
    geometryType === "Polygon"
      ? ({
          type: "Polygon",
          coordinates: coordinates as ParcelGeometry["coordinates"],
        } as ParcelGeometry)
      : ({
          type: "MultiPolygon",
          coordinates: coordinates as ParcelGeometry["coordinates"],
        } as ParcelGeometry);

  const areaM2Computed = isFiniteNumber(raw.areaSqm) ? (raw.areaSqm as number) : 0;
  const addressText = isString(raw.addressText) ? raw.addressText : undefined;
  const landUseData = isObject(raw.landUseData)
    ? (raw.landUseData as Record<string, unknown>)
    : undefined;
  const contentHash = isString(raw.contentHash) ? raw.contentHash : "";

  const typedSource = rawSource as Record<string, unknown>;
  const sourceObjectId = isString(typedSource.objectId) ? typedSource.objectId : undefined;
  const sourceEffectiveAt = isString(typedSource.effectiveAt) ? typedSource.effectiveAt : undefined;
  const freshnessState =
    isString(rawFreshness) && VALID_FRESHNESS_STATES.has(rawFreshness as FreshnessState)
      ? (rawFreshness as FreshnessState)
      : "unknown";

  const parcel: Parcel = {
    id: sourceObjectId || cadastralId,
    cadastralId,
    geometry,
    geometryCrs: crs,
    facts: {
      areaM2Computed,
      addressText,
      landUseData,
    },
    source: {
      sourceId: typedSource.id as string,
      sourceDatasetVersionId: typedSource.datasetVersion as string,
      sourceSyncRunId: typedSource.syncRun as string,
      sourceObjectId,
      normalizerVersion: typedSource.normalizerVersion as string,
      retrievedAt: typedSource.retrievedAt as string,
      sourceEffectiveAt,
    },
    freshnessState,
    contentHash,
  };

  const domainResult = validateParcel(parcel);

  if (!domainResult.valid) {
    const domainErrors: ParcelParseError[] = domainResult.errors.map((e) => ({
      code: "DOMAIN_VALIDATION_FAILED",
      field: e.field,
      message: e.message,
    }));
    return { valid: false, errors: domainErrors };
  }

  return {
    valid: true,
    parcel,
    warnings: domainResult.warnings,
  };
}
