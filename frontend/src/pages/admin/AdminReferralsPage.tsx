import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/adminClient';

function exportCsv(filename:string, rows:any[], cols:{k:string,l:string}[]) {
  const esc = (v:any) => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const csv = [cols.map(c=>esc(c.l)).join(','), ...rows.map(r=>cols.map(c=>esc(r[c.k])).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

function TreeNode({ n, depth=0 }: any) {
  const [open, setOpen] = useState(depth < 1);
  const has = n.children && n.children.length > 0;
  return (
    <div className="tn" style={{marginLeft: depth?16:0}}>
      <div className="tn-row">
        {has ? <button className="tog" onClick={()=>setOpen(o=>!o)}>{open?'−':'+'}</button> : <span className="dot" />}
        <div className="tn-info"><strong>{n.username||'Utilisateur'}</strong><span>{n.phone} · ID {n.memberId||'-'} · Code {n.inviteCode||'-'}</span></div>
      </div>
      {open && has && <div className="tn-kids">{n.children.map((c:any)=><TreeNode key={c.id} n={c} depth={depth+1} />)}</div>}
    </div>
  );
}

export function AdminReferralsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [tree, setTree] = useState<any[]>([]);
  const [view, setView] = useState<'table'|'tree'>('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [q, setQ] = useState('');
  useEffect(()=>{ (async()=>{ try { const [r,t] = await Promise.all([adminApi('/admin/referrals'), adminApi('/admin/referrals/tree')]); setItems(r as any[]); setTree(t as any[]); } catch(e:any){ setError(e.message);} finally{ setLoading(false);} })(); },[]);
  const fmt = (n:number)=>Number(n||0).toLocaleString('fr-FR');
  const filtered = useMemo(()=> items.filter(u=>{
    const s=q.toLowerCase(); if(!s) return true;
    return [u.username,u.phone,u.memberId,u.inviteCode,u.referrer?.username,u.referrer?.phone].some(v=>String(v||'').toLowerCase().includes(s));
  }), [items,q]);
  const onExport = () => exportCsv('parrainages.csv', filtered.map(u=>({username:u.username||'',phone:u.phone||'',memberId:u.memberId||'',code:u.inviteCode||'',parrain:u.referrer?`${u.referrer.username||''} ${u.referrer.phone||''}`:'Aucun',filleuls_directs:u.directReferrals?.length||0,equipe:u.totalTeam,commissions:u.totalCommission})), [{k:'username',l:'Utilisateur'},{k:'phone',l:'Téléphone'},{k:'memberId',l:'ID membre'},{k:'code',l:'Code'},{k:'parrain',l:'Parrain'},{k:'filleuls_directs',l:'Filleuls directs'},{k:'equipe',l:'Équipe totale'},{k:'commissions',l:'Commissions'}]);
  return (
    <div className="page">
      <h1>Parrainages</h1><p className="sub">Tableau des parrainages, liens parrain/filleuls et vue arbre</p>
      <div className="toolbar">
        <input className="search" placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)} />
        <div className="seg"><button className={view==='table'?'on':''} onClick={()=>setView('table')}>Tableau</button><button className={view==='tree'?'on':''} onClick={()=>setView('tree')}>Arbre</button></div>
        <button onClick={onExport}>Exporter CSV</button>
      </div>
      {error && <p className="err">{error}</p>}
      {loading ? <p>Chargement...</p> : view==='tree' ? (
        <div className="card tree">{tree.map(n=><TreeNode key={n.id} n={n} />)}{!tree.length && <p className="empty">Aucune donnée</p>}</div>
      ) : (
        <div className="table-wrap card"><table>
          <thead><tr><th>Utilisateur</th><th>Téléphone</th><th>ID membre</th><th>Code</th><th>Parrain (lié à)</th><th>Filleuls directs</th><th>Équipe totale</th><th>Commissions</th><th>Détail</th></tr></thead>
          <tbody>{filtered.map(u=>(
            <tr key={u.id}>
              <td><strong>{u.username||'Utilisateur'}</strong></td>
              <td>{u.phone}</td>
              <td>{u.memberId||'-'}</td>
              <td>{u.inviteCode||'-'}</td>
              <td>{u.referrer ? <><strong>{u.referrer.username||'-'}</strong><div className="sm">{u.referrer.phone}</div></> : <span className="muted">Aucun</span>}</td>
              <td>{u.directReferrals?.length || 0}</td>
              <td>{u.totalTeam} <span className="sm">(N1:{u.levels?.[0]?.count||0} N2:{u.levels?.[1]?.count||0} N3:{u.levels?.[2]?.count||0})</span></td>
              <td className="amt">{fmt(u.totalCommission)} F</td>
              <td><button className="linkbtn" onClick={()=>setSel(u)}>Voir</button></td>
            </tr>
          ))}{!filtered.length && <tr><td colSpan={9} className="empty">Aucune donnée</td></tr>}</tbody>
        </table></div>
      )}
      {sel && <div className="modal" onClick={()=>setSel(null)}><div className="panel" onClick={e=>e.stopPropagation()}>
        <div className="ph"><h2>Détail parrainage</h2><button onClick={()=>setSel(null)}>Fermer</button></div>
        <div className="grid">
          <div><label>Utilisateur</label><p>{sel.username} ({sel.phone})</p></div>
          <div><label>ID membre</label><p>{sel.memberId||'-'}</p></div>
          <div><label>Code invite</label><p>{sel.inviteCode}</p></div>
          <div><label>Parrain (lié à)</label><p>{sel.referrer ? `${sel.referrer.username||'Utilisateur'} · ${sel.referrer.phone} · ID ${sel.referrer.memberId||'-'}` : 'Aucun'}</p></div>
          <div><label>Commission totale</label><p className="amt">{fmt(sel.totalCommission)} FCFA</p></div>
          <div><label>Équipe totale</label><p>{sel.totalTeam}</p></div>
        </div>
        <h3>Niveaux & commissions</h3>
        <div className="table-wrap inner"><table><thead><tr><th>Niveau</th><th>Taux</th><th>Personnes</th><th>Commission</th></tr></thead><tbody>
          {(sel.levels||[]).map((l:any)=><tr key={l.level}><td>Niveau {l.level}</td><td>{l.rate}%</td><td>{l.count}</td><td>{fmt(l.commission)} FCFA</td></tr>)}
        </tbody></table></div>
        <h3>Filleuls directs</h3>
        <div className="table-wrap inner"><table><thead><tr><th>Utilisateur</th><th>Téléphone</th><th>ID membre</th></tr></thead><tbody>
          {(sel.directReferrals||[]).map((r:any)=><tr key={r.id}><td>{r.username||'Utilisateur'}</td><td>{r.phone}</td><td>{r.memberId||'-'}</td></tr>)}
          {!sel.directReferrals?.length && <tr><td colSpan={3} className="muted">Aucun filleul direct</td></tr>}
        </tbody></table></div>
      </div></div>}
      <style>{`
        h1{margin:0;font-size:24px;color:#0f172a}.sub{margin:4px 0 14px;color:#64748b;font-size:14px}
        .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
        .search{height:40px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:14px;flex:1;min-width:220px}
        .seg{display:flex;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:3px}
        .seg button{height:34px;border:none;background:transparent;padding:0 12px;border-radius:8px;font-weight:600;cursor:pointer;color:#334155}
        .seg button.on{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff}
        .toolbar > button{height:40px;padding:0 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:700;cursor:pointer}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 8px 20px rgba(15,23,42,.06)}
        .table-wrap{overflow:auto}
        table{width:100%;border-collapse:collapse;font-size:13px;min-width:1050px}
        th,td{padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle}
        th{background:linear-gradient(180deg,#f8fafc,#f5f3ff);color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em}
        tr:hover td{background:#fafaff}
        .sm{font-size:12px;color:#64748b;margin-top:2px}.muted{color:#94a3b8}
        .amt{color:#2563eb;font-weight:700}
        .empty{color:#94a3b8;text-align:center}
        .linkbtn{height:32px;padding:0 12px;border-radius:8px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-weight:600;cursor:pointer}
        .tree{padding:14px;overflow:auto}
        .tn{margin:4px 0}
        .tn-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:12px;background:linear-gradient(180deg,#fff,#f8fafc)}
        .tog{width:26px;height:26px;border-radius:8px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-weight:800;cursor:pointer}
        .dot{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;color:#94a3b8}
        .dot::before{content:"•";font-size:18px}
        .tn-info{display:flex;flex-direction:column}
        .tn-info span{font-size:12px;color:#64748b}
        .tn-kids{margin-top:6px;padding-left:10px;border-left:2px dashed #bfdbfe}
        .modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
        .panel{width:100%;max-width:900px;max-height:90vh;overflow:auto;background:#fff;border-radius:20px;padding:18px}
        .ph{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.ph h2{margin:0}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:12px}
        .grid label{display:block;font-size:12px;color:#64748b;margin-bottom:2px}.grid p{margin:0;font-weight:600;color:#0f172a}
        h3{margin:14px 0 8px;font-size:15px;color:#111827}
        .inner table{min-width:0}
        button{height:36px;padding:0 14px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-weight:600;cursor:pointer}
        .err{color:#dc2626}
      `}</style>
    </div>
  );
}
