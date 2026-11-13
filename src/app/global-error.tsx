"use client";

export default function ErreurGlobale({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F8FAFC", color: "#0F172A" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: 28, maxWidth: 420, textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 20px 40px -20px rgba(15,23,42,.3)" }}>
            <img src="/icons/icon-192.png" alt="" style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto" }} />
            <h1 style={{ fontSize: 20, marginTop: 16 }}>DevisBTP CI — incident technique</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>La page n'a pas pu se charger. Vos données sont conservées en toute sécurité.</p>
            <button onClick={() => reset()} style={{ marginTop: 20, width: "100%", background: "#F59E0B", color: "#fff", fontWeight: 800, padding: 14, borderRadius: 16, border: 0, fontSize: 15 }}>Recharger l'application</button>
          </div>
        </main>
      </body>
    </html>
  );
}
