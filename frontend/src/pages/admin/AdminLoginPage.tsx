import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, setAdminToken } from '../../api/adminClient';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('02040608');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login'|'recover'>('login');
  const [recMsg, setRecMsg] = useState('');
  const [recErr, setRecErr] = useState('');
  const [devCode, setDevCode] = useState('');
  const [r, setR] = useState({ code:'', phone:'', password:'', email:'' });
  const [recLoading, setRecLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await adminApi<{token:string}>('/admin/login', { method:'POST', body: JSON.stringify({ phone, password }) });
      setAdminToken(data.token);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Connexion échouée');
    } finally { setLoading(false); }
  };

  const requestCode = async () => {
    setRecErr(''); setRecMsg(''); setDevCode(''); setRecLoading(true);
    try {
      const out = await adminApi<any>('/admin/recover/request', { method:'POST', body: JSON.stringify({}) });
      setRecMsg(out.message || 'Code envoyé');
      if (out.devCode) setDevCode(out.devCode);
    } catch (e:any) { setRecErr(e.message || 'Erreur'); }
    finally { setRecLoading(false); }
  };

  const resetCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecErr(''); setRecMsg(''); setRecLoading(true);
    try {
      const out = await adminApi<any>('/admin/recover/reset', { method:'POST', body: JSON.stringify(r) });
      setRecMsg(out.message || 'Identifiants mis à jour');
      setDevCode('');
      setMode('login');
      if (r.phone) setPhone(r.phone);
      if (r.password) setPassword(r.password);
    } catch (e:any) { setRecErr(e.message || 'Erreur'); }
    finally { setRecLoading(false); }
  };

  return (
    <div className="screen">
      <div className="card">
        <div className="brand"><div className="logo">FZ</div><div><h1>FITZONE Admin</h1><p>Gestion de la plateforme</p></div></div>
        {mode === 'login' ? (
          <>
            <form onSubmit={submit}>
              <label>Identifiant (téléphone)<input className="input" value={phone} onChange={e=>setPhone(e.target.value)} /></label>
              <label>Mot de passe<input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
              {error && <p className="err">{error}</p>}
              <button className="btn" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
            </form>
            <button className="linkbtn" type="button" onClick={()=>{setMode('recover'); setError('');}}>Problème de connexion ? Récupérer l’accès</button>
          </>
        ) : (
          <div className="recover">
            <h3>Récupération admin</h3>
            <p className="hint">Un code sera envoyé à l’email de récupération configuré (dans Paramètres). Si l’email/SMTP n’est pas configuré, un code de secours pourra s’afficher.</p>
            <button className="btn secondary" type="button" onClick={requestCode} disabled={recLoading}>{recLoading?'Envoi...':'Envoyer le code par email'}</button>
            {recMsg && <p className="ok">{recMsg}</p>}
            {devCode && <p className="dev">Code de secours : <strong>{devCode}</strong></p>}
            {recErr && <p className="err">{recErr}</p>}
            <form onSubmit={resetCreds} className="rform">
              <label>Code reçu<input className="input" value={r.code} onChange={e=>setR({...r,code:e.target.value})} required /></label>
              <label>Nouvel identifiant admin<input className="input" value={r.phone} onChange={e=>setR({...r,phone:e.target.value})} required /></label>
              <label>Nouveau mot de passe<input className="input" type="text" value={r.password} onChange={e=>setR({...r,password:e.target.value})} required /></label>
              <label>Nouvel email de récupération (optionnel)<input className="input" type="email" value={r.email} onChange={e=>setR({...r,email:e.target.value})} /></label>
              <button className="btn" disabled={recLoading}>Valider et modifier les identifiants</button>
            </form>
            <button className="linkbtn" type="button" onClick={()=>setMode('login')}>Retour à la connexion</button>
          </div>
        )}
      </div>
      <style>{`
        .screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#eef2ff,#dbeafe,#f8fafc);padding:20px}
        .card{width:100%;max-width:460px;background:#fff;border:1px solid #bfdbfe;border-radius:24px;padding:28px;box-shadow:0 20px 40px rgba(30,64,175,.15)}
        .brand{display:flex;align-items:center;gap:12px;margin-bottom:18px}
        .logo{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}
        h1{margin:0;font-size:22px;color:#0f172a} p{margin:2px 0 0;color:#475569;font-size:13px}
        h3{margin:0 0 6px;color:#0f172a}
        .hint{margin:0 0 10px;font-size:13px;color:#475569}
        form,.recover{display:grid;gap:12px}
        .rform{margin-top:4px}
        label{display:grid;gap:6px;font-size:14px;font-weight:600;color:#334155}
        .input{height:46px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;font-size:14px}
        .input:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(30,64,175,.14)}
        .btn{height:48px;border:none;border-radius:14px;background:linear-gradient(135deg,#2563eb,#1d4ed8 50%,#1e40af);color:#fff;font-weight:700;cursor:pointer;box-shadow:0 10px 22px rgba(30,58,138,.3)}
        .btn.secondary{background:#fff;color:#1d4ed8;border:1px solid #93c5fd;box-shadow:none}
        .linkbtn{margin-top:10px;background:none;border:none;color:#1d4ed8;font-weight:600;cursor:pointer;text-decoration:underline;font-size:13px}
        .err{margin:0;color:#dc2626;font-size:13px}
        .ok{margin:0;color:#16a34a;font-size:13px;font-weight:600}
        .dev{margin:0;color:#0f172a;font-size:13px;background:#eff6ff;border:1px solid #bfdbfe;padding:8px 10px;border-radius:10px}
      `}</style>
    </div>
  );
}
