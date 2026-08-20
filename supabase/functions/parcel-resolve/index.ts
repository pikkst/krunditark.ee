import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  normalizeCadastralId,
  isValidEstonianCadastralId,
  toProviderCadastralRef,
} from "../../../src/lib/parcel-adapter/maru-wfs.utils.ts";
import { edgeParcelResolve } from "../../../src/lib/parcel-adapter/maru-wfs.resolve-handler.ts";
import { parseInAksAddressResponse } from "../../../src/lib/inaks-adapter/normalizer.ts";

const ALLOWED_INAKS_HOSTS = ["aks.geoportaal.ee", "aks-test.geoportaal.ee"];
const ALLOWED_MARU_WFS_HOSTS = ["inspire.geoportaal.ee"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const CADASTRAL_ID_MAX_LENGTH = 64;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_FEATURES = 20;
const MAX_ATTEMPTS = 2;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const INAKS_NORMALIZER_VERSION = "1";

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function isAllowedInAksUrl(url: URL): boolean {
  return ALLOWED_INAKS_HOSTS.includes(url.hostname);
}

function isAllowedMaruWfsUrl(url: URL): boolean {
  return ALLOWED_MARU_WFS_HOSTS.includes(url.hostname);
}

interface ResolveRequestBody {
  cadastralId?: string;
  addressResultId?: string;
  addressId?: string;
  point?: { type: "Point"; coordinates: [number, number] };
}

function parseRequestBody(req: Request): ResolveRequestBody | { error: string } {
  try {
    const body = (await req.json()) as ResolveRequestBody;
    const selectors = [
      body.cadastralId !== undefined,
      body.addressResultId !== undefined,
      body.point !== undefined,
    ].filter(Boolean);

    if (selectors.length !== 1) {
      return { error: "Exactly one of cadastralId, addressResultId, or point must be provided" };
    }

    if (body.cadastralId !== undefined && typeof body.cadastralId !== "string") {
      return { error: "cadastralId must be a string" };
    }

    if (body.addressResultId !== undefined && typeof body.addressResultId !== "string") {
      return { error: "addressResultId must be a string" };
    }

    if (body.point !== undefined) {
      const p = body.point;
      if (p.type !== "Point" || !Array.isArray(p.coordinates) || p.coordinates.length !== 2) {
        return { error: "point must be a GeoJSON Point with [lon, lat] coordinates" };
      }
      const [lon, lat] = p.coordinates;
      if (typeof lon !== "number" || typeof lat !== "number" || !Number.isFinite(lon) || !Number.isFinite(lat)) {
        return { error: "point coordinates must be finite numbers" };
      }
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        return { error: "point coordinates are out of WGS84 bounds" };
      }
    }

    return body;
  } catch {
    return { error: "Invalid JSON body" };
  }
}

async function resolveByCadastralId(cadastralId: string): Promise<{
  status: "resolved" | "ambiguous" | "not_found" | "unavailable";
  candidates: Array<{
    cadastralId: string;
    address: string;
    areaM2: number;
    geometry: unknown;
    source: {
      id: string;
      datasetVersionId: string;
      retrievedAt: string;
    };
  }>;
}> {
  const normalizedId = normalizeCadastralId(cadastralId);
  if (!isValidEstonianCadastralId(normalizedId)) {
    return { status: "not_found", candidates: [] };
  }

  const providerRef = toProviderCadastralRef(normalizedId);
  const syncRun = `maru-wfs-${Date.now()}`;
  const retrievedAt = new Date().toISOString();

  const wfsUrl = new URL("https://inspire.geoportaal.ee/geoserver/CP_katastriyksused/wfs");
  wfsUrl.searchParams.set("service", "WFS");
  wfsUrl.searchParams.set("version", "2.0.0");
  wfsUrl.searchParams.set("request", "GetFeature");
  wfsUrl.searchParams.set("typeNames", "CP_katastriyksused:CP.CadastralParcel");
  wfsUrl.searchParams.set("cql_filter", `nationalcadastralreference='${providerRef}'`);
  wfsUrl.searchParams.set("outputFormat", "application/json");
  wfsUrl.searchParams.set("count", String(MAX_FEATURES));
  wfsUrl.searchParams.set("srsName", "EPSG:3301");

  if (!isAllowedMaruWfsUrl(wfsUrl)) {
    throw new Error("Target host is not allowed");
  }

  const result = await edgeParcelResolve({
    cadastralId: normalizedId,
    wfsUrl,
    maxAttempts: MAX_ATTEMPTS,
    retryableStatuses: RETRYABLE_STATUSES,
    timeoutMs: REQUEST_TIMEOUT_MS,
    syncRun,
    retrievedAt,
  });

  return result;
}

