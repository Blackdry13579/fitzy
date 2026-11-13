import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/adminClient';

function exportCsv(filename:string, rows:any[], cols:{k:string,l:string}[]) {
  const esc = (v:any) => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const csv = [cols.map(c=>esc(c.l)).join(','), ...rows.map(r=>cols.map(c=>esc(r[c.k])).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export function AdminWithdrawalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const load = async () => { try { setItems(await adminApi('/admin/transactions?type=withdraw')); } catch(e:any){ setError(e.message);} finally{ setLoading(false);} };
  useEffect(()=>{load();},[]);
  const act = async (id:string, st:string) => { try { await adminApi(`/admin/transactions/${id}`, {method:'PATCH', body: JSON.stringify({status:st})}); await load(); setSel(null);} catch(e:any){ alert(e.message);} };
  const fmt = (n:number)=>Number(n||0).toLocaleString('fr-FR');
  const filtered = useMemo(()=> items.filter(t=>{
    if (status!=='all' && t.status!==status) return false;
    const s = q.toLowerCase(); if (!s) return true;
    return [t.id,t.user?.username,t.user?.phone,t.user?.memberId,t.referrer?.username,t.beneficiary,t.phone,t.status].some(v=>String(v||'').toLowerCase().includes(s));
  }), [items,q,status]);
  const onExport = () => exportCsv('retraits.csv', filtered.map(t=>({ date:t.createdAt||'', demandeur:`${t.user?.username||''} ${t.user?.phone||''}`.trim(), beneficiaire:t.beneficiary||'', tel_beneficiaire:t.phone||'', montant:t.amount, frais:t.fee||0, statut:t.status })), [{k:'date',l:'Date'},{k:'demandeur',l:'Demandeur'},{k:'beneficiaire',l:'Bénéficiaire'},{k:'tel_beneficiaire',l:'Tél bénéficiaire'},{k:'montant',l:'Montant'},{k:'frais',l:'Frais'},{k:'statut',l:'Statut'}]);
  return (
    <div className="page">
      <div className="head"><div><h1>Retraits</h1><p className="sub">Demandes de retrait : bénéficiaire, montant à recevoir après débit, frais et statut</p></div></div>
      <div className="toolbar">
        <input className="search" placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)} />
        <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tous statuts</option><option value="pending">En attente</option><option value="confirmed">Confirmé</option><option value="rejected">Rejeté</option></select>
        <button onClick={onExport}>Exporter CSV</button>
      </div>
      {error && <p className="err">{error}</p>}
      {loading ? <p>Chargement...</p> : (
        <div className="table-wrap card"><table>
          <thead><tr><th>Date</th><th>Utilisateur (demandeur)</th><th>Parrainé par</th><th>Bénéficiaire (reçoit)</th><th>Montant à recevoir</th><th>Frais</th><th>Total débité</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>{filtered.map(t=>(
            <tr key={t.id}>
              <td>{t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR') : '-'}</td>
              <td><strong>{t.user?.username||'-'}</strong><div className="sm">{t.user?.phone||t.userId}</div></td>
              <td>{t.referrer ? <><strong>{t.referrer.username||'-'}</strong><div className="sm">{t.referrer.phone}</div></> : <span className="muted">Non</span>}</td>
              <td><strong>{t.beneficiary||'-'}</strong><div className="sm">{t.phone||'-'}</div></td>
              <td className="out">{fmt(t.amount)} F</td>
              <td>{fmt(t.fee||0)} F</td>
              <td><strong>{fmt(Number(t.amount||0)+Number(t.fee||0))} F</strong></td>
              <td><span className={`badge ${t.status}`}>{t.status}</span></td>
              <td>{t.status==='pending' ? <div className="acts"><button className="ok" onClick={()=>act(t.id,'confirmed')}>Approuver</button><button className="danger" onClick={()=>act(t.id,'rejected')}>Rejeter</button></div> : <button className="linkbtn" onClick={()=>setSel(t)}>Détail</button>}</td>
            </tr>
          ))}{!filtered.length && <tr><td colSpan={9} className="empty">Aucun retrait</td></tr>}</tbody>
        </table></div>
      )}
      {sel && <div className="modal" onClick={()=>setSel(null)}><div className="panel" onClick={e=>e.stopPropagation()}>
        <h2>Détail de la demande de retrait</h2>
        <div className="grid">
          <div><label>ID transaction</label><p>{sel.id}</p></div>
          <div><label>Date</label><p>{sel.createdAt ? new Date(sel.createdAt).toLocaleString('fr-FR') : '-'}</p></div>
          <div><label>Demandeur</label><p>{sel.user?.username||'-'} ({sel.user?.phone||sel.userId})</p></div>
          <div><label>ID membre demandeur</label><p>{sel.user?.memberId||'-'}</p></div>
          <div><label>Solde actuel demandeur</label><p>{fmt(sel.user?.balance||0)} FCFA</p></div>
          <div><label>Parrainé par</label><p>{sel.referrer ? `${sel.referrer.username||''} (${sel.referrer.phone})` : 'Non'}</p></div>
          <div className="highlight"><label>Nom du bénéficiaire (reçoit le solde)</label><p><strong>{sel.beneficiary||'-'}</strong></p></div>
          <div className="highlight"><label>Téléphone bénéficiaire</label><p><strong>{sel.phone||'-'}</strong></p></div>
          <div><label>Montant à recevoir (après débit)</label><p className="out"><strong>{fmt(sel.amount)} FCFA</strong></p></div>
          <div><label>Frais</label><p>{fmt(sel.fee||0)} FCFA</p></div>
          <div><label>Total débité du compte</label><p><strong>{fmt(Number(sel.amount||0)+Number(sel.fee||0))} FCFA</strong></p></div>
          <div><label>Statut</label><p><span className={`badge ${sel.status}`}>{sel.status}</span></p></div>
        </div>
        <div className="actions">
          {sel.status==='pending' && <><button className="ok" onClick={()=>act(sel.id,'confirmed')}>Approuver</button><button className="danger" onClick={()=>act(sel.id,'rejected')}>Rejeter</button></>}
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
        table{width:100%;border-collapse:collapse;font-size:13px;min-width:1100px}
        th,td{padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
        th{background:linear-gradient(180deg,#f8fafc,#fff1f2);color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em}
        tr:hover td{background:#fff7f7}
        .sm{font-size:12px;color:#64748b;margin-top:2px}.muted{color:#94a3b8}
        .out{color:#dc2626;font-weight:700}
        .badge{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;text-transform:capitalize;display:inline-block}
        .badge.confirmed{background:#dcfce7;color:#166534}.badge.pending{background:#fef3c7;color:#92400e}.badge.rejected{background:#fee2e2;color:#991b1b}
        .acts{display:flex;gap:6px;flex-wrap:wrap}
        button{height:32px;padding:0 10px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;font-weight:600;cursor:pointer}
        .linkbtn{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}
        .ok{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none}
        .danger{background:#fee2e2;color:#991b1b;border-color:#fecaca}
        .empty{color:#94a3b8;text-align:center}
        .modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
        .panel{width:100%;max-width:760px;background:#fff;border-radius:20px;padding:18px}
        .panel h2{margin:0 0 4px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin:12px 0}
        .grid label{display:block;font-size:12px;color:#64748b;margin-bottom:2px}.grid p{margin:0;font-weight:600;color:#0f172a}
        .highlight{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px}
        .actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
        .err{color:#dc2626}
      `}</style>
    </div>
  );
}
