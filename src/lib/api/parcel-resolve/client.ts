import type {
  ParcelResolveErrorCode,
  ParcelResolveClientResult,
  ParcelResolveSuccess,
  ParcelResolveFailure,
  ParcelResolveRequest,
  ParcelResolveSelector,
} from "./types";

async function postResolve(selector: ParcelResolveSelector): Promise<ParcelResolveClientResult> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return {
      valid: false,
      error: { code: "CONFIG_ERROR", message: "VITE_SUPABASE_URL is not configured" },
    };
  }

  const targetUrl = `${baseUrl}/functions/v1/parcel-resolve`;
  const requestBody: ParcelResolveRequest = { selector };

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorCode: ParcelResolveErrorCode | undefined;
      let errorBody: { error?: string; message?: string } = {};
      try {
        errorBody = (await response.json()) as { error?: string; message?: string };
      } catch {
        // ignore parse error
      }

      if (errorBody.error === "INVALID_CADASTRAL_ID") errorCode = "INVALID_CADASTRAL_ID";
      else if (errorBody.error === "PARCEL_NOT_FOUND") errorCode = "PARCEL_NOT_FOUND";
      else if (errorBody.error === "AMBIGUOUS_RESULT") errorCode = "AMBIGUOUS_RESULT";
      else if (errorBody.error === "SOURCE_TIMEOUT") errorCode = "SOURCE_TIMEOUT";
      else if (errorBody.error === "INVALID_SOURCE") errorCode = "INVALID_SOURCE";

      const failure: ParcelResolveFailure = {
        valid: false,
        error: {
          code: errorCode ?? "UPSTREAM_ERROR",
          message: errorBody.message ?? `Parcel resolve returned status ${response.status}`,
        },
      };
      return failure;
    }

    const raw = await response.json();

    if (!raw || typeof raw !== "object" || !("status" in raw) || !("candidates" in raw)) {
      return {
        valid: false,
        error: { code: "PARSE_ERROR", message: "Invalid parcel resolve response" },
      };
    }

    const success: ParcelResolveSuccess = {
      valid: true,
      response: raw as import("./types").ParcelResolveResponse,
    };

    return success;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        valid: false,
        error: { code: "NETWORK_ERROR", message: "Request was cancelled" },
      };
    }
    return {
      valid: false,
      error: {
        code: "PARCEL_UNAVAILABLE",
        message: "Parcel resolve service is unavailable",
      },
    };
  }
}

export async function resolveParcel(
  request: ParcelResolveRequest
): Promise<ParcelResolveClientResult> {
  return postResolve(request.selector);
}

export async function resolveParcelByCadastralId(
  cadastralId: string
): Promise<ParcelResolveClientResult> {
  const trimmed = cadastralId.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: { code: "INVALID_INPUT", message: "cadastralId must not be empty" },
    };
  }
  return postResolve({ type: "cadastral", cadastralId: trimmed });
}

export async function resolveParcelByAddressResult(
  addressResultId: string,
  addressId: string
): Promise<ParcelResolveClientResult> {
  const trimmedResultId = addressResultId.trim();
  const trimmedAddressId = addressId.trim();
  if (trimmedResultId.length === 0) {
    return {
      valid: false,
      error: { code: "INVALID_INPUT", message: "addressResultId must not be empty" },
    };
  }
  if (trimmedAddressId.length === 0) {
    return {
      valid: false,
      error: { code: "INVALID_INPUT", message: "addressId must not be empty" },
    };
  }
  return postResolve({
    type: "address",
    addressResultId: trimmedResultId,
    addressId: trimmedAddressId,
  });
}

export async function resolveParcelByPoint(point: {
  lat: number;
  lng: number;
}): Promise<ParcelResolveClientResult> {
  if (typeof point.lat !== "number" || !Number.isFinite(point.lat)) {
    return {
      valid: false,
      error: { code: "INVALID_INPUT", message: "point.lat must be a finite number" },
    };
  }
  if (typeof point.lng !== "number" || !Number.isFinite(point.lng)) {
    return {
      valid: false,
      error: { code: "INVALID_INPUT", message: "point.lng must be a finite number" },
    };
  }
  return postResolve({ type: "point", point });
}
