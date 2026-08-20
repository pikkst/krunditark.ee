import type {
  Parcel,
  ParcelGeometry,
  PolygonGeometry,
  MultiPolygonGeometry,
} from "../../domain/parcel/types.ts";
import { CANONICAL_PARCEL_CRS } from "../../domain/parcel/types.ts";

export const EPSG_4326 = "EPSG:4326";
export const EPSG_3301 = "EPSG:3301";

/**
 * Canonical normalized CRS for authoritative Estonia metric domain geometry.
 * Provider/browser interchange uses EPSG:4326 and is transformed server-side
 * into this CRS before the normalized Parcel is constructed.
 */
export const CANONICAL_CRS = EPSG_3301;

/** Browser/provider interchange CRS (GeoJSON lon/lat degrees). */
export const BROWSER_CRS = EPSG_4326;

export const SUPPORTED_TRANSFORM_CRS = new Set([EPSG_4326, EPSG_3301]);

export interface LonLat {
  lon: number;
  lat: number;
}

export interface XY {
  x: number;
  y: number;
}

export type CrsTransformErrorCode = "UNSUPPORTED_TRANSFORM" | "OUT_OF_DOMAIN";

export class CrsTransformError extends Error {
  code: CrsTransformErrorCode;
  constructor(code: CrsTransformErrorCode, message: string) {
    super(message);
    this.name = "CrsTransformError";
    this.code = code;
  }
}

// EPSG:3301 (L-EST97 / Estonian National Grid) — Lambert Conic Conformal (2SP).
// Parameters from the EPSG registry / Maa-amet L-EST definition.
const GRS80_A = 6378137;
const GRS80_F = 1 / 298.257222101;
const E2 = GRS80_F * (2 - GRS80_F);
const ECC = Math.sqrt(E2);

const LAT_0_DEG = 57.5175539305556;
const LON_0_DEG = 24;
const LAT_1_DEG = 59.3333333333333;
const LAT_2_DEG = 58;
const FALSE_EASTING = 500000;
const FALSE_NORTHING = 6375000;

const DEG2RAD = Math.PI / 180;

const toRad = (deg: number): number => deg * DEG2RAD;

// Precomputed constants for the LCC 2SP projection.
const LAT_0 = toRad(LAT_0_DEG);
const LON_0 = toRad(LON_0_DEG);
const LAT_1 = toRad(LAT_1_DEG);
const LAT_2 = toRad(LAT_2_DEG);

function tOfLat(latRad: number): number {
  const sinLat = Math.sin(latRad);
  const tanHalf = Math.tan(Math.PI / 4 - latRad / 2);
  // Ellipsoidal Lambert Conformal Conic conformal latitude factor: divide,
  // not multiply. t(phi) = tan(pi/4 - phi/2) / ((1 - e*sin(phi))/(1 + e*sin(phi)))^(e/2).
  const factor = Math.pow((1 - ECC * sinLat) / (1 + ECC * sinLat), ECC / 2);
  return tanHalf / factor;
}

const M1 = Math.cos(LAT_1) / Math.sqrt(1 - E2 * Math.sin(LAT_1) ** 2);
const M2 = Math.cos(LAT_2) / Math.sqrt(1 - E2 * Math.sin(LAT_2) ** 2);
const T1 = tOfLat(LAT_1);
const T2 = tOfLat(LAT_2);
const T0 = tOfLat(LAT_0);

const N = (Math.log(M1) - Math.log(M2)) / (Math.log(T1) - Math.log(T2));
const F = M1 / (N * Math.pow(T1, N));
const RHO_0 = GRS80_A * F * Math.pow(T0, N);

/**
 * Forward projection from WGS84/EPSG:4326 geographic degrees to EPSG:3301
 * planar metres ([easting, northing]).
 */
export function projectLonLatToEpsg3301(lonDeg: number, latDeg: number): XY {
  const latRad = toRad(latDeg);
  const lonRad = toRad(lonDeg);
  const t = tOfLat(latRad);
  const rho = GRS80_A * F * Math.pow(t, N);
  const theta = N * (lonRad - LON_0);
  const x = FALSE_EASTING + rho * Math.sin(theta);
  const y = FALSE_NORTHING + RHO_0 - rho * Math.cos(theta);
  return { x, y };
}

/**
 * Inverse projection from EPSG:3301 planar metres ([easting, northing]) to
 * WGS84/EPSG:4326 geographic degrees.
 */
export function unprojectEpsg3301ToLonLat(x: number, y: number): LonLat {
  const dx = x - FALSE_EASTING;
  const dy = RHO_0 - (y - FALSE_NORTHING);
  const rho = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dx, dy);
  const t = Math.pow(rho / (GRS80_A * F), 1 / N);

  let latRad = Math.PI / 2 - 2 * Math.atan(t);
  for (let i = 0; i < 24; i++) {
    const sinLat = Math.sin(latRad);
    const g = Math.pow((1 - ECC * sinLat) / (1 + ECC * sinLat), ECC / 2);
    const next = Math.PI / 2 - 2 * Math.atan(t * g);
    if (Math.abs(next - latRad) < 1e-15) {
      latRad = next;
      break;
    }
    latRad = next;
  }

  const lonRad = LON_0 + theta / N;
  return { lon: lonRad / DEG2RAD, lat: latRad / DEG2RAD };
}

