import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { edgeParcelResolve } from "../../../src/lib/parcel-adapter/maru-wfs.resolve-handler.ts";
import { projectLonLatToEpsg3301 } from "../../../src/lib/crs/transform.ts";
import { buildAddressResolutionWfsFilter } from "../../../src/lib/parcel-adapter/inaks-resolve-handler.ts";
import type { InAksResolveResult } from "../../../src/lib/parcel-adapter/inaks-resolve-handler.types.ts";

const ALLOWED_MARU_WFS_HOSTS = ["inspire.geoportaal.ee"];
const ALLOWED_INAKS_HOSTS = ["aks.geoportaal.ee", "aks-test.geoportaal.ee"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const CADASTRAL_ID_MAX_LENGTH = 64;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

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

function isAllowedMaruWfsUrl(url: URL): boolean {
  return ALLOWED_MARU_WFS_HOSTS.includes(url.hostname);
}

function isAllowedInAksUrl(url: URL): boolean {
  return ALLOWED_INAKS_HOSTS.includes(url.hostname);
}

function normalizeCadastralId(raw: string): string {
  return raw.trim().replace(/[:\-.\s]/g, "");
}

function isValidEstonianCadastralId(raw: string): boolean {
  const normalized = normalizeCadastralId(raw);
  if (normalized.length === 0) return false;
  return /^\d{12}$/.test(normalized);
}

function buildMaruWfsUrl(cqlFilter: string, count = 20): URL {
  const url = new URL("https://inspire.geoportaal.ee/geoserver/CP_katastriyksused/wfs");
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", "CP_katastriyksused:CP.CadastralParcel");
  url.searchParams.set("cql_filter", cqlFilter);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("count", String(count));
  url.searchParams.set("srsName", "EPSG:3301");
  return url;
}

async function resolveCadastral(rawId: string) {
  const normalizedId = normalizeCadastralId(rawId);
  const providerRef = `${normalizedId.slice(0, 5)}:${normalizedId.slice(5, 8)}:${normalizedId.slice(8, 12)}`;
  const wfsUrl = buildMaruWfsUrl(`nationalcadastralreference='${providerRef}'`, 10);

  if (!isAllowedMaruWfsUrl(wfsUrl)) {
    return jsonResponse(
      { error: "INVALID_TARGET", message: "Target host is not allowed" },
      400,
      {}
    );
  }

  const syncRun = `maru-wfs-${Date.now()}`;
  const retrievedAt = new Date().toISOString();

  const result = await edgeParcelResolve({
    wfsUrl,
    maxAttempts: MAX_ATTEMPTS,
    retryableStatuses: RETRYABLE_STATUSES,
    timeoutMs: REQUEST_TIMEOUT_MS,
    syncRun,
    retrievedAt,
  });

  return jsonResponse(result, 200, {
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
  });
}

async function resolveAddress(addressResultId: string, addressId: string) {
  const inaksUrl = new URL("https://aks.geoportaal.ee/inaks/inaadress/gazetteer/");
  inaksUrl.searchParams.set("adrid", addressId.trim());

  if (!isAllowedInAksUrl(inaksUrl)) {
    return jsonResponse(
      { error: "INVALID_TARGET", message: "Target host is not allowed" },
      400,
      {}
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let inaksResponse;
  try {
    inaksResponse = await fetch(inaksUrl.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return jsonResponse({ error: "SOURCE_TIMEOUT", message: "In-AKS request timed out" }, 502, {
        "Cache-Control": "no-store, max-age=0",
      });
    }
    return jsonResponse(
      { error: "ADDRESS_SEARCH_UNAVAILABLE", message: "Failed to reach In-AKS" },
      502,
      { "Cache-Control": "no-store, max-age=0" }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!inaksResponse.ok) {
    if (inaksResponse.status === 429) {
      return jsonResponse({ error: "UPSTREAM_ERROR", message: "In-AKS rate limited" }, 502, {
        "Cache-Control": "no-store, max-age=0",
      });
    }
    return jsonResponse(
      {
        error: "UPSTREAM_ERROR",
        message: `In-AKS returned status ${inaksResponse.status}`,
      },
      502,
      { "Cache-Control": "no-store, max-age=0" }
    );
  }

  let inaksData: unknown;
  try {
    inaksData = await inaksResponse.json();
  } catch {
    return jsonResponse({ error: "PARSE_ERROR", message: "In-AKS returned non-JSON" }, 502, {
      "Cache-Control": "no-store, max-age=0",
    });
  }

  if (!inaksData || typeof inaksData !== "object" || Array.isArray(inaksData)) {
    return jsonResponse(
      { error: "PARSE_ERROR", message: "In-AKS response root must be a non-null object" },
      502,
      { "Cache-Control": "no-store, max-age=0" }
    );
  }

  const responseObj = inaksData as Record<string, unknown>;
  const addresses = responseObj.addresses;

  if (!Array.isArray(addresses)) {
    return jsonResponse(
      { error: "PARSE_ERROR", message: "In-AKS response missing addresses array" },
      502,
      { "Cache-Control": "no-store, max-age=0" }
    );
  }

  const selected = addresses.find((addr) => {
    if (typeof addr !== "object" || addr === null) return false;
    const record = addr as Record<string, unknown>;
    const adsOid = record.ads_oid;
    const adrId = record.adr_id;
    return (
      typeof adsOid === "string" &&
      typeof adrId === "string" &&
      adsOid.trim() === addressResultId.trim() &&
      adrId.trim() === addressId.trim()
    );
  });

  if (!selected) {
    return jsonResponse({ status: "not_found", candidates: [] }, 200, {
      "Cache-Control": "no-store, max-age=0",
    });
  }

  const selectedRecord = selected as Record<string, unknown>;
  const liik = selectedRecord.liik;
  const tunnus = selectedRecord.tunnus;

  let cqlFilter: string;
  let count = 10;
  if (liik === "4" && typeof tunnus === "string" && tunnus.trim().length > 0) {
    const normalized = normalizeCadastralId(tunnus);
    if (!isValidEstonianCadastralId(normalized)) {
      return jsonResponse(
        { error: "INVALID_CADASTRAL_ID", message: "Selected cadastral unit has invalid tunnus" },
        400,
        { "Cache-Control": "no-store, max-age=0" }
      );
    }
    const ref = `${normalized.slice(0, 5)}:${normalized.slice(5, 8)}:${normalized.slice(8, 12)}`;
    cqlFilter = `nationalcadastralreference='${ref}'`;
    count = 1;
  } else {
    const viiteX = selectedRecord.viitepunkt_x;
    const viiteY = selectedRecord.viitepunkt_y;
    if (
      typeof viiteX !== "number" ||
      typeof viiteY !== "number" ||
      !Number.isFinite(viiteX) ||
      !Number.isFinite(viiteY)
    ) {
      return jsonResponse(
        {
          error: "PARSE_ERROR",
          message: "Selected address result missing valid viitepunkt_x/viitepunkt_y",
        },
        502,
        { "Cache-Control": "no-store, max-age=0" }
      );
    }
    cqlFilter = `INTERSECTS(geometry, POINT(${viiteX} ${viiteY}))`;
  }

  const wfsUrl = buildMaruWfsUrl(cqlFilter, count);

  if (!isAllowedMaruWfsUrl(wfsUrl)) {
    return jsonResponse(
      { error: "INVALID_TARGET", message: "Target host is not allowed" },
      400,
      {}
    );
  }

  const syncRun = `maru-wfs-${Date.now()}`;
  const retrievedAt = new Date().toISOString();

  const result = await edgeParcelResolve({
    wfsUrl,
    maxAttempts: MAX_ATTEMPTS,
    retryableStatuses: RETRYABLE_STATUSES,
    timeoutMs: REQUEST_TIMEOUT_MS,
    syncRun,
    retrievedAt,
  });

  return jsonResponse(result, 200, {
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
  });
}

async function resolvePoint(lat: number, lng: number) {
  const { x, y } = projectLonLatToEpsg3301(lng, lat);
  const wfsUrl = buildMaruWfsUrl(`INTERSECTS(geometry, POINT(${x} ${y}))`, 50);

  if (!isAllowedMaruWfsUrl(wfsUrl)) {
    return jsonResponse(
      { error: "INVALID_TARGET", message: "Target host is not allowed" },
      400,
      {}
    );
  }

  const syncRun = `maru-wfs-${Date.now()}`;
  const retrievedAt = new Date().toISOString();

  const result = await edgeParcelResolve({
    wfsUrl,
    maxAttempts: MAX_ATTEMPTS,
    retryableStatuses: RETRYABLE_STATUSES,
    timeoutMs: REQUEST_TIMEOUT_MS,
    syncRun,
    retrievedAt,
  });

  return jsonResponse(result, 200, {
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "METHOD_NOT_ALLOWED", message: "Only POST is supported" },
      405,
      {}
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "Request body must be valid JSON" },
      400,
      {}
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "Request body must be an object" },
      400,
      {}
    );
  }

  const request = body as Record<string, unknown>;
  const selector = request.selector;

  if (!selector || typeof selector !== "object" || Array.isArray(selector)) {
    return jsonResponse({ error: "INVALID_INPUT", message: "selector is required" }, 400, {});
  }

  const selectorObj = selector as Record<string, unknown>;
  const selectorType = selectorObj.type;

  if (selectorType !== "cadastral" && selectorType !== "address" && selectorType !== "point") {
    return jsonResponse(
      {
        error: "INVALID_INPUT",
        message: "selector.type must be one of: cadastral, address, point",
      },
      400,
      {}
    );
  }

  if (selectorType === "cadastral") {
    const rawId = selectorObj.cadastralId;
    if (typeof rawId !== "string" || rawId.trim().length === 0) {
      return jsonResponse(
        { error: "INVALID_INPUT", message: "cadastralId is required for cadastral selector" },
        400,
        {}
      );
    }
    if (rawId.length > CADASTRAL_ID_MAX_LENGTH) {
      return jsonResponse(
        {
          error: "INVALID_INPUT",
          message: `cadastralId must not exceed ${CADASTRAL_ID_MAX_LENGTH} characters`,
        },
        400,
        {}
      );
    }
    if (!isValidEstonianCadastralId(rawId)) {
      return jsonResponse(
        { error: "INVALID_CADASTRAL_ID", message: "cadastralId has invalid format" },
        400,
        {}
      );
    }
    return resolveCadastral(rawId);
  }

  if (selectorType === "address") {
    const addressResultId = selectorObj.addressResultId;
    const addressId = selectorObj.addressId;

    if (typeof addressResultId !== "string" || addressResultId.trim().length === 0) {
      return jsonResponse(
        { error: "INVALID_INPUT", message: "addressResultId is required for address selector" },
        400,
        {}
      );
    }
    if (typeof addressId !== "string" || addressId.trim().length === 0) {
      return jsonResponse(
        { error: "INVALID_INPUT", message: "addressId is required for address selector" },
        400,
        {}
      );
    }
    return resolveAddress(addressResultId, addressId);
  }

  const point = selectorObj.point;
  if (!point || typeof point !== "object" || Array.isArray(point)) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "point is required for point selector" },
      400,
      {}
    );
  }

  const lat = (point as Record<string, unknown>).lat;
  const lng = (point as Record<string, unknown>).lng;

  if (typeof lat !== "number" || !Number.isFinite(lat)) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "point.lat must be a finite number" },
      400,
      {}
    );
  }
  if (typeof lng !== "number" || !Number.isFinite(lng)) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "point.lng must be a finite number" },
      400,
      {}
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "point coordinates out of WGS84 range" },
      400,
      {}
    );
  }

  return resolvePoint(lat, lng);
});
