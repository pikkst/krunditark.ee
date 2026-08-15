export default function LandingPage() {
  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Krunditark</h1>
      <p style={{ fontSize: "1.25rem", color: "#4b5563", marginBottom: "1.5rem" }}>
        Tea enne, kui ehitad.
      </p>
      <p style={{ marginBottom: "1rem" }}>
        Sisesta aadress või katastritunnus, et alusta krundi ja ehitusvõimaluste analüüsi.
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Nt Pärnu mnt 10, Tallinn või 12345:678:9012"
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
          Otsi
        </button>
      </div>
    </main>
  );
}
