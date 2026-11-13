import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Users, User, Sparkles, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const steps = [
  { title: 'Bienvenue sur FITZONE', text: 'Découvre rapidement comment utiliser l’app : dépôt, retrait, parrainage et profil.', icon: Sparkles, color: '#2563eb' },
  { title: 'Dépôt', text: 'Recharge ton portefeuille facilement depuis “Dépôt”. Choisis un montant, paie (OTP ou code marchand) et valide.', icon: ArrowDownToLine, color: '#0ea5e9' },
  { title: 'Retrait', text: 'Retire tes gains vers ton numéro depuis “Retrait”. Les frais et limites sont affichés avant confirmation.', icon: ArrowUpFromLine, color: '#6366f1' },
  { title: 'Parrainage', text: 'Partage ton lien/code d’invitation. Tes commissions de parrainage sont calculées et ajoutées à ton solde.', icon: Users, color: '#8b5cf6' },
  { title: 'Profil & Portefeuille', text: 'Gère ton compte dans “Profil/Compte” et suis ton solde, ton historique et tes produits dans “Portefeuille”.', icon: User, color: '#1d4ed8' },
];

export function Onboarding() {
  const { refresh } = useAuth();
  const [i, setI] = useState(0);
  const [closing, setClosing] = useState(false);
  const s = steps[i];
  const Icon = s.icon;

  const finish = async () => {
    setClosing(true);
    try { await api('/profile', { method: 'PATCH', body: JSON.stringify({ onboardingDone: true }) }); } catch {}
    await refresh();
  };

  const next = () => {
    if (i < steps.length - 1) setI(i + 1); else finish();
  };

  return (
    <div className={`ob-backdrop ${closing ? 'fade' : ''}`}>
      <div className="ob-card">
        <div className="ob-progress">
          {steps.map((_, idx) => <span key={idx} className={`dot ${idx === i ? 'on' : ''} ${idx < i ? 'done' : ''}`} />)}
        </div>
        <div className="ob-illu" style={{ background: `linear-gradient(135deg, ${s.color}, #1e40af)` }}>
          <div className="pulse" />
          <Icon size={46} color="#fff" />
        </div>
        <div className="ob-body" key={i}>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
        </div>
        <div className="ob-actions">
          <button className="skip" onClick={finish}>Passer</button>
          <button className="next" onClick={next}>{i < steps.length - 1 ? <>Suivant <ChevronRight size={18}/></> : 'Commencer'}</button>
        </div>
      </div>
      <style>{`
        .ob-backdrop{position:absolute;inset:0;z-index:200;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;animation:obIn .25s ease}
        .ob-backdrop.fade{opacity:.4}
        @keyframes obIn{from{opacity:0}to{opacity:1}}
        .ob-card{width:100%;max-width:380px;background:#fff;border-radius:24px;padding:20px;box-shadow:0 30px 60px rgba(15,23,42,.25);overflow:hidden}
        .ob-progress{display:flex;justify-content:center;gap:6px;margin-bottom:14px}
        .dot{width:8px;height:8px;border-radius:99px;background:#e2e8f0;transition:all .25s}.dot.on{width:22px;background:#2563eb}.dot.done{background:#93c5fd}
        .ob-illu{height:140px;border-radius:18px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
        .pulse{position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.18);animation:pulse 2s infinite ease-out}
        .pulse:after{content:'';position:absolute;inset:-18px;border-radius:50%;border:2px solid rgba(255,255,255,.25);animation:pulse 2s infinite ease-out .4s}
        @keyframes pulse{0%{transform:scale(.85);opacity:.9}100%{transform:scale(1.25);opacity:0}}
        .ob-body{padding:16px 4px 6px;text-align:center;animation:slideUp .3s ease}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .ob-body h2{margin:0;font-size:22px;color:#0f172a}
        .ob-body p{margin:8px 0 0;color:#475569;font-size:14px;line-height:1.5}
        .ob-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px}
        .skip{background:none;border:none;color:#64748b;font-weight:600;padding:10px 8px;cursor:pointer}
        .next{height:44px;padding:0 18px;border:none;border-radius:14px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 10px 20px rgba(37,99,235,.25)}
      `}</style>
    </div>
  );
}
