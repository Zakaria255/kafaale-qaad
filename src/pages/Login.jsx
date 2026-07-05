import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import Logo from '../components/Logo.jsx';

const C = {
  navy: "#002651", primary: "#004B96", green: "#4B7D19",
  accent: "#E0AB21", gold: "#E0AB21", blue: "#004B96",
  bg: "#F4F7FC", border: "#D8E4F0", muted: "#5A6E8A",
  text: "#0D1F3C", error: "#C0392B", danger: "#C0392B",
};

// Custom portal dropdown — works inside any overflow/fixed context
function PortalSelect({ value, onChange, groups }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);

  const allOpts = groups.flatMap(g => g.options);
  const selected = allOpts.find(o => o.value === value);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow < 280 ? r.top - Math.min(280, allOpts.length * 44 + groups.length * 28) : r.bottom + 4;
    setPos({ top, left: r.left, width: r.width });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  return (
    <>
      <button ref={btnRef} type="button" onClick={openMenu}
        style={{
          width: '100%', padding: '12px 16px', border: `1.5px solid ${open ? C.primary : C.border}`,
          borderRadius: 10, fontSize: 15, background: '#fff', color: C.text,
          outline: 'none', boxSizing: 'border-box', cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: open ? `0 0 0 3px ${C.primary}22` : 'none',
        }}>
        <span>{selected?.label ?? '— Choose role —'}</span>
        <span style={{ color: C.muted, fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onMouseDown={() => setOpen(false)} />
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
            zIndex: 9999, background: '#fff', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.20)', border: `1px solid ${C.border}`,
            maxHeight: 320, overflowY: 'auto',
          }}>
            {groups.map((g, gi) => (
              <div key={gi}>
                <div style={{ padding: '6px 14px', fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, background: '#F9FAFB', borderBottom: `1px solid ${C.border}` }}>
                  {g.label}
                </div>
                {g.options.map((opt, oi) => (
                  <div key={opt.value}
                    onMouseDown={() => { onChange(opt.value); setOpen(false); }}
                    style={{
                      padding: '11px 14px', cursor: 'pointer', fontSize: 14,
                      background: opt.value === value ? C.primary + '10' : 'transparent',
                      color: opt.value === value ? C.primary : C.text,
                      fontWeight: opt.value === value ? 700 : 400,
                      borderBottom: oi < g.options.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                    {opt.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

const ROLE_GROUPS = [
  {
    label: 'Immediate Access',
    options: [
      { value: 'reporter', label: 'Community Reporter — submit cases' },
      { value: 'donor',    label: 'Donor / Sponsor — fund verified cases' },
    ],
  },
  {
    label: 'Requires Admin Approval',
    options: [
      { value: 'field_agent',         label: 'Field Agent — verify on the ground' },
      { value: 'verification_office', label: 'Verification Office — case review team' },
      { value: 'program_manager',     label: 'Program Manager — child programs' },
      { value: 'project_manager',     label: 'Project Manager — community projects' },
      { value: 'partner',             label: 'Partner Organisation' },
    ],
  },
];

export default function Login() {
  const { login, register, loading } = useAuth();
  const { t, lang, changeLang, LANGUAGES, currentLang } = useLang();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab,          setTab]         = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [error,        setError]       = useState('');
  const [rateLocked,   setRateLocked]  = useState(false);
  const [countdown,    setCountdown]   = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [form,         setForm]        = useState({ email:'', password:'', name:'', role:'reporter', country:'', city:'', phone:'' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handle = async (e) => {
    e.preventDefault();
    if (rateLocked) return;
    setError('');
    try {
      tab === 'login'
        ? await login(form.email, form.password)
        : await register({ name:form.name, email:form.email, password:form.password, country:form.country, city:form.city, phone:form.phone });
      nav('/dashboard');
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('too many') || msg.includes('429')) {
        setRateLocked(true);
        setCountdown(15 * 60); // 15 minutes
        setTimeout(() => setRateLocked(false), 15 * 60 * 1000);
        setError('rate_limited');
      } else {
        setError(msg);
      }
    }
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
      padding:'20px', position:'relative', overflow:'clip',
    }}>
      {/* Background orbs */}
      <div style={{ position:'absolute', top:-120, right:-120, width:400, height:400, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-80, left:-80, width:300, height:300, borderRadius:'50%', background:'rgba(224,171,33,0.07)', pointerEvents:'none' }} />

      <div style={{
        background:'#fff', borderRadius:24, width:'100%', maxWidth:440,
        boxShadow:'0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)',
        position:'relative', zIndex:1,
      }}>
        {/* Navy top bar */}
        <div style={{
          background:`linear-gradient(135deg, ${C.navy}, ${C.primary})`,
          padding:'28px 32px 24px',
          borderRadius:'24px 24px 0 0',
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
                {tb === 'login' ? `${t('signIn')}` : `${t('register')}`}
              </button>
            ))}
          </div>

          {error && error !== 'rate_limited' && (
            <div style={{ background:'#FEF2F2', border:`1px solid ${C.error}30`, color:C.error, padding:'11px 15px', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:600 }}>
              {error}
            </div>
          )}
          {error === 'rate_limited' && (
            <div style={{ background:'#FFF7ED', border:'1px solid #FCD34D', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:14, color:'#92400E', marginBottom:4 }}>Too Many Attempts</div>
              <div style={{ fontSize:13, color:'#92400E', lineHeight:1.5 }}>
                Login is temporarily locked due to too many failed attempts.
              </div>
              {countdown > 0 && (
                <div style={{ marginTop:10, background:'#FEF3C7', borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:900, color:'#D97706', fontVariantNumeric:'tabular-nums' }}>
                    {String(Math.floor(countdown / 60)).padStart(2,'0')}:{String(countdown % 60).padStart(2,'0')}
                  </div>
                  <div style={{ fontSize:11, color:'#92400E', marginTop:2 }}>minutes remaining</div>
                </div>
              )}
              <div style={{ fontSize:12, color:'#92400E', marginTop:8 }}>
                Contact your administrator if you need immediate access.
              </div>
            </div>
          )}

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {tab === 'register' && inp('name', t('fullName'))}
            {inp('email',    t('email'),    'email')}
            {inp('password', t('password'), 'password')}

            {tab === 'register' && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {inp('country', t('country'))}
                  {inp('city',    t('city'))}
                </div>
                {inp('phone', t('phone'))}
              </>
            )}

            <button type="submit" disabled={loading || rateLocked} className="kf-btn kf-btn-navy"
              style={{
                padding:'14px', border:'none', borderRadius:12,
                fontSize:15, fontWeight:700, marginTop:4,
                opacity: (loading || rateLocked) ? 0.6 : 1,
                cursor: (loading || rateLocked) ? 'not-allowed' : 'pointer',
              }}>
              {loading
                ? `${t('pleaseWait')}`
                : rateLocked
                  ? `Locked — ${String(Math.floor(countdown/60)).padStart(2,'0')}:${String(countdown%60).padStart(2,'0')}`
                  : tab === 'login'
                    ? `${t('signIn')}`
                    : `${t('createAccount')}`}
            </button>
          </form>

          {/* ── Quick demo logins ── */}
          {tab === 'login' && (
            <div style={{ marginTop:20, paddingTop:18, borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:10, textAlign:'center' }}>Quick Demo Access</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { icon:"", label:"Super Admin", email:"superadmin@kafaale.org", color:"#991B1B", bg:"#FEF2F2" },
                  { icon:"🟠", label:"Admin",        email:"admin@kafaale.org",      color:"#92400E", bg:"#FFFBEB" },
                  { icon:"", label:"Verifier",    email:"verifier@kafaale.org",   color:"#1E40AF", bg:"#EFF6FF" },
                  { icon:"", label:"Field Agent",  email:"agent@kafaale.org",      color:"#5B21B6", bg:"#F5F3FF" },
                  { icon:"", label:"Donor",        email:"donor@kafaale.org",      color:"#9D174D", bg:"#FDF2F8" },
                  { icon:"", label:"Reporter",     email:"reporter@kafaale.org",   color:"#065F46", bg:"#ECFDF5" },
                ].map(d => (
                  <button key={d.email} type="button"
                    onClick={() => { setForm(f => ({ ...f, email:d.email, password:'Kafaale123!' })); }}
                    style={{
                      padding:'7px 10px', borderRadius:9, border:`1px solid ${d.color}30`,
                      background:d.bg, cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                      fontSize:11, fontWeight:700, color:d.color, textAlign:'left',
                    }}>
                    <span style={{ fontSize:14 }}>{d.icon}</span>{d.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:10, color:C.muted, textAlign:'center', marginTop:8 }}>Password: <strong>Kafaale123!</strong> · Click a role to fill credentials</div>
            </div>
          )}

          <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:C.muted }}>
            <Link to="/" style={{ color:C.primary, fontWeight:600, textDecoration:'none' }}>← {t('backToHome')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
