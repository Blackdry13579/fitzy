import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Package, Clock } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { api } from '../api/client';

type P = any;

export function MyProductsPage() {
  const [my, setMy] = useState<P[]>([]);
  const [collecting, setCollecting] = useState<string | null>(null);
  const load = () => api<P[]>('/purchases').then(setMy).catch(()=>setMy([]));
  useEffect(() => { load(); }, []);
  const collect = async (id: string) => {
    try {
      setCollecting(id);
      await api(`/purchases/${id}/collect`, { method: 'POST' });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Impossible de récolter pour le moment');
    } finally {
      setCollecting(null);
    }
  };

  const totalInvestment = my.reduce((s, m) => s + (m.amount || 0), 0);
  const totalDaily = my.reduce((s, m) => s + (m.dailyRevenue || 0), 0);
  const avgRest = my.length ? Math.round(my.reduce((s, m) => s + (m.daysLeft || 0), 0) / my.length) : 0;

  return (
    <div className="screen">
      <TopBar title="Mes produits" back />
      <div className="content">
        <div className="header">
          <div className="icon"><Package size={22} /></div>
          <div>
            <h1>Mes Produits</h1>
            <p>Suivez l'évolution de vos investissements</p>
          </div>
        </div>

        <div className="card summary">
          <h3>Résumé de vos investissements</h3>
          <div className="grid">
            <div className="stat"><p className="v c1">{my.length}</p><p className="l">Produits actifs</p></div>
            <div className="stat"><p className="v c2">{totalInvestment.toLocaleString('fr-FR')}</p><p className="l">Investissement total</p></div>
            <div className="stat"><p className="v c3">{totalDaily.toLocaleString('fr-FR')}</p><p className="l">Total revenus/jour</p></div>
            <div className="stat"><p className="v c4">{avgRest}</p><p className="l">Jours restants moyens</p></div>
          </div>
        </div>

        <div className="center"><Link to="/catalogue" className="btn-outline"><Home size={16} /> Retour à la boutique</Link></div>

        <div className="section">
          <h3 className="section-title"><Package size={18} /> Vos produits actifs ({my.length})</h3>
          <div className="list">
            {my.length === 0 ? (
              <div className="card empty">
                <Package size={48} />
                <h3>Aucun produit loué</h3>
                <p>Vous n'avez pas encore de produits actifs</p>
                <Link to="/catalogue" className="btn-main"><Home size={18} /> Découvrir la boutique</Link>
              </div>
            ) : my.map(p => (
              <Link key={p.id} to={`/mes-produits/${p.id}`} className="card product product-link">
                <div className="prow">
                  <div className="pimg"><img src={p.machine?.image} alt={p.machine?.name || ''} /></div>
                  <div className="pinfo">
                    <h4>{p.machine?.name || 'Machine'}</h4>
                    <p className="muted">{p.machine?.category || ''}</p>
                    <div className="prog-head"><span>Progression</span><span>{p.daysElapsed}/{p.durationDays} jours</span></div>
                    <div className="bar"><div className="fill" style={{ width: `${p.progress || 0}%` }} /></div>
                    <div className="prog-foot"><span>{p.daysElapsed} jours écoulés</span><span>{p.daysLeft} jours restants</span></div>
                    <div className="rev-grid">
                      <div className="rev green"><p>Gain / jour</p><strong>{(p.dailyRevenue||0).toLocaleString('fr-FR')} FCFA</strong></div>
                      <div className="rev blue"><p>Revenus totaux</p><strong>{(p.totalRevenue||0).toLocaleString('fr-FR')} FCFA</strong></div>
                    </div>
                    <p className="status"><Clock size={14} /> {p.daysLeft === 0 ? 'Produit expiré' : `Expire dans ${p.daysLeft} jours`}</p>
                    <div className="collect-row">
                      <div className="collect-info">
                        <span>À récolter</span>
                        <strong>{Number(p.collectableAmount || 0).toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                      <button
                        className="collect-btn"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); collect(p.id); }}
                        disabled={collecting === p.id || !(p.collectableAmount > 0)}
                      >
                        {collecting === p.id ? '...' : 'Collecter'}
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .screen{background:#fff;min-height:100%}
        .content{padding:12px;background:#fff;display:flex;flex-direction:column;gap:10px}
        .header{display:flex;align-items:center;gap:10px}
        .icon{padding:10px;border-radius:14px;background:#eff6ff;color:#3b82f6;display:flex}
        .header h1{margin:0;font-size:22px} .header p{margin:1px 0 0;color:var(--text-muted);font-size:13px}
        .card{background:#fff;border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm)}
        .summary{padding:12px}
        .summary h3{margin:0 0 8px;font-size:15px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center}
        .v{margin:0;font-size:20px;font-weight:700} .l{margin:1px 0 0;font-size:11px;color:var(--text-muted);line-height:1.2}
        .c1{color:#3b82f6} .c2{color:#16a34a} .c3{color:#7c3aed} .c4{color:#3b82f6}
        .center{display:flex;justify-content:center}
        .btn-outline{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 14px;border:1px solid transparent;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);width:100%;max-width:280px;font-size:14px}
        .section-title{margin:0 0 8px;font-size:16px;display:flex;align-items:center;gap:6px}
        .list{display:flex;flex-direction:column;gap:10px}
        .empty{padding:28px 14px;text-align:center;color:#111827;display:flex;flex-direction:column;align-items:center;gap:6px}
        .empty h3{margin:0;color:var(--text)} .empty p{margin:0}
        .btn-main{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border-radius:14px;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);color:#fff;text-decoration:none;font-weight:700;margin-top:6px}
        .product{padding:10px;overflow:hidden}
        .product-link{text-decoration:none;color:inherit;display:block}
        .prow{display:grid;grid-template-columns:96px 1fr;gap:10px;align-items:start}
        .pimg{width:96px;height:96px;border-radius:12px;overflow:hidden;background:#f0f0f0}
        .pimg img{width:100%;height:100%;object-fit:cover;transition:transform 300ms ease}
        .product:hover .pimg img{transform:scale(1.05)}
        .pinfo{min-width:0}
        .pinfo h4{margin:0;font-size:15px;line-height:1.2} .muted{margin:1px 0 6px;font-size:12px;color:var(--text-muted)}
        .prog-head,.prog-foot{display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted)}
        .prog-head{margin-bottom:4px}
        .bar{height:6px;background:#e5e7eb;border-radius:999px;overflow:hidden;margin:4px 0} .fill{height:100%;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%)}
        .rev-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
        .rev{border-radius:10px;padding:6px 8px} .rev p{margin:0;font-size:10px} .rev strong{font-size:12px}
        .green{background:#dcfce7;color:#166534} .blue{background:#eff6ff;color:#1d4ed8}
        .status{margin:6px 0 0;font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px}
        .collect-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding:8px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0}
        .collect-info span{display:block;font-size:10px;color:#166534}
        .collect-info strong{font-size:13px;color:#166534}
        .collect-btn{height:34px;padding:0 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}
        .collect-btn:disabled{opacity:.5;cursor:not-allowed;background:#94a3b8}
        @media (min-width: 900px){
          .content{padding:24px 32px 40px;max-width:1100px;width:100%;margin:0 auto;gap:16px}
          .grid{grid-template-columns:repeat(4,1fr)}
          .list{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:14px}
        }
      `}</style>
    </div>
  );
}
