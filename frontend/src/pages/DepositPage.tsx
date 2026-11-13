import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NoticeModal } from '../components/Modal';

export function DepositPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [presets, setPresets] = useState<number[]>([2500, 7000, 13000, 28000, 60000]);
  const [min, setMin] = useState(500);
  const [max, setMax] = useState(1000000);
  const [amount, setAmount] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [method, setMethod] = useState<'otp' | 'marchand'>('otp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [merchantCode, setMerchantCode] = useState('OM-123456');
  const [depositNumber, setDepositNumber] = useState('+226 66 76 83 92');
  useEffect(() => {
    api<any>('/settings').then(s => {
      if (s?.merchantCode) setMerchantCode(s.merchantCode);
      if (s?.depositNumber) setDepositNumber(s.depositNumber);
      if (s?.minDeposit != null) setMin(Number(s.minDeposit));
      if (s?.maxDeposit != null) setMax(Number(s.maxDeposit));
      if (Array.isArray(s?.depositPresets) && s.depositPresets.length) setPresets(s.depositPresets.map(Number).sort((a:number,b:number)=>a-b));
    }).catch(()=>{});
  }, []);
  const setPreset = (v: number) => setAmount(String(v));

  const amt = Number(amount || 0);
  const valid = amt >= min && (!max || amt <= max) && (method === 'otp' ? !!otp : true);

  const submit = async () => {
    setError('');
    if (!valid) { setError(`Montant invalide (min ${min.toLocaleString('fr-FR')} FCFA${max ? `, max ${max.toLocaleString('fr-FR')} FCFA` : ''})`); return; }
    setLoading(true);
    try {
      await api('/wallet/deposit', { method: 'POST', body: JSON.stringify({ amount: amt, method, otp, merchantCode }) });
      await refresh();
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du dépôt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Dépôt" back />
      <div className="content">
        <div className="hero3d">
          <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dollar%20banknote/3D/dollar_banknote_3d.png" alt="" />
          <div><strong>Recharger votre compte</strong><p>Dépôt rapide et sécurisé</p></div>
        </div>
        <div className="blocks-grid">
          <div className="card-pad block clay">
            <label className="field">
              <span>Montant à déposer (FCFA)</span>
              <input className="input" type="number" placeholder="Entrez le montant" value={amount} onChange={e=>setAmount(e.target.value)} />
            </label>
            <p className="limits">Minimum : <strong>{min.toLocaleString('fr-FR')} FCFA</strong> · Maximum : <strong>{max.toLocaleString('fr-FR')} FCFA</strong></p>
            <div className="chips">
              {presets.map(a => (
                <button key={a} type="button" className={`chip ${amount===String(a)?'active':''}`} onClick={() => setPreset(a)}>
                  {a.toLocaleString('fr-FR')} F
                </button>
              ))}
            </div>
          </div>

          <div className="card-pad block clay">
            <p className="label">Méthode de paiement</p>
            <div className="method-tabs">
              <button type="button" className={`mtab ${method==='otp'?'active':''}`} onClick={()=>setMethod('otp')}>Code OTP</button>
              <button type="button" className={`mtab ${method==='marchand'?'active':''}`} onClick={()=>setMethod('marchand')}>Code marchand (Orange Money)</button>
            </div>

            {method === 'otp' ? (
              <>
                <p className="label" style={{marginTop:10}}>Numéro de dépôt</p>
                <div className="number-box">{depositNumber}</div>
                <p className="hint">Effectuez le transfert vers ce numéro, puis entrez le code OTP reçu pour confirmer le dépôt.</p>
                <label className="field" style={{marginTop: 10}}>
                  <span>Code OTP reçu</span>
                  <input className="input" type="text" inputMode="numeric" placeholder="Entrez le code OTP" value={otp} onChange={e=>setOtp(e.target.value)} />
                </label>
              </>
            ) : (
              <>
                <p className="label" style={{marginTop:10}}>Paiement via code marchand Orange Money</p>
                <div className="number-box">{merchantCode}</div>
                <p className="hint">Si vous n'arrivez pas à utiliser le code OTP, payez via le <strong>code marchand Orange Money</strong> ci-dessus depuis votre application Orange Money (Paiement marchand), puis validez votre dépôt.</p>
                <div className="steps">
                  <p>1. Ouvrez Orange Money</p>
                  <p>2. Choisissez “Paiement marchand”</p>
                  <p>3. Entrez le code marchand et le montant</p>
                  <p>4. Confirmez le paiement</p>
                </div>
              </>
            )}
          </div>
        </div>

        {error && <p className="err">{error}</p>}
        <button className="btn-main" onClick={submit} disabled={loading || !amount || !valid}>
          <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Check%20mark%20button/3D/check_mark_button_3d.png" alt="" /> {loading ? 'Confirmation...' : 'Confirmer le dépôt'}
        </button>
      </div>
      <NoticeModal open={success} title="Dépôt confirmé" message="Votre dépôt a été confirmé avec succès." type="success" onClose={()=>{ setSuccess(false); navigate('/portefeuille'); }} />
      <style>{`
        .screen { background:#fff; min-height:100%; }
        .content { padding:14px; background:#fff; }
        .blocks-grid{display:block}
        .card-pad { background:#fff; border:1px solid #e5e7eb; border-radius:20px; box-shadow: 0 2px 10px rgba(17,24,39,.04); }
        .clay{background:linear-gradient(180deg,#ffffff,#f3f8ff);border:1px solid rgba(255,255,255,.8);box-shadow:8px 8px 20px rgba(148,163,184,.18), -6px -6px 16px rgba(255,255,255,.9), inset 0 1px 0 rgba(255,255,255,.8)}
        .hero3d{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:12px;border-radius:20px;background:linear-gradient(135deg,#1e40af,#3b82f6 60%,#06b6d4);color:#fff;box-shadow:0 10px 22px rgba(59,130,246,.22)}
        .hero3d img{width:54px;height:54px;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.15))}
        .hero3d strong{display:block;font-size:16px} .hero3d p{margin:2px 0 0;font-size:12px;color:#fff}
        .block { padding:14px; margin-bottom:12px; }
        .field { display:grid; gap:6px; font-size:13px; font-weight:500; }
        .input { height:46px; border:1px solid #bfdbfe; border-radius:14px; padding:0 12px; font-size:15px; width:100%; background:#fff; }
        .limits { margin:10px 0; font-size:13px; color:#111827; }
        .chips { display:flex; flex-wrap:wrap; gap:8px; }
        .chip { border:1px solid #dbeafe; background:#fff; padding:8px 12px; border-radius:999px; font-size:12px; font-weight:600; cursor:pointer; box-shadow:2px 2px 6px rgba(148,163,184,.1), -2px -2px 6px rgba(255,255,255,.8); }
        .chip.active { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%); color:#fff; border-color:transparent; }
        .label { margin:0 0 6px; font-size:13px; color:#111827; font-weight:600; }
        .number-box { font-size:20px; font-weight:700; color:#1d4ed8; background: linear-gradient(180deg,#eff6ff,#e0efff); border:1px solid #bfdbfe; border-radius:16px; padding:12px 14px; box-shadow:inset 3px 3px 6px rgba(148,163,184,.1), inset -3px -3px 6px rgba(255,255,255,.9); }
        .hint { margin:8px 0 0; font-size:13px; color:#111827; }
        .method-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
        .mtab{height:40px;border:1px solid #dbeafe;background:#fff;border-radius:12px;font-weight:600;font-size:12px;cursor:pointer;padding:0 6px}
        .mtab.active{background:linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%);color:#fff;border-color:transparent}
        .steps{margin-top:10px;padding:10px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:12px}
        .steps p{margin:4px 0;font-size:13px;color:#111827}
        .btn-main { width:100%; height:48px; border:none; border-radius:16px; color:#fff; font-weight:700; font-size:15px; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%); box-shadow:6px 8px 16px rgba(37,99,235,.28);cursor:pointer; display:flex;align-items:center;justify-content:center;gap:8px; }
        .btn-main:disabled{opacity:.6}
        .btn-main img{width:22px;height:22px}
        .err{margin:0 0 10px;color:#dc2626;font-size:13px}
        @media (min-width: 900px){
          .content{padding:24px 32px 40px;max-width:1100px;width:100%;margin:0 auto}
          .blocks-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
          .block{margin-bottom:0}
          .btn-main{max-width:360px;height:50px;margin:8px auto 0}
        }
      `}</style>
    </div>
  );
}
