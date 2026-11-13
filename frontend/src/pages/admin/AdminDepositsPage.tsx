import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/adminClient';

function exportCsv(filename:string, rows:any[], cols:{k:string,l:string}[]) {
  const esc = (v:any) => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const csv = [cols.map(c=>esc(c.l)).join(','), ...rows.map(r=>cols.map(c=>esc(r[c.k])).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export function AdminDepositsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const load = async () => { try { setItems(await adminApi('/admin/transactions?type=deposit')); } catch(e:any){ setError(e.message);} finally{ setLoading(false);} };
  useEffect(()=>{load();},[]);
  const act = async (id:string, st:string) => { try { await adminApi(`/admin/transactions/${id}`, {method:'PATCH', body: JSON.stringify({status:st})}); await load(); setSel(null);} catch(e:any){ alert(e.message);} };
  const fmt = (n:number)=>Number(n||0).toLocaleString('fr-FR');
  const filtered = useMemo(()=> items.filter(t=>{
    if (status!=='all' && t.status!==status) return false;
    const s = q.toLowerCase();
    if (!s) return true;
    return [t.id,t.user?.username,t.user?.phone,t.user?.memberId,t.referrer?.username,t.referrer?.phone,t.method,t.status].some(v=>String(v||'').toLowerCase().includes(s));
  }), [items,q,status]);
  const onExport = () => exportCsv('depots.csv', filtered.map(t=>({
    date: t.createdAt||'', utilisateur: `${t.user?.username||''} ${t.user?.phone||''}`.trim(), parrain: t.referrer?`${t.referrer.username||''} ${t.referrer.phone||''}`:'Non', montant: t.amount, statut: t.status, methode: t.method||''
  })), [{k:'date',l:'Date'},{k:'utilisateur',l:'Utilisateur'},{k:'parrain',l:'Parrainé par'},{k:'montant',l:'Montant'},{k:'statut',l:'Statut'},{k:'methode',l:'Méthode'}]);
  return (
    <div className="page">
      <div className="head"><div><h1>Dépôts</h1><p className="sub">Tableau des dépôts : utilisateur, parrain, montant à créditer et statut</p></div></div>
      <div className="toolbar">
        <input className="search" placeholder="Rechercher (utilisateur, téléphone, ID, parrain...)" value={q} onChange={e=>setQ(e.target.value)} />
        <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tous statuts</option><option value="pending">En attente</option><option value="confirmed">Confirmé</option><option value="rejected">Rejeté</option></select>
        <button onClick={onExport}>Exporter CSV</button>
      </div>
      {error && <p className="err">{error}</p>}
      {loading ? <p>Chargement...</p> : (
        <div className="table-wrap card"><table>
          <thead><tr><th>Date</th><th>Utilisateur</th><th>Parrainé par</th><th>Montant</th><th>À recevoir (solde)</th><th>Méthode</th><th>Statut</th><th>Détail</th></tr></thead>
          <tbody>{filtered.map(t=>(
            <tr key={t.id}>
              <td>{t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR') : '-'}</td>
              <td><strong>{t.user?.username||'-'}</strong><div className="sm">{t.user?.phone||t.userId} · ID {t.user?.memberId||'-'}</div></td>
              <td>{t.referrer ? <><strong>{t.referrer.username||'-'}</strong><div className="sm">{t.referrer.phone}</div></> : <span className="muted">Non</span>}</td>
              <td className="in">{fmt(t.amount)} F</td>
              <td><strong>{fmt(t.amount)} F</strong>{t.status==='confirmed' ? <div className="sm ok">Crédité</div> : t.status==='pending' ? <div className="sm wait">En attente</div> : <div className="sm no">Non crédité</div>}</td>
              <td>{t.method||'-'}</td>
              <td><span className={`badge ${t.status}`}>{t.status}</span></td>
              <td><button className="linkbtn" onClick={()=>setSel(t)}>Voir</button></td>
            </tr>
          ))}{!filtered.length && <tr><td colSpan={8} className="empty">Aucun dépôt</td></tr>}</tbody>
        </table></div>
      )}
      {sel && <div className="modal" onClick={()=>setSel(null)}><div className="panel" onClick={e=>e.stopPropagation()}>
        <h2>Détail du dépôt</h2>
        <div className="grid">
          <div><label>ID</label><p>{sel.id}</p></div>
          <div><label>Date</label><p>{sel.createdAt ? new Date(sel.createdAt).toLocaleString('fr-FR') : '-'}</p></div>
          <div><label>Utilisateur</label><p>{sel.user?.username} ({sel.user?.phone})</p></div>
          <div><label>Parrainé par</label><p>{sel.referrer ? `${sel.referrer.username||''} (${sel.referrer.phone})` : 'Non parrainé'}</p></div>
          <div><label>Montant</label><p className="in">{fmt(sel.amount)} FCFA</p></div>
          <div><label>Montant à recevoir (solde)</label><p><strong>{fmt(sel.amount)} FCFA</strong></p></div>
          <div><label>Méthode</label><p>{sel.method||'-'}</p></div>
          <div><label>Statut</label><p><span className={`badge ${sel.status}`}>{sel.status}</span></p></div>
        </div>
        <div className="actions">
          {sel.status==='pending' && <><button className="ok" onClick={()=>act(sel.id,'confirmed')}>Confirmer</button><button className="danger" onClick={()=>act(sel.id,'rejected')}>Rejeter</button></>}
          <button onClick={()=>setSel(null)}>Fermer</button>
        </div>
      </div></div>}
      <style>{`
        h1{margin:0;font-size:24px;color:#0f172a}.sub{margin:4px 0 14px;color:#64748b;font-size:14px}
        .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
        .search,select{height:40px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:14px}
        .search{flex:1;min-width:220px}
        .toolbar button{height:40px;padding:0 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:700;cursor:pointer}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 8px 20px rgba(15,23,42,.06)}
        .table-wrap{overflow:auto}
        table{width:100%;border-collapse:collapse;font-size:13px;min-width:980px}
        th,td{padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
        th{background:linear-gradient(180deg,#f8fafc,#eff6ff);color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em}
        tr:hover td{background:#f8fbff}
        .sm{font-size:12px;color:#64748b;margin-top:2px}.muted{color:#94a3b8}
        .in{color:#16a34a;font-weight:700}
        .ok{color:#16a34a}.wait{color:#d97706}.no{color:#dc2626}
        .badge{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;text-transform:capitalize;display:inline-block}
        .badge.confirmed{background:#dcfce7;color:#166534}.badge.pending{background:#fef3c7;color:#92400e}.badge.rejected{background:#fee2e2;color:#991b1b}
        .linkbtn{height:32px;padding:0 12px;border-radius:8px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-weight:600;cursor:pointer}
        .empty{color:#94a3b8;text-align:center}
        .modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
        .panel{width:100%;max-width:680px;background:#fff;border-radius:20px;padding:18px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:12px 0}
        .grid label{display:block;font-size:12px;color:#64748b;margin-bottom:2px}.grid p{margin:0;font-weight:600;color:#0f172a}
        .actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
        button{height:38px;padding:0 14px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-weight:600;cursor:pointer}
        .actions .ok, .ok{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none}
        .danger{background:#fee2e2;color:#991b1b;border-color:#fecaca}
        .err{color:#dc2626}
      `}</style>
    </div>
  );
}
