import { useTranslation } from "react-i18next";
import ParcelSearch from "../parcel-search/ParcelSearch";

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{t("landing.title")}</h1>
      <p style={{ fontSize: "1.25rem", color: "#4b5563", marginBottom: "1.5rem" }}>
        {t("tagline")}
      </p>
      <p style={{ marginBottom: "1rem" }}>{t("landing.description")}</p>
      <ParcelSearch
        onParcelResolved={(parcel) => {
          console.log("Parcel resolved:", parcel.cadastralId);
        }}
        onAmbiguousResolve={(parcel) => {
          console.log("Parcel selected from disambiguation:", parcel.cadastralId);
        }}
      />
    </main>
  );
}
