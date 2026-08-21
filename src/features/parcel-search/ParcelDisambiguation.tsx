import { useTranslation } from "react-i18next";
import type { ParcelGeometry } from "../../domain/parcel/types";
import type { ParcelDisambiguationProps } from "./ParcelDisambiguation.types";
import "./ParcelDisambiguation.css";

function geometryToSvgPaths(geometry: ParcelGeometry): string[] {
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
    const outerRing = polygon[0];
    return "M" + outerRing.map((p) => transform(p[0], p[1])).join("L") + "Z";
  });
}

function formatCadastralId(id: string): string {
  return `${id.slice(0, 5)}:${id.slice(5, 8)}:${id.slice(8, 12)}`;
}

export default function ParcelDisambiguation({ candidates, onSelect }: ParcelDisambiguationProps) {
  const { t, i18n } = useTranslation();

  const formatArea = (area: number): string => {
    return area.toLocaleString(i18n.language);
  };

  return (
    <div
      className="parcel-disambiguation"
      role="listbox"
      aria-label={t("parcelSearch.disambiguationLabel")}
    >
      <p className="parcel-disambiguation__title">{t("parcelSearch.disambiguationTitle")}</p>
      <p className="parcel-disambiguation__description">
        {t("parcelSearch.disambiguationDescription")}
      </p>
      <ul className="parcel-disambiguation__list">
        {candidates.map((candidate, index) => {
          const paths = geometryToSvgPaths(candidate.geometry);
          return (
            <li
              key={candidate.id}
              className="parcel-disambiguation__item"
              role="option"
              aria-selected="false"
            >
              <div className="parcel-disambiguation__preview">
                <svg
                  viewBox="0 0 100 80"
                  className="parcel-disambiguation__svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  {paths.map((path, i) => (
                    <path key={i} d={path} className="parcel-disambiguation__outline" />
                  ))}
                </svg>
              </div>
              <div className="parcel-disambiguation__info">
                <span className="parcel-disambiguation__index">
                  {t("parcelSearch.disambiguationCandidate", { index: index + 1 })}
                </span>
                <span className="parcel-disambiguation__address">
                  {candidate.facts.addressText || t("parcelSearch.disambiguationNoAddress")}
                </span>
                <span className="parcel-disambiguation__cadastral">
                  {formatCadastralId(candidate.cadastralId)}
                </span>
                <span className="parcel-disambiguation__area">
                  {t("parcelSearch.disambiguationArea")}:{" "}
                  {formatArea(candidate.facts.areaM2Computed)} m²
                </span>
              </div>
              <button
                type="button"
                className="parcel-disambiguation__select-button"
                onClick={() => onSelect(candidate)}
              >
                {t("parcelSearch.disambiguationUseParcel")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
