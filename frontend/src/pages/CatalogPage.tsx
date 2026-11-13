import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Home, Lock, MessageCircle, Package } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { api } from '../api/client';
import { machines as localMachines } from '../data/machines';

type Machine = { id: string; name: string; category: string; priceFcfa: number; dailyRevenueFcfa: number; durationDays: number; image: string; locked?: boolean };

export function CatalogPage() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<'produits' | 'mes'>(params.get('tab') === 'mes' ? 'mes' : 'produits');
  const [machines, setMachines] = useState<Machine[]>(localMachines as Machine[]);
  const [my, setMy] = useState<any[]>([]);
  const [collecting, setCollecting] = useState<string | null>(null);
  const loadMy = () => api<any[]>('/purchases').then(setMy).catch(()=>setMy([]));

  useEffect(() => { setTab(params.get('tab') === 'mes' ? 'mes' : 'produits'); }, [params]);
  useEffect(() => {
    api<Machine[]>('/machines').then((data) => { if (Array.isArray(data) && data.length) setMachines(data); }).catch(()=>{});
    loadMy();
  }, []);
  const collect = async (id: string) => {
    try {
      setCollecting(id);
      await api(`/purchases/${id}/collect`, { method: 'POST' });
      await loadMy();
    } catch (e: any) {
      alert(e?.message || 'Impossible de récolter pour le moment');
    } finally {
      setCollecting(null);
    }
  };

  const products = machines.map((m, i) => ({
    ...m,
    vip: i + 1,
    badge: `L${i + 1}`,
    status: m.locked ? 'Verrouillé' : i < 4 ? 'Poste partagé' : 'Accès premium',
    locked: !!m.locked,
    subtitle: m.category,
  }));

  const totalInvestment = my.reduce((s, m) => s + (m.amount || 0), 0);
  const totalDaily = my.reduce((s, m) => s + (m.dailyRevenue || 0), 0);
  const avgRest = my.length ? Math.round(my.reduce((s, m) => s + (m.daysLeft || 0), 0) / my.length) : 0;

  return (
    <div className="screen">
      <TopBar title="Catalogue" />
      <div className="content">
        <div className="tabs">
          <button className={`tab ${tab === 'produits' ? 'active' : ''}`} onClick={() => setTab('produits')}>Produits</button>
          <button className={`tab ${tab === 'mes' ? 'active' : ''}`} onClick={() => setTab('mes')}>Mes produits</button>
        </div>

        {tab === 'produits' ? (
          <div className="list-col">
            {products.map((m) => {
              const total = m.dailyRevenueFcfa * m.durationDays;
              const CardInner = (
                <>
                  <div className="hero">
                    <img src={m.image} alt={m.name} />
                    <div className="overlay">
                      <span className="badge">{m.badge}</span>
                      {m.locked && <span className="status">{m.status}</span>}
                    </div>
                    {m.locked && <div className="lock"><Lock size={18} /> Verrouillé</div>}
                  </div>
                  <div className="body">
                    <div className="title-row">
                      <h3 className="vip-gold">VIP{m.vip}</h3>
                      <span className="open-btn"><ArrowUpRight size={18} /></span>
                    </div>
                    <p className="subtitle">{m.subtitle}</p>
                    <div className="info-grid">
                      <div className="ibox"><span>Prix</span><strong>{m.priceFcfa.toLocaleString('fr-FR')} FCFA</strong></div>
                      <div className="ibox"><span>Crédit quotidien</span><strong>+{m.dailyRevenueFcfa.toLocaleString('fr-FR')} FCFA</strong></div>
                      <div className="ibox"><span>Durée</span><strong>{m.durationDays} jours</strong></div>
                    </div>
                    <div className="footer">
                      <span>Total des crédits {total.toLocaleString('fr-FR')} FCFA</span>
                      <MessageCircle size={18} />
                    </div>
                  </div>
                </>
              );
              return m.locked ? (
                <div key={m.id} className="card locked">{CardInner}</div>
              ) : (
                <Link key={m.id} to={`/catalogue/${m.id}`} className="card">{CardInner}</Link>
              );
            })}
          </div>
        ) : (
          <div className="mes-wrap">
            <div className="card-pad summary">
              <h3 className="summary-title">Résumé de vos investissements</h3>
              <div className="stats-grid">
                <div className="stat-box"><p className="v c1">{my.length}</p><p className="l">Produits actifs</p></div>
                <div className="stat-box"><p className="v c2">{totalInvestment.toLocaleString('fr-FR')}</p><p className="l">Investissement total</p></div>
                <div className="stat-box"><p className="v c3">{totalDaily.toLocaleString('fr-FR')}</p><p className="l">Total revenus/jour</p></div>
                <div className="stat-box"><p className="v c4">{avgRest}</p><p className="l">Jours restants moyens</p></div>
              </div>
            </div>

            <div className="section">
              <h3 className="section-title"><Package size={18} /> Vos produits actifs ({my.length})</h3>
              <div className="my-list">
                {my.length === 0 ? (
                  <div className="card-pad empty-card">
                    <Package size={48} />
                    <h3>Aucun produit loué</h3>
                    <p>Vous n'avez pas encore de produits actifs</p>
                    <button className="btn-main" onClick={()=>setTab('produits')}><Home size={18} /> Découvrir la boutique</button>
                  </div>
                ) : my.map(p => (
                  <Link key={p.id} to={`/mes-produits/${p.id}`} className="card-pad product product-link">
                    <div className="prow">
                      <div className="pimg"><img src={p.machine?.image} alt={p.machine?.name || ''} /></div>
                      <div className="pinfo">
                        <h4>{p.machine?.name || 'Machine'}</h4>
                        <p className="muted">{p.machine?.category || ''}</p>
                        <div className="prog-head"><span>Progression</span><span>{p.daysElapsed}/{p.durationDays} jours</span></div>
                        <div className="bar"><div className="fill" style={{ width: `${p.progress || 0}%` }} /></div>
                        <div className="prog-foot"><span>{p.daysElapsed} jours écoulés</span><span>{p.daysLeft} jours restants</span></div>
                        <div className="collect-row">
                          <div className="collect-info"><span>À récolter</span><strong>{Number(p.collectableAmount || 0).toLocaleString('fr-FR')} FCFA</strong></div>
                          <button className="collect-btn" onClick={(e)=>{e.preventDefault();e.stopPropagation();collect(p.id);}} disabled={collecting===p.id || !(p.collectableAmount>0)}>{collecting===p.id?'...':'Collecter'}</button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .screen { background:#fff; min-height:100%; }
        .content { padding:14px; background:#fff; }
        .tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }
        .tab { height:42px; border:1px solid #e5e7eb; background:#fff; border-radius:14px; font-weight:600; cursor:pointer; }
        .tab.active { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%); border-color:transparent; color:#fff; }
        .list-col{display:flex;flex-direction:column;gap:14px}
        .card{display:block;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border:2px solid transparent;border-radius:22px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:0 8px 20px rgba(37,99,235,.10);background-image:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%), linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);background-origin:border-box;background-clip:padding-box,border-box;transition:transform .18s ease, box-shadow .18s ease}
        .card:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(37,99,235,.16)}
        .card.locked{opacity:.72}
        .hero{position:relative;width:100%;height:180px;background:linear-gradient(135deg,#dbeafe,#bfdbfe)}
        .hero img{width:100%;height:100%;object-fit:cover}
        .overlay{position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:8px}
        .badge,.status{font-size:12px;font-weight:700;padding:6px 10px;border-radius:999px;backdrop-filter:blur(6px)}
        .badge{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;box-shadow:0 4px 10px rgba(29,78,216,.25)}
        .status{background:rgba(255,255,255,.95);color:#111827}
        .lock{position:absolute;inset:0;background:rgba(15,23,42,.35);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700}
        .body{padding:14px;background:linear-gradient(180deg,#ffffff 0%,#f0f7ff 100%)}
        .title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
        .title-row h3{margin:0;font-size:22px;color:#111827}
        .open-btn{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(37,99,235,.25)}
        .subtitle{margin:0 0 12px;color:#334155;font-size:13px;font-weight:500}
        .info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;border:none;border-radius:14px;overflow:visible;margin-bottom:12px}
        .ibox{padding:10px 8px;text-align:left;background:#fff;border:1px solid #dbeafe;border-radius:12px;box-shadow:0 2px 8px rgba(59,130,246,.06)}
        .ibox:not(:last-child){border-right:1px solid #dbeafe}
        .ibox:nth-child(1){background:linear-gradient(180deg,#eff6ff,#ffffff)}
        .ibox:nth-child(2){background:linear-gradient(180deg,#ecfdf5,#ffffff)}
        .ibox:nth-child(3){background:linear-gradient(180deg,#fff7ed,#ffffff)}
        .ibox span{display:block;font-size:11px;color:#475569;margin-bottom:4px;font-weight:600}
        .ibox strong{display:block;font-size:13px;color:#0f172a;line-height:1.2}
        .footer{display:flex;align-items:center;justify-content:space-between;color:#1e3a8a;font-size:13px;font-weight:700;background:linear-gradient(135deg,#dbeafe,#eff6ff);border:1px solid #bfdbfe;border-radius:12px;padding:10px 12px}
        .footer svg{color:#2563eb}
        .mes-wrap{display:flex;flex-direction:column;gap:12px}
        .card-pad{background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 2px 10px rgba(17,24,39,.04)}
        .summary{padding:14px;background:linear-gradient(135deg,#eff6ff 0%,#ffffff 55%,#ecfeff 100%);border-color:#bfdbfe}
        .summary-title{margin:0 0 12px;font-size:19px;text-align:center;color:#1e3a8a;font-weight:800}
        .stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:center}
        .stat-box{background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid #dbeafe;border-radius:14px;padding:12px 8px;box-shadow:0 4px 10px rgba(59,130,246,.08)}
        .v{margin:0;font-size:22px;font-weight:800} .l{margin:4px 0 0;font-size:12px;color:#334155;line-height:1.25;font-weight:600}
        .c1{color:#2563eb} .c2{color:#16a34a} .c3{color:#7c3aed} .c4{color:#f59e0b}
        .btn-outline{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 14px;border:1px solid transparent;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);width:100%;max-width:280px;font-size:14px}
        .section-title{margin:0 0 8px;font-size:16px;display:flex;align-items:center;gap:6px}
        .my-list{display:flex;flex-direction:column;gap:10px}
        .empty-card{padding:28px 14px;text-align:center;color:#111827;display:flex;flex-direction:column;align-items:center;gap:6px}
        .btn-main{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border:none;border-radius:14px;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);color:#fff;font-weight:700;margin-top:6px;cursor:pointer}
        .product{padding:10px;overflow:hidden}
        .product-link{text-decoration:none;color:inherit;display:block}
        .prow{display:grid;grid-template-columns:96px 1fr;gap:10px;align-items:start}
        .pimg{width:96px;height:96px;border-radius:12px;overflow:hidden;background:#f0f0f0}
        .pimg img{width:100%;height:100%;object-fit:cover}
        .pinfo h4{margin:0;font-size:15px;line-height:1.2} .muted{margin:1px 0 6px;font-size:12px;color:#111827}
        .prog-head,.prog-foot{display:flex;justify-content:space-between;font-size:11px;color:#111827}
        .prog-head{margin-bottom:4px}
        .bar{height:6px;background:#e5e7eb;border-radius:999px;overflow:hidden;margin:4px 0} .fill{height:100%;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%)}
        .collect-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding:8px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0}
        .collect-info span{display:block;font-size:10px;color:#166534}.collect-info strong{font-size:12px;color:#166534}
        .collect-btn{height:32px;padding:0 12px;border:none;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:700;font-size:12px;cursor:pointer}
        .collect-btn:disabled{opacity:.5;cursor:not-allowed;background:#94a3b8}
        @media (min-width: 900px){
          .content{padding:24px 32px 32px;max-width:1100px;width:100%;margin:0 auto}
          .list-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
          .hero{height:220px}
          .hero img{object-fit:cover;object-position:center}
          .stats-grid{grid-template-columns:repeat(4,1fr)}
          .my-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
          .tabs{max-width:420px;margin:0 auto 18px}
        }
        @media (min-width: 1400px){ .content{max-width:1200px;padding:28px 40px 40px} }
      `}</style>
    </div>
  );
}
