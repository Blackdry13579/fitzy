import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function TopBar({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <div className="left">
        {back ? (
          <button className="back" onClick={() => navigate(-1)} aria-label="Retour">Retour</button>
        ) : <span className="spacer" />}
      </div>
      <h1 className="title">{title}</h1>
      <div className="right">{right || <span className="spacer" />}</div>
      <style>{`
        .topbar{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:70px 1fr 70px;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid #e5e7eb}
        .title{margin:0;text-align:center;font-size:16px;font-weight:700;color:#111827}
        .back{height:34px;padding:0 12px;border:none;border-radius:10px;background:#111827;color:#fff;font-weight:700;font-size:13px;cursor:pointer}
        .spacer{display:block;width:70px;height:34px}
        .right{display:flex;justify-content:flex-end;align-items:center}
      `}</style>
    </div>
  );
}
