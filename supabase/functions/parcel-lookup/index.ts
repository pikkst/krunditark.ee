import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  normalizeCadastralId,
  isValidEstonianCadastralId,
} from "../../../src/lib/parcel-adapter/maru-wfs.utils.ts";
import { edgeParcelLookup } from "../../../src/lib/parcel-adapter/maru-wfs.edge-handler.ts";

const ALLOWED_MARU_WFS_HOSTS = ["inspire.geoportaal.ee"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const CADASTRAL_ID_MAX_LENGTH = 64;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_FEATURES = 10;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED", message: "Only GET is supported" }, 405, {});
  }

  const url = new URL(req.url);
  const cadastralId = url.searchParams.get("cadastralId")?.trim();

  if (!cadastralId) {
    return jsonResponse({ error: "INVALID_INPUT", message: "cadastralId is required" }, 400, {});
  }

  if (cadastralId.length > CADASTRAL_ID_MAX_LENGTH) {
    return jsonResponse(
      {
        error: "INVALID_INPUT",
        message: `cadastralId must not exceed ${CADASTRAL_ID_MAX_LENGTH} characters`,
      },
      400,
      {}
    );
  }

  if (!isValidEstonianCadastralId(cadastralId)) {
    return jsonResponse(
      { error: "INVALID_CADASTRAL_ID", message: "cadastralId has invalid format" },
      400,
      {}
    );
  }

  const normalizedId = normalizeCadastralId(cadastralId);
  const providerRef = `${normalizedId.slice(0, 5)}:${normalizedId.slice(5, 8)}:${normalizedId.slice(8, 12)}`;
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
    return jsonResponse(
      { error: "INVALID_TARGET", message: "Target host is not allowed" },
      400,
      {}
    );
  }

  const result = await edgeParcelLookup({
    cadastralId: normalizedId,
    wfsUrl,
    maxAttempts: MAX_ATTEMPTS,
    retryableStatuses: RETRYABLE_STATUSES,
    timeoutMs: REQUEST_TIMEOUT_MS,
    syncRun,
    retrievedAt,
  });

  if (!result.valid) {
    return jsonResponse({ error: result.error, message: result.error }, result.status, {
      "Cache-Control": "no-store, max-age=0",
    });
  }

  return jsonResponse({ valid: true, parcel: result.parcel }, 200, {
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
  });
});
