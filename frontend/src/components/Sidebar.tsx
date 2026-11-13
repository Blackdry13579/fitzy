import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Wallet, Users, User, ArrowDownToLine, ArrowUpFromLine, Package } from 'lucide-react';

const items = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/catalogue', label: 'Catalogue', icon: LayoutGrid },
  { to: '/portefeuille', label: 'Portefeuille', icon: Wallet },
  { to: '/depot', label: 'Dépôt', icon: ArrowDownToLine },
  { to: '/retrait', label: 'Retrait', icon: ArrowUpFromLine },
  { to: '/mes-produits', label: 'Mes produits', icon: Package },
  { to: '/parrainage', label: 'Parrainage', icon: Users },
  { to: '/compte', label: 'Compte', icon: User },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const comptePaths = ['/compte', '/politique', '/faq', '/support', '/notifications', '/erreur'];
  const effectivePath = comptePaths.some(p => pathname === p || pathname.startsWith(p + '/')) ? '/compte' : pathname;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo" aria-hidden="true">
          <svg viewBox="0 0 40 40" width="34" height="34" fill="none">
            <rect x="2" y="2" width="36" height="36" rx="12" fill="url(#lgs)" />
            <path d="M12 20h16M14 15v10M26 15v10M10 17v6M30 17v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            <defs><linearGradient id="lgs" x1="2" y1="2" x2="38" y2="38"><stop stopColor="#3b82f6"/><stop offset="1" stopColor="#1d4ed8"/></linearGradient></defs>
          </svg>
        </div>
        <span>FITZONE</span>
      </div>
      <nav className="nav">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? effectivePath === '/' : effectivePath === to || effectivePath.startsWith(to + '/');
          return (
            <NavLink key={to} to={to} end={to === '/'} className={`item ${active ? 'active' : ''}`}>
              <Icon size={20} strokeWidth={2.2} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
      <style>{`
        .sidebar{display:none}
        @media (min-width: 900px){
          .sidebar{display:flex;flex-direction:column;width:240px;flex-shrink:0;background:#fff;border-right:1px solid #e5e7eb;padding:18px 14px;position:sticky;top:0;height:100vh;z-index:20;overflow:auto}
          .brand{display:flex;align-items:center;gap:10px;padding:4px 8px 18px;margin-bottom:8px;border-bottom:1px solid #e5e7eb}
          .brand span{font-size:20px;font-weight:800;color:#111827;letter-spacing:.02em}
          .nav{display:flex;flex-direction:column;gap:6px}
          .item{display:flex;align-items:center;gap:12px;padding:12px 12px;border-radius:14px;color:#111827;text-decoration:none;font-weight:600;font-size:15px}
          .item:hover{background:#f3f4f6}
          .item.active{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1d4ed8}
        }
      `}</style>
    </aside>
  );
}
