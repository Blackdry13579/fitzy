import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function EditProfilePage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || 'Utilisateur');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (user?.username) setUsername(user.username); }, [user]);

  const save = async () => {
    setError('');
    setLoading(true);
    try {
      await api('/profile', { method: 'PATCH', body: JSON.stringify({ username }) });
      await refresh();
      navigate('/compte');
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Modifier le profil" back />
      <div className="content">
        <p className="intro">Votre photo et votre nom d'utilisateur sont affichés dans votre espace membre.</p>

        <div className="photo-block">
          <p className="label">Photo</p>
          <button className="photo" type="button">
            <svg viewBox="0 0 64 64" width="80" height="80">
              <defs>
                <linearGradient id="avm" x1="0" y1="0" x2="64" y2="64"><stop stopColor="#93c5fd"/><stop offset=".5" stopColor="#3b82f6"/><stop offset="1" stopColor="#1d4ed8"/></linearGradient>
              </defs>
              <circle cx="32" cy="32" r="30" fill="url(#avm)" />
              <circle cx="32" cy="25" r="9" fill="#fff" />
              <path d="M14 54c4-10 12-14 18-14s14 4 18 14" fill="#fff" />
            </svg>
            <span className="cam"><Camera size={16} /></span>
          </button>
          <p className="hint">Touchez la photo pour en téléverser une nouvelle.</p>
        </div>

        <div className="form">
          <label className="field">
            <div className="row"><span>Nom d'utilisateur</span><span className="count">{username.length}/20</span></div>
            <input className="input" maxLength={20} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Votre nom d'utilisateur" />
          </label>
        </div>

        {error && <p className="err">{error}</p>}
        <button className="btn-main" onClick={save} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
      <style>{`
        .screen{background:#fff;min-height:100%}
        .content{padding:16px;background:#fff}
        .intro{margin:0 0 18px;color:#111827;font-size:14px;line-height:1.5}
        .photo-block{margin-bottom:18px}
        .label{display:block;margin-bottom:8px;font-size:14px;font-weight:600;color:#111827}
        .photo{position:relative;width:88px;height:88px;border:none;background:transparent;padding:0;cursor:pointer;border-radius:50%}
        .photo svg{border-radius:50%;box-shadow:0 8px 18px rgba(59,130,246,.2)}
        .cam{position:absolute;right:0;bottom:0;width:30px;height:30px;border-radius:50%;background:#fff;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;color:#2563eb;box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .hint{margin:8px 0 0;font-size:13px;color:#111827}
        .form{display:grid;gap:14px;margin-bottom:18px}
        .field{display:grid;gap:6px}
        .field span{font-size:14px;font-weight:600;color:#111827}
        .row{display:flex;justify-content:space-between;align-items:center}
        .count{font-size:12px;color:#111827;font-weight:500}
        .input{height:48px;border:1px solid #e5e7eb;border-radius:14px;padding:0 14px;font-size:15px;width:100%;background:#fff}
        .input.readonly{background:#f3f4f6;color:#111827}
        .input:focus{outline:none;border-color:#93c5fd;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
        .note{margin:0;font-size:12px;color:#111827}
        .btn-main{width:100%;height:48px;border:none;border-radius:16px;color:#fff;font-weight:700;font-size:15px;background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);box-shadow:6px 8px 16px rgba(37,99,235,.28);cursor:pointer}
        .btn-main:disabled{opacity:.7}
        .err{margin:0 0 10px;color:#dc2626;font-size:13px}
        @media (min-width: 900px){
          .content{padding:24px 32px 40px;max-width:720px;width:100%;margin:0 auto}
        }
      `}</style>
    </div>
  );
}
