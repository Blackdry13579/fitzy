import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/adminClient';
import { Users, UserCheck, ShoppingBag, ArrowDownToLine, ArrowUpFromLine, Clock, Receipt, Wallet, Activity } from 'lucide-react';

function MiniBars({ data, colorA, colorB, label }: { data: any[]; colorA: string; colorB: string; label: string }) {
  const rows = data.slice(-10);
  const max = Math.max(1, ...rows.map(r => Number(r.total || 0)));
  const sum = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const count = rows.reduce((s, r) => s + Number(r.count || 0), 0);
  return (
    <div className="chart">
      <div className="chart-head"><span>{label}</span><strong>{sum.toLocaleString('fr-FR')} F</strong><em>{count} op.</em></div>
      <div className="bars">
        {rows.map((r) => {
          const h = Math.max(8, (Number(r.total || 0) / max) * 100);
          return (
            <div key={r.period} className="bar-col">
              <div className="val">{Number(r.total||0) >= 1000 ? Math.round(Number(r.total)/1000)+'k' : Number(r.total||0)}</div>
              <div className="track"><div className="fill" style={{ height: `${h}%`, background: `linear-gradient(180deg,${colorA},${colorB})` }} /></div>
              <div className="lab">{r.period.slice(5)}</div>
            </div>
          );
        })}
        {!rows.length && <div className="empty">Aucune donnée sur la période</div>}
      </div>
      <style>{`
        .chart-head{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}
        .chart-head span{font-size:13px;color:#64748b;font-weight:600}
        .chart-head strong{font-size:18px;color:#0f172a}
        .chart-head em{font-size:12px;color:#64748b;font-style:normal;margin-left:auto}
        .bars{display:flex;gap:10px;align-items:flex-end;height:220px}
        .bar-col{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;align-items:center;gap:6px}
        .val{font-size:10px;color:#475569;font-weight:700;height:14px}
        .track{flex:1;width:100%;max-width:42px;background:linear-gradient(180deg,#f1f5f9,#e2e8f0);border-radius:12px;padding:4px;display:flex;align-items:flex-end;box-shadow:inset 0 1px 2px rgba(15,23,42,.06)}
        .fill{width:100%;border-radius:9px;box-shadow:0 8px 16px rgba(15,23,42,.18)}
        .lab{font-size:10px;color:#64748b;white-space:nowrap}
        .empty{margin:auto;color:#94a3b8;font-size:13px}
      `}</style>
    </div>
  );
}

