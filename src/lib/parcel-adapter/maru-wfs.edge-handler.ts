import type { Parcel } from "../../domain/parcel/types.ts";
import {
  validateParcel,
  isValidCadastralId,
  normalizeCadastralId,
} from "../../domain/parcel/types.ts";

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof Error && err.name === "AbortError") ||
    (typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError")
  );
}

export type EdgeParcelLookupResult =
  { valid: true; parcel: Parcel } | { valid: false; error: string; status: number };

export interface EdgeParcelLookupOptions {
  cadastralId: string;
  wfsUrl: URL;
  maxAttempts: number;
  retryableStatuses: Set<number>;
  timeoutMs: number;
  syncRun: string;
  retrievedAt: string;
}

export async function edgeParcelLookup(
  options: EdgeParcelLookupOptions
): Promise<EdgeParcelLookupResult> {
  const { cadastralId, wfsUrl, maxAttempts, retryableStatuses, timeoutMs, syncRun, retrievedAt } =
    options;

  const normalizedId = cadastralId.replace(/[:\-.\s]/g, "");
  const providerRef = `${normalizedId.slice(0, 5)}:${normalizedId.slice(5, 8)}:${normalizedId.slice(8, 12)}`;

  wfsUrl.searchParams.set("cql_filter", `nationalcadastralreference='${providerRef}'`);
  wfsUrl.searchParams.set("srsName", "EPSG:3301");

  let lastError: { status: number; body: Record<string, unknown> } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstream = await fetch(wfsUrl.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!upstream.ok) {
        const errorBody = {
          error: "UPSTREAM_ERROR",
          message: `MaRu WFS returned status ${upstream.status}`,
        };
        lastError = { status: upstream.status, body: errorBody };

        if (attempt < maxAttempts && retryableStatuses.has(upstream.status)) {
          continue;
        }

        return { valid: false, error: "UPSTREAM_ERROR", status: 502 };
      }

      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const errorBody = { error: "INVALID_RESPONSE", message: "MaRu WFS returned non-JSON" };
        lastError = { status: 502, body: errorBody };
        return { valid: false, error: "INVALID_RESPONSE", status: 502 };
      }

      let decoded: unknown;
      try {
        decoded = await upstream.json();
      } catch (err) {
        if (isAbortError(err)) {
          throw err;
        }
        const errorBody = { error: "PARSE_ERROR", message: "Failed to decode JSON response" };
        lastError = { status: 502, body: errorBody };
        return { valid: false, error: "PARSE_ERROR", status: 502 };
      }

      if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
        const errorBody = {
          error: "INVALID_RESPONSE_TYPE",
          message: "Response root must be a non-null object",
        };
        lastError = { status: 502, body: errorBody };
        return { valid: false, error: "INVALID_RESPONSE_TYPE", status: 502 };
      }

      const data = decoded as Record<string, unknown>;

      if (data.type !== "FeatureCollection") {
        const errorBody = {
          error: "INVALID_RESPONSE_TYPE",
          message: `Response type must be FeatureCollection, got ${data.type}`,
        };
        lastError = { status: 502, body: errorBody };
        return { valid: false, error: "INVALID_RESPONSE_TYPE", status: 502 };
      }

      if (!data.features || !Array.isArray(data.features)) {
        const errorBody = { error: "PARSE_ERROR", message: "Missing features array in response" };
        lastError = { status: 502, body: errorBody };
        return { valid: false, error: "PARSE_ERROR", status: 502 };
      }

      if (data.features.length === 0) {
        return { valid: false, error: "PARCEL_NOT_FOUND", status: 404 };
      }

      if (data.features.length > 1) {
        return { valid: false, error: "AMBIGUOUS_RESULT", status: 409 };
      }

      const responseCrs = data.crs as Record<string, unknown> | undefined;
      const crsName = (responseCrs?.properties as { name?: string } | undefined)?.name;
      const normalizedCrs = crsName
        ? crsName.replace("urn:ogc:def:crs:EPSG::", "EPSG:")
        : undefined;
      if (normalizedCrs !== "EPSG:3301") {
        return {
          valid: false,
          error: `WFS response CRS must be EPSG:3301, got ${crsName ?? "undefined"}`,
          status: 502,
        };
      }

      const feature = data.features[0];
      if (
        !feature ||
        typeof feature !== "object" ||
        (feature as Record<string, unknown>).type !== "Feature"
      ) {
        const errorBody = {
          error: "INVALID_FEATURE_TYPE",
          message: `Feature type must be Feature, got ${(feature as Record<string, unknown> | undefined)?.type}`,
        };
        lastError = { status: 502, body: errorBody };
        return { valid: false, error: "INVALID_FEATURE_TYPE", status: 502 };
      }

      const parseResult = parseFeature(feature, normalizedId, syncRun, retrievedAt);

      if (!parseResult.valid) {
        return { valid: false, error: parseResult.error, status: 502 };
      }

      return { valid: true, parcel: parseResult.parcel };
    } catch (err) {
      if (isAbortError(err)) {
        const errorBody = { error: "SOURCE_TIMEOUT", message: "MaRu WFS request timed out" };
        lastError = { status: 502, body: errorBody };

        if (attempt < maxAttempts) {
          continue;
        }

        return { valid: false, error: "SOURCE_TIMEOUT", status: 502 };
      }

      const errorBody = {
        error: "PARCEL_UNAVAILABLE",
        message: "Failed to reach MaRu WFS",
      };
      lastError = { status: 502, body: errorBody };

      if (attempt < maxAttempts) {
        continue;
      }

      return { valid: false, error: "PARCEL_UNAVAILABLE", status: 502 };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    valid: false,
    error: (lastError?.body?.error as string) ?? "PARCEL_UNAVAILABLE",
    status: lastError?.status ?? 502,
  };
}

