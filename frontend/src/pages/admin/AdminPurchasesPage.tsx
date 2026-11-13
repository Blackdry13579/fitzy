import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/adminClient';

function exportCsv(filename:string, rows:any[], cols:{k:string,l:string}[]) {
  const esc = (v:any) => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const csv = [cols.map(c=>esc(c.l)).join(','), ...rows.map(r=>cols.map(c=>esc(r[c.k])).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export function AdminPurchasesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  useEffect(()=>{ (async()=>{ try { setItems(await adminApi('/admin/purchases')); } catch(e:any){ setError(e.message);} finally{ setLoading(false);} })(); },[]);
  const fmt = (n:number)=>Number(n||0).toLocaleString('fr-FR');
  const filtered = useMemo(()=> items.filter(p=>{
    const s=q.toLowerCase(); if(!s) return true;
    return [p.machine?.name,p.machineId,p.user?.username,p.user?.phone,p.referrer?.username,p.status].some(v=>String(v||'').toLowerCase().includes(s));
  }), [items,q]);
  const onExport = () => exportCsv('achats.csv', filtered.map(p=>({date:p.createdAt||'',produit:p.machine?.name||p.machineId,utilisateur:`${p.user?.username||''} ${p.user?.phone||''}`.trim(),parrain:p.referrer?`${p.referrer.username||''} ${p.referrer.phone||''}`:'Non',montant:p.amount,revenu_jour:p.dailyRevenue,total:p.totalRevenue,duree:p.durationDays,statut:p.status||''})), [{k:'date',l:'Date'},{k:'produit',l:'Produit'},{k:'utilisateur',l:'Utilisateur'},{k:'parrain',l:'Parrainé par'},{k:'montant',l:'Montant'},{k:'revenu_jour',l:'Revenu/jour'},{k:'total',l:'Total revenu'},{k:'duree',l:'Durée'},{k:'statut',l:'Statut'}]);
  return (
    <div className="page">
      <h1>Achats</h1><p className="sub">Tableau des achats : produit, acheteur, parrain, montants et revenus</p>
      <div className="toolbar"><input className="search" placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)} /><button onClick={onExport}>Exporter CSV</button></div>
      {error && <p className="err">{error}</p>}
      {loading ? <p>Chargement...</p> : (
        <div className="table-wrap card"><table>
          <thead><tr><th>Date</th><th>Produit</th><th>Utilisateur</th><th>Parrainé par</th><th>Montant payé</th><th>Revenu/jour</th><th>Total revenu</th><th>Durée</th><th>Statut</th></tr></thead>
          <tbody>{filtered.map(p=>(
            <tr key={p.id}>
              <td>{p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : '-'}</td>
              <td><div className="prod"><div className="img" style={{backgroundImage:`url(${p.machine?.image||''})`}} /><div><strong>{p.machine?.name || p.machineId}</strong></div></div></td>
              <td><strong>{p.user?.username||'-'}</strong><div className="sm">{p.user?.phone||p.userId}</div></td>
              <td>{p.referrer ? <><strong>{p.referrer.username||'-'}</strong><div className="sm">{p.referrer.phone}</div></> : <span className="muted">Non</span>}</td>
              <td className="amt">{fmt(p.amount)} F</td>
              <td>{fmt(p.dailyRevenue)} F</td>
              <td>{fmt(p.totalRevenue)} F</td>
              <td>{p.durationDays} j</td>
              <td><span className="st">{p.status||'-'}</span></td>
            </tr>
          ))}{!filtered.length && <tr><td colSpan={9} className="empty">Aucun achat</td></tr>}</tbody>
        </table></div>
      )}
      <style>{`
        h1{margin:0;font-size:24px;color:#0f172a}.sub{margin:4px 0 14px;color:#64748b;font-size:14px}
        .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
        .search{height:40px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:14px;flex:1;min-width:220px}
        .toolbar button{height:40px;padding:0 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:700;cursor:pointer}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 8px 20px rgba(15,23,42,.06)}
        .table-wrap{overflow:auto}
        table{width:100%;border-collapse:collapse;font-size:13px;min-width:1100px}
        th,td{padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle}
        th{background:linear-gradient(180deg,#f8fafc,#f5f3ff);color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em}
        tr:hover td{background:#fafaff}
        .prod{display:flex;align-items:center;gap:10px}
        .img{width:44px;height:44px;border-radius:10px;background:#e2e8f0 center/cover no-repeat;flex-shrink:0}
        .sm{font-size:12px;color:#64748b;margin-top:2px}.muted{color:#94a3b8}
        .amt{color:#2563eb;font-weight:700}
        .st{background:#dcfce7;color:#166534;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;text-transform:capitalize}
        .empty{color:#94a3b8;text-align:center}
        .err{color:#dc2626}
      `}</style>
    </div>
  );
}
