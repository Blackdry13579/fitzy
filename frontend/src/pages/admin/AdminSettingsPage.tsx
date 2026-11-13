import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminClient';

export function AdminSettingsPage() {
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(()=>{ (async()=>{ try{ setS(await adminApi('/admin/settings')); }catch(e:any){ setErr(e.message);} })(); },[]);
  const presetsToStr = (v: any) => Array.isArray(v) ? v.join(', ') : (v || '');
  const save = async (e:any) => {
    e.preventDefault(); setMsg(''); setErr('');
    try {
      const payload = { ...s };
      // backend accepts comma string for presets too, but send arrays
      if (typeof payload.depositPresets === 'string') payload.depositPresets = payload.depositPresets.split(',').map((x:string)=>Number(x.trim())).filter((n:number)=>n>0);
      if (typeof payload.withdrawPresets === 'string') payload.withdrawPresets = payload.withdrawPresets.split(',').map((x:string)=>Number(x.trim())).filter((n:number)=>n>0);
      const out = await adminApi('/admin/settings', {method:'PATCH', body: JSON.stringify(payload)});
      setS(out); setMsg('Paramètres enregistrés');
    } catch(e:any){ setErr(e.message); }
  };
  if (!s) return <div className="page"><h1>Paramètres</h1><p>Chargement...</p></div>;
  const set = (k:string,v:any)=>setS({...s,[k]:v});
  return (
    <div className="page">
      <h1>Paramètres & contenus</h1><p className="sub">Gérer les paramètres globaux utilisés côté client (paiement, support, dépôts, retraits) et les identifiants admin</p>
      {err && <p className="err">{err}</p>}{msg && <p className="okmsg">{msg}</p>}
      <form className="card form" onSubmit={save}>
        <h3>Support & paiement</h3>
        <div className="grid">
          <label>Lien support Telegram<input value={s.supportTelegram||''} onChange={e=>set('supportTelegram',e.target.value)} /></label>
          <label>Numéro de dépôt<input value={s.depositNumber||''} onChange={e=>set('depositNumber',e.target.value)} /></label>
          <label>Code marchand (Orange Money)<input value={s.merchantCode||''} onChange={e=>set('merchantCode',e.target.value)} /></label>
        </div>
        <h3>Dépôts</h3>
        <div className="grid">
          <label>Dépôt minimum (FCFA)<input type="number" value={s.minDeposit??500} onChange={e=>set('minDeposit',e.target.value)} /></label>
          <label>Dépôt maximum (FCFA)<input type="number" value={s.maxDeposit??1000000} onChange={e=>set('maxDeposit',e.target.value)} /></label>
          <label className="wide">Montants prédéfinis dépôt (séparés par des virgules)<input value={presetsToStr(s.depositPresets)} onChange={e=>set('depositPresets',e.target.value)} placeholder="2500, 7000, 13000" /></label>
        </div>
        <h3>Retraits</h3>
        <div className="grid">
          <label>Retrait minimum (FCFA)<input type="number" value={s.minWithdraw??1200} onChange={e=>set('minWithdraw',e.target.value)} /></label>
          <label>Retrait maximum (FCFA)<input type="number" value={s.maxWithdraw??1000000} onChange={e=>set('maxWithdraw',e.target.value)} /></label>
          <label>Frais de retrait (%)<input type="number" value={s.withdrawFeePercent??10} onChange={e=>set('withdrawFeePercent',e.target.value)} /></label>
          <label className="wide">Montants prédéfinis retrait (séparés par des virgules)<input value={presetsToStr(s.withdrawPresets)} onChange={e=>set('withdrawPresets',e.target.value)} placeholder="1200, 5000, 10000" /></label>
        </div>
        <h3>Identifiants admin (connexion & récupération)</h3>
        <div className="grid">
          <label>Téléphone/identifiant admin<input value={s.adminPhone||''} onChange={e=>set('adminPhone',e.target.value)} /></label>
          <label>Mot de passe admin<input type="text" value={s.adminPassword||''} onChange={e=>set('adminPassword',e.target.value)} /></label>
          <label>Email de récupération admin<input type="email" value={s.adminEmail||''} onChange={e=>set('adminEmail',e.target.value)} placeholder="email pour recevoir le code" /></label>
        </div>
        <div className="actions"><button className="primary" type="submit">Enregistrer</button></div>
      </form>
      <style>{`
        h1{margin:0;font-size:24px;color:#0f172a}.sub{margin:4px 0 14px;color:#64748b;font-size:14px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;box-shadow:0 8px 20px rgba(15,23,42,.06)}
        h3{margin:16px 0 8px;font-size:16px;color:#0f172a}.card h3:first-of-type{margin-top:0}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
        label{display:grid;gap:6px;font-size:13px;font-weight:600;color:#334155}
        .wide{grid-column:1 / -1}
        input{height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:14px}
        .actions{display:flex;justify-content:flex-end;margin-top:14px}
        .primary{height:42px;padding:0 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:700;cursor:pointer}
        .err{color:#dc2626}.okmsg{color:#16a34a;font-weight:600}
      `}</style>
    </div>
  );
}
