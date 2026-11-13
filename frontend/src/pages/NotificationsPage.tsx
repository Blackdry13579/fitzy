import { useEffect, useState } from 'react';
import { Bell, Gift, Wallet, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

type Notif = { id: string; title: string; text: string; type: string; read: boolean; createdAt: string };

function iconFor(type: string) {
  if (type === 'wallet') return Wallet;
  if (type === 'purchase') return Gift;
  return Info;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  useEffect(() => {
    api<Notif[]>('/notifications').then(setItems).catch(() => setItems([]));
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <div className="screen">
      <div className="content">
        <button className="back" onClick={() => navigate(-1)}>Retour</button>
        <div className="hero">
          <Bell size={26} />
          <div>
            <h1>Notifications</h1>
            <p>Restez informé de vos activités</p>
          </div>
        </div>

        <div className="list">
          {items.length === 0 ? (
            <div className="empty card">
              <Bell size={40} />
              <h3>Aucune notification</h3>
              <p>Vous n'avez pas encore de notification.</p>
            </div>
          ) : items.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <div key={n.id} className={`card item ${!n.read ? 'unread' : ''}`}>
                <div className="icon"><Icon size={20} /></div>
                <div className="body">
                  <div className="row"><strong>{n.title}</strong><span>{new Date(n.createdAt).toLocaleDateString('fr-FR')}</span></div>
                  <p>{n.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .screen{min-height:100%;background:transparent}
        .content{padding:16px 14px 20px;display:flex;flex-direction:column;gap:14px}
        .back{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;border:none;background:#111827;color:#fff;padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer}
        .hero{display:flex;align-items:center;gap:12px;padding:16px;border-radius:20px;color:#fff;background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 45%,#2563eb 100%)}
        .hero h1{margin:0;font-size:22px} .hero p{margin:2px 0 0;color:rgba(255,255,255,.95)}
        .list{display:flex;flex-direction:column;gap:10px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 14px rgba(15,23,42,.05)}
        .item{display:flex;gap:12px;padding:12px;align-items:flex-start}
        .item.unread{border-color:#bfdbfe;background:linear-gradient(180deg,#fff,#f8fbff)}
        .icon{width:40px;height:40px;border-radius:12px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .body{flex:1;min-width:0}
        .row{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
        .row strong{font-size:14px;color:#111827}
        .row span{font-size:11px;color:#111827;white-space:nowrap}
        .body p{margin:4px 0 0;font-size:13px;color:#111827;line-height:1.45}
        .empty{padding:28px 16px;text-align:center;color:#111827;display:flex;flex-direction:column;align-items:center;gap:6px}
        .empty h3{margin:0;color:#111827} .empty p{margin:0}
        @media (min-width: 900px){
          .content{padding:24px 32px 40px;max-width:900px;width:100%;margin:0 auto}
          .list{gap:12px}
        }
      `}</style>
    </div>
  );
}
