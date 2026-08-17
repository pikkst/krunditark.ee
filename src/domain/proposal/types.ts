export type StructureType = "detached_house" | "sauna" | "shed" | "garage" | "auxiliary_building";

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

export type ProposalGeometry = PolygonGeometry;

export interface ProposalFacts {
  areaM2: number;
  heightM?: number;
  storeys?: number;
  widthM?: number;
  lengthM?: number;
  orientationDeg?: number;
  intendedUse?: string;
  userNotes?: string;
}

export interface Proposal {
  id: string;
  projectId: string;
  version: number;
  structureType: StructureType;
  geometry: ProposalGeometry;
  geometryCrs: string;
  facts: ProposalFacts;
  createdAt: string;
  supersededAt?: string;
}

export interface ProposalValidationError {
  field: string;
  message: string;
}

export interface ProposalValidationResult {
  valid: boolean;
  errors: ProposalValidationError[];
  warnings: ProposalValidationError[];
}

const VALID_STRUCTURE_TYPES = new Set<StructureType>([
  "detached_house",
  "sauna",
  "shed",
  "garage",
  "auxiliary_building",
]);

const SUPPORTED_CRS = new Set(["EPSG:3301"]);

interface CoordinateBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const SUPPORTED_CRS_BOUNDS: Record<string, CoordinateBounds> = {
  "EPSG:3301": { minX: 200000, maxX: 900000, minY: 6300000, maxY: 7800000 },
};

export function isValidStructureType(raw: string): raw is StructureType {
  return VALID_STRUCTURE_TYPES.has(raw as StructureType);
}

export function normalizeStructureType(raw: string): StructureType | undefined {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return isValidStructureType(normalized) ? normalized : undefined;
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validatePosition(
  position: unknown,
  path: string,
  bounds: CoordinateBounds
): ProposalValidationError | undefined {
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
): ProposalValidationError | undefined {
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
): ProposalValidationError | undefined {
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

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function validateFacts(facts: ProposalFacts): {
  errors: ProposalValidationError[];
  warnings: ProposalValidationError[];
} {
  const errors: ProposalValidationError[] = [];
  const warnings: ProposalValidationError[] = [];

  if (!isFiniteNumber(facts.areaM2) || facts.areaM2 <= 0) {
    errors.push({ field: "facts.areaM2", message: "area must be a positive finite number" });
  } else if (facts.areaM2 > 100000) {
    errors.push({ field: "facts.areaM2", message: "area must not exceed 100000 m²" });
  }

  if (facts.heightM !== undefined) {
    if (!isFiniteNumber(facts.heightM) || facts.heightM <= 0) {
      errors.push({ field: "facts.heightM", message: "height must be a positive finite number" });
    } else if (facts.heightM > 200) {
      errors.push({ field: "facts.heightM", message: "height must not exceed 200 m" });
    }
  }

  if (facts.storeys !== undefined) {
    if (!Number.isInteger(facts.storeys) || facts.storeys <= 0) {
      errors.push({ field: "facts.storeys", message: "storeys must be a positive integer" });
    } else if (facts.storeys > 100) {
      errors.push({ field: "facts.storeys", message: "storeys must not exceed 100" });
    }
  }

  if (facts.widthM !== undefined) {
    if (!isFiniteNumber(facts.widthM) || facts.widthM <= 0) {
      errors.push({ field: "facts.widthM", message: "width must be a positive finite number" });
    } else if (facts.widthM > 2000) {
      errors.push({ field: "facts.widthM", message: "width must not exceed 2000 m" });
    }
  }

  if (facts.lengthM !== undefined) {
    if (!isFiniteNumber(facts.lengthM) || facts.lengthM <= 0) {
      errors.push({ field: "facts.lengthM", message: "length must be a positive finite number" });
    } else if (facts.lengthM > 2000) {
      errors.push({ field: "facts.lengthM", message: "length must not exceed 2000 m" });
    }
  }

  if (facts.orientationDeg !== undefined) {
    if (
      !isFiniteNumber(facts.orientationDeg) ||
      facts.orientationDeg < 0 ||
      facts.orientationDeg >= 360
    ) {
      errors.push({
        field: "facts.orientationDeg",
        message: "orientation must be a number in [0, 360)",
      });
    }
  }

  if (facts.intendedUse !== undefined) {
    if (typeof facts.intendedUse !== "string") {
      errors.push({ field: "facts.intendedUse", message: "intendedUse must be a string" });
    } else if (facts.intendedUse.length > 500) {
      errors.push({
        field: "facts.intendedUse",
        message: "intendedUse must not exceed 500 characters",
      });
    }
  }

  if (facts.userNotes !== undefined) {
    if (typeof facts.userNotes !== "string") {
      errors.push({ field: "facts.userNotes", message: "userNotes must be a string" });
    } else if (facts.userNotes.length > 2000) {
      errors.push({
        field: "facts.userNotes",
        message: "userNotes must not exceed 2000 characters",
      });
    }
  }

  return { errors, warnings };
}

export function validateProposal(proposal: Proposal): ProposalValidationResult {
  const errors: ProposalValidationError[] = [];
  const warnings: ProposalValidationError[] = [];

  if (!proposal.id) {
    errors.push({ field: "id", message: "id is required" });
  }

  if (!proposal.projectId) {
    errors.push({ field: "projectId", message: "projectId is required" });
  }

  if (!proposal.structureType) {
    errors.push({ field: "structureType", message: "structureType is required" });
  } else if (!isValidStructureType(proposal.structureType)) {
    errors.push({ field: "structureType", message: "structureType is not a supported type" });
  }

  if (!proposal.geometry) {
    errors.push({ field: "geometry", message: "geometry is required" });
  } else if (proposal.geometry.type !== "Polygon") {
    errors.push({ field: "geometry", message: "geometry type must be Polygon" });
  }

  if (proposal.geometry) {
    const bounds = SUPPORTED_CRS_BOUNDS[proposal.geometryCrs];
    if (bounds) {
      const coordinateError = validatePolygonCoordinates(proposal.geometry.coordinates, bounds);
      if (coordinateError) {
        errors.push(coordinateError);
      }
    }
  }

  if (!proposal.geometryCrs) {
    errors.push({ field: "geometryCrs", message: "geometryCrs is required" });
  } else if (!SUPPORTED_CRS.has(proposal.geometryCrs)) {
    errors.push({ field: "geometryCrs", message: "geometryCrs is not a supported CRS" });
  }

  if (!proposal.facts) {
    errors.push({ field: "facts", message: "facts are required" });
  } else {
    const factsResult = validateFacts(proposal.facts);
    errors.push(...factsResult.errors);
    warnings.push(...factsResult.warnings);
  }

  if (!Number.isInteger(proposal.version) || proposal.version <= 0) {
    errors.push({ field: "version", message: "version must be a positive integer" });
  }

  if (!proposal.createdAt) {
    errors.push({ field: "createdAt", message: "createdAt is required" });
  } else if (!isIsoTimestamp(proposal.createdAt)) {
    errors.push({
      field: "createdAt",
      message: "createdAt must be a valid ISO timestamp",
    });
  }

  if (proposal.supersededAt && !isIsoTimestamp(proposal.supersededAt)) {
    errors.push({
      field: "supersededAt",
      message: "supersededAt must be a valid ISO timestamp",
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
