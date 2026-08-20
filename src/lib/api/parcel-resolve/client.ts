import type {
  ParcelResolveErrorCode,
  ParcelResolveResponse,
  ParcelResolveSuccess,
  ParcelResolveFailure,
  ResolveParcelInput,
} from "./types";

export async function resolveParcel(
  input: ResolveParcelInput
): Promise<ParcelResolveResponse> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return {
      valid: false,
      error: { code: "CONFIG_ERROR", message: "VITE_SUPABASE_URL is not configured" },
    };
  }

  const targetUrl = `${baseUrl}/functions/v1/parcel-resolve`;

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      let errorCode: ParcelResolveErrorCode | undefined;
      let errorBody: { error?: string; message?: string } = {};
      try {
        errorBody = (await response.json()) as { error?: string; message?: string };
      } catch {
        // ignore parse error
      }

      if (errorBody.error === "PARCEL_NOT_FOUND") errorCode = "PARCEL_NOT_FOUND";
      else if (errorBody.error === "SOURCE_UNAVAILABLE") errorCode = "SOURCE_UNAVAILABLE";

      const failure: ParcelResolveFailure = {
        valid: false,
        error: {
          code: errorCode ?? "PARSE_ERROR",
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

    const status = (raw as { status: string }).status as "resolved" | "ambiguous";
    const candidates = (raw as { candidates: unknown[] }).candidates;

    if (status !== "resolved" && status !== "ambiguous") {
      return {
        valid: false,
        error: { code: "PARSE_ERROR", message: `Unexpected status: ${status}` },
      };
    }

    const success: ParcelResolveSuccess = {
      valid: true,
      status,
      candidates: candidates as ParcelResolveSuccess["candidates"],
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
        code: "SOURCE_UNAVAILABLE",
        message: "Parcel resolve service is unavailable",
      },
    };
  }
}

export async function resolveParcelByCadastralId(
  cadastralId: string
): Promise<ParcelResolveResponse> {
  return resolveParcel({ cadastralId });
}

export async function resolveParcelByAddressResult(
  addressResultId: string,
  addressId: string
): Promise<ParcelResolveResponse> {
  return resolveParcel({ addressResultId, addressId });
}

export async function resolveParcelByPoint(
  point: { type: "Point"; coordinates: [number, number] }
): Promise<ParcelResolveResponse> {
  return resolveParcel({ point });
}
