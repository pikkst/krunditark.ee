import { parseMaruWfsResponse } from "./maru-wfs.parser";

export interface EdgeParcelResolveOptions {
  cadastralId: string;
  wfsUrl: URL;
  maxAttempts: number;
  retryableStatuses: Set<number>;
  timeoutMs: number;
  syncRun: string;
  retrievedAt: string;
}

export interface ResolveCandidate {
  cadastralId: string;
  address: string;
  areaM2: number;
  geometry: unknown;
  source: {
    id: string;
    datasetVersionId: string;
    retrievedAt: string;
  };
}

export type EdgeParcelResolveResult =
  | {
      status: "resolved";
      candidates: ResolveCandidate[];
    }
  | {
      status: "ambiguous";
      candidates: ResolveCandidate[];
    }
  | {
      status: "not_found";
      candidates: [];
    }
  | {
      status: "unavailable";
      candidates: [];
    };

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof Error && err.name === "AbortError") ||
    (typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError")
  );
}

export async function edgeParcelResolve(
  options: EdgeParcelResolveOptions
): Promise<EdgeParcelResolveResult> {
  const { wfsUrl, maxAttempts, retryableStatuses, timeoutMs, syncRun, retrievedAt } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstream = await fetch(wfsUrl.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!upstream.ok) {
        if (attempt < maxAttempts && retryableStatuses.has(upstream.status)) {
          continue;
        }
        return { status: "unavailable", candidates: [] };
      }

      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return { status: "unavailable", candidates: [] };
      }

      let decoded: unknown;
      try {
        decoded = await upstream.json();
      } catch (err) {
        if (isAbortError(err)) {
          throw err;
        }
        return { status: "unavailable", candidates: [] };
      }

      const parseResult = parseMaruWfsResponse(decoded, retrievedAt, syncRun);

      if (!parseResult.valid) {
        const criticalErrors = parseResult.errors.filter(
          (e) => e.code === "PARSE_ERROR" || e.code === "INVALID_RESPONSE_TYPE"
        );
        if (criticalErrors.length > 0) {
          return { status: "unavailable", candidates: [] };
        }
        return { status: "not_found", candidates: [] };
      }

      const candidates: ResolveCandidate[] = parseResult.parcels.map((parcel) => ({
        cadastralId: parcel.cadastralId,
        address: parcel.facts.addressText || "",
        areaM2: parcel.facts.areaM2Computed,
        geometry: parcel.geometry,
        source: {
          id: parcel.source.sourceId,
          datasetVersionId: parcel.source.sourceDatasetVersionId,
          retrievedAt: parcel.source.retrievedAt,
        },
      }));

      if (candidates.length === 0) {
        return { status: "not_found", candidates: [] };
      }

      if (candidates.length === 1) {
        return { status: "resolved", candidates };
      }

      return { status: "ambiguous", candidates };
    } catch (err) {
      if (isAbortError(err)) {
        if (attempt < maxAttempts) {
          continue;
        }
        return { status: "unavailable", candidates: [] };
      }

      return { status: "unavailable", candidates: [] };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { status: "unavailable", candidates: [] };
}
