import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/adminClient';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Users, Gift } from 'lucide-react';

function exportCsv(filename:string, rows:any[], cols:{k:string,l:string}[]) {
  const esc = (v:any) => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const csv = [cols.map(c=>esc(c.l)).join(','), ...rows.map(r=>cols.map(c=>esc(r[c.k])).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export function AdminUsersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [q, setQ] = useState('');
  const load = async () => { try { setItems(await adminApi('/admin/users')); } catch(e:any){ setError(e.message);} finally{ setLoading(false);} };
  useEffect(()=>{load();},[]);
  const fmt = (n:number)=>Number(n||0).toLocaleString('fr-FR');
  const open = async (id:string) => { try { setDetail(await adminApi(`/admin/users/${id}`)); } catch(e:any){ alert(e.message);} };
  const save = async () => {
    if (!detail) return;
    try { await adminApi(`/admin/users/${detail.id}`, {method:'PATCH', body: JSON.stringify(edit)}); setEdit(null); await open(detail.id); await load(); }
    catch(e:any){ alert(e.message); }
  };

  const filtered = useMemo(()=> items.filter(u=>{
    const s=q.toLowerCase(); if(!s) return true;
    return [u.username,u.phone,u.memberId,u.country,u.inviteCode,u.id].some(v=>String(v||'').toLowerCase().includes(s));
  }), [items,q]);
  const onExport = () => exportCsv('utilisateurs.csv', filtered.map(u=>({createdAt:u.createdAt?new Date(u.createdAt).toLocaleString('fr-FR'):'',memberId:u.memberId||'',username:u.username||'',phone:u.phone||'',country:u.country||'',balance:u.balance||0,bonus:u.bonus||0,inviteCode:u.inviteCode||''})), [{k:'createdAt',l:"Date d'inscription"},{k:'memberId',l:'ID membre'},{k:'username',l:'Utilisateur'},{k:'phone',l:'Téléphone'},{k:'country',l:'Pays'},{k:'balance',l:'Solde disponible'},{k:'bonus',l:'Bonus cumulés'},{k:'inviteCode',l:'Code invite'}]);

  const dstats = useMemo(() => {
    if (!detail) return null;
    const txs = detail.transactions || [];
    const dep = txs.filter((t:any)=>t.type==='deposit' && t.status!=='rejected').reduce((s:number,t:any)=>s+Number(t.amount||0),0);
    const wd = txs.filter((t:any)=>t.type==='withdraw' && t.status!=='rejected').reduce((s:number,t:any)=>s+Number(t.amount||0),0);
    const levels = detail.referral?.levels || [];
    const comm = levels.reduce((s:number,l:any)=>s+Number(l.commission||0),0);
    const team = levels.reduce((s:number,l:any)=>s+Number(l.count||0),0);
    return { dep, wd, comm, team, levels };
  }, [detail]);

  return (
    <div className="page">
      <div className="head"><h1>Utilisateurs</h1><p className="sub">Comptes, soldes, dépôts/retraits, équipes et commissions</p></div>
      <div className="toolbar"><input className="search" placeholder="Rechercher (nom, téléphone, ID membre, code...)" value={q} onChange={e=>setQ(e.target.value)} /><button onClick={onExport}>Exporter CSV</button></div>
      {error && <p className="err">{error}</p>}
      {loading ? <p>Chargement...</p> : (
        <div className="table-wrap card"><table>
          <thead><tr><th>Date d'inscription</th><th>ID membre</th><th>Téléphone</th><th>Pays</th><th>Solde disponible</th><th>Bonus cumulés</th><th>Code invite</th><th>Parrain</th><th>Détail</th></tr></thead>
          <tbody>{filtered.map(u=>(
            <tr key={u.id}>
              <td className="date">{u.createdAt ? new Date(u.createdAt).toLocaleString('fr-FR') : '-'}</td>
              <td><span className="pill">{u.memberId||'-'}</span></td>
              <td>{u.phone}</td>
              <td>{u.country||'-'}</td>
              <td className="amt">{fmt(u.balance)} F</td>
              <td>{fmt(u.bonus||0)} F</td>
              <td>{u.inviteCode||'-'}</td>
              <td>{u.referredBy ? <span className="tag ok">Lié</span> : <span className="tag muted">Aucun</span>}</td>
              <td><button className="linkbtn" onClick={()=>open(u.id)}>Voir détail</button></td>
            </tr>
          ))}{!filtered.length && <tr><td colSpan={9} className="empty">Aucun utilisateur</td></tr>}</tbody>
        </table></div>
      )}

      {detail && dstats && <div className="modal" onClick={()=>{setDetail(null);setEdit(null);}}><div className="panel" onClick={e=>e.stopPropagation()}>
        <div className="ph">
          <div><h2>{detail.username||'Utilisateur'}</h2><p>{detail.phone} · ID {detail.memberId||'-'} · {detail.country||'-'}</p></div>
          <button onClick={()=>{setDetail(null);setEdit(null);}}>Fermer</button>
        </div>
        <div className="kpis">
          <div className="k k1"><div className="i"><Wallet size={18}/></div><div><span>Solde actuel</span><strong>{fmt(detail.balance)} F</strong></div></div>
          <div className="k k2"><div className="i"><ArrowDownToLine size={18}/></div><div><span>Total dépôts</span><strong>{fmt(dstats.dep)} F</strong></div></div>
          <div className="k k3"><div className="i"><ArrowUpFromLine size={18}/></div><div><span>Total retraits</span><strong>{fmt(dstats.wd)} F</strong></div></div>
          <div className="k k4"><div className="i"><Gift size={18}/></div><div><span>Commissions</span><strong>{fmt(dstats.comm)} F</strong></div></div>
          <div className="k k5"><div className="i"><Users size={18}/></div><div><span>Équipe totale</span><strong>{dstats.team}</strong></div></div>
        </div>
        <div className="grid">
          <div><label>Code invite</label><p>{detail.inviteCode||'-'}</p></div>
          <div><label>Bonus & commissions cumulés</label><p>{fmt(detail.bonus||0)} FCFA</p></div>
          <div><label>Parrain (lié à)</label><p>{detail.referrer ? `${detail.referrer.username||'Utilisateur'} · ${detail.referrer.phone||''} · ID ${detail.referrer.memberId||'-'}` : 'Aucun'}</p></div>
          <div><label>Dernière activité</label><p>{detail.lastActiveAt ? new Date(detail.lastActiveAt).toLocaleString('fr-FR') : '-'}</p></div>
        </div>
        {!edit ? <div className="actions"><button className="ok" onClick={()=>setEdit({username:detail.username,balance:detail.balance})}>Modifier solde / profil</button></div> : (
          <div className="edit">
            <label>Pseudo<input value={edit.username} onChange={e=>setEdit({...edit,username:e.target.value})}/></label>
            <label>Solde<input type="number" value={edit.balance} onChange={e=>setEdit({...edit,balance:e.target.value})}/></label>
            <p className="hint">Le total « Bonus & commissions cumulés » est calculé automatiquement à partir des transactions confirmées (bonus/commissions). Le solde disponible inclut les bonus crédités sur le portefeuille.</p>
            <div className="actions"><button onClick={()=>setEdit(null)}>Annuler</button><button className="ok" onClick={save}>Enregistrer</button></div>
          </div>
        )}
        <h3>Équipe & commissions (N1/N2/N3)</h3>
        <div className="table-wrap inner"><table><thead><tr><th>Niveau</th><th>Taux</th><th>Personnes</th><th>Commission</th></tr></thead><tbody>
          {dstats.levels.map((l:any)=><tr key={l.level}><td><span className={`lv l${l.level}`}>Niveau {l.level}</span></td><td>{l.rate}%</td><td><strong>{l.count}</strong></td><td className="amt">{fmt(l.commission)} F</td></tr>)}
          {!dstats.levels.length && <tr><td colSpan={4} className="muted">Aucune donnée</td></tr>}
        </tbody></table></div>
        <h3>Filleuls directs (liés à cet utilisateur)</h3>
        <div className="table-wrap inner"><table><thead><tr><th>Utilisateur</th><th>Téléphone</th><th>ID membre</th></tr></thead><tbody>
          {(detail.directReferrals||[]).map((r:any)=><tr key={r.id}><td>{r.username||'Utilisateur'}</td><td>{r.phone}</td><td>{r.memberId||'-'}</td></tr>)}
          {!detail.directReferrals?.length && <tr><td colSpan={3} className="muted">Aucun filleul direct</td></tr>}
        </tbody></table></div>
        <h3>Dernières transactions</h3>
        <div className="table-wrap inner"><table><thead><tr><th>Date</th><th>Type</th><th>Montant</th><th>Statut</th></tr></thead><tbody>
          {(detail.transactions||[]).slice(0,15).map((t:any)=><tr key={t.id}><td>{t.createdAt?new Date(t.createdAt).toLocaleString('fr-FR'):'-'}</td><td><span className={`tt ${t.type}`}>{t.type}</span></td><td>{fmt(t.amount)} F</td><td><span className={`badge ${t.status}`}>{t.status}</span></td></tr>)}
          {!detail.transactions?.length && <tr><td colSpan={4} className="muted">Aucune</td></tr>}
        </tbody></table></div>
      </div></div>}
      <style>{`
        .head h1{margin:0;font-size:24px;color:#0f172a}.sub{margin:4px 0 14px;color:#64748b;font-size:14px}
        .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
        .search{height:40px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:14px;flex:1;min-width:220px}
        .toolbar button{height:40px;padding:0 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:700;cursor:pointer}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 8px 20px rgba(15,23,42,.06)}
        .table-wrap{overflow:auto}
        table{width:100%;border-collapse:collapse;font-size:13px;min-width:1000px}
        th,td{padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle}
        th{background:linear-gradient(180deg,#f8fafc,#dbeafe);color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em}
        tr:hover td{background:#f8fbff}
        .amt{color:#1d4ed8;font-weight:700}
        .date{white-space:nowrap;color:#334155;font-size:12px}
        .pill{background:#e0e7ff;color:#3730a3;padding:4px 8px;border-radius:8px;font-weight:700;font-size:12px}
        .tag{padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700}
        .tag.ok{background:#dcfce7;color:#166534}.tag.muted{background:#f1f5f9;color:#64748b}
        .empty{color:#94a3b8;text-align:center}
        .linkbtn{height:32px;padding:0 12px;border-radius:8px;border:1px solid #bfdbfe;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1d4ed8;font-weight:700;cursor:pointer}
        .modal{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
        .panel{width:100%;max-width:980px;max-height:92vh;overflow:auto;background:linear-gradient(180deg,#ffffff,#f8fafc);border-radius:22px;padding:20px;border:1px solid #e5e7eb}
        .ph{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
        .ph h2{margin:0;font-size:22px;color:#0f172a}.ph p{margin:4px 0 0;color:#64748b;font-size:13px}
        .kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:14px}
        .k{display:flex;align-items:center;gap:10px;border-radius:16px;padding:12px;color:#fff}
        .k .i{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}
        .k span{display:block;font-size:11px;opacity:.95}.k strong{display:block;font-size:17px;line-height:1.2}
        .k1{background:linear-gradient(135deg,#2563eb,#1d4ed8)} .k2{background:linear-gradient(135deg,#059669,#16a34a)} .k3{background:linear-gradient(135deg,#e11d48,#f43f5e)} .k4{background:linear-gradient(135deg,#7c3aed,#a855f7)} .k5{background:linear-gradient(135deg,#0891b2,#06b6d4)}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:12px}
        .grid label{display:block;font-size:12px;color:#64748b;margin-bottom:2px}.grid p{margin:0;font-weight:600;color:#0f172a}
        h3{margin:16px 0 8px;font-size:15px;color:#111827}
        .inner table{min-width:0;background:#fff;border-radius:12px;overflow:hidden}
        .inner th{background:linear-gradient(180deg,#f8fafc,#eef2ff)}
        .lv{padding:4px 10px;border-radius:999px;font-weight:700;font-size:12px}
        .l1{background:#dbeafe;color:#1d4ed8}.l2{background:#ede9fe;color:#6d28d9}.l3{background:#dcfce7;color:#166534}
        .actions{display:flex;gap:8px;justify-content:flex-end;margin:8px 0}
        .edit{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:12px;margin:8px 0}
        .edit label{display:grid;gap:6px;font-size:13px;font-weight:600}
        .edit input{border:1px solid #cbd5e1;border-radius:10px;padding:10px}
        .hint{color:#64748b;font-size:12px;margin:0;grid-column:1/-1;align-self:center}
        .tt{padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#f1f5f9;color:#334155;text-transform:capitalize}
        .tt.deposit{background:#dcfce7;color:#166534}.tt.withdraw{background:#ffe4e6;color:#9f1239}.tt.purchase{background:#dbeafe;color:#1d4ed8}.tt.bonus{background:#fef3c7;color:#92400e}
        .badge{padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700;text-transform:capitalize}
        .badge.confirmed{background:#dcfce7;color:#166534}.badge.pending{background:#fef3c7;color:#92400e}.badge.rejected{background:#fee2e2;color:#991b1b}
        .muted{color:#94a3b8}
        button{height:36px;padding:0 14px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-weight:600;cursor:pointer}
        .ok{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none}
        .err{color:#dc2626}
      `}</style>
    </div>
  );
}
