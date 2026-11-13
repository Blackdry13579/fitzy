import { Link, useNavigate } from 'react-router-dom';
import { Copy, Shield, LogOut } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const copy = (t: string) => navigator.clipboard?.writeText(t);
  const inviteCode = user?.inviteCode || '------';
  const link = (user as any)?.inviteLink || `https://fitzone.app/invite/${inviteCode}`;
  const balance = user?.balance ?? 0;
  const onLogout = () => { logout(); navigate('/connexion'); };

  return (
    <div className="screen">
      <TopBar title="Mon compte" />
      <div className="content">
        <section className="hero">
          <div className="banner-bg" aria-hidden="true" />
          <div className="banner-overlay" aria-hidden="true" />
          <div className="hero-top">
            <div className="avatar">
              <span className="avatar-letter">{(user?.username || 'U').trim().charAt(0).toUpperCase()}</span>
            </div>
            <div className="hero-info">
              <h2>{user?.username || 'Utilisateur'}</h2>
              <p className="sub">{user?.phone || ''} · <span className="vip-gold">VIP {user?.vipLevel ?? 0}</span>{user?.memberId ? <span className="member-id"> · ID {user.memberId}</span> : null}</p>
              <div className="code-pill">
                <span>Lien d'invitation</span>
                <div className="link-row">
                  <span className="link-text">{link}</span>
                  <button className="copy-icon" onClick={() => copy(link)} aria-label="Copier le lien" title="Copier le lien"><Copy size={18} /></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card wallet clay">
          <div className="wallet-head">
            <div className="wtitle">
              <img className="w3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20bag/3D/money_bag_3d.png" alt="" />
              <div><h3>Mon portefeuille</h3><p>Total {balance.toLocaleString('fr-FR')} FCFA</p></div>
            </div>
            <div className="big">{balance.toLocaleString('fr-FR')} <small>FCFA</small></div>
          </div>
          <div className="w-grid">
            <div className="wbox clay-in"><span>Disponible</span><strong>{balance.toLocaleString('fr-FR')} FCFA</strong></div>
            <div className="wbox clay-in"><span>Aujourd'hui</span><strong>0 FCFA</strong></div>
          </div>
          <div className="w-actions">
            <Link to="/depot" className="wbtn primary clay-btn">
              <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dollar%20banknote/3D/dollar_banknote_3d.png" alt="" />
              Recharger
            </Link>
            <Link to="/retrait" className="wbtn clay-btn">
              <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Credit%20card/3D/credit_card_3d.png" alt="" />
              Retirer
            </Link>
          </div>
        </section>

        <section className="grid4">
          <Link to="/catalogue?tab=mes" className="gcard clay">
            <img className="g3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hammer%20and%20wrench/3D/hammer_and_wrench_3d.png" alt="" />
            <strong>Mes produits</strong>
            <span>Voir mes machines</span>
          </Link>
          <Link to="/portefeuille" className="gcard clay">
            <img className="g3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Alarm%20clock/3D/alarm_clock_3d.png" alt="" />
            <strong>Historique</strong>
            <span>Transactions & fonds</span>
          </Link>
          <Link to="/compte/modifier" className="gcard clay">
            <img className="g3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Gear/3D/gear_3d.png" alt="" />
            <strong>Modifier profil</strong>
            <span>Nom d'utilisateur</span>
          </Link>
          <Link to="/politique" className="gcard clay">
            <div className="g3d-icon"><Shield size={26} color="#fff" /></div>
            <strong>Politique</strong>
            <span>Infos légales & support</span>
          </Link>
        </section>

        <button className="logout clay" onClick={onLogout}><LogOut size={18} /> Déconnexion</button>
      </div>
      <style>{`
        .screen{background:#fff;min-height:100%}
        .content{padding:14px;background:#fff;display:flex;flex-direction:column;gap:14px}
        .hero{position:relative;overflow:hidden;color:#fff;border-radius:22px;padding:16px;box-shadow:0 12px 28px rgba(30,58,138,.25);background:#1e3a8a}
        .banner-bg{position:absolute;inset:0;z-index:0;background-image:url('/banner-profile.jpg');background-position:center;background-size:cover;background-repeat:no-repeat}
        .banner-overlay{position:absolute;inset:0;z-index:1;background:linear-gradient(110deg, rgba(15,23,42,.65) 0%, rgba(30,64,175,.45) 50%, rgba(15,23,42,.25) 100%)}
        .hero-top{position:relative;z-index:2;display:flex;gap:14px;align-items:flex-start}
        .avatar{width:64px;height:64px;flex-shrink:0;filter:drop-shadow(0 6px 12px rgba(0,0,0,.15));border-radius:50%;background:linear-gradient(135deg,#1e3a8a,#2563eb);display:flex;align-items:center;justify-content:center;border:3px solid rgba(255,255,255,.35)}
        .avatar-letter{font-size:28px;font-weight:800;color:#22c55e;line-height:1;text-transform:uppercase}
        .member-id{color:#fff;font-weight:700}
        .hero-info{flex:1;min-width:0}
        .hero-info h2{margin:0 0 2px;font-size:20px;display:flex;align-items:center;gap:8px}
        .sub{margin:0 0 10px;font-size:13px;color:rgba(255,255,255,.92)}
        .code-pill{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:10px}
        .code-pill > span{display:block;font-size:11px;color:rgba(255,255,255,.88);margin-bottom:6px}
        .link-row{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:8px 8px 8px 10px}
        .link-text{flex:1;min-width:0;font-size:12px;color:#fff;word-break:break-all;line-height:1.3}
        .copy-icon{flex-shrink:0;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border:none;background:#fff;color:#1d4ed8;border-radius:8px;cursor:pointer}
        .copy-icon:hover{background:#eff6ff}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:22px;box-shadow:0 2px 10px rgba(17,24,39,.04)}
        .clay{background:linear-gradient(180deg,#ffffff,#f3f8ff);border:1px solid rgba(255,255,255,.8);box-shadow:8px 8px 20px rgba(148,163,184,.18), -6px -6px 16px rgba(255,255,255,.9), inset 0 1px 0 rgba(255,255,255,.8)}
        .clay-in{background:linear-gradient(180deg,#f8fbff,#eef5ff);border:1px solid rgba(255,255,255,.9);box-shadow:inset 3px 3px 6px rgba(148,163,184,.12), inset -3px -3px 6px rgba(255,255,255,.9)}
        .wallet{padding:14px}
        .wallet-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:10px}
        .wtitle{display:flex;gap:10px;align-items:center}
        .w3d{width:46px;height:46px;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(59,130,246,.25))}
        .wallet-head h3{margin:0;font-size:16px} .wallet-head p{margin:2px 0 0;font-size:12px;color:#111827}
        .big{font-size:26px;font-weight:800;color:#2563eb;line-height:1} .big small{font-size:12px}
        .w-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
        .wbox{border-radius:14px;padding:10px}
        .wbox span{display:block;font-size:11px;color:#111827;margin-bottom:2px} .wbox strong{font-size:13px;color:#111827}
        .w-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .wbtn{height:46px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-weight:700;font-size:14px;background:linear-gradient(180deg,#ffffff,#eef4ff);color:#1d4ed8;border:1px solid #dbeafe;box-shadow:4px 4px 10px rgba(148,163,184,.15), -4px -4px 10px rgba(255,255,255,.9)}
        .wbtn img{width:24px;height:24px;object-fit:contain}
        .wbtn.primary{background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);color:#fff;border:none;box-shadow:6px 8px 16px rgba(30,58,138,.28), inset 0 1px 0 rgba(255,255,255,.2)}
        .grid4{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media (min-width: 900px){
          .content{max-width:1100px;width:100%;margin:0 auto;padding:24px 32px 32px}
          .grid4{grid-template-columns:repeat(4,1fr)}
          .w-grid{grid-template-columns:repeat(2,1fr)}
        }
        @media (min-width: 1400px){ .content{max-width:1200px;padding:28px 40px 40px} }
        .gcard{border-radius:20px;padding:14px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-decoration:none;color:inherit;cursor:pointer;text-align:left;border:none}
        .g3d{width:52px;height:52px;object-fit:contain;margin-bottom:2px;filter:drop-shadow(0 8px 10px rgba(59,130,246,.2))}
        .g3d-icon{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#60a5fa,#2563eb);display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:2px;box-shadow:0 8px 14px rgba(37,99,235,.25)}
        .gcard strong{font-size:14px;color:#111827} .gcard span{font-size:12px;color:#111827;line-height:1.3}
        .logout{height:50px;border-radius:16px;border:1px solid #fecaca;background:linear-gradient(180deg,#fff1f2,#ffe4e6);color:#b91c1c;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 6px 14px rgba(185,28,28,.12)}
      `}</style>
    </div>
  );
}
