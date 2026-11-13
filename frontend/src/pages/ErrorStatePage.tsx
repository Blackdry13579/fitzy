import { Link } from 'react-router-dom';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export function ErrorStatePage() {
  return (
    <div className="screen">
      <div className="content">
        <div className="card">
          <div className="icons">
            <AlertTriangle size={34} />
            <WifiOff size={30} />
          </div>
          <h1>Un problème est survenu</h1>
          <p>Impossible de charger certaines informations. Vérifiez votre connexion internet ou réessayez plus tard.</p>
          <div className="actions">
            <button className="btn primary" onClick={() => window.location.reload()}><RefreshCw size={16} /> Réessayer</button>
            <Link to="/" className="btn ghost">Accueil</Link>
          </div>
        </div>

        <div className="card state">
          <h3>États système</h3>
          <div className="row"><span className="dot ok" /> Service opérationnel</div>
          <div className="row"><span className="dot warn" /> Maintenance possible</div>
          <div className="row"><span className="dot err" /> Erreur réseau / serveur</div>
        </div>
      </div>
      <style>{`
        .screen{min-height:100%;background:transparent}
        .content{padding:20px 14px;display:flex;flex-direction:column;gap:14px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:22px 16px;text-align:center;box-shadow:0 6px 18px rgba(15,23,42,.08)}
        .icons{display:flex;justify-content:center;gap:10px;color:#2563eb;margin-bottom:6px}
        h1{margin:0;font-size:22px;color:#111827}
        p{margin:6px 0 14px;color:#111827;font-size:14px;line-height:1.5}
        .actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .btn{height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;text-decoration:none;border:1px solid #e5e7eb;background:#fff;color:#111827;cursor:pointer}
        .btn.primary{background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 45%,#2563eb 100%);color:#fff;border:none}
        .state{text-align:left;padding:16px}
        .state h3{margin:0 0 10px;font-size:16px;color:#111827}
        .row{display:flex;align-items:center;gap:10px;padding:8px 0;color:#111827;font-size:14px}
        .dot{width:10px;height:10px;border-radius:50%}
        .ok{background:#22c55e} .warn{background:#f59e0b} .err{background:#ef4444}
      `}</style>
    </div>
  );
}
