import type {
  Parcel,
  ParcelGeometry,
  PolygonGeometry,
  MultiPolygonGeometry,
} from "../../domain/parcel/types";
import { CANONICAL_PARCEL_CRS } from "../../domain/parcel/types";
import {
  CANONICAL_CRS,
  EPSG_3301,
  EPSG_4326,
  projectLonLatToEpsg3301,
  unprojectEpsg3301ToLonLat,
  transformPosition,
  transformParcelGeometry,
  toCanonicalParcelGeometry,
  toBrowserGeometry,
  planarAreaM2,
  CrsTransformError,
} from "./transform";

describe("CRS transform (EPSG:3301 canonical, L-EST97 LCC 2SP)", () => {
  test("canonical CRS is EPSG:3301", () => {
    expect(CANONICAL_CRS).toBe(EPSG_3301);
  });

  test("projects the LCC false origin (lon 24, lat 57.5175...) to exact false origin", () => {
    const { x, y } = projectLonLatToEpsg3301(24, 57.5175539305556);
    expect(x).toBeCloseTo(500000, 6);
    expect(y).toBeCloseTo(6375000, 6);
  });

  test("forward projection is monotonic (east increases easting, north increases northing)", () => {
    const base = projectLonLatToEpsg3301(24.5, 58.5);
    const east = projectLonLatToEpsg3301(25.5, 58.5);
    const north = projectLonLatToEpsg3301(24.5, 59.5);
    expect(east.x).toBeGreaterThan(base.x);
    expect(north.y).toBeGreaterThan(base.y);
  });

  test("matches an independent PROJ/EST97 reference projection (Tallinn, non-origin)", () => {
    // Independent reference from PROJ EPSG:3301 (L-EST97, EST97~WGS84): the
    // WGS84 point (lon 24.75353, lat 59.43696) projects to ~ (542759.45, 6589031.77).
    // This is a non-origin vector and catches sign/reciprocal formula errors.
    const { x, y } = projectLonLatToEpsg3301(24.75353, 59.43696);
    expect(Math.abs(x - 542759.45)).toBeLessThan(2);
    expect(Math.abs(y - 6589031.77)).toBeLessThan(2);
  });

  test("round-trips a realistic Estonian WGS84 point within sub-mm tolerance", () => {
    const lon = 24.75353;
    const lat = 59.43696;
    const { x, y } = projectLonLatToEpsg3301(lon, lat);
    expect(x).toBeGreaterThan(350000);
    expect(x).toBeLessThan(750000);
    expect(y).toBeGreaterThan(6300000);
    expect(y).toBeLessThan(6700000);
    const back = unprojectEpsg3301ToLonLat(x, y);
    expect(back.lon).toBeCloseTo(lon, 9);
    expect(back.lat).toBeCloseTo(lat, 9);
  });

  test("rejects unsupported CRS in transformPosition", () => {
    expect(() => transformPosition("EPSG:3857", EPSG_3301, 1, 1)).toThrow(CrsTransformError);
    expect(() => transformPosition(EPSG_4326, "EPSG:3857", 1, 1)).toThrow(CrsTransformError);
  });

  test("transformPosition passes through identical CRS", () => {
    expect(transformPosition(EPSG_3301, EPSG_3301, 650000, 6600000)).toEqual({
      x: 650000,
      y: 6600000,
    });
  });

  test("transformPosition genuinely reprojects 4326 -> 3301 (not a relabel)", () => {
    const { x, y } = transformPosition(EPSG_4326, EPSG_3301, 24, 57.5175539305556);
    expect(x).toBeCloseTo(500000, 3);
    expect(y).toBeCloseTo(6375000, 3);
    expect(x).not.toBeCloseTo(24, 0);
  });

  const polygon4326: ParcelGeometry = {
    type: "Polygon",
    coordinates: [
      [
        [24, 57.5175539305556],
        [24.1, 57.5175539305556],
        [24.1, 57.6],
        [24, 57.6],
        [24, 57.5175539305556],
      ],
    ],
  };

  test("toCanonicalParcelGeometry reprojects 4326 polygon vertices to 3301", () => {
    const canonical = toCanonicalParcelGeometry(polygon4326, EPSG_4326);
    expect(canonical.type).toBe("Polygon");
    const first = canonical.coordinates[0][0];
    expect(first[0]).toBeCloseTo(500000, 3);
    expect(first[1]).toBeCloseTo(6375000, 3);
  });

  test("toCanonicalParcelGeometry does not mutate the input geometry", () => {
    const snapshot = JSON.stringify(polygon4326);
    toCanonicalParcelGeometry(polygon4326, EPSG_4326);
    expect(JSON.stringify(polygon4326)).toBe(snapshot);
  });

  test("toBrowserGeometry inverts toCanonicalParcelGeometry without mutation", () => {
    const canonical = toCanonicalParcelGeometry(polygon4326, EPSG_4326);
    const browser = toBrowserGeometry(canonical);
    const original = polygon4326.coordinates[0][0];
    const recovered = browser.coordinates[0][0];
    expect(recovered[0]).toBeCloseTo(original[0], 6);
    expect(recovered[1]).toBeCloseTo(original[1], 6);
  });

  test("transformParcelGeometry handles MultiPolygon", () => {
    const multi: ParcelGeometry = {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [24, 57.5175539305556],
            [24.01, 57.5175539305556],
            [24.01, 57.52],
            [24, 57.52],
            [24, 57.5175539305556],
          ],
        ],
      ],
    };
    const canonical = transformParcelGeometry(multi, EPSG_4326, EPSG_3301) as MultiPolygonGeometry;
    expect(canonical.type).toBe("MultiPolygon");
    expect(canonical.coordinates[0][0][0][0]).toBeCloseTo(500000, 3);
  });

  function canonicalParcel(geometry: ParcelGeometry): Parcel {
    return {
      id: "p-1",
      cadastralId: "1234567890",
      geometry,
      geometryCrs: CANONICAL_PARCEL_CRS,
      facts: { areaM2Computed: 0 },
      source: {
        sourceId: "maru.cadastre.parcels",
        sourceDatasetVersionId: "v1",
        sourceSyncRunId: "sync-1",
        normalizerVersion: "1",
        retrievedAt: "2026-01-01T00:00:00Z",
      },
      freshnessState: "fresh",
      contentHash: "h",
    };
  }

  test("planarAreaM2 returns metric square metres for canonical geometry", () => {
    const unitSquare: ParcelGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [650000, 6600000],
          [650001, 6600000],
          [650001, 6600001],
          [650000, 6600001],
          [650000, 6600000],
        ],
      ],
    };
    expect(planarAreaM2(canonicalParcel(unitSquare))).toBeCloseTo(1, 9);

    const kmSquare: ParcelGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [650000, 6600000],
          [651000, 6600000],
          [651000, 6601000],
          [650000, 6601000],
          [650000, 6600000],
        ],
      ],
    };
    expect(planarAreaM2(canonicalParcel(kmSquare))).toBeCloseTo(1_000_000, 1);
  });

  test("planarAreaM2 rejects EPSG:4326/degree geometry and never treats it as metric", () => {
    const degreePolygon: ParcelGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [24, 57.5],
          [24.1, 57.5],
          [24.1, 57.6],
          [24, 57.6],
          [24, 57.5],
        ],
      ],
    };
    const degreeParcel = {
      ...canonicalParcel(degreePolygon),
      geometryCrs: "EPSG:4326",
    } as unknown as Parcel;
    expect(() => planarAreaM2(degreeParcel)).toThrow(CrsTransformError);
  });

  test("canonical metric geometry never carries degree-scale coordinates", () => {
    const canonical = toCanonicalParcelGeometry(polygon4326, EPSG_4326);
    const canonicalPolygon = canonical as PolygonGeometry;
    for (const ring of canonicalPolygon.coordinates) {
      for (const vertex of ring) {
        const [x, y] = vertex;
        expect(Math.abs(x)).toBeGreaterThanOrEqual(1000);
        expect(Math.abs(y)).toBeGreaterThanOrEqual(1000);
      }
    }
  });
});
