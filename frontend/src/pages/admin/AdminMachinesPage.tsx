import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminClient';

const empty = { name:'', category:'', level:'', priceFcfa:0, dailyRevenueFcfa:0, durationDays:90, description:'', image:'', locked:false };

export function AdminMachinesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string|null>(null);
  const [show, setShow] = useState(false);

  const load = async () => { try { setItems(await adminApi('/admin/machines')); } catch(e:any){ setError(e.message);} finally{ setLoading(false);} };
  useEffect(()=>{load();},[]);

  const save = async (e:any) => {
    e.preventDefault();
    try {
      if (editing) await adminApi(`/admin/machines/${editing}`, { method:'PUT', body: JSON.stringify(form) });
      else await adminApi('/admin/machines', { method:'POST', body: JSON.stringify(form) });
      setShow(false); setEditing(null); setForm(empty); await load();
    } catch(err:any){ alert(err.message); }
  };
  const edit = (m:any) => { setEditing(m.id); setForm({...m}); setShow(true); };
  const del = async (id:string) => { if(!confirm('Supprimer ce produit ?')) return; try { await adminApi(`/admin/machines/${id}`,{method:'DELETE'}); await load(); } catch(e:any){ alert(e.message);} };
  const fmt = (n:number)=>Number(n||0).toLocaleString('fr-FR');

  return (
    <div className="page">
      <div className="head"><div><h1>Produits / Machines</h1><p className="sub">Ajouter, modifier ou supprimer les produits visibles côté client</p></div>
        <button className="primary" onClick={()=>{setEditing(null);setForm(empty);setShow(true);}}>+ Ajouter un produit</button></div>
      {error && <p className="err">{error}</p>}
      {loading ? <p>Chargement...</p> : (
        <div className="grid">
          {items.map(m => (
            <div key={m.id} className="card">
              <div className="img" style={{backgroundImage:`url(${m.image})`}} />
              <div className="body">
                <div className="top"><h3>{m.name}</h3>{m.locked && <span className="lock">Verrouillé</span>}</div>
                <p className="cat">{m.category || m.level}</p>
                <div className="meta"><span><strong>{fmt(m.priceFcfa)}</strong> FCFA</span><span>+{fmt(m.dailyRevenueFcfa)}/j</span><span>{m.durationDays} j</span></div>
                <div className="actions"><button onClick={()=>edit(m)}>Modifier</button><button className="danger" onClick={()=>del(m.id)}>Supprimer</button></div>
              </div>
            </div>
          ))}
        </div>
      )}
      {show && <div className="modal"><form className="form" onSubmit={save}>
        <h2>{editing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
        <div className="cols">
          <label>Nom<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
          <label>Catégorie<input value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label>
          <label>Niveau<input value={form.level||''} onChange={e=>setForm({...form,level:e.target.value})}/></label>
          <label>Prix (FCFA)<input type="number" value={form.priceFcfa} onChange={e=>setForm({...form,priceFcfa:e.target.value})}/></label>
          <label>Revenu/jour (FCFA)<input type="number" value={form.dailyRevenueFcfa} onChange={e=>setForm({...form,dailyRevenueFcfa:e.target.value})}/></label>
          <label>Durée (jours)<input type="number" value={form.durationDays} onChange={e=>setForm({...form,durationDays:e.target.value})}/></label>
        </div>
        <label>Image (URL ou chemin)<input value={form.image||''} onChange={e=>setForm({...form,image:e.target.value})}/></label>
        <label>Description<textarea value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label className="check"><input type="checkbox" checked={!!form.locked} onChange={e=>setForm({...form,locked:e.target.checked})}/> Verrouillé</label>
        <div className="row"><button type="button" onClick={()=>setShow(false)}>Annuler</button><button className="primary" type="submit">Enregistrer</button></div>
      </form></div>}
      <style>{`
        .head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px}
        h1{margin:0;font-size:24px;color:#0f172a}.sub{margin:4px 0 0;color:#64748b;font-size:14px}
        .primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none;border-radius:12px;padding:10px 14px;font-weight:700;cursor:pointer}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 8px 20px rgba(15,23,42,.06)}
        .img{height:140px;background:#e2e8f0 center/cover no-repeat}
        .body{padding:12px}
        .top{display:flex;justify-content:space-between;gap:8px;align-items:center}
        h3{margin:0;font-size:16px;color:#0f172a}
        .cat{margin:4px 0 8px;color:#64748b;font-size:12px}
        .meta{display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:#334155;margin-bottom:10px}
        .actions{display:flex;gap:8px}
        .actions button{flex:1;height:36px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:600;cursor:pointer}
        .actions .danger{background:#fee2e2;color:#991b1b;border-color:#fecaca}
        .lock{font-size:11px;background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:999px;font-weight:700}
        .modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
        .form{width:100%;max-width:720px;max-height:90vh;overflow:auto;background:#fff;border-radius:20px;padding:18px;display:grid;gap:12px}
        .form h2{margin:0}
        .cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
        label{display:grid;gap:6px;font-size:13px;font-weight:600;color:#334155}
        input,textarea{border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:14px}
        textarea{min-height:80px;resize:vertical}
        .check{display:flex;align-items:center;gap:8px}
        .row{display:flex;justify-content:flex-end;gap:8px}
        .row button{height:40px;padding:0 14px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-weight:600;cursor:pointer}
        .err{color:#dc2626}
      `}</style>
    </div>
  );
}
