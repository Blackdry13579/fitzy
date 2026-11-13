import { useEffect, useState } from 'react';
import { MessageCircle, Send, HelpCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export function SupportPage() {
  const navigate = useNavigate();
  const [telegramLink, setTelegramLink] = useState('https://t.me/fitzone_support');
  useEffect(() => { api<any>('/settings').then(s => { if (s?.supportTelegram) setTelegramLink(s.supportTelegram); }).catch(()=>{}); }, []);
  return (
    <div className="screen">
      <div className="content">
        <button className="back" onClick={() => navigate(-1)}>Retour</button>
        <div className="hero">
          <MessageCircle size={28} />
          <div>
            <h1>Support</h1>
            <p>Nous sommes là pour vous aider</p>
          </div>
        </div>

        <section className="card">
          <h3>Contacter le support</h3>
          <p>En cas de souci (dépôt, retrait, compte, machine, etc.), contactez notre équipe via le groupe Telegram officiel. Vous pourrez poser vos questions et recevoir de l'aide.</p>
          <a className="btn telegram" href={telegramLink} target="_blank" rel="noreferrer">
            <Send size={18} /> Rejoindre le groupe Telegram
          </a>
          <p className="small">Lien : {telegramLink}</p>
        </section>

        <section className="card">
          <h3>Avant de contacter</h3>
          <ul>
            <li>Vérifiez la FAQ pour une réponse rapide.</li>
            <li>Préparez votre numéro de téléphone et les détails du problème.</li>
            <li>Pour un dépôt/retrait, gardez la preuve de transaction.</li>
          </ul>
          <Link to="/faq" className="btn ghost"><HelpCircle size={18} /> Voir la FAQ</Link>
        </section>
      </div>
      <style>{`
        .screen{min-height:100%;background:transparent}
        .content{padding:16px 14px 20px;display:flex;flex-direction:column;gap:14px}
        .back{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;border:none;background:#111827;color:#fff;padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer}
        .hero{display:flex;align-items:center;gap:12px;padding:16px;border-radius:20px;color:#fff;background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 45%,#2563eb 100%)}
        .hero h1{margin:0;font-size:22px} .hero p{margin:2px 0 0;color:rgba(255,255,255,.95)}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:14px;box-shadow:0 4px 14px rgba(15,23,42,.05)}
        .card h3{margin:0 0 8px;font-size:17px;color:#111827}
        .card p,.card li{color:#111827;font-size:14px;line-height:1.5}
        .card ul{margin:0 0 12px;padding-left:18px;display:grid;gap:6px}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 16px;border-radius:14px;text-decoration:none;font-weight:700;border:none}
        .telegram{width:100%;background:linear-gradient(135deg,#229ED9,#0088cc);color:#fff;margin-top:10px}
        .ghost{width:100%;background:#f3f4f6;color:#111827;border:1px solid #e5e7eb}
        .small{margin:10px 0 0;font-size:12px;word-break:break-all}
        @media (min-width: 900px){
          .content{padding:24px 32px 40px;max-width:900px;width:100%;margin:0 auto}
          .telegram,.ghost{max-width:420px}
        }
      `}</style>
    </div>
  );
}
