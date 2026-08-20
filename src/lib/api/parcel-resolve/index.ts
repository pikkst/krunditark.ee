export type {
  ParcelResolveErrorCode,
  ParcelResolveError,
  ParcelResolveCandidate,
  ParcelResolveCandidateSource,
  ParcelResolveSuccess,
  ParcelResolveFailure,
  ParcelResolveResponse,
  ResolveParcelInput,
  ResolveParcelByCadastralIdInput,
  ResolveParcelByAddressResultInput,
  ResolveParcelByPointInput,
} from "./types";

export {
  resolveParcel,
  resolveParcelByCadastralId,
  resolveParcelByAddressResult,
  resolveParcelByPoint,
} from "./client";
