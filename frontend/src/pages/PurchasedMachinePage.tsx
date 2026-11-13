import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { api } from '../api/client';

export function PurchasedMachinePage() {
  const { id } = useParams();
  const [p, setP] = useState<any>(null);
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    if (id) api<any>(`/purchases/${id}`).then(setP).catch(()=>setP(null));
    api<any[]>('/machines').then(setMachines).catch(()=>{});
  }, [id]);

  if (!p) return <div className="screen"><TopBar title="Détail de ma machine" back /><div className="content">Chargement...</div></div>;
  const base = p.machine || {};
  const vipIndex = Math.max(1, machines.findIndex((m) => m.id === base.id) + 1);
  const totalCredits = p.totalRevenue || 0;
  const montantPris = p.earned || 0;
  const montantRestant = p.remaining || 0;

  return (
    <div className="screen">
      <TopBar title="Détail de ma machine" back />
      <div className="hero-wrap">
        <div className="hero-img"><img src={base.image} alt={base.name} /></div>
      </div>
      <div className="content">
        <div className="head card">
          <img className="i3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hammer%20and%20wrench/3D/hammer_and_wrench_3d.png" alt="" />
          <div>
            <p className="label">Machine achetée</p>
            <h1><span className="vip-gold">VIP{vipIndex}</span> · {base.name}</h1>
            <p className="sub">{base.category}</p>
          </div>
        </div>

        <section className="card stats">
          <div className="card-head">
            <img className="i3d-sm" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wrapped%20gift/3D/wrapped_gift_3d.png" alt="" />
            <h3>Suivi des gains</h3>
          </div>
          <div className="grid">
            <div className="box b1"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dollar%20banknote/3D/dollar_banknote_3d.png" alt="" /><span>Montant pris</span><strong>{montantPris.toLocaleString('fr-FR')} FCFA</strong></div>
            <div className="box b2"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png" alt="" /><span>Reste à prendre</span><strong>{montantRestant.toLocaleString('fr-FR')} FCFA</strong></div>
            <div className="box b3"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Alarm%20clock/3D/alarm_clock_3d.png" alt="" /><span>Jours écoulés</span><strong>{p.daysElapsed} jours</strong></div>
            <div className="box b4"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png" alt="" /><span>Jours restants</span><strong>{p.daysLeft} jours</strong></div>
          </div>
          <div className="progress">
            <div className="prow"><span>Progression</span><span>{p.daysElapsed}/{p.durationDays} jours</span></div>
            <div className="bar"><div className="fill" style={{ width: `${p.progress || 0}%` }} /></div>
          </div>
        </section>

        <section className="card info">
          <h3>Détails</h3>
          <div className="row"><span>Crédit quotidien</span><strong>+{(p.dailyRevenue||0).toLocaleString('fr-FR')} FCFA</strong></div>
          <div className="row"><span>Prix d'achat</span><strong>{(p.amount||0).toLocaleString('fr-FR')} FCFA</strong></div>
          <div className="row"><span>Durée totale</span><strong>{p.durationDays} jours</strong></div>
          <div className="row"><span>Total des crédits</span><strong>{totalCredits.toLocaleString('fr-FR')} FCFA</strong></div>
        </section>
      </div>
      <style>{`
        .screen{background:transparent;min-height:100%}
        .hero-wrap{position:relative}
        .hero-img{width:100%;aspect-ratio:16/10;overflow:hidden;background:#f3f4f6}
        .hero-img img{width:100%;height:100%;object-fit:cover}
        .content{padding:12px 14px 20px;display:flex;flex-direction:column;gap:12px}
        .card{background:#fff;border-radius:20px;padding:14px;box-shadow:0 6px 18px rgba(15,23,42,.08);border:1px solid #e5e7eb}
        .head{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#ecfeff,#f0fdf4);border-color:#a7f3d0}
        .i3d{width:52px;height:52px;object-fit:contain}
        .label{margin:0;font-size:12px;color:#047857;font-weight:600}
        .head h1{margin:2px 0 4px;font-size:20px;color:#111827}
        .sub{margin:0;color:#111827;font-size:13px}
        .card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .i3d-sm{width:32px;height:32px;object-fit:contain}
        h3{margin:0;font-size:16px;color:#0f172a}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
        .box{border-radius:14px;padding:10px;text-align:center;border:1px solid transparent}
        .box img{width:30px;height:30px;object-fit:contain;margin-bottom:2px}
        .box span{display:block;font-size:11px;color:#111827;margin-bottom:3px}
        .box strong{display:block;font-size:13px;color:#111827}
        .b1{background:linear-gradient(180deg,#ecfeff,#cffafe);border-color:#a5f3fc}
        .b2{background:linear-gradient(180deg,#f5f3ff,#ede9fe);border-color:#ddd6fe}
        .b3{background:linear-gradient(180deg,#fff7ed,#ffedd5);border-color:#fed7aa}
        .b4{background:linear-gradient(180deg,#f0fdf4,#dcfce7);border-color:#bbf7d0}
        .prow{display:flex;justify-content:space-between;font-size:12px;color:#111827;margin-bottom:6px}
        .bar{height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden}
        .fill{height:100%;background:linear-gradient(90deg,#22c55e,#3b82f6,#8b5cf6);border-radius:999px}
        .info{background:linear-gradient(180deg,#fff,#fffbeb);border-color:#fde68a}
        .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #f1f5f9;font-size:14px}
        .row span{color:#111827}
        .row strong{color:#0f172a}
        @media (min-width: 900px){
          .hero-img{aspect-ratio:21/9;max-height:360px}
          .content{padding:24px 32px 40px;max-width:1100px;width:100%;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
          .head{grid-column:1 / -1}
          .grid{grid-template-columns:repeat(4,1fr)}
        }
      `}</style>
    </div>
  );
}
