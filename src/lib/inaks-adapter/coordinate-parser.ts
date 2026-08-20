import type { InAksParseError } from "./types";

export interface CoordinateBounds {
  min: number;
  max: number;
}

export function parseCoordinatePair(
  rawX: unknown,
  rawY: unknown,
  fieldPrefix: string,
  xBounds?: CoordinateBounds,
  yBounds?: CoordinateBounds
): InAksParseError | undefined {
  if (rawX == null || rawY == null) {
    return { code: "INVALID_COORDINATES", field: fieldPrefix, message: "both coordinate values are required" };
  }
  if (typeof rawX !== "string" || typeof rawY !== "string") {
    return {
      code: "INVALID_COORDINATES",
      field: fieldPrefix,
      message: "coordinates must be numeric strings when provided",
    };
  }
  const x = Number(rawX);
  const y = Number(rawY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { code: "NON_FINITE_NUMERIC", field: fieldPrefix, message: "coordinates must be finite numbers" };
  }
  if (xBounds && (x < xBounds.min || x > xBounds.max)) {
    return {
      code: "INVALID_COORDINATES",
      field: fieldPrefix,
      message: `x coordinate out of range [${xBounds.min}, ${xBounds.max}]`,
    };
  }
  if (yBounds && (y < yBounds.min || y > yBounds.max)) {
    return {
      code: "INVALID_COORDINATES",
      field: fieldPrefix,
      message: `y coordinate out of range [${yBounds.min}, ${yBounds.max}]`,
    };
  }
  return undefined;
}
