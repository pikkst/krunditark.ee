import type { Parcel } from "../../domain/parcel/types.ts";
import { parseMaruWfsFeature } from "./maru-wfs.parser.ts";
import { parseProviderParcel } from "./normalizer.ts";

export interface EdgeParcelResolveOptions {
  wfsUrl: URL;
  maxAttempts: number;
  retryableStatuses: Set<number>;
  timeoutMs: number;
  syncRun: string;
  retrievedAt: string;
  expectedCadastralId?: string;
}

export type EdgeParcelResolveResult =
  | {
      status: "resolved";
      candidates: Parcel[];
    }
  | {
      status: "ambiguous";
      candidates: Parcel[];
    }
  | {
      status: "not_found";
      candidates: [];
    }
  | {
      status: "unavailable";
      candidates: [];
    }
  | {
      status: "invalid_source";
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
  const {
    wfsUrl,
    maxAttempts,
    retryableStatuses,
    timeoutMs,
    syncRun,
    retrievedAt,
    expectedCadastralId,
  } = options;

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

      if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
        return { status: "unavailable", candidates: [] };
      }

      const data = decoded as Record<string, unknown>;
      if (data.type !== "FeatureCollection") {
        return { status: "unavailable", candidates: [] };
      }

      const responseCrs = data.crs as Record<string, unknown> | undefined;
      const crsName = (responseCrs?.properties as { name?: string } | undefined)?.name;
      const normalizedCrs = crsName
        ? crsName.replace("urn:ogc:def:crs:EPSG::", "EPSG:")
        : undefined;
      if (normalizedCrs !== "EPSG:3301") {
        return { status: "unavailable", candidates: [] };
      }

      const features = data.features;
      if (!Array.isArray(features) || features.length === 0) {
        return { status: "not_found", candidates: [] };
      }

      const candidates: Parcel[] = [];
      let hasInvalidFeature = false;

      for (let i = 0; i < features.length; i++) {
        const featureResult = parseMaruWfsFeature(features[i], retrievedAt, syncRun);
        if (!featureResult.valid) {
          hasInvalidFeature = true;
          continue;
        }

        const parseResult = parseProviderParcel(featureResult.dto);
        if (!parseResult.valid) {
          hasInvalidFeature = true;
          continue;
        }

        candidates.push(parseResult.parcel);
      }

      if (hasInvalidFeature) {
        return { status: "invalid_source", candidates: [] };
      }

      if (candidates.length === 0) {
        return { status: "not_found", candidates: [] };
      }

      let filtered = candidates;
      if (expectedCadastralId) {
        const expected = expectedCadastralId.replace(/[:\-.\s]/g, "");
        filtered = candidates.filter((candidate) => candidate.cadastralId === expected);
      }

      if (filtered.length === 0) {
        return { status: "not_found", candidates: [] };
      }

      if (filtered.length === 1) {
        return { status: "resolved", candidates: filtered };
      }

      return { status: "ambiguous", candidates: filtered };
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
