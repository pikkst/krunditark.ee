import { useTranslation } from "react-i18next";

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{t("landing.title")}</h1>
      <p style={{ fontSize: "1.25rem", color: "#4b5563", marginBottom: "1.5rem" }}>
        {t("tagline")}
      </p>
      <p style={{ marginBottom: "1rem" }}>{t("landing.description")}</p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder={t("landing.search.placeholder")}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            fontSize: "1rem",
          }}
        />
        <button
          type="button"
          style={{
            padding: "0.75rem 1.25rem",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          {t("landing.search.button")}
        </button>
      </div>
    </main>
  );
}
