import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NoticeModal } from '../components/Modal';

const countries = [
  { code: 'BF', name: 'Burkina Faso', dial: '+226', length: 8, example: '70000000', flag: 'https://flagcdn.com/w40/bf.png' },
  { code: 'CI', name: 'Côte d’Ivoire', dial: '+225', length: 10, example: '0700000000', flag: 'https://flagcdn.com/w40/ci.png' },
  { code: 'GN', name: 'Guinée', dial: '+224', length: 9, example: '620000000', flag: 'https://flagcdn.com/w40/gn.png' },
  { code: 'ML', name: 'Mali', dial: '+223', length: 8, example: '70000000', flag: 'https://flagcdn.com/w40/ml.png' },
  { code: 'NE', name: 'Niger', dial: '+227', length: 8, example: '90000000', flag: 'https://flagcdn.com/w40/ne.png' },
];

export function WithdrawPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [country, setCountry] = useState('BF');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [min, setMin] = useState(1200);
  const [max, setMax] = useState(1000000);
  const [feePct, setFeePct] = useState(10);
  const [presets, setPresets] = useState<number[]>([1200, 5000, 10000, 25000, 50000]);
  const selected = countries.find((c) => c.code === country) ?? countries[0];
  const phoneDigits = phone.replace(/\D/g, '');

  useEffect(() => {
    api<any>('/settings').then(s => {
      if (s?.minWithdraw != null) setMin(Number(s.minWithdraw));
      if (s?.maxWithdraw != null) setMax(Number(s.maxWithdraw));
      if (s?.withdrawFeePercent != null) setFeePct(Number(s.withdrawFeePercent));
      if (Array.isArray(s?.withdrawPresets) && s.withdrawPresets.length) setPresets(s.withdrawPresets.map(Number).sort((a:number,b:number)=>a-b));
    }).catch(()=>{});
  }, []);

  const onPhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, selected.length);
    setPhone(digits);
  };
  const onCountryChange = (code: string) => {
    setCountry(code);
    const c = countries.find((x) => x.code === code);
    if (c) setPhone((p) => p.replace(/\D/g, '').slice(0, c.length));
  };

  const amt = Number(amount || 0);
  const fee = Math.round(amt * (feePct / 100));
  const received = Math.max(0, amt - fee);
  const phoneValid = phoneDigits.length === selected.length;
  const valid = amt >= min && (!max || amt <= max) && phoneValid && name.trim();

  const submit = async () => {
    setError('');
    if (!phoneValid) {
      setError(`Le numéro pour ${selected.name} doit contenir ${selected.length} chiffres (ex: ${selected.example}).`);
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `${selected.dial}${phoneDigits}`;
      await api('/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount: amt, phone: fullPhone, beneficiary: name }) });
      await refresh();
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du retrait');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Retrait" back />
      <div className="content">
        <div className="hero3d">
          <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Credit%20card/3D/credit_card_3d.png" alt="" />
          <div><strong>Retrait de fonds</strong><p>Transfert vers votre numéro</p></div>
        </div>
        <div className="blocks-grid">
          <div className="card-pad block clay">
            <label className="field">
              <span>Montant à retirer (FCFA)</span>
              <input className="input" type="number" placeholder="Entrez le montant" value={amount} onChange={e=>setAmount(e.target.value)} />
            </label>
            <p className="limits">Retrait min : <strong>{min.toLocaleString('fr-FR')} FCFA</strong>{max ? <> · max : <strong>{max.toLocaleString('fr-FR')} FCFA</strong></> : null} · Frais : <strong>{feePct}%</strong></p>
            <div className="chips">
              {presets.map(a => (
                <button key={a} type="button" className={`chip ${amount===String(a)?'active':''}`} onClick={()=>setAmount(String(a))}>{a.toLocaleString('fr-FR')} F</button>
              ))}
            </div>

            <div className="summary">
              <div><span>Montant</span><strong>{amt.toLocaleString('fr-FR')} FCFA</strong></div>
              <div><span>Frais ({feePct}%)</span><strong className="neg">-{fee.toLocaleString('fr-FR')} FCFA</strong></div>
              <div className="total"><span>Vous recevrez</span><strong>{received.toLocaleString('fr-FR')} FCFA</strong></div>
            </div>
          </div>

          <div className="card-pad block clay">
            <div className="row-phone">
              <div className="field">
                <span>Pays</span>
                <div className="country-select">
                  <img src={selected.flag} alt="" className="flag" />
                  <span className="dial-code">{selected.dial}</span>
                  <select className="input country-input" value={country} onChange={(e) => onCountryChange(e.target.value)}>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <span>Numéro de réception</span>
                <input className="input" type="tel" inputMode="numeric" placeholder={selected.example} value={phone} onChange={e=>onPhoneChange(e.target.value)} maxLength={selected.length} />
              </div>
            </div>
            <p className="hint-phone">{selected.length} chiffres requis pour {selected.name} (ex: {selected.example}).</p>
            <label className="field" style={{marginTop:10}}>
              <span>Nom du bénéficiaire</span>
              <input className="input" type="text" placeholder="Nom complet" value={name} onChange={e=>setName(e.target.value)} />
            </label>
            <p className="hint"><img className="mini3d" src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Alarm%20clock/3D/alarm_clock_3d.png" alt="" /> Vous recevrez le montant dans un délai maximal de 24h après confirmation.</p>
          </div>
        </div>

        {error && <p className="err">{error}</p>}
        <button className="btn-main" disabled={!valid || loading} onClick={submit}><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Credit%20card/3D/credit_card_3d.png" alt="" /> {loading ? 'Envoi...' : 'Confirmer le retrait'}</button>
      </div>
      <NoticeModal open={success} title="Demande envoyée" message="Votre demande de retrait a été envoyée et sera traitée." type="success" onClose={()=>{ setSuccess(false); navigate('/portefeuille'); }} />
      <style>{`
        .screen { background:#fff; min-height:100%; }
        .content { padding:14px; background:#fff; }
        .blocks-grid{display:block}
        .card-pad { background:#fff; border:1px solid #e5e7eb; border-radius:20px; box-shadow: 0 2px 10px rgba(17,24,39,.04); }
        .clay{background:linear-gradient(180deg,#ffffff,#f3f8ff);border:1px solid rgba(255,255,255,.8);box-shadow:8px 8px 20px rgba(148,163,184,.18), -6px -6px 16px rgba(255,255,255,.9), inset 0 1px 0 rgba(255,255,255,.8)}
        .hero3d{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:12px;border-radius:20px;background:linear-gradient(135deg,#1e40af,#3b82f6 60%,#06b6d4);color:#fff;box-shadow:0 10px 22px rgba(59,130,246,.22)}
        .hero3d img{width:54px;height:54px;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.15))}
        .hero3d strong{display:block;font-size:16px} .hero3d p{margin:2px 0 0;font-size:12px;opacity:.9;color:#fff}
        .block { padding:14px; margin-bottom:12px; }
        .field { display:grid; gap:6px; font-size:13px; font-weight:500; }
        .input { height:46px; border:1px solid #bfdbfe; border-radius:14px; padding:0 12px; font-size:15px; width:100%; background:#fff; }
        .limits { margin:10px 0 0; font-size:13px; color:#111827; }
        .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
        .chip { border:1px solid #dbeafe; background:#fff; padding:8px 12px; border-radius:999px; font-size:12px; font-weight:600; cursor:pointer; box-shadow:2px 2px 6px rgba(148,163,184,.1), -2px -2px 6px rgba(255,255,255,.8); }
        .chip.active { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%); color:#fff; border-color:transparent; }
        .summary { margin-top:12px; border-top:1px dashed #bfdbfe; padding-top:10px; display:grid; gap:8px; font-size:14px; }
        .summary div { display:flex; justify-content:space-between; }
        .neg { color:#dc2626; }
        .total { font-weight:700; color:#1d4ed8; }
        .row-phone{display:grid;gap:10px}
        .country-select{position:relative;display:flex;align-items:center}
        .flag{position:absolute;left:10px;width:22px;height:16px;object-fit:cover;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.2)}
        .dial-code{position:absolute;left:38px;font-size:14px;font-weight:700;color:#1e40af;pointer-events:none}
        .country-input{padding-left:88px}
        .hint-phone{margin:6px 0 0;font-size:12px;color:#475569}
        .hint { margin:10px 0 0; font-size:13px; color:#111827; display:flex; align-items:center; gap:6px; }
        .mini3d{width:18px;height:18px;object-fit:contain}
        .btn-main { width:100%; height:48px; border:none; border-radius:16px; color:#fff; font-weight:700; font-size:15px; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 45%, #2563eb 100%); box-shadow:6px 8px 16px rgba(37,99,235,.28); cursor:pointer; display:flex;align-items:center;justify-content:center;gap:8px; }
        .btn-main img{width:22px;height:22px}
        .btn-main:disabled { opacity:0.5; box-shadow:none; cursor:not-allowed; }
        .err{margin:0 0 10px;color:#dc2626;font-size:13px}
        @media (min-width: 900px){
          .content{padding:24px 32px 40px;max-width:1100px;width:100%;margin:0 auto}
          .blocks-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
          .block{margin-bottom:0}
          .row-phone{grid-template-columns:1fr 1fr;align-items:end}
          .btn-main{max-width:360px;height:50px;margin:8px auto 0}
        }
      `}</style>
    </div>
  );
}
