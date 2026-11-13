import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const countries = [
  { code: 'BF', name: 'Burkina Faso', dial: '+226', length: 8, example: '05030505', flag: 'https://flagcdn.com/w40/bf.png' },
  { code: 'CI', name: 'Côte d’Ivoire', dial: '+225', length: 10, example: '0700000000', flag: 'https://flagcdn.com/w40/ci.png' },
  { code: 'GN', name: 'Guinée', dial: '+224', length: 9, example: '620000000', flag: 'https://flagcdn.com/w40/gn.png' },
  { code: 'ML', name: 'Mali', dial: '+223', length: 8, example: '70000000', flag: 'https://flagcdn.com/w40/ml.png' },
  { code: 'NE', name: 'Niger', dial: '+227', length: 8, example: '90000000', flag: 'https://flagcdn.com/w40/ne.png' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [country, setCountry] = useState('BF');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const selected = countries.find((c) => c.code === country) ?? countries[0];
  const dial = selected.dial;
  const phoneDigits = phone.replace(/\D/g, '');

  const onPhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, selected.length);
    setPhone(digits);
  };

  const onCountryChange = (code: string) => {
    setCountry(code);
    const c = countries.find((x) => x.code === code);
    if (c) setPhone((p) => p.replace(/\D/g, '').slice(0, c.length));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (phoneDigits.length !== selected.length) {
      setError(`Le numéro pour ${selected.name} doit contenir ${selected.length} chiffres (ex: ${selected.example}).`);
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `${dial}${phoneDigits}`;
      await login(fullPhone, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="hero">
        <div className="hero-overlay">
          <div className="logo">FITZONE</div>
          <p>Content de vous revoir</p>
        </div>
      </div>
      <div className="form-wrap">
        <div className="form-card">
          <div className="card-head">
            <div>
              <h2>Connexion</h2>
              <p className="tagline">Travaille pour ton argent</p>
            </div>
          </div>
          <div className="tabs">
            <Link to="/inscription" className="tab">Inscription</Link>
            <span className="tab active">Connexion</span>
          </div>
          <form className="form" onSubmit={onSubmit}>
            <div className="row-phone">
              <div className="field">
                <label>Pays</label>
                <div className="country-select">
                  <img src={selected.flag} alt="" className="flag" />
                  <span className="dial-code">{selected.dial}</span>
                  <select className="input country-input" value={country} onChange={(e) => onCountryChange(e.target.value)}>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Numéro de téléphone</label>
                <input className="input" type="tel" inputMode="numeric" placeholder={selected.example} value={phone} onChange={e=>onPhoneChange(e.target.value)} maxLength={selected.length} required />
              </div>
            </div>
            <p className="hint">{selected.length} chiffres requis pour {selected.name} (ex: {selected.example}).</p>
            <div className="field">
              <label>Mot de passe</label>
              <div className="pass-wrap">
                <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Votre mot de passe" value={password} onChange={e=>setPassword(e.target.value)} required />
                <button type="button" className="eye-btn" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="err">{error}</p>}
            <div className="bottom-actions">
              <button className="btn-primary" disabled={loading}>{loading ? 'Connexion...' : 'Connexion'}</button>
            </div>
          </form>
        </div>
      </div>
      <style>{`
        .auth-screen { background: #fff; min-height: 100vh; }
        .hero { position:relative; overflow:hidden; height: 220px; background: url('https://i.pinimg.com/736x/b9/ca/e2/b9cae2853ae3d51a1be64b4b5f24ea01.jpg') center/cover no-repeat; }
        .hero-overlay { position:relative; z-index:2; height: 100%; background: transparent; color: #fff; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; }
        .logo { font-weight: 800; font-size: 24px; letter-spacing: .04em; text-shadow:0 4px 14px rgba(0,0,0,.45); }
        .hero-overlay p { color: #fff; margin: 4px 0 0; font-weight:600; text-shadow:0 3px 10px rgba(0,0,0,.45); }
        .form-wrap { padding: 16px; background: linear-gradient(180deg,#f8fafc 0%, #eef2ff 100%); }
        .form-card{position:relative;overflow:hidden;max-width:520px;margin:0 auto;background:linear-gradient(180deg,#ffffff 0%, #f8fbff 100%);border:1px solid #bfdbfe;border-radius:24px;padding:20px;box-shadow:0 18px 40px rgba(30,64,175,.18)}
        .card-head,.tabs,.form{position:relative;z-index:1}
        .card-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .card-head h2{margin:0;font-size:20px;color:#0f172a}
        .card-head p{margin:2px 0 0;font-size:13px;color:#475569}
        .tagline{font-weight:700;background:linear-gradient(90deg,#1d4ed8,#2563eb,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent !important}
        .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
        .tab { height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid #bfdbfe; text-decoration: none; color: #111827; font-weight: 600; background: #fff; }
        .tab.active { border-color: transparent; color: #fff; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%); box-shadow:0 6px 14px rgba(30,58,138,.28); }
        .form { display: grid; gap: 12px; }
        .field { display: grid; gap: 6px; }
        .field label { font-size: 13px; font-weight: 600; color:#334155; }
        .hint{margin:-4px 0 0;font-size:12px;color:#475569}
        .input { height: 48px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0 12px; font-size: 14px; width: 100%; background: #fff; }
        .input:focus{outline:none;border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(30,64,175,.14)}
        .pass-wrap{position:relative;display:flex;align-items:center}
        .pass-wrap .input{padding-right:44px}
        .eye-btn{position:absolute;right:8px;width:34px;height:34px;border:none;background:transparent;color:#64748b;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px}
        .eye-btn:hover{background:#f1f5f9;color:#1d4ed8}
        .country-select{position:relative;display:flex;align-items:center}
        .flag{position:absolute;left:10px;width:22px;height:16px;object-fit:cover;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.2)}
        .dial-code{position:absolute;left:38px;font-size:14px;font-weight:700;color:#1e40af;pointer-events:none}
        .country-input{padding-left:88px}
        .row-phone{display:grid;gap:12px}
        .bottom-actions{display:grid;gap:10px;margin-top:4px;grid-template-columns:1fr}
        .btn-primary { height: 50px; width:100%; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%); color: #fff; border: none; border-radius: 14px; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 10px 22px rgba(30,58,138,.3), inset 0 1px 0 rgba(255,255,255,.2); }
        .btn-primary:disabled{opacity:.7}
        .bonus { background: linear-gradient(135deg,#111827,#1e3a8a); color: #fff; padding: 0 14px; border-radius: 14px; font-size: 14px; text-align: center; font-weight:600; box-shadow:0 8px 18px rgba(17,24,39,.25); height:50px; display:flex; align-items:center; justify-content:center; gap:6px; border:1px solid rgba(96,165,250,.35); }
        .err{margin:0;color:#dc2626;font-size:13px}
        @media (min-width: 900px){
          .auth-screen{display:grid;grid-template-columns:1fr 1.15fr;min-height:100vh}
          .hero{height:auto;min-height:100vh}
          .hero-overlay{justify-content:center;padding:56px}
          .logo{font-size:40px}
          .hero-overlay p{font-size:19px;max-width:460px}
          .form-wrap{display:flex;align-items:center;justify-content:center;padding:40px 48px;background:linear-gradient(135deg,#eef2ff 0%, #dbeafe 45%, #f8fafc 100%)}
          .form-card{width:100%;max-width:none;border-radius:28px;padding:40px 44px;box-shadow:0 22px 48px rgba(30,64,175,.22);display:flex;flex-direction:column;justify-content:flex-start}
          .card-head h2{font-size:26px}
          .input{height:52px;font-size:15px}
          .tab{height:48px}
          .row-phone{grid-template-columns:1fr 1fr;align-items:end}
          .bottom-actions{grid-template-columns:1fr;align-items:stretch}
          .btn-primary{height:54px}

        }
      `}</style>
    </div>
  );
}
