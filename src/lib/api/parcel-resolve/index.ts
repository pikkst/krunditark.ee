export type {
  ParcelResolveErrorCode,
  ParcelResolveError,
  ParcelResolveSuccess,
  ParcelResolveFailure,
  ParcelResolveClientResult,
  ParcelResolveSelector,
  ParcelResolveRequest,
  ParcelResolveResponse,
  ParcelResolveStatus,
} from "./types";

export {
  resolveParcel,
  resolveParcelByCadastralId,
  resolveParcelByAddressResult,
  resolveParcelByPoint,
} from "./client";
