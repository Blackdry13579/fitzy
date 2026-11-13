export function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page">
      <p className="eyebrow accent">FITZONE</p>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{title}</h1>
      <p>{subtitle}</p>
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <p style={{ fontSize: 14 }}>Cette section sera implémentée prochainement (UI + intégration backend).</p>
      </div>
    </div>
  );
}
