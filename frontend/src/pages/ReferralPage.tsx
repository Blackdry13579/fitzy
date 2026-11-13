import { useEffect, useState } from 'react';
import { Copy, Share2, Users, Award } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { api } from '../api/client';

type RefMember = { id: string; memberId?: string; username?: string; phone?: string; createdAt?: string; vipLevel?: number };
type RefData = {
  code: string;
  link: string;
  totalEarned?: number;
  inviteBonus?: { directCount: number; awarded: number; target: number; tiers: {count:number;total:number}[] };
  levels: { level: number; count: number; commission: number; rate?: number; members?: RefMember[] }[];
  teams: { name: string; count: number }[];
};

const defaultInviteTiers = [
  { count: 3, total: 700, icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wrapped%20gift/3D/wrapped_gift_3d.png', color: 'linear-gradient(135deg,#38bdf8,#2563eb)' },
  { count: 5, total: 1200, icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png', color: 'linear-gradient(135deg,#34d399,#059669)' },
  { count: 10, total: 3000, icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png', color: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { count: 15, total: 5000, icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fa99/512.gif', color: 'linear-gradient(135deg,#a78bfa,#7c3aed)' },
];

export function ReferralPage() {
  const [tab, setTab] = useState<'A'|'B'|'C'>('A');
  const [data, setData] = useState<RefData | null>(null);
  useEffect(() => { api<RefData>('/referral').then(setData).catch(()=>{}); }, []);
  const copy = (t: string) => navigator.clipboard?.writeText(t);

  const link = data?.link || '';
  const code = data?.code || '------';
  const gains = data?.totalEarned ?? (data?.levels.reduce((s,l)=>s+(l.commission||0),0) || 0);
  const counts = { A: data?.levels[0]?.count || 0, B: data?.levels[1]?.count || 0, C: data?.levels[2]?.count || 0 };
  const rates = { A: data?.levels[0]?.rate ?? 27, B: data?.levels[1]?.rate ?? 3, C: data?.levels[2]?.rate ?? 1 };
  const idx = tab === 'A' ? 0 : tab === 'B' ? 1 : 2;
  const list = data?.levels?.[idx]?.members || [];
  const directCount = data?.inviteBonus?.directCount ?? counts.A;

  return (
    <div className="screen">
      <TopBar title="Mon Équipe" back />
      <div className="content">
        <p className="subtitle">Gagnez des commissions sur 3 niveaux</p>

        <div className="card earnings">
          <div className="banner-bg" aria-hidden="true" />
          <div className="banner-overlay" aria-hidden="true" />
          <div className="earn-content">
            <p>Total des commissions gagnées (ajoutées au solde)</p>
            <h2>{gains.toLocaleString('fr-FR')} FCFA</h2>
          </div>
        </div>

        <div className="card ref-card">
          <div className="share-wrap"><Share2 size={28} /></div>
          <div className="wfull">
            <p className="small">Votre code / lien de parrainage</p>
            <div className="input-row">
              <input readOnly value={link || code} />
              <button onClick={() => copy(link || code)}><Copy size={16} /></button>
            </div>
          </div>
          <button className="btn-copy" onClick={() => copy(link || code)}><Copy size={16} /> Copier le lien</button>
        </div>

        <div className="card bonus-card">
          <div className="ib-head">
            <div>
              <h3>Bonus d'invitation</h3>
              <p className="bsub">Invitez des personnes et gagnez des bonus cumulés (complétés automatiquement)</p>
            </div>
          </div>
          <div className="bmeta"><span>Invités directs : <strong>{directCount}</strong></span><span>Bonus reçu : <strong>{(data?.inviteBonus?.awarded ?? 0).toLocaleString('fr-FR')} FCFA</strong></span></div>
          <div className="tiers-grid">
            {defaultInviteTiers.map((t) => {
              const reached = directCount >= t.count;
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
                  <div className="bar"><div className="fill" style={{ width: reached ? '100%' : `${Math.min(100, (directCount / t.count) * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="stats">
          <div className="card stat s1"><p>Niveau 1</p><strong className="n1">{counts.A}</strong><span>{rates.A}%</span></div>
          <div className="card stat s2"><p>Niveau 2</p><strong className="n2">{counts.B}</strong><span>{rates.B}%</span></div>
          <div className="card stat s3"><p>Niveau 3</p><strong className="n3">{counts.C}</strong><span>{rates.C}%</span></div>
        </div>

        <div>
          <div className="tabs">
            {(['A','B','C'] as const).map(level => (
              <button key={level} onClick={() => setTab(level)} className={`tab ${tab===level ? `active t${level}` : ''}`}>
                Équipe {level}
              </button>
            ))}
          </div>
          <div className="list">
            {list.length === 0 ? (
              <div className="empty card">
                <Users size={36} />
                <p>Aucun membre dans ce niveau</p>
              </div>
            ) : list.map(m => (
              <div key={m.id} className="card member">
                <div className="mleft">
                  <div className="av">{(m.username || 'U').trim().charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="mname">{m.username || 'Utilisateur'}</p>
                    <p className="mmeta">ID {m.memberId || '-'} • {m.phone || '-'}{m.createdAt ? ` • Inscrit le ${new Date(m.createdAt).toLocaleDateString('fr-FR')}` : ''}</p>
                  </div>
                </div>
                <div><span className="vip-badge"><Award size={10}/> <span className="vip-gold">VIP {m.vipLevel ?? 0}</span></span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .screen{background:linear-gradient(180deg,#eff6ff 0%, #ffffff 30%);min-height:100%}
        .content{padding:16px;display:flex;flex-direction:column;gap:14px}
        .subtitle{margin:0;text-align:center;color:#1e3a8a;font-size:15px;font-weight:700;background:#dbeafe;padding:10px 12px;border-radius:14px}
        .card{background:#fff;border:1px solid var(--border);border-radius:18px;box-shadow:0 6px 16px rgba(15,23,42,.08)}
        .earnings{position:relative;overflow:hidden;padding:20px;text-align:center;color:#fff;border:none;box-shadow:8px 10px 24px rgba(30,58,138,.25)}
        .banner-bg{position:absolute;inset:0;background:url('/banner-referral.jpg') center/cover no-repeat}
        .banner-overlay{position:absolute;inset:0;background:linear-gradient(110deg, rgba(15,23,42,.78) 0%, rgba(30,64,175,.55) 50%, rgba(15,23,42,.35) 100%)}
        .earn-content{position:relative;z-index:1}
        .earnings p{margin:0;font-size:13px;color:rgba(255,255,255,.95)} .earnings h2{margin:4px 0 0;font-size:32px;color:#fff}
        .ref-card{padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px;background:linear-gradient(135deg, #3b82f6 0%, #2563eb 45%, #7c3aed 100%);border:none;color:#fff;box-shadow:8px 10px 24px rgba(30,58,138,.25)}
        .share-wrap{width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;color:#fff;border:1px solid rgba(255,255,255,.25)}
        .wfull{width:100%} .small{margin:0 0 6px;font-size:12px;text-align:center;color:rgba(255,255,255,.9)}
        .input-row{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.95);border:1px solid rgba(255,255,255,.4);border-radius:12px;padding:6px 6px 6px 10px}
        .input-row input{flex:1;border:none;outline:none;background:transparent;font-size:12px;color:#334155;min-width:0}
        .input-row button{width:34px;height:34px;border:none;border-radius:10px;background:transparent;color:#2563eb;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
        .btn-copy{width:100%;height:42px;border:none;border-radius:14px;background:#fff;color:#1d4ed8;font-weight:700;cursor:pointer}
        .bonus-card{padding:14px;border:1px solid #bfdbfe;background:linear-gradient(180deg,#ffffff,#f0f7ff)}
        .ib-head h3{margin:0;font-size:16px;color:#0f172a} .bsub{margin:3px 0 0;font-size:13px;color:#475569}
        .bmeta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 12px;font-size:13px;color:#334155}
        .bmeta strong{color:#1d4ed8}
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
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .stat{padding:12px 8px;text-align:center;border:none;color:#fff}
        .stat p{margin:0;font-size:12px;color:rgba(255,255,255,.95);font-weight:600} .stat strong{display:block;font-size:22px;margin:4px 0;color:#fff} .stat span{font-size:12px;font-weight:800;color:#fff;background:rgba(255,255,255,.2);padding:2px 8px;border-radius:999px}
        .s1{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
        .s2{background:linear-gradient(135deg,#06b6d4,#0891b2)}
        .s3{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
        .tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:12px;padding-bottom:2px}
        .tab{padding:10px 16px;border:none;border-radius:999px;font-size:14px;font-weight:700;white-space:nowrap;cursor:pointer;background:#e5e7eb;color:#111827}
        .tab.active.tA{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff}
        .tab.active.tB{background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff}
        .tab.active.tC{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff}
        .list{display:flex;flex-direction:column;gap:10px}
        .empty{text-align:center;padding:28px 14px;color:#111827;display:flex;flex-direction:column;align-items:center;gap:8px;background:linear-gradient(180deg,#fff,#f8fbff)}
        .empty p{margin:0;font-weight:600}
        .member{padding:12px;display:flex;align-items:center;justify-content:space-between;gap:10px}
        .mleft{display:flex;align-items:center;gap:10px;min-width:0}
        .av{width:40px;height:40px;border-radius:14px;background:#eff6ff;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0}
        .mname{margin:0;font-weight:700;font-size:14px} .mmeta{margin:2px 0 0;font-size:12px;color:#111827}
        .vip-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:#92400e;background:#fef3c7;padding:4px 8px;border-radius:999px}
        .inactive{font-size:12px;color:#111827}
        @media (min-width: 900px){
          .content{padding:24px 32px 32px;max-width:1100px;width:100%;margin:0 auto;gap:18px}
          .earnings h2{font-size:40px}
          .stats{gap:14px}
          .stat{padding:18px 12px}
          .stat strong{font-size:28px}
        }
        @media (min-width: 1200px){
          .content{max-width:1200px;display:grid;grid-template-columns:1fr 1fr;align-items:start}
          .subtitle{grid-column:1 / -1}
          .earnings{grid-column:1 / 2}
          .ref-card{grid-column:2 / 3}
          .bonus-card{grid-column:1 / -1}
          .stats{grid-column:1 / -1}
          .content > div:last-child{grid-column:1 / -1}
          .tiers-grid{grid-template-columns:repeat(4,1fr)}
        }
      `}</style>
    </div>
  );
}
