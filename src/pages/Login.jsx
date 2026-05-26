import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';

const C = { primary: '#0B3D91', green: '#1A6B3C', accent: '#E8A020', bg: '#F0F4F8', border: '#E2E8F0', error: '#C0392B' };

export default function Login() {
  const { login, register, loading } = useAuth();
  const { t, lang, changeLang, LANGUAGES, currentLang } = useLang();
  const nav = useNavigate();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'reporter', country: '', city: '', phone: '' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    try {
      tab === 'login'
        ? await login(form.email, form.password)
        : await register({ name: form.name, email: form.email, password: form.password, role: form.role, country: form.country, city: form.city, phone: form.phone });
      nav('/dashboard');
    } catch (err) { setError(err.message); }
  };

  const inp = (key, placeholder, type='text') => (
    <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} type={type} required
      style={{ width: '100%', padding: '12px 16px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 15, background: C.bg, outline: 'none', boxSizing: 'border-box' }} />
  );

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.primary}15, ${C.green}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', padding: '36px 32px', width: '100%', maxWidth: 440 }}>

        {/* Language picker */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, position: 'relative' }}>
          <button onClick={() => setShowLangMenu(v => !v)}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {currentLang.flag} {currentLang.label} ▾
          </button>
          {showLangMenu && (
            <div style={{ position: 'absolute', top: 38, right: 0, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px #0002', zIndex: 99, minWidth: 160 }}>
              {LANGUAGES.map(l => (
                <div key={l.code} onClick={() => { changeLang(l.code); setShowLangMenu(false); }}
                  style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', background: lang === l.code ? C.primary + '10' : '', fontWeight: lang === l.code ? 700 : 400, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8 }}>
                  {l.flag} {l.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌍</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.primary }}>{t('appName')}</div>
          <div style={{ color: '#6B7280', fontSize: 14 }}>{t('appTagline')}</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: C.bg, borderRadius: 10, marginBottom: 24, padding: 4 }}>
          {['login','register'].map(tb => (
            <button key={tb} onClick={() => { setTab(tb); setError(''); }}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: tab===tb ? C.primary : 'none', color: tab===tb ? '#fff' : '#6B7280', transition: 'all 0.2s' }}>
              {tb === 'login' ? `🔐 ${t('signIn')}` : `✨ ${t('register')}`}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', border: `1px solid ${C.error}`, color: C.error, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>
        )}

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'register' && inp('name', t('fullName'))}
          {inp('email', t('email'), 'email')}
          {inp('password', t('password'), 'password')}
          {tab === 'register' && (
            <>
              <select value={form.role} onChange={e => set('role', e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 15, background: C.bg }}>
                <option value="reporter">{t('roleReporter')}</option>
                <option value="donor">{t('roleDonor')}</option>
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                {inp('country', t('country'))}
                {inp('city', t('city'))}
              </div>
              {inp('phone', t('phone'))}
            </>
          )}
          <button type="submit" disabled={loading}
            style={{ padding: '14px', background: `linear-gradient(135deg, ${C.primary}, ${C.green})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? `⏳ ${t('pleaseWait')}` : tab === 'login' ? `🔐 ${t('signIn')}` : `✨ ${t('createAccount')}`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6B7280' }}>
          <Link to="/" style={{ color: C.primary }}>{t('backToHome')}</Link>
        </div>
      </div>
    </div>
  );
}
