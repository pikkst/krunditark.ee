export interface MaruWfsGeoJsonGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface MaruWfsGeoJsonProperties {
  nationalcadastralreference: string;
  areavalue: number;
  label?: string;
  validfrom?: string;
  beginlifespanversion?: string;
  gml_description?: string;
  inspireid_identifier_localid?: string;
  inspireid_identifier_namespace?: string;
}

export interface MaruWfsGeoJsonFeature {
  type: "Feature";
  id: string;
  geometry: MaruWfsGeoJsonGeometry;
  properties: MaruWfsGeoJsonProperties;
}

export interface MaruWfsGeoJsonResponse {
  type: "FeatureCollection";
  features: MaruWfsGeoJsonFeature[];
  numberMatched: number;
  numberReturned: number;
  timeStamp: string;
  crs: {
    type: "name";
    properties: {
      name: string;
    };
  };
}

export interface MaruWfsLookupOptions {
  environment?: string;
  timeoutMs?: number;
}

export type MaruWfsParseErrorCode =
  | "INVALID_RESPONSE_TYPE"
  | "MISSING_FEATURES"
  | "MISSING_NATIONAL_REFERENCE"
  | "INVALID_GEOMETRY_TYPE"
  | "MISSING_GEOMETRY"
  | "MISSING_AREA_VALUE"
  | "INVALID_AREA_VALUE"
  | "UNSUPPORTED_CRS"
  | "MULTIPLE_FEATURES"
  | "SOURCE_VERSION_PARSE_FAILED";

export interface MaruWfsParseError {
  code: MaruWfsParseErrorCode;
  field: string;
  message: string;
}
