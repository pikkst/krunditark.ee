import type { InAksResolveResult } from "./inaks-resolve-handler.types.ts";
import { parseCoordinatePair } from "../inaks-adapter/coordinate-parser.ts";

export function buildAddressResolutionWfsFilter(
  inaksData: unknown,
  addressResultId: string,
  addressId: string
): InAksResolveResult {
  if (!inaksData || typeof inaksData !== "object" || Array.isArray(inaksData)) {
    return {
      status: "invalid_source",
      error: "In-AKS response root must be a non-null object",
    };
  }

  const responseObj = inaksData as Record<string, unknown>;
  const addresses = responseObj.addresses;

  if (!Array.isArray(addresses)) {
    return {
      status: "invalid_source",
      error: "In-AKS response missing addresses array",
    };
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
    return { status: "not_found" };
  }

  const selectedRecord = selected as Record<string, unknown>;
  const liik = selectedRecord.liik;
  const tunnus = selectedRecord.tunnus;

  if (liik === "4" && typeof tunnus === "string" && tunnus.trim().length > 0) {
    const normalized = tunnus.trim().replace(/[:\-.\s]/g, "");
    if (!/^\d{12}$/.test(normalized)) {
      return {
        status: "invalid_source",
        error: "Selected cadastral unit has invalid tunnus",
      };
    }
    const ref = `${normalized.slice(0, 5)}:${normalized.slice(5, 8)}:${normalized.slice(8, 12)}`;
    return {
      status: "resolved",
      mode: "exact_cadastral",
      expectedCadastralId: normalized,
      wfsFilter: `nationalcadastralreference='${ref}'`,
      count: 1,
    };
  }

  const coordError = parseCoordinatePair(
    selectedRecord.viitepunkt_x,
    selectedRecord.viitepunkt_y,
    "viitepunkt_x_y",
    { min: 200000, max: 900000 },
    { min: 6300000, max: 7800000 }
  );

  if (coordError) {
    return {
      status: "invalid_source",
      error: `Selected address result has invalid reference point: ${coordError.message}`,
    };
  }

  const x = Number(selectedRecord.viitepunkt_x);
  const y = Number(selectedRecord.viitepunkt_y);

  return {
    status: "resolved",
    mode: "spatial",
    wfsFilter: `INTERSECTS(geometry, POINT(${x} ${y}))`,
    count: 10,
  };
}
