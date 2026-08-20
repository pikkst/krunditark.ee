import type {
  ParcelLookupErrorCode,
  ParcelLookupResponse,
  ParcelLookupSuccess,
  ParcelLookupFailure,
} from "./types";

export async function lookupParcelByCadastralId(
  cadastralId: string
): Promise<ParcelLookupResponse> {
  const trimmed = cadastralId.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: { code: "INVALID_INPUT", message: "cadastralId must not be empty" },
    };
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return {
      valid: false,
      error: { code: "CONFIG_ERROR", message: "VITE_SUPABASE_URL is not configured" },
    };
  }

  const targetUrl = `${baseUrl}/functions/v1/parcel-lookup?cadastralId=${encodeURIComponent(trimmed)}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let errorCode: ParcelLookupErrorCode | undefined;
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

      const failure: ParcelLookupFailure = {
        valid: false,
        error: {
          code: errorCode ?? "UPSTREAM_ERROR",
          message: errorBody.message ?? `Parcel lookup returned status ${response.status}`,
        },
      };
      return failure;
    }

    const raw = await response.json();

    if (!raw.valid || !raw.parcel) {
      return {
        valid: false,
        error: {
          code: "PARSE_ERROR",
          message: "Invalid parcel lookup response",
        },
      };
    }

    const success: ParcelLookupSuccess = {
      valid: true,
      parcel: raw.parcel,
      retrievedAt: raw.parcel.source.retrievedAt,
      sourceVersion: raw.parcel.source.sourceDatasetVersionId,
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
        message: "Parcel lookup service is unavailable",
      },
    };
  }
}
