export type {
  ParcelParseErrorCode,
  ParcelParseError,
  ParcelParseSuccess,
  ParcelParseFailure,
  ParcelParseResult,
} from "./types";

export type {
  MaruWfsGeoJsonGeometry,
  MaruWfsGeoJsonProperties,
  MaruWfsGeoJsonFeature,
  MaruWfsGeoJsonResponse,
  MaruWfsLookupOptions,
  MaruWfsParseErrorCode,
  MaruWfsParseError,
} from "./maru-wfs.types";

export { parseProviderParcel } from "./normalizer";
export { parseMaruWfsFeature, parseMaruWfsResponse } from "./maru-wfs.parser";
export { edgeParcelLookup } from "./maru-wfs.edge-handler";
export { edgeParcelResolve, type EdgeParcelResolveResult } from "./maru-wfs.resolve-handler";
