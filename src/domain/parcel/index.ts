export type {
  CadastralId,
  CadastralIdErrorCode,
  CadastralIdValidationError,
  CadastralIdValidationResult,
  FreshnessState,
  PolygonGeometry,
  MultiPolygonGeometry,
  ParcelGeometry,
  SourceProvenance,
  ParcelFacts,
  Parcel,
  ParcelValidationError,
  ParcelValidationResult,
  CanonicalParcelCrs,
} from "./types";

export {
  ESTONIAN_CADASTRAL_ID_LENGTH,
  normalizeCadastralId,
  validateCadastralId,
  isValidCadastralId,
  validateParcel,
  CANONICAL_PARCEL_CRS,
} from "./types";
