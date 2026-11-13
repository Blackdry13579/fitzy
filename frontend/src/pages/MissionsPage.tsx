import { useState } from 'react';
import { TopBar } from '../components/TopBar';

const missions = [
  { title: 'Première connexion', pts: '+100 pts', progress: 100, done: true },
  { title: 'Découvrir un matériel', pts: '+100 pts', progress: 100, done: true },
  { title: 'Faire une séance', pts: '+150 pts', progress: 40, done: false },
  { title: 'Inviter un ami', pts: '+200 pts', progress: 20, done: false },
];

export function MissionsPage() {
  const [tab, setTab] = useState<'Missions' | 'Récompenses'>('Missions');
  return (
    <div className="screen">
      <TopBar title="Missions & Récompenses" back />
      <div className="content">
        <div className="tabs">
          {(['Missions', 'Récompenses'] as const).map((t) => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        {tab === 'Missions' ? (
          <div className="list">
            {missions.map((m) => (
              <div key={m.title} className="card-pad item">
                <div className="row"><strong>{m.title}</strong><span className="pts">{m.pts}</span></div>
                <div className="progress"><div className={`bar ${m.done ? 'done' : ''}`} style={{ width: `${m.progress}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-pad"><p style={{ margin: 0, color:'#111827' }}>Vos récompenses apparaîtront ici.</p></div>
        )}
      </div>
      <style>{`
        .screen { background: #fff; min-height: 100%; }
        .content { padding: 14px; background: #ffffff; }
        .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .tab { height: 38px; border: 1px solid var(--border); background: #fff; border-radius: 14px; font-weight: 500; cursor: pointer; }
        .tab.active { border-color: var(--navy); color: var(--navy); font-weight: 600; }
        .list { display: grid; gap: 10px; }
        .card-pad { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 14px; box-shadow: var(--shadow-sm); }
        .item .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; gap: 8px; }
        .pts { color: var(--accent-strong); font-weight: 600; }
        .progress { height: 8px; background: #e5e7eb; border-radius: 10px; overflow: hidden; }
        .bar { height: 100%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .bar.done { background: var(--success); }
      `}</style>
    </div>
  );
}
