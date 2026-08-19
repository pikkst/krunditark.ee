export type CadastralId = string;

export type FreshnessState = "fresh" | "warning" | "stale" | "unknown";

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: number[][][][];
}

export type ParcelGeometry = PolygonGeometry | MultiPolygonGeometry;

export interface SourceProvenance {
  sourceId: string;
  sourceDatasetVersionId: string;
  sourceSyncRunId: string;
  sourceObjectId?: string;
  normalizerVersion: string;
  retrievedAt: string;
  sourceEffectiveAt?: string;
}

export interface ParcelFacts {
  areaM2Source?: number;
  areaM2Computed: number;
  addressText?: string;
  landUseData?: Record<string, unknown>;
}

export interface Parcel {
  id: string;
  cadastralId: CadastralId;
  geometry: ParcelGeometry;
  geometryCrs: CanonicalParcelCrs;
  facts: ParcelFacts;
  source: SourceProvenance;
  freshnessState: FreshnessState;
  contentHash: string;
}

export interface ParcelValidationError {
  field: string;
  message: string;
}

export interface ParcelValidationResult {
  valid: boolean;
  errors: ParcelValidationError[];
  warnings: ParcelValidationError[];
}

const ESTONIAN_CADASTRAL_PATTERN = /^\d{4,20}$/;

/**
 * Canonical normalized Parcel geometry is authoritative Estonia metric data and
 * only exists in EPSG:3301. Provider/browser EPSG:4326 geometry is transformed
 * to this CRS at the adapter boundary before a normalized Parcel is built, so
 * the canonical contract never carries 4326.
 */
export const CANONICAL_PARCEL_CRS = "EPSG:3301";
export type CanonicalParcelCrs = typeof CANONICAL_PARCEL_CRS;
export const SUPPORTED_CRS = new Set([CANONICAL_PARCEL_CRS]);
const VALID_FRESHNESS_STATES = new Set<FreshnessState>(["fresh", "warning", "stale", "unknown"]);

interface CoordinateBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const SUPPORTED_CRS_BOUNDS: Record<string, CoordinateBounds> = {
  "EPSG:3301": { minX: 200000, maxX: 900000, minY: 6300000, maxY: 7800000 },
};

export function normalizeCadastralId(raw: string): CadastralId {
  return raw.trim().replace(/[:\-.\s]/g, "");
}

export function isValidCadastralId(raw: string): boolean {
  const normalized = normalizeCadastralId(raw);
  return ESTONIAN_CADASTRAL_PATTERN.test(normalized);
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validatePosition(
  position: unknown,
  path: string,
  bounds: CoordinateBounds
): ParcelValidationError | undefined {
  if (!Array.isArray(position) || position.length < 2) {
    return { field: path, message: "position must have at least x and y" };
  }
  if (!isFiniteCoordinate(position[0])) {
    return { field: `${path}[0]`, message: "coordinate must be a finite number" };
  }
  if (!isFiniteCoordinate(position[1])) {
    return { field: `${path}[1]`, message: "coordinate must be a finite number" };
  }
  if (position[0] < bounds.minX || position[0] > bounds.maxX) {
    return {
      field: `${path}[0]`,
      message: `coordinate x out of valid range [${bounds.minX}, ${bounds.maxX}]`,
    };
  }
  if (position[1] < bounds.minY || position[1] > bounds.maxY) {
    return {
      field: `${path}[1]`,
      message: `coordinate y out of valid range [${bounds.minY}, ${bounds.maxY}]`,
    };
  }
  return undefined;
}

function validateRing(
  ring: unknown,
  path: string,
  bounds: CoordinateBounds
): ParcelValidationError | undefined {
  if (!Array.isArray(ring) || ring.length < 4) {
    return { field: path, message: "ring must have at least 4 positions" };
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
    return { field: path, message: "ring is not closed" };
  }
  return undefined;
}

function validatePolygonCoordinates(
  coordinates: unknown,
  bounds: CoordinateBounds
): ParcelValidationError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { field: "geometry.coordinates", message: "coordinates must not be empty" };
  }
  for (let i = 0; i < coordinates.length; i++) {
    const ringError = validateRing(coordinates[i], `geometry.coordinates[${i}]`, bounds);
    if (ringError) {
      return ringError;
    }
  }
  return undefined;
}