async function resolveByAddressResult(
  addressResultId: string,
  addressId?: string
): Promise<{
  status: "resolved" | "ambiguous" | "not_found" | "unavailable";
  candidates: Array<{
    cadastralId: string;
    address: string;
    areaM2: number;
    geometry: unknown;
    source: {
      id: string;
      datasetVersionId: string;
      retrievedAt: string;
    };
  }>;
}> {
  if (!addressId) {
    return { status: "not_found", candidates: [] };
  }

  const gazetteerUrl = new URL("https://aks.geoportaal.ee/inaks/inaadress/gazetteer/");
  gazetteerUrl.searchParams.set("adrid", addressId);

  if (!isAllowedInAksUrl(gazetteerUrl)) {
    throw new Error("Target host is not allowed");
  }

  const upstream = await fetch(gazetteerUrl.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!upstream.ok) {
    return { status: "unavailable", candidates: [] };
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { status: "unavailable", candidates: [] };
  }

  const raw = await upstream.json();
  const parsed = parseInAksAddressResponse(raw, INAKS_NORMALIZER_VERSION, new Date().toISOString());

  if (!parsed.valid || parsed.results.length === 0) {
    return { status: "not_found", candidates: [] };
  }

  const targetResult = parsed.results.find((r) => r.id === addressResultId);
  if (!targetResult) {
    return { status: "not_found", candidates: [] };
  }

  const cadastralCandidates: Array<{ cadastralId: string; address: string }> = [];

  if (targetResult.objectType === "cadastral_unit" && targetResult.cadastralId) {
    cadastralCandidates.push({
      cadastralId: targetResult.cadastralId,
      address: targetResult.label,
    });
  }

  for (const result of parsed.results) {
    if (result.objectType === "cadastral_unit" && result.cadastralId) {
      const exists = cadastralCandidates.some((c) => c.cadastralId === result.cadastralId);
      if (!exists) {
        cadastralCandidates.push({
          cadastralId: result.cadastralId,
          address: result.label,
        });
      }
    }
  }

  if (cadastralCandidates.length === 0) {
    return { status: "not_found", candidates: [] };
  }

  const resolvedCandidates = [];
  for (const candidate of cadastralCandidates) {
    const resolveResult = await resolveByCadastralId(candidate.cadastralId);
    if (resolveResult.status === "resolved" || resolveResult.status === "ambiguous") {
      resolvedCandidates.push(...resolveResult.candidates);
    }
  }

  if (resolvedCandidates.length === 0) {
    return { status: "not_found", candidates: [] };
  }

  if (resolvedCandidates.length > 1) {
    return { status: "ambiguous", candidates: resolvedCandidates };
  }

  return { status: "resolved", candidates: resolvedCandidates };
}

