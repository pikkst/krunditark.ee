export type {
  CadastralId,
  FreshnessState,
  PolygonGeometry,
  MultiPolygonGeometry,
  ParcelGeometry,
  SourceProvenance,
  ParcelFacts,
  Parcel,
  ParcelValidationError,
  ParcelValidationResult,
} from "./types";

export { normalizeCadastralId, isValidCadastralId, validateParcel } from "./types";
