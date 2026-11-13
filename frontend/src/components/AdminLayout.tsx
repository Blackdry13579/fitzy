import { useState } from 'react';
import { Outlet, Navigate, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { getAdminToken, setAdminToken } from '../api/adminClient';
import { AdminSidebar, adminNavItems } from './AdminSidebar';
import { Menu, X, LogOut } from 'lucide-react';

export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!getAdminToken() && pathname !== '/admin/login') return <Navigate to="/admin/login" replace />;
  const logout = () => { setAdminToken(null); navigate('/admin/login'); };
  const quick = adminNavItems.slice(0,4); // overview, dépôts, retraits, utilisateurs

  return (
    <div className="app-frame">
      <div className="app-device">
        <div className="app-body admin-body">
          <AdminSidebar />
          <div className="admin-content-col">
            <header className="mobile-top">
              <button className="iconbtn" onClick={()=>setMenuOpen(true)} aria-label="Menu"><Menu size={22}/></button>
              <div className="mtitle"><span className="logo">FZ</span><div><strong>FITZONE</strong><small>Admin</small></div></div>
              <div style={{width:38}} />
            </header>
            <main className="app-main">
              <Outlet />
            </main>
          </div>
        </div>

        {/* mobile bottom nav */}
        <nav className="admin-bottom">
          {quick.map(({to,label,icon:Icon,end}) => (
            <NavLink key={to} to={to} end={end} className={({isActive})=>`ab-item ${isActive?'active':''}`} onClick={()=>setMenuOpen(false)}>
              <Icon size={20}/>
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          ))}
          <button className={`ab-item ${menuOpen?'active':''}`} onClick={()=>setMenuOpen(v=>!v)}>
            {menuOpen ? <X size={20}/> : <Menu size={20}/>}
            <span>Menu</span>
          </button>
        </nav>

        {menuOpen && <div className="drawer-backdrop" onClick={()=>setMenuOpen(false)} />}
        <aside className={`drawer ${menuOpen?'open':''}`}>
          <div className="drawer-head"><strong>Menu admin</strong><button className="iconbtn" onClick={()=>setMenuOpen(false)}><X size={20}/></button></div>
          <nav className="drawer-nav">
            {adminNavItems.map(({to,label,icon:Icon,end}) => (
              <NavLink key={to} to={to} end={end} className={({isActive})=>`d-item ${isActive?'active':''}`} onClick={()=>setMenuOpen(false)}>
                <Icon size={18}/><span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <button className="d-logout" onClick={logout}><LogOut size={18}/> Déconnexion</button>
        </aside>
      </div>
      <style>{`
        .app-frame { min-height: 100vh; background: #f1f5f9; padding: 12px 0; }
        .app-device { max-width: 430px; min-height: calc(100vh - 24px); margin: 0 auto; background: #ffffff; position: relative; border: 2px solid #111827; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 50px rgba(17,24,39,0.15); }
        .app-body{position:relative;z-index:1;min-height:inherit;display:flex;flex-direction:column}
        .admin-content-col{flex:1;min-width:0;display:flex;flex-direction:column}
        .mobile-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:25}
        .mtitle{display:flex;align-items:center;gap:8px}
        .mtitle .logo{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
        .mtitle strong{display:block;font-size:14px;color:#0f172a;line-height:1} .mtitle small{font-size:11px;color:#2563eb;font-weight:700}
        .iconbtn{width:38px;height:38px;border:1px solid #e5e7eb;background:#f8fafc;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#0f172a}
        .app-main { flex:1; background: #f8fafc; position: relative; z-index: 1; padding:14px; padding-bottom:90px; overflow:auto; }
        .admin-bottom{position:absolute;bottom:0;left:0;right:0;height:72px;background:#fff;border-top:1px solid #e5e7eb;display:grid;grid-template-columns:repeat(5,1fr);z-index:30;padding:6px 6px 10px}
        .ab-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#475569;font-size:10px;font-weight:600;text-decoration:none;border:none;background:transparent;cursor:pointer;border-radius:12px}
        .ab-item.active{color:#1d4ed8;background:#eff6ff}
        .drawer-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.4);z-index:40}
        .drawer{position:absolute;top:0;right:0;bottom:0;width:min(86%,320px);background:#fff;z-index:50;transform:translateX(100%);transition:transform .25s ease;display:flex;flex-direction:column;box-shadow:-10px 0 30px rgba(15,23,42,.15)}
        .drawer.open{transform:translateX(0)}
        .drawer-head{display:flex;align-items:center;justify-content:space-between;padding:14px 14px;border-bottom:1px solid #e5e7eb}
        .drawer-nav{padding:10px;display:flex;flex-direction:column;gap:6px;overflow:auto}
        .d-item{display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;color:#0f172a;text-decoration:none;font-weight:600}
        .d-item.active{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1d4ed8}
        .d-logout{margin:10px;margin-top:auto;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:12px;padding:12px;font-weight:700;cursor:pointer}
        @media (max-width: 460px) { .app-frame { padding: 0; background: #fff; } .app-device { border: none; border-radius: 0; min-height: 100vh; box-shadow: none; } }
        @media (min-width: 900px) {
          .app-frame { padding: 0; background: #eef2ff; }
          .app-device { width: 100%; max-width: none; min-height: 100vh; margin: 0; border: none; border-radius: 0; box-shadow: none; display:flex; align-items:stretch; }
          .app-body { flex:1; min-width:0; display:flex; flex-direction:row; }
          .admin-content-col{flex:1;min-width:0}
          .mobile-top,.admin-bottom,.drawer,.drawer-backdrop{display:none !important}
          .app-main { min-height: 100vh; width: 100%; flex:1; padding:28px 36px; padding-bottom:28px; overflow:auto; }
        }
        @media (min-width: 1400px) { .app-main { padding:32px 48px; } }
      `}</style>
    </div>
  );
}