async function resolveByPoint(
  coordinates: [number, number]
): Promise<{
  status: "resolved" | "ambiguous" | "not_found" | "unavailable";
  candidates: Array<{
    cadastralId: string;
    address: string;
    areaM2: number;
    geometry: unknown;
    source: {
      id: string;
      datasetVersionId: string;
      retrievedAt: string;
    };
  }>;
}> {
  const [lon, lat] = coordinates;

  const projection = await import("https://cdn.jsdelivr.net/npm/proj4@2.11.0/+esm");
  const from = "EPSG:4326";
  const to = "EPSG:3301";
  const projected = projection.default(lon, lat, from, to);
  const x = projected[0];
  const y = projected[1];

  const halfSize = 50;
  const minX = x - halfSize;
  const maxX = x + halfSize;
  const minY = y - halfSize;
  const maxY = y + halfSize;

  const syncRun = `maru-wfs-${Date.now()}`;
  const retrievedAt = new Date().toISOString();

  const wfsUrl = new URL("https://inspire.geoportaal.ee/geoserver/CP_katastriyksused/wfs");
  wfsUrl.searchParams.set("service", "WFS");
  wfsUrl.searchParams.set("version", "2.0.0");
  wfsUrl.searchParams.set("request", "GetFeature");
  wfsUrl.searchParams.set("typeNames", "CP_katastriyksused:CP.CadastralParcel");
  wfsUrl.searchParams.set(
    "cql_filter",
    `BBOX(geometry, ${minX}, ${minY}, ${maxX}, ${maxY}, 'EPSG:3301')`
  );
  wfsUrl.searchParams.set("outputFormat", "application/json");
  wfsUrl.searchParams.set("count", String(MAX_FEATURES));
  wfsUrl.searchParams.set("srsName", "EPSG:3301");

  if (!isAllowedMaruWfsUrl(wfsUrl)) {
    throw new Error("Target host is not allowed");
  }

  const result = await edgeParcelResolve({
    cadastralId: "",
    wfsUrl,
    maxAttempts: MAX_ATTEMPTS,
    retryableStatuses: RETRYABLE_STATUSES,
    timeoutMs: REQUEST_TIMEOUT_MS,
    syncRun,
    retrievedAt,
  });

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED", message: "Only POST is supported" }, 405, {});
  }

  const parsed = parseRequestBody(req);
  if ("error" in parsed) {
    return jsonResponse({ error: "INVALID_INPUT", message: parsed.error }, 400, {});
  }

  try {
    let result: {
      status: "resolved" | "ambiguous" | "not_found" | "unavailable";
      candidates: Array<{
        cadastralId: string;
        address: string;
        areaM2: number;
        geometry: unknown;
        source: {
          id: string;
          datasetVersionId: string;
          retrievedAt: string;
        };
      }>;
    };

    if (parsed.cadastralId) {
      result = await resolveByCadastralId(parsed.cadastralId);
    } else if (parsed.addressResultId) {
      result = await resolveByAddressResult(parsed.addressResultId, parsed.addressId);
    } else if (parsed.point) {
      result = await resolveByPoint(parsed.point.coordinates);
    } else {
      return jsonResponse({ error: "INVALID_INPUT", message: "No selector provided" }, 400, {});
    }

    if (result.status === "unavailable") {
      return jsonResponse(
        { error: "SOURCE_UNAVAILABLE", message: "Parcel resolution is temporarily unavailable" },
        503,
        { "Cache-Control": "no-store, max-age=0" }
      );
    }

    if (result.status === "not_found") {
      return jsonResponse(
        { error: "PARCEL_NOT_FOUND", message: "No matching parcel found" },
        404,
        { "Cache-Control": "no-store, max-age=0" }
      );
    }

    return jsonResponse(
      {
        status: result.status,
        candidates: result.candidates.map((c) => ({
          cadastralId: c.cadastralId,
          address: c.address,
          areaM2: c.areaM2,
          geometry: c.geometry,
          source: {
            id: c.source.id,
            datasetVersionId: c.source.datasetVersionId,
            retrievedAt: c.source.retrievedAt,
          },
        })),
      },
      200,
      {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      }
    );
  } catch (err) {
    return jsonResponse(
      {
        error: "PARCEL_UNAVAILABLE",
        message: err instanceof Error ? err.message : "Parcel resolution failed",
      },
      502,
      { "Cache-Control": "no-store, max-age=0" }
    );
  }
});
