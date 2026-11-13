import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { machines as localMachines } from '../data/machines';
import { NoticeModal } from '../components/Modal';

type Machine = { id: string; name: string; priceFcfa: number; dailyRevenueFcfa: number; durationDays: number; image: string; locked?: boolean };
type InviteBonus = { directCount: number; awarded: number; target: number; tiers: {count:number;total:number}[] };

const defaultInviteTiers = [
  { count: 3, total: 700, icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wrapped%20gift/3D/wrapped_gift_3d.png', color: 'linear-gradient(135deg,#38bdf8,#2563eb)' },
  { count: 5, total: 1200, icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png', color: 'linear-gradient(135deg,#34d399,#059669)' },
  { count: 10, total: 3000, icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png', color: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { count: 15, total: 5000, icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fa99/512.gif', color: 'linear-gradient(135deg,#a78bfa,#7c3aed)' },
];

export function HomePage() {
  const { user, refresh } = useAuth();
  const [machines, setMachines] = useState<Machine[]>(localMachines as Machine[]);
  const [notice, setNotice] = useState<{title?:string; message:string; type:'success'|'error'|'info'} | null>(null);
  const [inviteBonus, setInviteBonus] = useState<InviteBonus | null>(null);
  const [notifPopup, setNotifPopup] = useState<{title:string; message:string} | null>(null);

  useEffect(() => {
    api<Machine[]>('/machines').then((data) => {
      if (Array.isArray(data) && data.length) setMachines(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    api<{ inviteBonus?: InviteBonus; levels?: {count:number}[] }>('/referral').then((d) => {
      if (d?.inviteBonus) setInviteBonus(d.inviteBonus);
      else setInviteBonus({ directCount: d?.levels?.[0]?.count || 0, awarded: 0, target: 0, tiers: defaultInviteTiers.map(t=>({count:t.count,total:t.total})) });
    }).catch(() => {});
    api<any[]>('/notifications').then((list) => {
      const unread = (Array.isArray(list)?list:[]).filter(n => !n.read && (n.title === 'Commission reçue' || n.type === 'wallet' || n.type === 'bonus'));
      if (unread.length) {
        const n = unread[0];
        setNotifPopup({ title: n.title || 'Notification', message: unread.length > 1 ? `${n.text} (+${unread.length-1} autre(s) notification(s))` : n.text });
      }
    }).catch(() => {});
  }, [user]);

  const claim = async () => {
    try {
      await api('/wallet/claim-daily', { method: 'POST' });
      await refresh();
      setNotice({ title: 'Bonus quotidien', message: 'Vous avez récupéré votre bonus de 50 FCFA !', type: 'success' });
    } catch (e: any) {
      setNotice({ title: 'Bonus quotidien', message: e.message || 'Impossible de réclamer le bonus', type: 'error' });
    }
  };

  return (
    <div className="screen">
      <div className="content">
        <header className="home-header">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              <svg viewBox="0 0 40 40" width="34" height="34" fill="none">
                <rect x="2" y="2" width="36" height="36" rx="12" fill="url(#lg)" />
                <path d="M12 20h16M14 15v10M26 15v10M10 17v6M30 17v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                <defs><linearGradient id="lg" x1="2" y1="2" x2="38" y2="38"><stop stopColor="#3b82f6"/><stop offset="1" stopColor="#1d4ed8"/></linearGradient></defs>
              </svg>
            </div>
            <h2>FITZONE</h2>
          </div>
          <div className="header-actions">
            <Link to="/notifications" className="notif-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span className="dot" />
            </Link>
            <Link to="/compte" className="avatar" aria-label="Profil">
              <span className="avatar-letter">{(user?.username || 'U').trim().charAt(0).toUpperCase()}</span>
            </Link>
          </div>
        </header>

        <section className="balance-card">
          <div className="balance-bg" aria-hidden="true" />
          <div className="balance-overlay" aria-hidden="true" />
          <div className="balance-content">
            <p className="label">Solde Total</p>
            <h1 className="amount">{(user?.balance ?? 0).toLocaleString('fr-FR')} <span>FCFA</span></h1>
            <div className="actions">
              <Link to="/depot" className="action-btn clay-btn"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dollar%20banknote/3D/dollar_banknote_3d.png" alt="" /> Dépôt</Link>
              <Link to="/retrait" className="action-btn ghost clay-btn"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Credit%20card/3D/credit_card_3d.png" alt="" /> Retrait</Link>
            </div>
          </div>
        </section>

        <section className="quick-grid">
          <Link to="/parrainage" className="quick card-pad clay">
            <img className="q3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png" alt="" />
            <div><strong>Inviter</strong><p>Gagner des bonus</p></div>
          </Link>
          <Link to="/catalogue" className="quick card-pad clay">
            <img className="q3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png" alt="" />
            <div><strong>Investir</strong><p>Choisir une machine</p></div>
          </Link>
        </section>

        <button className="daily-banner clay-banner" onClick={claim}>
          <div className="banner-avatar" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="58" height="58">
              <defs>
                <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f7c9a8"/><stop offset="1" stopColor="#e9a97f"/></linearGradient>
                <linearGradient id="shirt" x1="0" y1="0" x2="64" y2="64"><stop stopColor="#60a5fa"/><stop offset="1" stopColor="#2563eb"/></linearGradient>
                <linearGradient id="band" x1="0" y1="0" x2="64" y2="0"><stop stopColor="#22d3ee"/><stop offset="1" stopColor="#3b82f6"/></linearGradient>
              </defs>
              <ellipse cx="32" cy="58" rx="18" ry="4" fill="rgba(0,0,0,.15)"/>
              <rect x="22" y="34" width="20" height="18" rx="8" fill="url(#shirt)"/>
              <circle cx="32" cy="22" r="10" fill="url(#skin)"/>
              <path d="M22 20c2-8 18-8 20 0" fill="#3b3b3b"/>
              <rect x="21" y="18" width="22" height="5" rx="2.5" fill="url(#band)"/>
              <circle cx="28" cy="22" r="1.5" fill="#333"/><circle cx="36" cy="22" r="1.5" fill="#333"/>
              <path d="M29 27c2 2 4 2 6 0" stroke="#333" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <rect x="12" y="38" width="8" height="6" rx="3" fill="url(#skin)"/>
              <rect x="44" y="38" width="8" height="6" rx="3" fill="url(#skin)"/>
              <rect x="6" y="36" width="8" height="10" rx="3" fill="#93c5fd"/><rect x="50" y="36" width="8" height="10" rx="3" fill="#93c5fd"/>
            </svg>
          </div>
          <div className="daily-text">
            <strong>Revenu quotidien</strong>
            <span>Cliquez pour recevoir +50 FCFA aujourd’hui</span>
          </div>
          <div className="daily-cta">
            <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wrapped%20gift/3D/wrapped_gift_3d.png" alt="" />
            +50 F
          </div>
        </button>

        <section className="block">
          <div className="block-head">
            <h3>Équipements à la une</h3>
            <Link to="/catalogue" className="link">Voir tout <ChevronRight size={15} /></Link>
          </div>
          <div className="h-scroll">
            {machines.filter((m) => !m.locked).slice(0, 6).map((m, i) => (
              <Link key={m.id} to={`/catalogue/${m.id}`} className="machine-tile card-pad">
                <div className="tile-img"><img src={m.image} alt={m.name} /></div>
                <span className="tile-badge vip-badge">VIP {i + 1}</span>
                <h4>{m.name}</h4>
                <p className="tile-price">{m.priceFcfa.toLocaleString('fr-FR')} FCFA</p>
                <span className="tile-sub">{m.dailyRevenueFcfa.toLocaleString('fr-FR')} FCFA/jour</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="block">
          <div className="invite-bonus card-pad">
            <div className="ib-head">
              <div>
                <h3>Bonus d'invitation</h3>
                <p>Invitez des personnes et gagnez des bonus cumulés (complétés automatiquement)</p>
              </div>
              <Link to="/parrainage" className="link">Voir <ChevronRight size={15} /></Link>
            </div>
            <div className="ib-meta">
              <span>Invités directs : <strong>{inviteBonus?.directCount ?? 0}</strong></span>
              <span>Bonus reçu : <strong>{(inviteBonus?.awarded ?? 0).toLocaleString('fr-FR')} FCFA</strong></span>
            </div>
            <div className="tiers-grid">
              {defaultInviteTiers.map((t) => {
                const reached = (inviteBonus?.directCount ?? 0) >= t.count;
                return (
                  <div key={t.count} className={`tier ${reached ? 'reached' : ''}`} style={{ ['--tc' as any]: t.color }}>
                    <div className="tier-top">
                      <img src={t.icon} alt="" className={(t as any).spin ? 'coin-spin' : ''} />
                      {reached && <span className="badge">Atteint</span>}
                    </div>
                    <div className="tier-info">
                      <strong>{t.count} invités</strong>
                      <span>{t.total.toLocaleString('fr-FR')} F</span>
                    </div>
                    <div className="bar"><div className="fill" style={{ width: reached ? '100%' : `${Math.min(100, ((inviteBonus?.directCount ?? 0) / t.count) * 100)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="block">
          <div className="vip-table card-pad">
            <div className="vip-head">
              <h3><Zap size={16} /> Tableau de Rentabilité <span className="vip-gold">VIP</span></h3>
              <span>Niveaux par machine</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Niveau</th><th>Prix</th><th>Gain/j</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {machines.map((m, i) => (
                    <tr key={m.id}>
                      <td className="lvl vip-gold">VIP {i + 1}</td>
                      <td>{m.priceFcfa.toLocaleString('fr-FR')} FCFA</td>
                      <td className="gain">{m.dailyRevenueFcfa.toLocaleString('fr-FR')} FCFA</td>
                      <td className="total">{(m.dailyRevenueFcfa * m.durationDays).toLocaleString('fr-FR')} FCFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      <NoticeModal open={!!notice} title={notice?.title} message={notice?.message||''} type={notice?.type} onClose={()=>setNotice(null)} />
      <NoticeModal open={!!notifPopup} title={notifPopup?.title} message={notifPopup?.message||''} type="success" onClose={()=>setNotifPopup(null)} />

      <style>{`
        .screen { background: #fff; min-height: 100%; }
        .content { padding: 16px 14px 20px; background: #fff; }
        .home-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .brand { display:flex; align-items:center; gap:10px; }
        .logo { width:36px; height:36px; display:flex; align-items:center; justify-content:center; }
        .home-header h2 { font-size: 22px; margin: 0; font-weight:800; letter-spacing:.02em; color:#111827; }
        .header-actions{display:flex;align-items:center;gap:10px}
        .notif-btn{position:relative;width:40px;height:40px;border-radius:12px;background:#fff;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;color:#111827;text-decoration:none;box-shadow:0 2px 8px rgba(15,23,42,.06)}
        .notif-btn .dot{position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:50%;background:#ef4444;border:2px solid #fff}
        .avatar { width: 40px; height: 40px; border-radius: 50%; overflow:hidden; flex-shrink:0; box-shadow:0 2px 8px rgba(59,130,246,.25); display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#1e3a8a,#2563eb); text-decoration:none; }
        .avatar-letter{font-size:18px;font-weight:800;color:#22c55e;line-height:1}
        .balance-card { position: relative; overflow: hidden; border-radius: 22px; padding: 18px; margin-bottom: 14px; color: #fff; min-height: 210px; box-shadow: 0 12px 28px rgba(15,23,42,0.22); }
        .balance-bg { position: absolute; inset: 0; background: url('/banner-home.jpg') center/cover no-repeat; transform: scale(1.02); }
        .balance-overlay { position: absolute; inset: 0; background: linear-gradient(110deg, rgba(15,23,42,.78) 0%, rgba(30,64,175,.62) 45%, rgba(15,23,42,.35) 100%); }
        .balance-content { position: relative; z-index: 1; height: 100%; min-height: 174px; display: flex; flex-direction: column; }
        .label { margin: 0; font-size: 13px; color: rgba(255,255,255,0.95); text-shadow: 0 1px 2px rgba(0,0,0,.25); }
        .amount { margin: 4px 0 0; font-size: 34px; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.25); }
        .amount span { font-size: 14px; font-weight: 600; }
        .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: auto; padding-top: 18px; }
        .action-btn { height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 14px; background: #fff; color: #1d4ed8; text-decoration: none; font-weight: 700; font-size: 14px; border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 4px 12px rgba(15,23,42,0.18); }
        .action-btn.ghost { background: #fff; color: #0f172a; }
        .quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        @media (min-width: 900px){
          .content{max-width:1200px;width:100%;margin:0 auto;padding:24px 32px 32px}
          .quick-grid{grid-template-columns:repeat(2,minmax(220px,360px));justify-content:center}
          .actions{grid-template-columns:repeat(2,minmax(180px,240px));justify-content:center}
          .action-btn{height:46px}
          .h-scroll{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible;gap:20px}
          .machine-tile{min-width:0;width:100%;flex:none}
          .tile-img{height:220px}
          .block-head h3{font-size:20px}
          .daily-banner{max-width:820px;margin-left:auto;margin-right:auto}
        }
        @media (min-width: 1400px){
          .content{max-width:1280px;padding:28px 40px 40px}
          .h-scroll{grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
          .tile-img{height:240px}
        }
        .card-pad { background: #fff; border: 1px solid #e5e7eb; border-radius: 20px; padding: 12px; box-shadow: var(--shadow-sm); }
        .clay{background:linear-gradient(180deg,#ffffff,#f3f8ff);border:1px solid rgba(255,255,255,.8);box-shadow:8px 8px 20px rgba(148,163,184,.18), -6px -6px 16px rgba(255,255,255,.9), inset 0 1px 0 rgba(255,255,255,.8)}
        .quick { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .q3d { width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 6px 8px rgba(59,130,246,.2)); flex-shrink:0; }
        .quick strong { display: block; font-size: 14px; color: var(--text); }
        .quick p { font-size: 12px; margin: 0; color:#111827; }
        .daily-banner { width: 100%; border: none; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 16px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%); box-shadow: 8px 10px 24px rgba(30,58,138,.25), inset 0 1px 0 rgba(255,255,255,.15); position:relative; overflow:hidden; }
        .banner-avatar{flex-shrink:0; filter:drop-shadow(0 6px 10px rgba(0,0,0,.2))}
        .daily-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .daily-text strong { font-size: 14px; }
        .daily-text span { font-size: 12px; color: rgba(255,255,255,0.85); }
        .daily-cta { background: rgba(255,255,255,.18); padding: 8px 10px; border-radius: 14px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border:1px solid rgba(255,255,255,.2); }
        .daily-cta img{width:22px;height:22px;object-fit:contain}
        .action-btn.clay-btn{gap:8px}
        .action-btn.clay-btn img{width:22px;height:22px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,.15))}
        .block { margin-bottom: 16px; }
        .block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .block-head h3 { font-size: 16px; margin: 0; }
        .link { display: inline-flex; align-items: center; gap: 2px; color: #3b82f6; font-size: 13px; font-weight: 600; text-decoration: none; }
        .h-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .h-scroll::-webkit-scrollbar { height: 0; }
        .machine-tile { min-width: 170px; width: 170px; flex: 0 0 170px; scroll-snap-align: start; text-decoration: none; color: inherit; padding: 10px; }
        .tile-img { height: 190px; border-radius: 14px; overflow: hidden; background: #f0f0f0; margin-bottom: 8px; }
        .tile-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 300ms ease; }
        .machine-tile:hover .tile-img img { transform: scale(1.05); }
        .tile-badge { display: inline-block; font-size: 10px; font-weight: 700; color: #fff; background: linear-gradient(135deg,#3b82f6,#1d4ed8); padding: 4px 8px; border-radius: 999px; margin-bottom: 6px; }
        .vip-badge{background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff}
        .machine-tile h4 { font-size: 13px; margin: 0 0 4px; line-height: 1.3; color: var(--text); }
        .tile-price { margin: 0; font-size: 13px; font-weight: 700; color: #3b82f6; }
        .tile-sub { font-size: 11px; color:#111827; }
        .vip-table { padding: 0; overflow: hidden; }
        .vip-head { padding: 12px 14px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); background: linear-gradient(135deg,#eff6ff,#fff); }
        .vip-head h3 { margin:0; font-size:14px; display:flex; align-items:center; gap:6px; color:#1d4ed8; }
        .vip-head span { font-size:11px; color:var(--text-muted); }
        .table-wrap { overflow-x:auto; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        th { text-align:left; padding:10px 12px; color:var(--text-muted); font-weight:600; background:#fafafa; }
        td { padding:10px 12px; border-top:1px solid var(--border); }
        .lvl { font-weight:700; color:#3b82f6; }
        .gain { color:#0b1f3b; font-weight:600; }
        .total { color:#16a34a; font-weight:700; }
        .invite-bonus{padding:14px;background:linear-gradient(180deg,#ffffff,#f0f7ff)}
        .ib-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
        .ib-head h3{margin:0;font-size:16px;color:#0f172a} .ib-head p{margin:3px 0 0;font-size:12px;color:#475569;max-width:320px}
        .ib-meta{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;font-size:13px;color:#334155}
        .ib-meta strong{color:#1d4ed8}
        .tiers-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        .tier{position:relative;border-radius:16px;padding:10px;background:#fff;border:1px solid #e5e7eb;box-shadow:0 4px 12px rgba(15,23,42,.05);overflow:hidden}
        .tier:before{content:'';position:absolute;inset:0 0 auto 0;height:4px;background:var(--tc);opacity:.9}
        .tier.reached{border-color:#bfdbfe;background:linear-gradient(180deg,#ffffff,#eff6ff)}
        .tier-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
        .tier-top img{width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,.12))}
        .coin-spin{animation:coinSpin 2.4s linear infinite;transform-origin:center;will-change:transform,filter}
        @keyframes coinSpin{0%{transform:rotateY(0deg);filter:drop-shadow(0 6px 8px rgba(0,0,0,.12)) brightness(1)}25%{filter:drop-shadow(0 6px 10px rgba(250,204,21,.35)) brightness(1.15)}50%{transform:rotateY(180deg);filter:drop-shadow(0 6px 8px rgba(0,0,0,.12)) brightness(1)}75%{filter:drop-shadow(0 6px 10px rgba(250,204,21,.35)) brightness(1.15)}100%{transform:rotateY(360deg);filter:drop-shadow(0 6px 8px rgba(0,0,0,.12)) brightness(1)}}
        .badge{font-size:10px;font-weight:700;color:#166534;background:#dcfce7;padding:3px 8px;border-radius:999px}
        .tier-info strong{display:block;font-size:13px;color:#0f172a}
        .tier-info span{display:block;font-size:14px;font-weight:800;color:#1d4ed8;margin-top:1px}
        .bar{height:6px;background:#e2e8f0;border-radius:99px;margin-top:8px;overflow:hidden}
        .fill{height:100%;border-radius:99px;background:var(--tc)}
        @media (min-width: 900px){ .tiers-grid{grid-template-columns:repeat(4,1fr)} .ib-head p{max-width:none} }
      `}</style>
    </div>
  );
}
