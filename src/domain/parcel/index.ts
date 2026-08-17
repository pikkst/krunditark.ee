export type {
  CadastralId,
  FreshnessState,
  GeometryType,
  ParcelGeometry,
  SourceProvenance,
  ParcelFacts,
  Parcel,
  ParcelValidationError,
  ParcelValidationResult,
} from "./types";

export { normalizeCadastralId, isValidCadastralId, validateParcel } from "./types";
