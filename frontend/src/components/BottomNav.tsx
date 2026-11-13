import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Wallet, Users, User } from 'lucide-react';

const items = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/catalogue', label: 'Catalogue', icon: LayoutGrid },
  { to: '/portefeuille', label: 'Portefeuille', icon: Wallet },
  { to: '/parrainage', label: 'Parrainage', icon: Users },
  { to: '/compte', label: 'Compte', icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const comptePaths = ['/compte', '/politique', '/faq', '/support', '/notifications', '/erreur'];
  const effectivePath = comptePaths.some(p => pathname === p || pathname.startsWith(p + '/')) ? '/compte' : pathname;
  const activeIndex = items.findIndex((it) =>
    it.to === '/' ? effectivePath === '/' : effectivePath === it.to || effectivePath.startsWith(it.to + '/')
  );
  const idx = activeIndex === -1 ? 0 : activeIndex;

  return (
    <nav className="bottom-nav">
      <span className="bubble" style={{ transform: `translateX(calc(${idx * 100}% + ${idx * 0}px))` }} aria-hidden="true" />
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `bn-item${isActive ? ' active' : ''}`}>
          <span className="icon-wrap"><Icon size={20} strokeWidth={2.2} /></span>
          <span className="lbl">{label}</span>
        </NavLink>
      ))}
      <style>{`
        .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; height: 72px; padding: 6px 8px 10px; background: #fff; border-top: 1px solid #e5e7eb; box-shadow: 0 -4px 18px rgba(15,23,42,.06); display: grid; grid-template-columns: repeat(5, 1fr); z-index: 30; border-radius: 20px 20px 0 0; animation: navIn .35s ease; }
        @keyframes navIn { from { transform: translate(-50%, 110%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .bubble { position: absolute; top: 8px; left: 8px; width: calc((100% - 16px) / 5); height: 36px; border-radius: 12px; background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%); transition: transform .35s cubic-bezier(.4,0,.2,1); z-index: 0; }
        .bn-item { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: #111827; font-size: 10px; font-weight: 600; text-decoration: none; }
        .icon-wrap { width: 24px; height: 24px; display:flex; align-items:center; justify-content:center; color: #111827; transition: transform .25s ease; }
        .lbl { color: #111827; }
        .bn-item.active .icon-wrap { transform: translateY(-1px); }
        @media (max-width: 460px) { .bottom-nav { border-radius: 18px 18px 0 0; } }
        @media (min-width: 900px) { .bottom-nav { display:none; } }
      `}</style>
    </nav>
  );
}
