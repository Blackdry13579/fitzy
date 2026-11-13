import { Link, useNavigate } from 'react-router-dom';
import { HelpCircle, Wallet, Users, Gift, Shield } from 'lucide-react';

const items = [
  { q: "Comment créer un compte ?", a: "Inscrivez-vous avec votre numéro de téléphone, un mot de passe et un code d'invitation valide. Votre compte est activé après vérification." },
  { q: "Comment fonctionne FITZONE ?", a: "Vous choisissez une machine (VIP), vous l'activez et vous recevez des profits quotidiens pendant la durée du forfait selon les conditions affichées." },
  { q: "Comment déposer de l'argent ?", a: "Allez dans Portefeuille > Dépôt, entrez le montant et payez via OTP ou via le code marchand Orange Money si l'OTP ne fonctionne pas." },
  { q: "Comment retirer mes gains ?", a: "Allez dans Portefeuille > Retrait, indiquez le montant, le numéro et le nom du bénéficiaire. Les retraits sont traités selon les conditions indiquées (minimum, frais, délai)." },
  { q: "Comment fonctionne le parrainage ?", a: "Partagez votre lien/code d'invitation. Vous gagnez des commissions sur les niveaux de votre équipe selon les règles de parrainage en vigueur." },
  { q: "Puis-je modifier mon numéro de téléphone ?", a: "Non. Pour des raisons de sécurité, seul votre nom d'utilisateur peut être modifié depuis le profil." },
];

export function FaqPage() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <div className="content">
        <button className="back" onClick={() => navigate(-1)}>Retour</button>
        <div className="hero">
          <HelpCircle size={28} />
          <div>
            <h1>FAQ</h1>
            <p>Comment fonctionne FITZONE</p>
          </div>
        </div>

        <div className="cards">
          <div className="mini"><Wallet size={18} /><span>Dépôts & retraits</span></div>
          <div className="mini"><Users size={18} /><span>Parrainage</span></div>
          <div className="mini"><Gift size={18} /><span>Profits quotidiens</span></div>
          <div className="mini"><Shield size={18} /><span>Sécurité</span></div>
        </div>

        <section className="list">
          {items.map((it) => (
            <details key={it.q} className="item">
              <summary>{it.q}</summary>
              <p>{it.a}</p>
            </details>
          ))}
        </section>

        <div className="help">
          <p>Besoin d'aide supplémentaire ?</p>
          <Link to="/support" className="btn">Contacter le support</Link>
        </div>
      </div>
      <style>{`
        .screen{min-height:100%;background:transparent}
        .content{padding:16px 14px 20px;display:flex;flex-direction:column;gap:14px}
        .back{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;border:none;background:#111827;color:#fff;padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer}
        .hero{display:flex;align-items:center;gap:12px;padding:16px;border-radius:20px;color:#fff;background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 45%,#2563eb 100%)}
        .hero h1{margin:0;font-size:22px} .hero p{margin:2px 0 0;color:rgba(255,255,255,.95)}
        .cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .mini{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;font-size:13px;font-weight:600;color:#111827}
        .list{display:flex;flex-direction:column;gap:8px}
        .item{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:12px 14px}
        .item summary{cursor:pointer;font-weight:700;color:#111827;list-style:none}
        .item summary::-webkit-details-marker{display:none}
        .item p{margin:8px 0 0;color:#111827;font-size:14px;line-height:1.5}
        .help{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:14px;text-align:center}
        .help p{margin:0 0 10px;color:#111827}
        .btn{display:inline-flex;align-items:center;justify-content:center;height:42px;padding:0 16px;border-radius:12px;background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 45%,#2563eb 100%);color:#fff;text-decoration:none;font-weight:700}
        @media (min-width: 900px){
          .content{padding:24px 32px 40px;max-width:900px;width:100%;margin:0 auto}
          .cards{grid-template-columns:repeat(4,1fr)}
        }
      `}</style>
    </div>
  );
}
