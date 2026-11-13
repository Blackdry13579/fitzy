import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
// back button text only
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { machines as localMachines } from '../data/machines';

type Machine = { id: string; name: string; category: string; level: string; priceFcfa: number; dailyRevenueFcfa: number; durationDays: number; description: string; image: string; locked?: boolean };

export function MachineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const local = (localMachines as Machine[]).find((m) => m.id === id) || (localMachines as Machine[])[0] || null;
  const [machine, setMachine] = useState<Machine | null>(local);
  const [all, setAll] = useState<Machine[]>(localMachines as Machine[]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const balance = user?.balance ?? 0;

  useEffect(() => {
    api<Machine[]>(`/machines`).then((data) => { if (Array.isArray(data) && data.length) setAll(data); }).catch(()=>{});
    if (id) api<Machine>(`/machines/${id}`).then((data) => { if (data && data.id) setMachine(data); }).catch(()=>{});
  }, [id]);

  if (!machine) return <div className="screen"><div className="content">Machine introuvable</div></div>;
  const vipIndex = Math.max(1, all.findIndex((m) => m.id === machine.id) + 1);
  const totalCredits = machine.dailyRevenueFcfa * machine.durationDays;
  const canPay = balance >= machine.priceFcfa;

  const buy = async () => {
    setError('');
    setLoading(true);
    try {
      await api('/purchases', { method: 'POST', body: JSON.stringify({ machineId: machine.id }) });
      await refresh();
      setShowConfirm(false);
      navigate('/catalogue?tab=mes');
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="detail-layout">
        <div className="hero-wrap">
          <div className="hero-img"><img src={machine.image} alt={machine.name} /></div>
          <span className="hero-cover" aria-hidden="true" />
          <button className="back-btn-text back-pos" onClick={() => navigate(-1)} aria-label="Retour">Retour</button>
        </div>

        <div className="left-col">
          <div className="content">
            <div className="title-block">
              <h1 className="vip-title vip-gold">VIP{vipIndex}</h1>
              <p className="machine-name">{machine.name}</p>
            </div>

            <section className="card daily-card">
              <div className="daily-head">
                <img className="i3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wrapped%20gift/3D/wrapped_gift_3d.png" alt="" />
                <div>
                  <span>Profit quotidien</span>
                  <strong>+{machine.dailyRevenueFcfa.toLocaleString('fr-FR')} FCFA</strong>
                  <p>Un profit toutes les 24 heures</p>
                </div>
              </div>
              <div className="stats-grid">
                <div className="stat price">
                  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dollar%20banknote/3D/dollar_banknote_3d.png" alt="" />
                  <span>Prix</span>
                  <strong>{machine.priceFcfa.toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div className="stat duration">
                  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Alarm%20clock/3D/alarm_clock_3d.png" alt="" />
                  <span>Durée</span>
                  <strong>{machine.durationDays} jours</strong>
                </div>
                <div className="stat total">
                  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png" alt="" />
                  <span>Total des profits</span>
                  <strong>{totalCredits.toLocaleString('fr-FR')} FCFA</strong>
                </div>
              </div>
            </section>

            <section className="card how-card">
              <div className="card-head">
                <img className="i3d-sm" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png" alt="" />
                <h3>Comment arrivent vos profits</h3>
              </div>
              <ul className="how-list">
                <li><span className="dot d1" />Un profit toutes les 24 heures</li>
                <li><span className="dot d2" />{machine.dailyRevenueFcfa.toLocaleString('fr-FR')} FCFA à chaque fois</li>
                <li><span className="dot d3" />{machine.durationDays} versements au total</li>
                <li><span className="dot d4" />Total des profits {totalCredits.toLocaleString('fr-FR')} FCFA</li>
                <li><span className="dot d5" />Le forfait se termine dans environ {machine.durationDays} jours</li>
              </ul>
              <div className="bubbles">
                <div className="bubble b1"><strong>+{machine.dailyRevenueFcfa.toLocaleString('fr-FR')}</strong><span>1 jour</span></div>
                <div className="bubble b2"><strong>+{(machine.dailyRevenueFcfa * Math.min(15, machine.durationDays)).toLocaleString('fr-FR')}</strong><span>15 jours</span></div>
                <div className="bubble b3"><strong>+{totalCredits.toLocaleString('fr-FR')}</strong><span>{machine.durationDays} jours</span></div>
              </div>
            </section>
          </div>

          <div className="footer-bar">
            <div className="fleft">
              <span>Prix d'achat</span>
              <strong>{machine.priceFcfa.toLocaleString('fr-FR')} FCFA</strong>
            </div>
            <button className="pay-now" onClick={() => setShowConfirm(true)} disabled={!!machine.locked}>Payer maintenant</button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="modal sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>Confirmer l'adhésion</h3>
            <p className="m-vip vip-gold">VIP{vipIndex}</p>
            <p className="m-sub">+{machine.dailyRevenueFcfa.toLocaleString('fr-FR')} FCFA / jour · {machine.durationDays} jours</p>
            <div className="m-row"><span>Prix du forfait</span><strong>{machine.priceFcfa.toLocaleString('fr-FR')} FCFA</strong></div>
            <div className="m-row"><span>Solde disponible</span><strong>{balance.toLocaleString('fr-FR')} FCFA</strong></div>
            {!canPay && <p className="m-warn">Votre solde disponible ne suffit pas encore pour ce forfait. Rechargez d'abord, puis revenez.</p>}
            {error && <p className="m-warn" style={{background:'#fef2f2',borderColor:'#fecaca',color:'#991b1b'}}>{error}</p>}
            <div className="m-actions">
              {canPay ? (
                <button className="btn primary" onClick={buy} disabled={loading}>{loading ? 'Achat...' : 'Confirmer'}</button>
              ) : (
                <Link to="/depot" className="btn primary">Recharger</Link>
              )}
              <button className="btn ghost" onClick={() => setShowConfirm(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .screen{background:transparent;min-height:100%;position:relative}
        .detail-layout{display:block}
        .hero-wrap{position:relative}
        .hero-img{width:100%;aspect-ratio:16/10;overflow:hidden;background:#f3f4f6}
        .hero-img img{width:100%;height:118%;object-fit:cover;object-position:center 35%}
        .hero-cover{position:absolute;top:0;left:0;right:0;height:28%;background:linear-gradient(180deg,rgba(255,255,255,.96) 0%,rgba(255,255,255,.85) 45%,rgba(255,255,255,0) 100%);z-index:1;pointer-events:none}
        .back-pos{position:absolute;top:12px;left:12px;z-index:2}
        .content{padding:12px 14px 110px}
        .vip-title{margin:6px 0 2px;font-size:32px;color:#0f172a}
        .machine-name{margin:0 0 12px;color:#111827;font-size:14px}
        .card{background:#fff;border-radius:20px;padding:14px;box-shadow:0 6px 18px rgba(15,23,42,.08);margin-bottom:12px}
        .daily-card{border:1px solid #bfdbfe;background:linear-gradient(180deg,#fff,#f0f7ff)}
        .daily-head{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);color:#fff;border-radius:16px;padding:14px}
        .i3d{width:54px;height:54px;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,.15))}
        .daily-head span{display:block;font-size:13px;color:#fff;font-weight:600}
        .daily-head strong{display:block;font-size:28px;line-height:1.1;margin:2px 0;color:#fff}
        .daily-head p{margin:0;font-size:13px;color:#fff;font-weight:500}
        .stats-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}
        .stat{border-radius:14px;padding:10px 8px;text-align:center;border:1px solid transparent}
        .stat img{width:34px;height:34px;object-fit:contain;margin-bottom:4px}
        .stat span{display:block;font-size:11px;color:#111827;margin-bottom:2px}
        .stat strong{display:block;font-size:12px;color:#0f172a;line-height:1.2}
        .price{background:linear-gradient(180deg,#ecfeff,#cffafe);border-color:#a5f3fc}
        .duration{background:linear-gradient(180deg,#f0fdf4,#dcfce7);border-color:#bbf7d0}
        .total{background:linear-gradient(180deg,#f5f3ff,#ede9fe);border-color:#ddd6fe}
        .how-card{border:1px solid #e0e7ff;background:linear-gradient(180deg,#fff,#f8faff)}
        .card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .i3d-sm{width:36px;height:36px;object-fit:contain}
        .card-head h3{margin:0;font-size:17px;color:#0f172a}
        .how-list{margin:0 0 14px;padding:0;list-style:none;display:grid;gap:8px}
        .how-list li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid #e5e7eb;color:#334155;font-size:14px}
        .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .d1{background:#3b82f6}.d2{background:#10b981}.d3{background:#f59e0b}.d4{background:#8b5cf6}.d5{background:#ef4444}
        .bubbles{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;padding:14px 6px;border-radius:18px;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%)}
        .bubble{border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;box-shadow:0 10px 18px rgba(0,0,0,.18)}
        .bubble span{font-size:11px;margin-top:3px;font-weight:600;opacity:.95}
        .b1{width:90px;height:90px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35)} .b1 strong{font-size:14px}
        .b2{width:106px;height:106px;background:rgba(255,255,255,.24);border:1px solid rgba(255,255,255,.4)} .b2 strong{font-size:15px}
        .b3{width:124px;height:124px;background:#fff;color:#2563eb} .b3 strong{font-size:16px;color:#2563eb} .b3 span{color:#111827}
        .footer-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:74px;width:100%;max-width:430px;padding:10px 14px;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:25}
        .fleft span{display:block;font-size:12px;color:#111827} .fleft strong{font-size:16px;color:#111827}
        .pay-now{height:46px;padding:0 20px;border:none;border-radius:14px;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);color:#fff;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 8px 18px rgba(37,99,235,.25)}
        .pay-now:disabled{opacity:.5}
        .modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center;z-index:40;animation:fadeIn .25s ease}
        .modal{width:100%;max-width:430px;background:#fff;border-radius:22px 22px 0 0;padding:10px 18px 22px;box-shadow:0 -10px 40px rgba(0,0,0,.2)}
        .sheet{animation:sheetUp .35s cubic-bezier(.22,1,.36,1)}
        .sheet-handle{width:44px;height:5px;border-radius:999px;background:#d1d5db;margin:4px auto 12px}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .modal h3{margin:0 0 8px;font-size:20px}
        .m-vip{margin:0;font-size:18px;font-weight:700}
        .m-sub{margin:2px 0 12px;color:#111827;font-size:14px}
        .m-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #f1f5f9;font-size:14px}
        .m-warn{margin:10px 0 0;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;color:#1e40af;font-size:13px}
        .m-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
        .btn{height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-weight:700;font-size:14px;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#111827}
        .btn.primary{background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);color:#fff;border:none}
        @media (min-width: 900px){
          .screen{max-width:1200px;margin:0 auto;width:100%;padding:20px 24px 24px}
          .detail-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,460px);gap:24px;align-items:start}
          .left-col{order:1}
          .hero-wrap{order:2;position:sticky;top:20px;border-radius:24px;overflow:hidden;background:#f3f4f6;box-shadow:0 10px 30px rgba(15,23,42,.12)}
          .hero-img{aspect-ratio:4/5;max-height:none;height:auto}
          .hero-img img{width:100%;height:100%;object-fit:cover;object-position:center}
          .hero-cover{display:none}
          .content{padding:0;display:flex;flex-direction:column;gap:12px}
          .card{margin-bottom:0}
          .footer-bar{position:static;left:auto;transform:none;bottom:auto;max-width:none;width:100%;margin-top:14px;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 6px 18px rgba(15,23,42,.08)}
          .pay-now{min-width:220px;height:48px}
          .modal-backdrop{align-items:center;padding:24px}
          .modal{max-width:520px;border-radius:22px}
          .sheet{animation:fadeIn .2s ease}
        }
      `}</style>
    </div>
  );
}
