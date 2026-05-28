import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import Logo from '../components/Logo.jsx';

const C = {
  navy: "#002651", primary: "#004B96", green: "#4B7D19",
  accent: "#E0AB21", gold: "#E0AB21", blue: "#004B96",
  bg: "#F4F7FC", border: "#D8E4F0", muted: "#5A6E8A",
  text: "#0D1F3C", error: "#C0392B", danger: "#C0392B",
};

export default function Login() {
  const { login, register, loading } = useAuth();
  const { t, lang, changeLang, LANGUAGES, currentLang } = useLang();
  const nav = useNavigate();
  const [tab,          setTab]         = useState('login');
  const [error,        setError]       = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [form,         setForm]        = useState({ email:'', password:'', name:'', role:'reporter', country:'', city:'', phone:'' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    try {
      tab === 'login'
        ? await login(form.email, form.password)
        : await register({ name:form.name, email:form.email, password:form.password, role:form.role, country:form.country, city:form.city, phone:form.phone });
      nav('/dashboard');
    } catch (err) { setError(err.message); }
  };

  const inp = (key, placeholder, type = 'text') => (
    <input
      value={form[key]} onChange={e => set(key, e.target.value)}
      placeholder={placeholder} type={type} required
      className="kf-input"
      style={{
        width:'100%', padding:'12px 16px', border:`1.5px solid ${C.border}`,
        borderRadius:10, fontSize:15, background:'#fff', outline:'none',
        boxSizing:'border-box', color: C.text,
        fontFamily:"'Segoe UI', system-ui, sans-serif",
      }}
    />
  );

  return (
    <div style={{
      minHeight:'100vh',
      background:`linear-gradient(145deg, ${C.navy} 0%, ${C.primary} 55%, ${C.green} 100%)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', position:'relative', overflow:'hidden',
    }}>
      {/* Background orbs */}
      <div style={{ position:'absolute', top:-120, right:-120, width:400, height:400, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-80, left:-80, width:300, height:300, borderRadius:'50%', background:'rgba(224,171,33,0.07)', pointerEvents:'none' }} />

      <div style={{
        background:'#fff', borderRadius:24, width:'100%', maxWidth:440,
        boxShadow:'0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)',
        overflow:'hidden', position:'relative', zIndex:1,
      }}>
        {/* Navy top bar */}
        <div style={{
          background:`linear-gradient(135deg, ${C.navy}, ${C.primary})`,
          padding:'28px 32px 24px',
        }}>
          {/* Lang picker */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20, position:'relative' }}>
            <button onClick={() => setShowLangMenu(v => !v)}
              style={{
                background:'rgba(255,255,255,0.14)', border:'1px solid rgba(255,255,255,0.22)',
                borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700,
                cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'#fff',
              }}>
              {currentLang.flag} {currentLang.code.toUpperCase()} ▾
            </button>
            {showLangMenu && (
              <div style={{
                position:'absolute', top:38, right:0, background:'#fff',
                border:`1px solid ${C.border}`, borderRadius:12,
                boxShadow:'0 12px 32px rgba(0,0,0,0.16)', zIndex:99, minWidth:170, overflow:'hidden',
              }}>
                {LANGUAGES.map(l => (
                  <div key={l.code} onClick={() => { changeLang(l.code); setShowLangMenu(false); }}
                    style={{
                      padding:'10px 16px', fontSize:13, cursor:'pointer',
                      background: lang === l.code ? C.primary+'12' : '#fff',
                      fontWeight: lang === l.code ? 700 : 400,
                      display:'flex', alignItems:'center', gap:10,
                      borderBottom:`1px solid ${C.border}`,
                    }}>
                    <span style={{ fontSize:18 }}>{l.flag}</span>
                    <span>{l.label}</span>
                    {lang === l.code && <span style={{ marginLeft:'auto', color:C.green, fontWeight:900 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logo */}
          <div style={{ textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
              <Logo size="lg" linked={false} dark />
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:6 }}>{t('appTagline')}</div>
          </div>
        </div>

        {/* Form area */}
        <div style={{ padding:'28px 32px 32px' }}>
          {/* Tabs */}
          <div style={{ display:'flex', background:C.bg, borderRadius:12, marginBottom:24, padding:4 }}>
            {['login','register'].map(tb => (
              <button key={tb} onClick={() => { setTab(tb); setError(''); }}
                style={{
                  flex:1, padding:'10px 8px', border:'none', borderRadius:9,
                  fontSize:13, fontWeight:700, cursor:'pointer',
                  background: tab===tb ? C.primary : 'none',
                  color: tab===tb ? '#fff' : C.muted,
                  transition:'all 0.18s', boxShadow: tab===tb ? `0 2px 8px ${C.primary}35` : 'none',
                }}>
                {tb === 'login' ? `🔐 ${t('signIn')}` : `✨ ${t('register')}`}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background:'#FEF2F2', border:`1px solid ${C.error}30`, color:C.error, padding:'11px 15px', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:600 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {tab === 'register' && inp('name', t('fullName'))}
            {inp('email',    t('email'),    'email')}
            {inp('password', t('password'), 'password')}

            {tab === 'register' && (
              <>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  style={{ width:'100%', padding:'12px 16px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:15, background:'#fff', color:C.text, outline:'none' }}>
                  <option value="reporter">{t('roleReporter')}</option>
                  <option value="donor">{t('roleDonor')}</option>
                </select>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {inp('country', t('country'))}
                  {inp('city',    t('city'))}
                </div>
                {inp('phone', t('phone'))}
              </>
            )}

            <button type="submit" disabled={loading} className="kf-btn kf-btn-navy"
              style={{
                padding:'14px', border:'none', borderRadius:12,
                fontSize:15, fontWeight:700, marginTop:4,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              {loading
                ? `⏳ ${t('pleaseWait')}`
                : tab === 'login'
                  ? `🔐 ${t('signIn')}`
                  : `✨ ${t('createAccount')}`}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:C.muted }}>
            <Link to="/" style={{ color:C.primary, fontWeight:600, textDecoration:'none' }}>← {t('backToHome')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
