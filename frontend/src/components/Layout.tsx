import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { Onboarding } from './Onboarding';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hideNav = pathname === '/connexion' || pathname === '/inscription' || pathname.startsWith('/invite/');
  const showOnboarding = !!user && user.onboardingDone === false && !pathname.startsWith('/connexion') && !pathname.startsWith('/inscription') && !pathname.startsWith('/invite');

  return (
    <div className="app-frame">
      <div className="app-device">
        <div className="smoke-bg" aria-hidden="true">
          <svg className="glyphs" viewBox="0 0 430 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="smk" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="18" />
              </filter>
            </defs>
            <g filter="url(#smk)" opacity="0.18">
              <ellipse cx="70" cy="120" rx="120" ry="60" fill="#94a3b8" />
              <ellipse cx="340" cy="260" rx="140" ry="70" fill="#cbd5e1" />
              <ellipse cx="120" cy="460" rx="150" ry="80" fill="#94a3b8" />
              <ellipse cx="360" cy="620" rx="130" ry="70" fill="#cbd5e1" />
              <ellipse cx="90" cy="780" rx="140" ry="75" fill="#94a3b8" />
            </g>
            <g fill="none" stroke="#94a3b8" strokeWidth="1.2" opacity="0.12">
              <path d="M40 80 l30 -20 l30 20 m-30 -20 v40 m80 -10 c20 -30 50 -30 70 0 m-35 -22 v44 m-20 -12 h40" />
              <path d="M260 360 l20 -30 l20 30 l20 -30 m-60 40 h60 m-30 -40 v40" />
              <path d="M60 560 c10 -30 40 -30 50 0 c10 30 40 30 50 0 m-80 30 h60 m-30 -60 v60" />
              <path d="M280 720 l25 -25 l25 25 l-25 25 z m-5 35 h60 m-30 -70 v70" />
            </g>
          </svg>
        </div>
        {!hideNav && <Sidebar />}
        <div className="app-body">
          <main className={`app-main ${hideNav ? '' : 'with-nav'}`}>
            <Outlet />
          </main>
          {!hideNav && <BottomNav />}
        </div>
        {showOnboarding && <Onboarding />}
      </div>
      <style>{`
        .app-frame { min-height: 100vh; background: #f1f5f9; padding: 12px 0; }
        .app-device { max-width: 430px; min-height: calc(100vh - 24px); margin: 0 auto; background: #ffffff; position: relative; border: 2px solid #111827; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 50px rgba(17,24,39,0.15); }
        .smoke-bg{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
        .glyphs{width:100%;height:100%;display:block;pointer-events:none}
        .app-body{position:relative;z-index:1;min-height:inherit}
        .app-main { min-height: calc(100vh - 24px); background: transparent; position: relative; z-index: 1; }
        .app-main.with-nav { padding-bottom: 84px; }
        @media (max-width: 460px) { .app-frame { padding: 0; background: #fff; } .app-device { border: none; border-radius: 0; min-height: 100vh; box-shadow: none; } .app-main { min-height: 100vh; } }
        @media (min-width: 900px) {
          .app-frame { padding: 0; background: #eef2ff; }
          .app-device { width: 100%; max-width: none; min-height: 100vh; margin: 0; border: none; border-radius: 0; box-shadow: none; display:flex; align-items:stretch; }
          .app-body { flex:1; min-width:0; display:flex; flex-direction:column; }
          .app-main { min-height: 100vh; width: 100%; }
          .app-main.with-nav { padding-bottom: 24px; }
        }
      `}</style>
    </div>
  );
}
