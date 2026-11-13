import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { api } from '../api/client';

type Tx = { id: string; label?: string; type: string; amount: number; status?: string; createdAt: string };

export function WalletPage() {
  const [filter, setFilter] = useState<'tout' | 'depot' | 'retrait'>('tout');
  const [balance, setBalance] = useState(0);
  const [bonusTotal, setBonusTotal] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [affiliation, setAffiliation] = useState(0);

  useEffect(() => {
    api<{ balance: number; bonus?: number; transactions: Tx[] }>('/wallet').then((d) => {
      setBalance(d.balance || 0);
      setBonusTotal(Number(d.bonus || 0));
      setTxs(d.transactions || []);
    }).catch(() => {});
    api<{ totalEarned?: number; levels: { commission: number }[] }>('/referral').then((d) => {
      const total = d.totalEarned ?? (d.levels || []).reduce((s, l) => s + (l.commission || 0), 0);
      setAffiliation(total);
    }).catch(() => {});
  }, []);

  const filtered = txs.filter((h) => filter === 'tout' || h.type === (filter === 'depot' ? 'deposit' : 'withdraw'));
  const totalDepose = txs.filter(t => t.type === 'deposit').reduce((s,t)=>s + Math.abs(t.amount || 0), 0);
  const totalRetrait = txs.filter(t => t.type === 'withdraw').reduce((s,t)=>s + Math.abs(t.amount || 0), 0);
  const totalBonus = txs.filter(t => t.type === 'bonus').reduce((s,t)=>s + Math.abs(t.amount || 0), 0);

  return (
    <div className="screen">
      <TopBar title="Portefeuille" />
      <div className="content">
        <section className="balance-card clay-hero">
          <div className="banner-bg" aria-hidden="true" />
          <div className="banner-overlay" aria-hidden="true" />
          <div className="balance-content">
            <p>Solde disponible</p>
            <h1>{balance.toLocaleString('fr-FR')} <span>FCFA</span></h1>
            <div className="sub-balance">Bonus & commissions cumulés : <strong>{bonusTotal.toLocaleString('fr-FR')} FCFA</strong></div>
            <div className="actions">
              <Link to="/depot" className="btn clay-btn"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dollar%20banknote/3D/dollar_banknote_3d.png" alt="" /> Dépôt</Link>
              <Link to="/retrait" className="btn ghost clay-btn"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Credit%20card/3D/credit_card_3d.png" alt="" /> Retrait</Link>
            </div>
            <Link to="/catalogue?tab=mes" className="btn-mes"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hammer%20and%20wrench/3D/hammer_and_wrench_3d.png" alt="" /> Voir mes produits / machines</Link>
          </div>
        </section>

        <section className="block">
          <div className="head">
            <h3><img className="h3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Alarm%20clock/3D/alarm_clock_3d.png" alt="" /> Historique</h3>
            <div className="filters">
              <button className={`f ${filter === 'tout' ? 'active' : ''}`} onClick={() => setFilter('tout')}>Tout</button>
              <button className={`f ${filter === 'depot' ? 'active' : ''}`} onClick={() => setFilter('depot')}>Dépôt</button>
              <button className={`f ${filter === 'retrait' ? 'active' : ''}`} onClick={() => setFilter('retrait')}>Retrait</button>
            </div>
          </div>
          <div className="card-pad list">
            {filtered.length === 0 ? (
              <div className="empty-tx">
                <div className="breakdown">
                  <div className="bstat"><span>Montant déposé</span><strong>{totalDepose.toLocaleString('fr-FR')} F</strong></div>
                  <div className="bstat"><span>Retrait</span><strong>{totalRetrait.toLocaleString('fr-FR')} F</strong></div>
                  <div className="bstat"><span>Commissions</span><strong>{affiliation.toLocaleString('fr-FR')} F</strong></div>
                  <div className="bstat"><span>Bonus</span><strong>{totalBonus.toLocaleString('fr-FR')} F</strong></div>
                </div>
                <div className="empty-center">
                  <div className="empty-icon">💳</div>
                </div>
                <div className="empty-bottom">
                  <strong>Aucune transaction</strong>
                  <p>Vos dépôts, retraits et activités apparaîtront ici.</p>
                </div>
              </div>
            ) : filtered.map((h) => (
              <div key={h.id} className="row">
                <div>
                  <strong>{h.label || h.type}</strong>
                  <p>{new Date(h.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={h.amount >= 0 && h.type !== 'withdraw' && h.type !== 'purchase' ? 'in' : 'out'}>
                  {h.amount > 0 ? '+' : ''}{h.amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <style>{`
        .screen { background:#fff; min-height:100%; }
        .content { padding:14px; background:#fff; }
        @media (min-width: 900px){
          .content{padding:24px 32px 32px;max-width:1000px;width:100%;margin:0 auto}
          .actions{max-width:520px;margin-left:auto;margin-right:auto}
          .action{height:48px}
          .breakdown{max-width:700px;margin-left:auto;margin-right:auto}
        }
        @media (min-width: 1400px){ .content{max-width:1100px;padding:28px 40px 40px} }
        .balance-card { position:relative; overflow:hidden; border-radius:22px; padding:18px; color:#fff; box-shadow:0 12px 28px rgba(30,58,138,0.25); margin-bottom:14px; }
        .banner-bg{position:absolute;inset:0;background:url('/banner-wallet.jpg') center/cover no-repeat}
        .banner-overlay{position:absolute;inset:0;background:linear-gradient(110deg, rgba(15,23,42,.78) 0%, rgba(30,64,175,.55) 50%, rgba(15,23,42,.35) 100%)}
        .balance-content{position:relative;z-index:1}
        .balance-card p { margin:0; font-size:13px; color:rgba(255,255,255,0.95); }
        .balance-card h1 { margin:4px 0 8px; font-size:32px; color:#fff; }
        .sub-balance { margin:0 0 14px; font-size:12px; color:rgba(255,255,255,.95); background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.18); display:inline-block; padding:6px 10px; border-radius:999px; backdrop-filter:blur(2px); }
        .sub-balance strong { color:#fff; }
        .balance-card span { font-size:14px; }
        .actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .btn { height:44px; display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:16px; background:rgba(255,255,255,0.22); color:#fff; text-decoration:none; font-weight:600; border:1px solid rgba(255,255,255,0.25); backdrop-filter:blur(2px); }
        .btn.ghost { background:rgba(255,255,255,0.12); }
        .clay-btn img{width:22px;height:22px;object-fit:contain}
        .btn-mes { margin-top:10px; height:42px; display:flex; align-items:center; justify-content:center; gap:8px; border-radius:16px; background:#fff; color:#1d4ed8; text-decoration:none; font-weight:700; font-size:13px; box-shadow:4px 4px 10px rgba(0,0,0,.08), -2px -2px 8px rgba(255,255,255,.7); }
        .btn-mes img{width:22px;height:22px}
        .head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:0 0 10px; }
        .head h3 { margin:0; font-size:16px; display:flex; align-items:center; gap:8px; white-space:nowrap; }
        .h3d{width:24px;height:24px;object-fit:contain}
        .filters { display:flex; align-items:center; gap:6px; }
        .f { border:none; background:#f1f5f9; color:#111827; font-size:12px; font-weight:600; padding:6px 10px; border-radius:999px; cursor:pointer; }
        .f.active { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%); color:#fff; }
        .card-pad { background:linear-gradient(180deg,#fff,#f8fbff); border:1px solid #e5e7eb; border-radius:18px; box-shadow:6px 6px 16px rgba(148,163,184,.12), -4px -4px 12px rgba(255,255,255,.9); }
        .list { padding:4px 0; }
        .row { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #e5e7eb; gap:10px; }
        .row:last-child { border-bottom:none; }
        .row strong { font-size:14px; display:block; }
        .row p { margin:2px 0 0; font-size:12px; color:#111827; }
        .in { color:#16a34a; font-weight:700; font-size:13px; white-space:nowrap; }
        .out { color:#dc2626; font-weight:700; font-size:13px; white-space:nowrap; }
        .empty-tx{padding:14px;text-align:center;display:flex;flex-direction:column;gap:14px;color:#111827;min-height:320px}
        .breakdown{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .bstat{background:linear-gradient(180deg,#f8fbff,#ffffff);border:1px solid #dbeafe;border-radius:14px;padding:10px 8px;text-align:center}
        .bstat span{display:block;font-size:12px;color:#374151;margin-bottom:4px;font-weight:600}
        .bstat strong{display:block;font-size:15px;color:#111827}
        .empty-center{flex:1;display:flex;align-items:center;justify-content:center;padding:10px 0}
        .empty-icon{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#dbeafe,#eff6ff);display:flex;align-items:center;justify-content:center;font-size:28px}
        .empty-bottom{margin-top:auto}
        .empty-bottom strong{display:block;font-size:16px}
        .empty-bottom p{margin:4px 0 0;font-size:13px;color:#374151}
      `}</style>
    </div>
  );
}
