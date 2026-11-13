import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="screen">
      <div className="content">
        <div className="card">
          <SearchX size={48} />
          <h1>Page introuvable</h1>
          <p>La page que vous recherchez n'existe pas ou a été déplacée.</p>
          <Link to="/" className="btn">Retour à l'accueil</Link>
        </div>
      </div>
      <style>{`
        .screen{min-height:100%;background:transparent;display:flex;align-items:center}
        .content{padding:20px 14px;width:100%}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:28px 18px;text-align:center;box-shadow:0 6px 18px rgba(15,23,42,.08);display:flex;flex-direction:column;align-items:center;gap:8px;color:#2563eb}
        h1{margin:0;font-size:22px;color:#111827}
        p{margin:0 0 8px;color:#111827;font-size:14px}
        .btn{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 18px;border-radius:14px;background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 45%,#2563eb 100%);color:#fff;text-decoration:none;font-weight:700}
      `}</style>
    </div>
  );
}
