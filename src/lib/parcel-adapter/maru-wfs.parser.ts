import type {
  MaruWfsGeoJsonResponse,
  MaruWfsGeoJsonFeature,
  MaruWfsGeoJsonProperties,
  MaruWfsGeoJsonGeometry,
  MaruWfsParseError,
  MaruWfsParseErrorCode,
} from "./maru-wfs.types";
import type { ParcelParseError, ValidatedProviderParcelDTO } from "./types";
import { parseProviderParcel } from "./normalizer";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseError(
  code: MaruWfsParseErrorCode,
  field: string,
  message: string
): MaruWfsParseError {
  return { code, field, message };
}

function parseSourceVersion(description: string): string | undefined {
  const match = description.match(/Last update:(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  return undefined;
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value || value.length !== 8) return undefined;
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  return `${year}-${month}-${day}T00:00:00Z`;
}

function buildValidatedDTO(
  feature: MaruWfsGeoJsonFeature,
  sourceVersion: string,
  retrievedAt: string,
  syncRun: string
): ValidatedProviderParcelDTO {
  const props = feature.properties;
  const geometry = feature.geometry;

  const cadastralNumber = props.nationalcadastralreference;
  const areaSqm = props.areavalue;
  const addressText = props.label;
  const landUseData: Record<string, unknown> = {
    validFrom: props.validfrom,
    beginLifespanVersion: props.beginlifespanversion,
    gmlDescription: props.gml_description,
    inspireIdNamespace: props.inspireid_identifier_namespace,
  };

  const objectId = props.inspireid_identifier_localid ?? feature.id;
  const datasetVersion = sourceVersion;
  const syncRunId = syncRun;

  return {
    cadastralNumber,
    geometry: {
      type: geometry.type,
      coordinates: geometry.coordinates as ValidatedProviderParcelDTO["geometry"]["coordinates"],
    },
    crs: "EPSG:3301",
    facts: {
      areaSqm,
      addressText,
      landUseData,
    },
    source: {
      id: "maru.cadastre.parcels.inspire",
      datasetVersion,
      syncRun: syncRunId,
      objectId,
      normalizerVersion: "1",
      retrievedAt,
      effectiveAt: toIsoDate(props.beginlifespanversion),
    },
    freshness: "fresh",
    contentHash: "",
  };
}

export function parseMaruWfsFeature(
  feature: unknown,
  retrievedAt: string,
  syncRun: string
):
  { valid: true; dto: ValidatedProviderParcelDTO } | { valid: false; errors: MaruWfsParseError[] } {
  const errors: MaruWfsParseError[] = [];

  if (!isObject(feature)) {
    return {
      valid: false,
      errors: [parseError("INVALID_RESPONSE_TYPE", "feature", "feature must be an object")],
    };
  }

  const typedFeature = feature as Partial<MaruWfsGeoJsonFeature>;

  const props = typedFeature.properties;
  if (!isObject(props)) {
    return {
      valid: false,
      errors: [parseError("MISSING_NATIONAL_REFERENCE", "properties", "properties is required")],
    };
  }

  const typedProps = props as Partial<MaruWfsGeoJsonProperties>;

  const nationalRef = typedProps.nationalcadastralreference;
  if (!isString(nationalRef) || nationalRef.trim().length === 0) {
    errors.push(
      parseError(
        "MISSING_NATIONAL_REFERENCE",
        "properties.nationalcadastralreference",
        "nationalcadastralreference is required"
      )
    );
  }

  const areaValue = typedProps.areavalue;
  if (areaValue === undefined || areaValue === null) {
    errors.push(parseError("MISSING_AREA_VALUE", "properties.areavalue", "areavalue is required"));
  } else if (!isNumber(areaValue)) {
    errors.push(
      parseError("INVALID_AREA_VALUE", "properties.areavalue", "areavalue must be a number")
    );
  }

  const geometry = typedFeature.geometry;
  if (!isObject(geometry)) {
    errors.push(parseError("MISSING_GEOMETRY", "geometry", "geometry is required"));
  } else {
    const typedGeom = geometry as Partial<MaruWfsGeoJsonGeometry>;
    const geomType = typedGeom.type;
    if (!isString(geomType) || (geomType !== "Polygon" && geomType !== "MultiPolygon")) {
      errors.push(
        parseError(
          "INVALID_GEOMETRY_TYPE",
          "geometry.type",
          "geometry type must be Polygon or MultiPolygon"
        )
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const rawSourceVersion = typedProps.gml_description
    ? parseSourceVersion(typedProps.gml_description)
    : undefined;

  if (!rawSourceVersion) {
    return {
      valid: false,
      errors: [
        parseError(
          "SOURCE_VERSION_PARSE_FAILED",
          "properties.gml_description",
          "gml_description must contain a parseable Last update date"
        ),
      ],
    };
  }

  const dto = buildValidatedDTO(
    typedFeature as MaruWfsGeoJsonFeature,
    rawSourceVersion,
    retrievedAt,
    syncRun
  );

  return { valid: true, dto };
}

export function parseMaruWfsResponse(
  payload: unknown,
  retrievedAt: string,
  syncRun: string
):
  | { valid: true; parcels: import("../../domain/parcel/types").Parcel[] }
  | {
      valid: false;
      errors: MaruWfsParseError[] | ParcelParseError[];
    } {
  if (!isObject(payload)) {
    return {
      valid: false,
      errors: [parseError("INVALID_RESPONSE_TYPE", "", "response must be an object")],
    };
  }

  const response = payload as Partial<MaruWfsGeoJsonResponse>;

  if (response.type !== "FeatureCollection") {
    return {
      valid: false,
      errors: [
        parseError("INVALID_RESPONSE_TYPE", "type", "response type must be FeatureCollection"),
      ],
    };
  }

  const responseCrs = response.crs;
  const crsName = responseCrs?.properties?.name;
  const normalizedCrs = crsName ? crsName.replace("urn:ogc:def:crs:EPSG::", "EPSG:") : undefined;
  if (normalizedCrs !== "EPSG:3301") {
    return {
      valid: false,
      errors: [parseError("UNSUPPORTED_CRS", "crs", "response CRS must be EPSG:3301")],
    };
  }

  const features = response.features;
  if (!Array.isArray(features) || features.length === 0) {
    return {
      valid: false,
      errors: [
        parseError("MISSING_FEATURES", "features", "features array is required and non-empty"),
      ],
    };
  }

  if (features.length > 1) {
    return {
      valid: false,
      errors: [
        parseError(
          "MULTIPLE_FEATURES",
          "features",
          "expected exactly one feature for exact lookup"
        ),
      ],
    };
  }

  const featureResult = parseMaruWfsFeature(features[0], retrievedAt, syncRun);
  if (!featureResult.valid) {
    return { valid: false, errors: featureResult.errors };
  }

  const parseResult = parseProviderParcel(featureResult.dto);
  if (!parseResult.valid) {
    return { valid: false, errors: parseResult.errors };
  }

  return {
    valid: true,
    parcels: [parseResult.parcel],
  };
}