function validateMultiPolygonCoordinates(
  coordinates: unknown,
  bounds: CoordinateBounds
): ParcelValidationError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { field: "geometry.coordinates", message: "coordinates must not be empty" };
  }
  for (let i = 0; i < coordinates.length; i++) {
    const polygon = coordinates[i];
    if (!Array.isArray(polygon) || polygon.length === 0) {
      return {
        field: `geometry.coordinates[${i}]`,
        message: "polygon must have at least one ring",
      };
    }
    for (let j = 0; j < polygon.length; j++) {
      const ringError = validateRing(polygon[j], `geometry.coordinates[${i}][${j}]`, bounds);
      if (ringError) {
        return ringError;
      }
    }
  }
  return undefined;
}

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function validateParcel(parcel: Parcel): ParcelValidationResult {
  const errors: ParcelValidationError[] = [];
  const warnings: ParcelValidationError[] = [];

  if (!parcel.id) {
    errors.push({ field: "id", message: "id is required" });
  }

  if (!parcel.cadastralId) {
    errors.push({ field: "cadastralId", message: "cadastralId is required" });
  } else if (!isValidCadastralId(parcel.cadastralId)) {
    errors.push({ field: "cadastralId", message: "cadastralId has invalid format" });
  }

  if (!parcel.geometry) {
    errors.push({ field: "geometry", message: "geometry is required" });
  } else if (!["Polygon", "MultiPolygon"].includes(parcel.geometry.type)) {
    errors.push({ field: "geometry", message: "geometry type must be Polygon or MultiPolygon" });
  }

  if (parcel.geometry) {
    const bounds = SUPPORTED_CRS_BOUNDS[parcel.geometryCrs];
    if (bounds) {
      if (parcel.geometry.type === "Polygon") {
        const coordinateError = validatePolygonCoordinates(parcel.geometry.coordinates, bounds);
        if (coordinateError) {
          errors.push(coordinateError);
        }
      } else {
        const coordinateError = validateMultiPolygonCoordinates(
          parcel.geometry.coordinates,
          bounds
        );
        if (coordinateError) {
          errors.push(coordinateError);
        }
      }
    }
  }

  if (!parcel.geometryCrs) {
    errors.push({ field: "geometryCrs", message: "geometryCrs is required" });
  } else if (!SUPPORTED_CRS.has(parcel.geometryCrs)) {
    errors.push({ field: "geometryCrs", message: "geometryCrs is not a supported CRS" });
  }

  if (typeof parcel.facts.areaM2Computed !== "number" || parcel.facts.areaM2Computed <= 0) {
    warnings.push({ field: "facts.areaM2Computed", message: "computed area should be positive" });
  }

  if (!parcel.source.sourceId) {
    errors.push({ field: "source.sourceId", message: "sourceId is required" });
  }
  if (!parcel.source.sourceDatasetVersionId) {
    errors.push({
      field: "source.sourceDatasetVersionId",
      message: "sourceDatasetVersionId is required",
    });
  }
  if (!parcel.source.sourceSyncRunId) {
    errors.push({ field: "source.sourceSyncRunId", message: "sourceSyncRunId is required" });
  }
  if (!parcel.source.normalizerVersion) {
    errors.push({ field: "source.normalizerVersion", message: "normalizerVersion is required" });
  }
  if (!parcel.source.retrievedAt) {
    errors.push({ field: "source.retrievedAt", message: "retrievedAt is required" });
  } else if (!isIsoTimestamp(parcel.source.retrievedAt)) {
    errors.push({
      field: "source.retrievedAt",
      message: "retrievedAt must be a valid ISO timestamp",
    });
  }
  if (parcel.source.sourceEffectiveAt && !isIsoTimestamp(parcel.source.sourceEffectiveAt)) {
    errors.push({
      field: "source.sourceEffectiveAt",
      message: "sourceEffectiveAt must be a valid ISO timestamp",
    });
  }

  if (!VALID_FRESHNESS_STATES.has(parcel.freshnessState)) {
    errors.push({
      field: "freshnessState",
      message: "freshnessState must be a valid FreshnessState",
    });
  }

  if (!parcel.contentHash) {
    warnings.push({ field: "contentHash", message: "contentHash is empty" });
  }

  return { valid: errors.length === 0, errors, warnings };
}
