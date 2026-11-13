import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Machine } from '../data/machines';

export function MachineCard({ machine }: { machine: Machine }) {
  return (
    <article className="card machine-card">
      <div className="machine-media">
        <img src={machine.image} alt={machine.name} loading="lazy" />
      </div>
      <div className="machine-body">
        <div className="machine-top">
          <span className="badge">{machine.level}</span>
          <span className="muted">{machine.category}</span>
        </div>
        <h3>{machine.name}</h3>
        <p className="machine-desc">{machine.description}</p>
        <div className="machine-meta">
          <div>
            <span className="meta-label">Prix</span>
            <strong>{machine.priceFcfa.toLocaleString('fr-FR')} FCFA</strong>
          </div>
          <div>
            <span className="meta-label">Revenu/jour</span>
            <strong>{machine.dailyRevenueFcfa.toLocaleString('fr-FR')} FCFA</strong>
          </div>
        </div>
        <Link to={`/catalogue/${machine.id}`} className="machine-link">
          Voir le détail <ArrowRight size={16} />
        </Link>
      </div>
      <style>{`
        .machine-card { overflow: hidden; display: flex; flex-direction: column; }
        .machine-media { aspect-ratio: 16 / 10; background: var(--surface-alt); border-bottom: 1px solid var(--border); }
        .machine-media { overflow: hidden; }
        .machine-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 300ms ease; }
        .machine-card:hover .machine-media img { transform: scale(1.05); }
        .machine-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .machine-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; }
        .machine-desc { font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .machine-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 4px; margin-top: auto; }
        .machine-meta div { display: flex; flex-direction: column; gap: 2px; }
        .meta-label { font-size: 11px; color: var(--text-muted); }
        .machine-meta strong { font-size: 13px; font-weight: 600; color: var(--text); }
        .machine-link { margin-top: 4px; display: inline-flex; align-items: center; gap: 6px; color: var(--accent-strong); font-size: 13px; font-weight: 500; }
      `}</style>
    </article>
  );
}