const EPSG_3301_BOUNDS = {
  minX: 200000,
  maxX: 900000,
  minY: 6300000,
  maxY: 7800000,
};

function validatePosition(position: unknown): string | undefined {
  if (!Array.isArray(position) || position.length !== 2) {
    return "position must contain exactly x and y";
  }
  const x = position[0];
  const y = position[1];
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return "coordinates must be finite numbers";
  }
  if (x < EPSG_3301_BOUNDS.minX || x > EPSG_3301_BOUNDS.maxX) {
    return `coordinate x ${x} out of valid EPSG:3301 range`;
  }
  if (y < EPSG_3301_BOUNDS.minY || y > EPSG_3301_BOUNDS.maxY) {
    return `coordinate y ${y} out of valid EPSG:3301 range`;
  }
  return undefined;
}

function validateRing(ring: unknown[]): string | undefined {
  if (!Array.isArray(ring) || ring.length < 4) {
    return "ring must have at least 4 positions";
  }
  for (let i = 0; i < ring.length; i++) {
    const posError = validatePosition(ring[i]);
    if (posError) {
      return posError;
    }
  }
  const first = ring[0] as number[];
  const last = ring[ring.length - 1] as number[];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return "ring is not closed";
  }
  return undefined;
}

function validatePolygonCoordinates(coordinates: unknown): string | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return "coordinates must not be empty";
  }
  for (let i = 0; i < coordinates.length; i++) {
    const ringError = validateRing(coordinates[i] as unknown[]);
    if (ringError) {
      return ringError;
    }
  }
  return undefined;
}

function validateMultiPolygonCoordinates(coordinates: unknown): string | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return "coordinates must not be empty";
  }
  for (let i = 0; i < coordinates.length; i++) {
    const polygon = coordinates[i];
    if (!Array.isArray(polygon) || polygon.length === 0) {
      return "polygon must have at least one ring";
    }
    for (let j = 0; j < polygon.length; j++) {
      const ringError = validateRing(polygon[j] as unknown[]);
      if (ringError) {
        return ringError;
      }
    }
  }
  return undefined;
}

function validateCoordinates(coordinates: unknown, type: string): string | undefined {
  if (type === "Polygon") {
    return validatePolygonCoordinates(coordinates);
  }
  if (type === "MultiPolygon") {
    return validateMultiPolygonCoordinates(coordinates);
  }
  return undefined;
}

