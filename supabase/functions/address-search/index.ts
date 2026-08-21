import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { INAKS_GAZETTEER_BASE } from "../_shared/inaks.ts";

const ALLOWED_INAKS_HOSTS = ["aks.geoportaal.ee", "aks-test.geoportaal.ee"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const QUERY_MAX_LENGTH = 256;
const ADRID_MAX_LENGTH = 64;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED", message: "Only GET is supported" }, 405, {});
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim();
  const adrid = url.searchParams.get("adrid")?.trim();

  if (!query && !adrid) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "Provide exactly one of q or adrid" },
      400,
      {}
    );
  }

  if (query && adrid) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "Provide only one of q or adrid" },
      400,
      {}
    );
  }

  if (query && query.length > QUERY_MAX_LENGTH) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: `q must not exceed ${QUERY_MAX_LENGTH} characters` },
      400,
      {}
    );
  }

  if (adrid && (adrid.length === 0 || adrid.length > ADRID_MAX_LENGTH || !/^\d+$/.test(adrid))) {
    return jsonResponse(
      { error: "INVALID_INPUT", message: "adrid must be a digits-only identifier" },
      400,
      {}
    );
  }

  const gazetteerUrl = new URL(INAKS_GAZETTEER_BASE);
  if (query) gazetteerUrl.searchParams.set("address", query);
  if (adrid) gazetteerUrl.searchParams.set("adrid", adrid);

  if (!isAllowedInAksUrl(gazetteerUrl)) {
    return jsonResponse(
      { error: "INVALID_TARGET", message: "Target host is not allowed" },
      400,
      {}
    );
  }

  try {
    const upstream = await fetch(gazetteerUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!upstream.ok) {
      return jsonResponse(
        {
          error: "UPSTREAM_ERROR",
          message: `In-AKS returned status ${upstream.status}`,
        },
        502,
        { "Cache-Control": "no-store, max-age=0" }
      );
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return jsonResponse({ error: "INVALID_RESPONSE", message: "In-AKS returned non-JSON" }, 502, {
        "Cache-Control": "no-store, max-age=0",
      });
    }

    const data = await upstream.json();

    const isExactLookup = !!adrid;
    const hasEmptyAddresses =
      !data.addresses || !Array.isArray(data.addresses) || data.addresses.length === 0;
    const cacheTtl = hasEmptyAddresses ? 300 : isExactLookup ? 86400 : 3600;

    return jsonResponse(data, 200, {
      "Cache-Control": `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`,
    });
  } catch (err) {
    return jsonResponse(
      {
        error: "ADDRESS_SEARCH_UNAVAILABLE",
        message: "Failed to reach In-AKS",
      },
      502,
      { "Cache-Control": "no-store, max-age=0" }
    );
  }
});
