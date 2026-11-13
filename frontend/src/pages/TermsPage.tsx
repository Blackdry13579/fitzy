import { useNavigate } from 'react-router-dom';

export function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <div className="content">
        <button className="back" onClick={() => navigate(-1)}>Retour</button>
        <h1>Conditions d'utilisation</h1>
        <section className="card">
          <h3>1. Acceptation</h3>
          <p>En utilisant FITZONE, vous acceptez les présentes conditions d'utilisation et vous engagez à fournir des informations exactes.</p>
          <h3>2. Compte utilisateur</h3>
          <p>Vous êtes responsable de la confidentialité de votre compte. Le numéro de téléphone sert d'identifiant et ne peut pas être modifié depuis le profil. Seul le nom d'utilisateur peut être modifié.</p>
          <h3>3. Dépôts, retraits et paiements</h3>
          <p>Les dépôts et retraits sont soumis aux limites, frais et délais affichés dans l'application. En cas d'indisponibilité du code OTP, le paiement peut être effectué via le code marchand Orange Money selon les instructions fournies.</p>
          <h3>4. Machines et profits</h3>
          <p>Les informations de prix, durée et profits sont affichées avant toute activation. Les résultats peuvent dépendre des conditions du service et des règles en vigueur.</p>
          <h3>5. Parrainage</h3>
          <p>Les commissions de parrainage sont calculées selon les niveaux et pourcentages définis par la plateforme.</p>
          <h3>6. Suspension</h3>
          <p>FITZONE se réserve le droit de suspendre un compte en cas de fraude, d'abus ou de non-respect des règles.</p>
        </section>
      </div>
      <style>{`
        .screen{min-height:100%;background:transparent}
        .content{padding:16px 14px 20px}
        .back{display:inline-flex;align-items:center;justify-content:center;border:none;background:#111827;color:#fff;padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer;margin-bottom:10px}
        h1{margin:0 0 12px;font-size:24px;color:#111827}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:14px;box-shadow:0 4px 14px rgba(15,23,42,.05)}
        h3{margin:12px 0 6px;font-size:16px;color:#111827} h3:first-child{margin-top:0}
        p{margin:0;color:#111827;font-size:14px;line-height:1.55}
      `}</style>
    </div>
  );
}
