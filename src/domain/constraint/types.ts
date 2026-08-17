export type FreshnessState = "fresh" | "warning" | "stale" | "unknown";

export type ConstraintCategory =
  "cadastral_restriction" | "environment" | "heritage" | "road" | "utility" | "planning" | "other";

export interface PointGeometry {
  type: "Point";
  coordinates: number[];
}

export interface LineStringGeometry {
  type: "LineString";
  coordinates: number[][];
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

export interface MultiPointGeometry {
  type: "MultiPoint";
  coordinates: number[][];
}

export interface MultiLineStringGeometry {
  type: "MultiLineString";
  coordinates: number[][][];
}

export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: number[][][][];
}

export type ConstraintGeometry =
  | PointGeometry
  | LineStringGeometry
  | PolygonGeometry
  | MultiPointGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry;

export interface ConstraintSourceProvenance {
  sourceId: string;
  sourceDatasetVersionId: string;
  sourceSyncRunId: string;
  sourceObjectId: string;
  normalizerVersion: string;
  retrievedAt: string;
}

export interface ConstraintSourceReference {
  sourceId: string;
  legalSourceId?: string;
  authority?: string;
  officialUrl?: string;
  documentIdentifier?: string;
  sectionReference?: string;
}

export interface ConstraintFacts {
  name?: string;
  sourceReference?: ConstraintSourceReference;
  sourceAttributes?: Record<string, unknown>;
}

export interface Constraint {
  id: string;
  category: ConstraintCategory;
  subcategory?: string;
  geometry: ConstraintGeometry;
  geometryCrs: string;
  impactGeometry?: ConstraintGeometry;
  impactGeometryCrs?: string;
  source: ConstraintSourceProvenance;
  facts: ConstraintFacts;
  sourceEffectiveFrom?: string;
  sourceEffectiveTo?: string;
  freshnessState: FreshnessState;
  contentHash: string;
}

export interface ConstraintValidationError {
  field: string;
  message: string;
}

export interface ConstraintValidationResult {
  valid: boolean;
  errors: ConstraintValidationError[];
  warnings: ConstraintValidationError[];
}

const SUPPORTED_CRS = new Set(["EPSG:3301"]);
const VALID_CATEGORIES = new Set<ConstraintCategory>([
  "cadastral_restriction",
  "environment",
  "heritage",
  "road",
  "utility",
  "planning",
  "other",
]);

interface CoordinateBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const SUPPORTED_CRS_BOUNDS: Record<string, CoordinateBounds> = {
  "EPSG:3301": { minX: 200000, maxX: 900000, minY: 6300000, maxY: 7800000 },
};

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validatePosition(
  position: unknown,
  path: string,
  bounds: CoordinateBounds
): ConstraintValidationError | undefined {
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

function validatePositionArray(
  positions: unknown,
  path: string,
  bounds: CoordinateBounds
): ConstraintValidationError | undefined {
  if (!Array.isArray(positions) || positions.length === 0) {
    return { field: path, message: "positions must not be empty" };
  }
  for (let i = 0; i < positions.length; i++) {
    const positionError = validatePosition(positions[i], `${path}[${i}]`, bounds);
    if (positionError) {
      return positionError;
    }
  }
  return undefined;
}

function validateLineStringCoordinates(
  coordinates: unknown,
  path: string,
  bounds: CoordinateBounds
): ConstraintValidationError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return { field: path, message: "LineString must have at least 2 positions" };
  }
  return validatePositionArray(coordinates, path, bounds);
}

function validateRing(
  ring: unknown,
  path: string,
  bounds: CoordinateBounds
): ConstraintValidationError | undefined {
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

function validatePolygonRings(
  coordinates: unknown,
  path: string,
  bounds: CoordinateBounds
): ConstraintValidationError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { field: path, message: "coordinates must not be empty" };
  }
  for (let i = 0; i < coordinates.length; i++) {
    const ringError = validateRing(coordinates[i], `${path}[${i}]`, bounds);
    if (ringError) {
      return ringError;
    }
  }
  return undefined;
}

