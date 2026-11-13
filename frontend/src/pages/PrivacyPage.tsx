import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <div className="content">
        <button className="back" onClick={() => navigate(-1)}>Retour</button>
        <h1>Politique de confidentialité</h1>
        <section className="card">
          <h3>1. Données collectées</h3>
          <p>Nous collectons les informations nécessaires au fonctionnement du service : numéro de téléphone, nom d'utilisateur, informations de parrainage, transactions et activités liées aux machines.</p>
          <h3>2. Utilisation des données</h3>
          <p>Vos données sont utilisées pour gérer votre compte, traiter les dépôts/retraits, calculer les profits et commissions, assurer la sécurité et améliorer le service.</p>
          <h3>3. Partage</h3>
          <p>Les données ne sont partagées qu'avec les prestataires nécessaires au fonctionnement du service (paiement, hébergement, sécurité) ou lorsque la loi l'exige.</p>
          <h3>4. Sécurité</h3>
          <p>Nous mettons en œuvre des mesures de sécurité pour protéger vos informations. Aucune méthode n'est toutefois totalement infaillible.</p>
          <h3>5. Vos droits</h3>
          <p>Vous pouvez demander l'accès ou la correction de certaines informations de votre compte. Le numéro de téléphone ne peut pas être modifié directement depuis le profil pour des raisons de sécurité.</p>
          <h3>6. Contact</h3>
          <p>Pour toute question relative à la confidentialité, contactez le support via le groupe Telegram officiel.</p>
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