function assertSupportedCrs(crs: string): void {
  if (!SUPPORTED_TRANSFORM_CRS.has(crs)) {
    throw new CrsTransformError(
      "UNSUPPORTED_TRANSFORM",
      `transform is only supported between ${EPSG_4326} and ${EPSG_3301}, received ${crs}`
    );
  }
}

/**
 * Transform a single position between supported CRS. Only EPSG:4326 <-> EPSG:3301
 * is supported. The input is genuinely reprojected; coordinates are never merely
 * relabeled with a different SRID.
 */
export function transformPosition(fromCrs: string, toCrs: string, x: number, y: number): XY {
  assertSupportedCrs(fromCrs);
  assertSupportedCrs(toCrs);
  if (fromCrs === toCrs) {
    return { x, y };
  }
  if (fromCrs === EPSG_4326 && toCrs === EPSG_3301) {
    return projectLonLatToEpsg3301(x, y);
  }
  if (fromCrs === EPSG_3301 && toCrs === EPSG_4326) {
    const ll = unprojectEpsg3301ToLonLat(x, y);
    return { x: ll.lon, y: ll.lat };
  }
  throw new CrsTransformError(
    "UNSUPPORTED_TRANSFORM",
    `transform ${fromCrs} -> ${toCrs} is not supported`
  );
}

function transformPolygonCoords(
  coordinates: number[][][],
  fromCrs: string,
  toCrs: string
): number[][][] {
  return coordinates.map((ring) =>
    ring.map((pos) => {
      const { x, y } = transformPosition(fromCrs, toCrs, pos[0], pos[1]);
      return [x, y];
    })
  );
}

/**
 * Reproject a canonical-style Polygon/MultiPolygon geometry between supported CRS.
 * Returns a new geometry; the input is never mutated.
 */
export function transformParcelGeometry(
  geometry: ParcelGeometry,
  fromCrs: string,
  toCrs: string
): ParcelGeometry {
  if (geometry.type === "Polygon") {
    const poly: PolygonGeometry = {
      type: "Polygon",
      coordinates: transformPolygonCoords(geometry.coordinates, fromCrs, toCrs),
    };
    return poly;
  }
  const multi: MultiPolygonGeometry = {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((poly) => transformPolygonCoords(poly, fromCrs, toCrs)),
  };
  return multi;
}

/**
 * Reproject a provider/browser geometry into the canonical EPSG:3301 domain CRS.
 * Used on the server/adapter boundary before normalized Parcel construction.
 */
export function toCanonicalParcelGeometry(
  geometry: ParcelGeometry,
  fromCrs: string
): ParcelGeometry {
  return transformParcelGeometry(geometry, fromCrs, CANONICAL_CRS);
}

/**
 * Explicit display/API conversion of canonical EPSG:3301 geometry back to
 * browser-safe EPSG:4326 GeoJSON. This never mutates the canonical geometry.
 */
export function toBrowserGeometry(geometry: ParcelGeometry): ParcelGeometry {
  return transformParcelGeometry(geometry, CANONICAL_CRS, BROWSER_CRS);
}

function ringSignedArea(ring: number[][]): number {
  const n = ring.length;
  if (n < 3) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/**
 * Deterministic planar (shoelace) area of canonical geometry in square metres.
 * Canonical EPSG:3301 coordinates are metres, so the result is metric. This is a
 * non-authoritative convenience/sanity check only; material area for findings
 * remains PostGIS-computed (geo.st_area_m2).
 *
 * The helper is CRS-branded: it only accepts an already-validated canonical
 * `Parcel` (whose `geometryCrs` is the literal `CanonicalParcelCrs`), so metric
 * area logic can never be run on untagged EPSG:4326/degree provider geometry.
 * A defensive runtime guard enforces the canonical CRS as well.
 */
export function planarAreaM2(parcel: Parcel): number {
  if (parcel.geometryCrs !== CANONICAL_PARCEL_CRS) {
    throw new CrsTransformError(
      "OUT_OF_DOMAIN",
      `planarAreaM2 requires canonical ${CANONICAL_PARCEL_CRS} geometry, received ${parcel.geometryCrs}`
    );
  }
  const geometry = parcel.geometry;
  if (geometry.type === "Polygon") {
    let signed = 0;
    for (const ring of geometry.coordinates) {
      signed += ringSignedArea(ring);
    }
    return Math.abs(signed);
  }
  let signed = 0;
  for (const poly of geometry.coordinates) {
    for (const ring of poly) {
      signed += ringSignedArea(ring);
    }
  }
  return Math.abs(signed);
}