function validateMultiLineStringCoordinates(
  coordinates: unknown,
  path: string,
  bounds: CoordinateBounds
): ConstraintValidationError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { field: path, message: "coordinates must not be empty" };
  }
  for (let i = 0; i < coordinates.length; i++) {
    const lineError = validateLineStringCoordinates(coordinates[i], `${path}[${i}]`, bounds);
    if (lineError) {
      return lineError;
    }
  }
  return undefined;
}

function validateMultiPolygonCoordinates(
  coordinates: unknown,
  path: string,
  bounds: CoordinateBounds
): ConstraintValidationError | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { field: path, message: "coordinates must not be empty" };
  }
  for (let i = 0; i < coordinates.length; i++) {
    const polygon = coordinates[i];
    if (!Array.isArray(polygon) || polygon.length === 0) {
      return {
        field: `${path}[${i}]`,
        message: "polygon must have at least one ring",
      };
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

function validateConstraintGeometry(
  geometry: unknown,
  path: string,
  bounds: CoordinateBounds
): ConstraintValidationError | undefined {
  if (!geometry || typeof geometry !== "object") {
    return { field: path, message: "geometry is required" };
  }
  const geo = geometry as Record<string, unknown>;
  const type = geo.type;
  if (
    type !== "Point" &&
    type !== "LineString" &&
    type !== "Polygon" &&
    type !== "MultiPoint" &&
    type !== "MultiLineString" &&
    type !== "MultiPolygon"
  ) {
    return {
      field: `${path}.type`,
      message: "geometry type must be a valid GeoJSON geometry type",
    };
  }
  const coordinates = geo.coordinates;
  switch (type) {
    case "Point":
      return validatePosition(coordinates, `${path}.coordinates`, bounds);
    case "LineString":
      return validateLineStringCoordinates(coordinates, `${path}.coordinates`, bounds);
    case "MultiPoint":
      return validatePositionArray(coordinates, `${path}.coordinates`, bounds);
    case "Polygon":
      return validatePolygonRings(coordinates, `${path}.coordinates`, bounds);
    case "MultiLineString":
      return validateMultiLineStringCoordinates(coordinates, `${path}.coordinates`, bounds);
    case "MultiPolygon":
      return validateMultiPolygonCoordinates(coordinates, `${path}.coordinates`, bounds);
    default:
      return undefined;
  }
}

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function validateConstraint(constraint: Constraint): ConstraintValidationResult {
  const errors: ConstraintValidationError[] = [];
  const warnings: ConstraintValidationError[] = [];

  if (!constraint.id) {
    errors.push({ field: "id", message: "id is required" });
  }

  if (!constraint.category) {
    errors.push({ field: "category", message: "category is required" });
  } else if (!VALID_CATEGORIES.has(constraint.category)) {
    errors.push({
      field: "category",
      message: `category must be one of: ${Array.from(VALID_CATEGORIES).join(", ")}`,
    });
  }

  if (constraint.subcategory !== undefined) {
    if (typeof constraint.subcategory !== "string") {
      errors.push({ field: "subcategory", message: "subcategory must be a string" });
    } else if (constraint.subcategory.length > 100) {
      errors.push({
        field: "subcategory",
        message: "subcategory must not exceed 100 characters",
      });
    }
  }

  if (!constraint.geometry) {
    errors.push({ field: "geometry", message: "geometry is required" });
  }

  if (!constraint.geometryCrs) {
    errors.push({ field: "geometryCrs", message: "geometryCrs is required" });
  } else if (!SUPPORTED_CRS.has(constraint.geometryCrs)) {
    errors.push({ field: "geometryCrs", message: "geometryCrs is not a supported CRS" });
  }

  if (constraint.geometry) {
    const bounds = SUPPORTED_CRS_BOUNDS[constraint.geometryCrs];
    if (bounds) {
      const geometryError = validateConstraintGeometry(constraint.geometry, "geometry", bounds);
      if (geometryError) {
        errors.push(geometryError);
      }
    }
  }

  if (constraint.impactGeometry) {
    const impactCrs = constraint.impactGeometryCrs || constraint.geometryCrs;
    const bounds = SUPPORTED_CRS_BOUNDS[impactCrs];
    if (bounds) {
      const impactError = validateConstraintGeometry(
        constraint.impactGeometry,
        "impactGeometry",
        bounds
      );
      if (impactError) {
        errors.push(impactError);
      }
    }
  }

  if (constraint.impactGeometryCrs && !SUPPORTED_CRS.has(constraint.impactGeometryCrs)) {
    errors.push({
      field: "impactGeometryCrs",
      message: "impactGeometryCrs is not a supported CRS",
    });
  }

  if (!constraint.source || typeof constraint.source !== "object") {
    errors.push({ field: "source", message: "source is required" });
  } else {
    if (!constraint.source.sourceId || typeof constraint.source.sourceId !== "string") {
      errors.push({
        field: "source.sourceId",
        message: "sourceId is required and must be a string",
      });
    }
    if (!constraint.source.sourceDatasetVersionId) {
      errors.push({
        field: "source.sourceDatasetVersionId",
        message: "sourceDatasetVersionId is required",
      });
    }
    if (!constraint.source.sourceSyncRunId) {
      errors.push({
        field: "source.sourceSyncRunId",
        message: "sourceSyncRunId is required",
      });
    }
    if (!constraint.source.sourceObjectId) {
      errors.push({
        field: "source.sourceObjectId",
        message: "sourceObjectId is required",
      });
    }
    if (!constraint.source.normalizerVersion) {
      errors.push({
        field: "source.normalizerVersion",
        message: "normalizerVersion is required",
      });
    }
    if (!constraint.source.retrievedAt) {
      errors.push({
        field: "source.retrievedAt",
        message: "retrievedAt is required",
      });
    } else if (!isIsoTimestamp(constraint.source.retrievedAt)) {
      errors.push({
        field: "source.retrievedAt",
        message: "retrievedAt must be a valid ISO timestamp",
      });
    }
  }

  if (constraint.facts.sourceReference) {
    const ref = constraint.facts.sourceReference;
    if (!ref.sourceId || typeof ref.sourceId !== "string") {
      errors.push({
        field: "facts.sourceReference.sourceId",
        message: "sourceReference.sourceId is required and must be a string",
      });
    }
    if (ref.officialUrl !== undefined && typeof ref.officialUrl !== "string") {
      errors.push({
        field: "facts.sourceReference.officialUrl",
        message: "sourceReference.officialUrl must be a string",
      });
    }
    if (ref.documentIdentifier !== undefined && typeof ref.documentIdentifier !== "string") {
      errors.push({
        field: "facts.sourceReference.documentIdentifier",
        message: "sourceReference.documentIdentifier must be a string",
      });
    }
    if (ref.sectionReference !== undefined && typeof ref.sectionReference !== "string") {
      errors.push({
        field: "facts.sourceReference.sectionReference",
        message: "sourceReference.sectionReference must be a string",
      });
    }
  }

  if (constraint.sourceEffectiveFrom && !isIsoTimestamp(constraint.sourceEffectiveFrom)) {
    errors.push({
      field: "sourceEffectiveFrom",
      message: "sourceEffectiveFrom must be a valid ISO timestamp",
    });
  }

  if (constraint.sourceEffectiveTo && !isIsoTimestamp(constraint.sourceEffectiveTo)) {
    errors.push({
      field: "sourceEffectiveTo",
      message: "sourceEffectiveTo must be a valid ISO timestamp",
    });
  }

  if (constraint.sourceEffectiveFrom && constraint.sourceEffectiveTo) {
    const fromTime = Date.parse(constraint.sourceEffectiveFrom);
    const toTime = Date.parse(constraint.sourceEffectiveTo);
    if (Number.isFinite(fromTime) && Number.isFinite(toTime) && fromTime > toTime) {
      errors.push({
        field: "sourceEffectiveFrom",
        message: "sourceEffectiveFrom must be earlier than sourceEffectiveTo",
      });
    }
  }

  const validFreshnessStates = new Set<FreshnessState>(["fresh", "warning", "stale", "unknown"]);
  if (!validFreshnessStates.has(constraint.freshnessState)) {
    errors.push({
      field: "freshnessState",
      message: "freshnessState must be a valid FreshnessState",
    });
  }

  if (!constraint.contentHash) {
    warnings.push({ field: "contentHash", message: "contentHash is empty" });
  }

  return { valid: errors.length === 0, errors, warnings };
}
