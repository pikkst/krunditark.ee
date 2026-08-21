import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import type { Parcel } from "../../domain/parcel/types";
import type { IntentCode } from "../../domain/intent/types";
import { INTENT_I18N_KEYS, isIntentSupported, isIntentPlanned } from "../../domain/intent/types";
import { formatCadastralId, formatArea } from "./parcel-overview.utils";
import "./ParcelOverview.css";

function geometryToSvgPaths(geometry: Parcel["geometry"]): string[] {
  const { type, coordinates } = geometry;
  const polygons = type === "Polygon" ? [coordinates] : coordinates;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const dataWidth = maxX - minX || 1;
  const dataHeight = maxY - minY || 1;
  const vbWidth = 100;
  const vbHeight = 80;
  const scale = Math.min(vbWidth / dataWidth, vbHeight / dataHeight);
  const offsetX = (vbWidth - dataWidth * scale) / 2;
  const offsetY = (vbHeight - dataHeight * scale) / 2;

  function transform(x: number, y: number): string {
    const sx = (x - minX) * scale + offsetX;
    const sy = vbHeight - ((y - minY) * scale + offsetY);
    return `${sx.toFixed(1)},${sy.toFixed(1)}`;
  }

  return polygons.map((polygon) => {
    const rings = polygon.map(
      (ring) => "M" + ring.map((p) => transform(p[0], p[1])).join("L") + "Z"
    );
    return rings.join("");
  });
}

export interface ParcelOverviewProps {
  parcel: Parcel;
  onIntentSelected: (code: IntentCode) => void;
}

export default function ParcelOverview({ parcel, onIntentSelected }: ParcelOverviewProps) {
  const { t, i18n } = useTranslation();
  const paths = geometryToSvgPaths(parcel.geometry);
  const area = formatArea(parcel.facts.areaM2Computed, i18n.language);
  const sourceDate = parcel.source.retrievedAt
    ? new Date(parcel.source.retrievedAt).toLocaleDateString(i18n.language)
    : undefined;

  const intents: IntentCode[] = [
    "build",
    "pre_purchase",
    "understand_parcel",
    "existing_building_modification",
    "professional",
  ];

  return (
    <div className="parcel-overview">
      <header className="parcel-overview__header">
        <h2 className="parcel-overview__title">
          {parcel.facts.addressText || t("parcelOverview.noAddress")}
        </h2>
        <p className="parcel-overview__cadastral">{formatCadastralId(parcel.cadastralId)}</p>
      </header>

      <div className="parcel-overview__map" aria-label={t("parcelOverview.mapLabel")}>
        <svg
          viewBox="0 0 100 80"
          className="parcel-overview__svg"
          aria-hidden="true"
          focusable="false"
        >
          {paths.map((path, i) => (
            <path
              key={i}
              d={path}
              className="parcel-overview__outline"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          ))}
        </svg>
      </div>

      <div className="parcel-overview__facts">
        <div className="parcel-overview__fact">
          <span className="parcel-overview__fact-label">{t("parcelOverview.area")}</span>
          <span className="parcel-overview__fact-value">{area} m²</span>
        </div>
        {parcel.facts.addressText && (
          <div className="parcel-overview__fact">
            <span className="parcel-overview__fact-label">{t("parcelOverview.address")}</span>
            <span className="parcel-overview__fact-value">{parcel.facts.addressText}</span>
          </div>
        )}
        <div className="parcel-overview__fact">
          <span className="parcel-overview__fact-label">{t("parcelOverview.dataFreshness")}</span>
          <span className="parcel-overview__fact-value">
            {sourceDate || t("ui.freshness.unknown")}
          </span>
        </div>
      </div>

      <div className="parcel-overview__coverage">
        <h3 className="parcel-overview__coverage-title">{t("parcelOverview.supportedCoverage")}</h3>
        <ul className="parcel-overview__coverage-list">
          <li>{t("parcelOverview.coveragePlanning")}</li>
          <li>{t("parcelOverview.coverageRestrictions")}</li>
          <li>{t("parcelOverview.coverageEnvironment")}</li>
          <li>{t("parcelOverview.coveragePartial")}</li>
        </ul>
        <p className="parcel-overview__coverage-note">{t("parcelOverview.coverageNote")}</p>
      </div>

      <div className="parcel-overview__intent">
        <h3 className="parcel-overview__intent-title">{t("parcelOverview.intentTitle")}</h3>
        <div
          className="parcel-overview__intent-buttons"
          role="group"
          aria-label={t("parcelOverview.intentTitle")}
        >
          {intents.map((code) => {
            const supported = isIntentSupported(code);
            const planned = isIntentPlanned(code);
            const label = t(INTENT_I18N_KEYS[code]);
            return (
              <button
                key={code}
                type="button"
                className={cn(
                  "parcel-overview__intent-button",
                  supported && "parcel-overview__intent-button--primary",
                  planned && "parcel-overview__intent-button--secondary"
                )}
                onClick={() => onIntentSelected(code)}
              >
                {label}
                {planned && (
                  <span className="parcel-overview__intent-soon">{t("parcelOverview.soon")}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