function parseGmlDescription(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(/Last update:(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

function parseFeature(
  feature: unknown,
  expectedCadastralId: string,
  syncRun: string,
  retrievedAt: string
): { valid: true; parcel: Parcel } | { valid: false; error: string } {
  if (
    !feature ||
    typeof feature !== "object" ||
    !("properties" in (feature as Record<string, unknown>))
  ) {
    return { valid: false, error: "INVALID_FEATURE" };
  }

  const record = feature as Record<string, unknown>;
  const props = record.properties as Record<string, unknown> | undefined;
  if (!props) {
    return { valid: false, error: "MISSING_PROPERTIES" };
  }

  const nationalRef = props.nationalcadastralreference;
  if (!nationalRef || typeof nationalRef !== "string" || nationalRef.trim().length === 0) {
    return { valid: false, error: "MISSING_NATIONAL_REFERENCE" };
  }

  const normalizedRef = normalizeCadastralId(nationalRef);
  if (!isValidCadastralId(normalizedRef) || normalizedRef !== expectedCadastralId) {
    return { valid: false, error: "INVALID_NATIONAL_REFERENCE" };
  }

  const featureId = record.id;
  if (typeof featureId !== "string" || featureId.trim().length === 0) {
    return { valid: false, error: "INVALID_FEATURE_ID" };
  }

  const areaValue = props.areavalue;
  if (areaValue === undefined || areaValue === null || typeof areaValue !== "number") {
    return { valid: false, error: "INVALID_AREA_VALUE" };
  }

  const geometry = record.geometry;
  if (!geometry || typeof geometry !== "object") {
    return { valid: false, error: "MISSING_GEOMETRY" };
  }

  const geomType = (geometry as Record<string, unknown>).type;
  if (geomType !== "Polygon" && geomType !== "MultiPolygon") {
    return { valid: false, error: "INVALID_GEOMETRY_TYPE" };
  }

  const coordinates = (geometry as Record<string, unknown>).coordinates;
  const coordError = validateCoordinates(coordinates, geomType as string);
  if (coordError) {
    return { valid: false, error: `INVALID_COORDINATES: ${coordError}` };
  }

  const sourceVersion = parseGmlDescription(props.gml_description as string | undefined);
  if (!sourceVersion) {
    return { valid: false, error: "SOURCE_VERSION_PARSE_FAILED" };
  }

  const effectiveAt =
    typeof props.beginlifespanversion === "string" && props.beginlifespanversion.length === 8
      ? `${props.beginlifespanversion.slice(0, 4)}-${props.beginlifespanversion.slice(4, 6)}-${props.beginlifespanversion.slice(6, 8)}T00:00:00Z`
      : undefined;

  const parcel: Parcel = {
    id: record.id as string,
    cadastralId: nationalRef.replace(/[:\-.\s]/g, ""),
    geometry: {
      type: geomType as "Polygon" | "MultiPolygon",
      coordinates: coordinates as Parcel["geometry"]["coordinates"],
    } as Parcel["geometry"],
    geometryCrs: "EPSG:3301",
    facts: {
      areaM2Computed: areaValue,
      addressText: typeof props.label === "string" ? props.label : undefined,
      landUseData: {
        validFrom: props.validfrom,
        beginLifespanVersion: props.beginlifespanversion,
        gmlDescription: props.gml_description,
        inspireIdNamespace: props.inspireid_identifier_namespace,
      },
    },
    source: {
      sourceId: "maru.cadastre.parcels.inspire",
      sourceDatasetVersionId: sourceVersion,
      sourceSyncRunId: syncRun,
      sourceObjectId:
        typeof props.inspireid_identifier_localid === "string"
          ? props.inspireid_identifier_localid
          : (record.id as string),
      normalizerVersion: "1",
      retrievedAt,
      sourceEffectiveAt: effectiveAt,
    },
    freshnessState: "fresh",
    contentHash: "",
  };

  const domainValidation = validateParcel(parcel);
  if (!domainValidation.valid) {
    return {
      valid: false,
      error: `DOMAIN_VALIDATION_FAILED: ${domainValidation.errors[0]?.message ?? "invalid parcel"}`,
    };
  }

  return { valid: true, parcel };
}
