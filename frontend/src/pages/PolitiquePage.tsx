import { Link, useNavigate } from 'react-router-dom';
import { Shield, FileText, HelpCircle, Headphones } from 'lucide-react';

export function PolitiquePage() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <div className="content">
        <button className="back" onClick={() => navigate(-1)}>Retour</button>
        <div className="hero">
          <Shield size={26} />
          <div>
            <h1>Politique & Infos</h1>
            <p>Informations légales et assistance</p>
          </div>
        </div>

        <div className="list">
          <Link to="/politique/conditions" className="item card">
            <div className="icon"><FileText size={20} /></div>
            <div><strong>Conditions d'utilisation</strong><p>Règles d'utilisation de la plateforme FITZONE.</p></div>
          </Link>
          <Link to="/politique/confidentialite" className="item card">
            <div className="icon"><Shield size={20} /></div>
            <div><strong>Politique de confidentialité</strong><p>Comment vos données sont collectées et protégées.</p></div>
          </Link>
          <Link to="/faq" className="item card">
            <div className="icon"><HelpCircle size={20} /></div>
            <div><strong>FAQ</strong><p>Réponses aux questions fréquentes.</p></div>
          </Link>
          <Link to="/support" className="item card">
            <div className="icon"><Headphones size={20} /></div>
            <div><strong>Support</strong><p>Contacter l'équipe via le groupe Telegram.</p></div>
          </Link>
        </div>
      </div>
      <style>{`
        .screen{min-height:100%;background:transparent}
        .content{padding:16px 14px 20px;display:flex;flex-direction:column;gap:14px}
        .back{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;border:none;background:#111827;color:#fff;padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer}
        .hero{display:flex;align-items:center;gap:12px;padding:16px;border-radius:20px;color:#fff;background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 45%,#2563eb 100%)}
        .hero h1{margin:0;font-size:22px} .hero p{margin:2px 0 0;color:rgba(255,255,255,.95)}
        .list{display:flex;flex-direction:column;gap:10px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 14px rgba(15,23,42,.05)}
        .item{display:flex;gap:12px;align-items:center;padding:14px;text-decoration:none;color:inherit}
        .icon{width:42px;height:42px;border-radius:12px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .item strong{display:block;color:#111827;font-size:15px}
        .item p{margin:2px 0 0;color:#111827;font-size:13px}
      `}</style>
    </div>
  );
}
