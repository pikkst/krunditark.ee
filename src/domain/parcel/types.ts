export type CadastralId = string;

export type FreshnessState = "fresh" | "warning" | "stale" | "unknown";

export type GeometryType = "Polygon" | "MultiPolygon";

export interface ParcelGeometry {
  type: GeometryType;
  coordinates: number[][][] | number[][][][];
}

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
  geometryCrs: string;
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
const SUPPORTED_CRS = new Set(["EPSG:3301", "EPSG:4326"]);
const VALID_FRESHNESS_STATES = new Set<FreshnessState>(["fresh", "warning", "stale", "unknown"]);

export function normalizeCadastralId(raw: string): CadastralId {
  return raw.trim().replace(/[:\-.\s]/g, "");
}

export function isValidCadastralId(raw: string): boolean {
  const normalized = normalizeCadastralId(raw);
  return ESTONIAN_CADASTRAL_PATTERN.test(normalized);
}

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function validateGeometryCoordinates(
  type: GeometryType,
  coordinates: number[][][] | number[][][][]
): ParcelValidationError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { field: "geometry.coordinates", message: "coordinates must not be empty" };
  }

  if (type === "Polygon") {
    if (!Array.isArray(coordinates[0][0])) {
      return { field: "geometry.coordinates", message: "Polygon coordinates must be a ring array" };
    }
  }

  if (type === "MultiPolygon") {
    if (!Array.isArray(coordinates[0][0][0])) {
      return {
        field: "geometry.coordinates",
        message: "MultiPolygon coordinates must be a polygon array",
      };
    }
  }

  return undefined;
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
    const coordinateError = validateGeometryCoordinates(
      parcel.geometry.type,
      parcel.geometry.coordinates
    );
    if (coordinateError) {
      errors.push(coordinateError);
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