export function AdminDashboardPage() {
  const [period, setPeriod] = useState<'day'|'week'>('day');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setStats(await adminApi(`/admin/stats?period=${period}`)); }
    catch (e:any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [period]);

  const fmt = (n:number) => Number(n||0).toLocaleString('fr-FR');
  const cards = useMemo(() => stats ? [
    { label: 'Inscrits', value: String(stats.users), sub: 'Utilisateurs total', icon: Users, g:'linear-gradient(135deg,#2563eb,#60a5fa)', glow:'rgba(37,99,235,.25)' },
    { label: 'Connectés', value: String(stats.usersOnline), sub: 'Actifs (10 min)', icon: UserCheck, g:'linear-gradient(135deg,#059669,#34d399)', glow:'rgba(5,150,105,.25)' },
    { label: 'Achats', value: String(stats.purchases), sub: 'Produits achetés', icon: ShoppingBag, g:'linear-gradient(135deg,#7c3aed,#a78bfa)', glow:'rgba(124,58,237,.25)' },
    { label: 'Transactions', value: String(stats.transactions), sub: 'Toutes opérations', icon: Receipt, g:'linear-gradient(135deg,#0891b2,#22d3ee)', glow:'rgba(8,145,178,.25)' },
    { label: 'Total dépôts', value: fmt(stats.depositsTotal)+' F', sub: 'Montant cumulé', icon: ArrowDownToLine, g:'linear-gradient(135deg,#16a34a,#4ade80)', glow:'rgba(22,163,74,.25)' },
    { label: 'Total retraits', value: fmt(stats.withdrawalsTotal)+' F', sub: 'Montant cumulé', icon: ArrowUpFromLine, g:'linear-gradient(135deg,#e11d48,#fb7185)', glow:'rgba(225,29,72,.25)' },
    { label: 'Retraits en attente', value: String(stats.withdrawalsPending), sub: 'À traiter', icon: Clock, g:'linear-gradient(135deg,#d97706,#fbbf24)', glow:'rgba(217,119,6,.25)' },
    { label: 'Dépôts en attente', value: String(stats.depositsPending), sub: 'À valider', icon: Wallet, g:'linear-gradient(135deg,#4f46e5,#818cf8)', glow:'rgba(79,70,229,.25)' },
  ] : [], [stats]);

  const ratio = useMemo(() => {
    if (!stats) return { dep: 50, wd: 50 };
    const d = Number(stats.depositsTotal||0), w = Number(stats.withdrawalsTotal||0), t = d+w || 1;
    return { dep: Math.round((d/t)*100), wd: Math.round((w/t)*100), d, w };
  }, [stats]);

  return (
    <div className="page">
      <div className="topbar">
        <div className="title">
          <div className="badge"><Activity size={18} color="#fff" /></div>
          <div><h1>Dashboard Admin</h1><p>Suivi en temps réel · inscriptions, activité, flux financiers</p></div>
        </div>
        <div className="controls">
          <div className="seg">
            <button className={period==='day'?'on':''} onClick={()=>setPeriod('day')}>Jour</button>
            <button className={period==='week'?'on':''} onClick={()=>setPeriod('week')}>Semaine</button>
          </div>
          <button className="refresh" onClick={load}>Actualiser</button>
        </div>
      </div>

      {error && <p className="err">{error}</p>}
      {loading ? <div className="loading">Chargement du tableau de bord...</div> : stats && (<>
        <div className="kpis">
          {cards.map((c, i) => { const Icon = c.icon as any; return (
            <div key={i} className="kpi">
              <div className="kpi-top">
                <div className="ico" style={{background:c.g, boxShadow:`0 10px 20px ${c.glow}`}}><Icon size={20} color="#fff" /></div>
                <span className="sub">{c.sub}</span>
              </div>
              <div className="kpi-val">{c.value}</div>
              <div className="kpi-lab">{c.label}</div>
            </div>
          );})}
        </div>

        <div className="mid">
          <div className="panel chart-panel">
            <div className="panel-h"><h2>Évolution des dépôts</h2><span className="tag green">Entrées</span></div>
            <MiniBars data={stats.depositsByPeriod||[]} colorA="#34d399" colorB="#059669" label={`Total ${period==='day'?'journalier':'hebdo'}`} />
          </div>
          <div className="panel chart-panel">
            <div className="panel-h"><h2>Évolution des retraits</h2><span className="tag red">Sorties</span></div>
            <MiniBars data={stats.withdrawalsByPeriod||[]} colorA="#fb7185" colorB="#e11d48" label={`Total ${period==='day'?'journalier':'hebdo'}`} />
          </div>
        </div>

        <div className="panel ratio-panel">
          <div className="panel-h"><h2>Répartition Dépôts / Retraits</h2><span className="tag blue">Vue globale</span></div>
          <div className="ratio">
            <div className="trackline"><div className="dep" style={{width:`${ratio.dep}%`}} /><div className="wd" style={{width:`${ratio.wd}%`}} /></div>
            <div className="legend">
              <div className="leg"><i style={{background:'#22c55e'}} /> Dépôts <strong>{fmt(ratio.d||0)} F</strong> <span>{ratio.dep}%</span></div>
              <div className="leg"><i style={{background:'#f43f5e'}} /> Retraits <strong>{fmt(ratio.w||0)} F</strong> <span>{ratio.wd}%</span></div>
            </div>
          </div>
        </div>
      </>)}
      <style>{`
        .page{width:100%}
        .topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px;padding:18px 20px;border-radius:22px;background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 45%,#2563eb 100%);color:#fff;box-shadow:0 18px 40px rgba(15,23,42,.25)}
        .title{display:flex;align-items:center;gap:14px}
        .badge{width:42px;height:42px;border-radius:14px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.25)}
        h1{margin:0;font-size:26px;letter-spacing:-.02em}
        .title p{margin:3px 0 0;color:rgba(255,255,255,.8);font-size:13px}
        .controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .seg{display:flex;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:4px}
        .seg button{border:none;background:transparent;color:#fff;padding:8px 14px;border-radius:9px;font-weight:700;cursor:pointer}
        .seg button.on{background:#fff;color:#1d4ed8}
        .refresh{height:40px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;font-weight:700;cursor:pointer}
        .kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:16px}
        .kpi{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:16px;box-shadow:0 10px 24px rgba(15,23,42,.06);position:relative;overflow:hidden}
        .kpi::after{content:"";position:absolute;right:-20px;top:-20px;width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#dbeafe,#ede9fe);opacity:.5}
        .kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;position:relative;z-index:1}
        .ico{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center}
        .sub{font-size:11px;color:#64748b;font-weight:600;background:#f8fafc;padding:4px 8px;border-radius:999px}
        .kpi-val{font-size:24px;font-weight:800;color:#0f172a;line-height:1.1;position:relative;z-index:1}
        .kpi-lab{font-size:13px;color:#475569;font-weight:600;margin-top:4px;position:relative;z-index:1}
        .mid{display:grid;gap:14px;margin-bottom:14px}
        .panel{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:16px 18px;box-shadow:0 10px 24px rgba(15,23,42,.06)}
        .panel-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        h2{margin:0;font-size:16px;color:#0f172a}
        .tag{font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px}
        .tag.green{background:#dcfce7;color:#166534}.tag.red{background:#ffe4e6;color:#9f1239}.tag.blue{background:#dbeafe;color:#1d4ed8}
        .ratio{display:grid;gap:14px;margin-top:6px}
        .trackline{height:18px;border-radius:999px;overflow:hidden;display:flex;background:#f1f5f9;box-shadow:inset 0 1px 2px rgba(15,23,42,.08)}
        .dep{background:linear-gradient(90deg,#22c55e,#16a34a)} .wd{background:linear-gradient(90deg,#fb7185,#e11d48)}
        .legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
        .leg{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;font-size:14px;color:#334155}
        .leg i{width:10px;height:10px;border-radius:50%} .leg strong{color:#0f172a} .leg span{margin-left:auto;font-weight:700;color:#1d4ed8}
        .loading{padding:30px;text-align:center;color:#64748b}
        .err{color:#dc2626}
        @media(min-width:900px){.kpis{grid-template-columns:repeat(4,1fr)}.mid{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  );
}
