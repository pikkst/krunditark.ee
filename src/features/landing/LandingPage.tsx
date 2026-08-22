import { useTranslation } from "react-i18next";
import ParcelSearch from "../parcel-search/ParcelSearch";
import ParcelOverview from "../parcel-overview/ParcelOverview";
import { useProjectState } from "../project-state";

export default function LandingPage() {
  const { t } = useTranslation();
  const { selectedParcel, setSelectedParcel, setSelectedIntent } = useProjectState();

  const handleIntentSelected = (code: Parameters<typeof setSelectedIntent>[0]) => {
    setSelectedIntent(code);
  };

  if (selectedParcel) {
    return (
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" }}>
        <ParcelOverview parcel={selectedParcel} onIntentSelected={handleIntentSelected} />
        <button
          type="button"
          onClick={() => {
            setSelectedParcel(null);
            setSelectedIntent(null);
          }}
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            color: "#2563eb",
            background: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          {t("parcelOverview.backToSearch")}
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{t("landing.title")}</h1>
      <p style={{ fontSize: "1.25rem", color: "#4b5563", marginBottom: "1.5rem" }}>
        {t("tagline")}
      </p>
      <p style={{ marginBottom: "1rem" }}>{t("landing.description")}</p>
      <ParcelSearch
        onParcelResolved={(parcel) => setSelectedParcel(parcel)}
        onAmbiguousResolve={(parcel) => setSelectedParcel(parcel)}
      />
    </main>
  );
}
