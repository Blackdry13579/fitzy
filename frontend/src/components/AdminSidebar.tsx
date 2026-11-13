import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Users, Share2, ShoppingBag, Package, Settings, FileText, LogOut } from 'lucide-react';
import { setAdminToken } from '../api/adminClient';

export const adminNavItems = [
  { to: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboard, end: true },
  { to: '/admin/depots', label: 'Dépôts', icon: ArrowDownToLine },
  { to: '/admin/retraits', label: 'Retraits', icon: ArrowUpFromLine },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/admin/parrainages', label: 'Parrainages', icon: Share2 },
  { to: '/admin/achats', label: 'Achats', icon: ShoppingBag },
  { to: '/admin/produits', label: 'Produits', icon: Package },
  { to: '/admin/parametres', label: 'Paramètres', icon: Settings },
  { to: '/admin/audit', label: 'Audit', icon: FileText },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const logout = () => { setAdminToken(null); navigate('/admin/login'); };
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo" aria-hidden="true">
          <svg viewBox="0 0 40 40" width="34" height="34" fill="none">
            <rect x="2" y="2" width="36" height="36" rx="12" fill="url(#lga)" />
            <path d="M12 20h16M14 15v10M26 15v10M10 17v6M30 17v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            <defs><linearGradient id="lga" x1="2" y1="2" x2="38" y2="38"><stop stopColor="#2563eb"/><stop offset="1" stopColor="#1e40af"/></linearGradient></defs>
          </svg>
        </div>
        <div><span>FITZONE</span><small>Admin</small></div>
      </div>
      <nav className="nav">
        {adminNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({isActive}) => `item ${isActive ? 'active' : ''}`}>
            <Icon size={20} strokeWidth={2.2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="logout" onClick={logout}><LogOut size={18}/> Déconnexion</button>
      <style>{`
        .sidebar{display:none}
        .brand{display:flex;align-items:center;gap:10px;padding:4px 8px 18px;margin-bottom:8px;border-bottom:1px solid #e5e7eb}
        .brand span{font-size:20px;font-weight:800;color:#111827;letter-spacing:.02em;display:block}
        .brand small{font-size:12px;color:#2563eb;font-weight:700}
        .nav{display:flex;flex-direction:column;gap:6px}
        .item{display:flex;align-items:center;gap:8px;padding:12px;border-radius:12px;color:#111827;text-decoration:none;font-weight:600;font-size:15px}
        .item.active{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1d4ed8}
        .logout{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:12px;padding:10px 12px;font-weight:600;cursor:pointer}
        @media (min-width: 900px){
          .sidebar{display:flex;flex-direction:column;width:250px;flex-shrink:0;height:100vh;padding:18px 14px;border-right:1px solid #e5e7eb;background:#fff;position:sticky;top:0}
        }
      `}</style>
    </aside>
  );
}
