import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminClient';

export function AdminAuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ (async()=>{ try{ setItems(await adminApi('/admin/audit')); } finally{ setLoading(false);} })(); },[]);
  return (
    <div className="page">
      <h1>Journal d’audit</h1><p className="sub">Historique des actions administrateur</p>
      {loading ? <p>Chargement...</p> : (
        <div className="table-wrap card"><table>
          <thead><tr><th>Date</th><th>Admin</th><th>Action</th><th>Détails</th></tr></thead>
          <tbody>{items.map(l=>(
            <tr key={l.id}><td>{l.createdAt ? new Date(l.createdAt).toLocaleString('fr-FR') : '-'}</td><td>{l.admin||'-'}</td><td><span className="act">{l.action}</span></td><td><code>{JSON.stringify(l.details||{})}</code></td></tr>
          ))}{!items.length && <tr><td colSpan={4} className="empty">Aucune action enregistrée</td></tr>}</tbody>
        </table></div>
      )}
      <style>{`
        h1{margin:0;font-size:24px;color:#0f172a}.sub{margin:4px 0 14px;color:#64748b;font-size:14px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 8px 20px rgba(15,23,42,.06)}
        .table-wrap{overflow:auto}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
        th{background:linear-gradient(180deg,#f8fafc,#e0e7ff);color:#334155;font-size:12px;text-transform:uppercase}
        .act{background:#dbeafe;color:#1d4ed8;padding:4px 8px;border-radius:8px;font-weight:700;font-size:12px}
        code{font-size:12px;color:#334155;white-space:pre-wrap}
        .empty{color:#94a3b8;text-align:center}
      `}</style>
    </div>
  );
}
