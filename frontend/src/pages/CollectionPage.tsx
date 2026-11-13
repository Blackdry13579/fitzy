import { TopBar } from '../components/TopBar';
import { machines } from '../data/machines';

export function CollectionPage() {
  const owned = machines.slice(0, 3);
  const total = 8;
  const count = owned.length;
  const pct = Math.round((count / total) * 100);
  return (
    <div className="screen">
      <TopBar title="Ma collection" back />
      <div className="content">
        <div className="filters">
          {['Tout', 'Cardio', 'Musculation', 'Fitness'].map((f, i) => (
            <button key={f} className={`chip ${i === 0 ? 'active' : ''}`}>{f}</button>
          ))}
        </div>
        <div className="grid">
          {owned.map((m) => (
            <div key={m.id} className="card-pad item">
              <div className="img"><img src={m.image} alt={m.name} /></div>
              <h4>{m.name}</h4>
              <span className="badge">✓ Débloqué</span>
            </div>
          ))}
        </div>
        <div className="card-pad progress-block">
          <div className="row"><strong>Collection complète</strong><span>{count} / {total} ({pct}%)</span></div>
          <div className="progress"><div className="bar" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
      <style>{`
        .screen { background: #fff; min-height: 100%; }
        .content { padding: 14px; background: #ffffff; }
        .filters { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 12px; }
        .chip { border: 1px solid var(--border); background: #fff; padding: 7px 12px; border-radius: 10px; font-size: 13px; white-space: nowrap; }
        .chip.active { background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-color: var(--accent); color: #fff; font-weight: 600; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
        .card-pad { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 10px; }
        .img { aspect-ratio: 1; overflow: hidden; border-radius: 10px; margin-bottom: 8px; }
        .img img { width: 100%; height: 100%; object-fit: cover; transition: transform 300ms ease; }
        .item:hover .img img { transform: scale(1.05); }
        h4 { font-size: 13px; margin: 0 0 6px; }
        .badge { display: inline-block; background: #dcfce7; color: var(--success); font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 10px; }
        .progress-block { padding: 14px; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
        .progress { height: 8px; background: #e5e7eb; border-radius: 10px; overflow: hidden; }
        .bar { height: 100%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
      `}</style>
    </div>
  );
}
