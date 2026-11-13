import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export function NoticeModal({ open, title, message, type = 'info', onClose }: { open: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) {
  if (!open) return null;
  const isErr = type === 'error';
  const isOk = type === 'success';
  return (
    <div className="nm-backdrop" onClick={onClose}>
      <div className="nm-card" onClick={e => e.stopPropagation()}>
        <button className="nm-x" onClick={onClose} aria-label="Fermer"><X size={18}/></button>
        <div className={`nm-icon ${isErr?'err':isOk?'ok':'info'}`}>
          {isErr ? <AlertCircle size={28}/> : <CheckCircle2 size={28}/>}
        </div>
        {title && <h3>{title}</h3>}
        <p>{message}</p>
        <button className="nm-btn" onClick={onClose}>OK</button>
      </div>
      <style>{`
        .nm-backdrop{position:fixed;inset:0;z-index:300;background:rgba(15,23,42,.45);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:18px;animation:nmIn .18s ease}
        @keyframes nmIn{from{opacity:0}to{opacity:1}}
        .nm-card{width:100%;max-width:340px;background:#fff;border-radius:20px;padding:20px 18px 16px;box-shadow:0 24px 50px rgba(15,23,42,.22);text-align:center;position:relative;animation:nmPop .22s ease}
        @keyframes nmPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        .nm-x{position:absolute;top:10px;right:10px;width:30px;height:30px;border:none;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#475569}
        .nm-icon{width:54px;height:54px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:2px auto 10px}
        .nm-icon.ok{background:#dcfce7;color:#16a34a}
        .nm-icon.err{background:#fee2e2;color:#dc2626}
        .nm-icon.info{background:#dbeafe;color:#2563eb}
        .nm-card h3{margin:0 0 4px;font-size:18px;color:#0f172a}
        .nm-card p{margin:0;color:#475569;font-size:14px;line-height:1.45}
        .nm-btn{margin-top:14px;height:42px;padding:0 22px;border:none;border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:700;cursor:pointer;min-width:120px}
      `}</style>
    </div>
  );
}
