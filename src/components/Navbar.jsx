import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";

const C = { primary: "#0B3D91", secondary: "#1A6B3C", accent: "#E8A020" };

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const { t, lang, changeLang, LANGUAGES, currentLang } = useLang();

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropOpen,     setDropOpen]     = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const links = [
    { to: "/",            label: t("navHome")         },
    { to: "/about",       label: t("navAbout")        },
    { to: "/how-it-works",label: t("navHowItWorks")   },
    { to: "/cases",       label: `🌍 ${t("navCases")}` },
    { to: "/donate",      label: `💳 ${t("navDonate")}` },
    { to: "/contact",     label: t("navContact")      },
  ];

  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const closeAll = () => { setMenuOpen(false); setDropOpen(false); setLangMenuOpen(false); };

  return (
    <>
      <nav style={{ position: "sticky", top: 0, zIndex: 500, background: "#fff", boxShadow: "0 2px 16px rgba(11,61,145,.12)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>

          {/* Logo */}
          <Link to="/" onClick={closeAll} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 26 }}>🤝</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.primary, letterSpacing: -0.5 }}>KAFAALE QAAD</div>
              <div style={{ fontSize: 8, color: C.secondary, fontWeight: 700, letterSpacing: 1.2, display: "none" }} className="nav-tagline">HUMANITARIAN AID</div>
            </div>
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <div className="nav-desktop" style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} style={{
                textDecoration: "none", padding: "7px 11px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                color: isActive(l.to) ? C.primary : "#374151",
                background: isActive(l.to) ? C.primary + "12" : "transparent",
                whiteSpace: "nowrap",
              }}>{l.label}</Link>
            ))}
          </div>

          {/* Right side: Lang + Auth + Hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

            {/* 🌍 Language switcher — always visible */}
            <div style={{ position: "relative" }}>
              <button onClick={() => { setLangMenuOpen(v => !v); setDropOpen(false); }}
                style={{ background: C.primary + "10", border: `1px solid ${C.primary}25`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 4, fontWeight: 600, color: C.primary }}>
                {currentLang.flag}
                <span style={{ fontSize: 11 }}>{currentLang.code.toUpperCase()}</span>
                <span style={{ fontSize: 10 }}>▾</span>
              </button>
              {langMenuOpen && (
                <div style={{ position: "absolute", right: 0, top: 44, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px #0003", zIndex: 600, minWidth: 165, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                  {LANGUAGES.map(l => (
                    <div key={l.code} onClick={() => { changeLang(l.code); setLangMenuOpen(false); }}
                      style={{ padding: "11px 16px", fontSize: 13, cursor: "pointer", background: lang === l.code ? C.primary + "10" : "#fff", fontWeight: lang === l.code ? 700 : 400, display: "flex", alignItems: "center", gap: 10, color: "#1A202C", borderBottom: "1px solid #F3F4F6" }}>
                      <span style={{ fontSize: 18 }}>{l.flag}</span>
                      <span>{l.label}</span>
                      {lang === l.code && <span style={{ marginLeft: "auto", color: C.primary }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auth — desktop only */}
            <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {user ? (
                <div style={{ position: "relative" }}>
                  <button onClick={() => { setDropOpen(!dropOpen); setLangMenuOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.primary + "12", border: `1px solid ${C.primary}30`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.primary }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </span>
                    <span>{user.name?.split(" ")[0]}</span>
                    <span style={{ fontSize: 10 }}>▾</span>
                  </button>
                  {dropOpen && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", padding: 8, minWidth: 200, zIndex: 600 }}>
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0f0f0", marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>{user.role?.replace(/_/g," ")}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{user.email}</div>
                      </div>
                      <button onClick={() => { navigate("/dashboard"); setDropOpen(false); }}
                        style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: 8, fontSize: 14, fontWeight: 600, color: C.primary }}>
                        📊 {t("dashboard")}
                      </button>
                      <button onClick={() => { logout(); navigate("/"); setDropOpen(false); }}
                        style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: 8, fontSize: 14, color: "#EF4444" }}>
                        🚪 {t("signOut")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <Link to="/login" style={{ padding: "7px 14px", border: `1px solid ${C.primary}`, color: C.primary, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>{t("signIn")}</Link>
                  <Link to="/login" style={{ padding: "7px 14px", background: C.primary, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{t("register")}</Link>
                </div>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button className="nav-hamburger"
              onClick={() => { setMenuOpen(v => !v); setDropOpen(false); setLangMenuOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center" }}>
              <span style={{ display: "block", width: 22, height: 2.5, background: menuOpen ? C.primary : "#374151", borderRadius: 2, transition: "all .2s", transform: menuOpen ? "rotate(45deg) translateY(7.5px)" : "none" }} />
              <span style={{ display: "block", width: 22, height: 2.5, background: C.primary, borderRadius: 2, transition: "all .2s", opacity: menuOpen ? 0 : 1 }} />
              <span style={{ display: "block", width: 22, height: 2.5, background: menuOpen ? C.primary : "#374151", borderRadius: 2, transition: "all .2s", transform: menuOpen ? "rotate(-45deg) translateY(-7.5px)" : "none" }} />
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div style={{ background: "#fff", borderTop: "1px solid #E2E8F0", padding: "12px 16px 20px" }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={closeAll}
                style={{ display: "block", padding: "13px 16px", borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: "none", marginBottom: 4, color: isActive(l.to) ? C.primary : "#374151", background: isActive(l.to) ? C.primary + "10" : "transparent" }}>
                {l.label}
              </Link>
            ))}
            <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 8, paddingTop: 12 }}>
              {user ? (
                <>
                  <div style={{ padding: "8px 16px", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{user.role?.replace(/_/g," ")}</div>
                  </div>
                  <button onClick={() => { navigate("/dashboard"); closeAll(); }}
                    style={{ width: "100%", padding: "13px 16px", background: C.primary + "10", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", color: C.primary, textAlign: "left", marginBottom: 4 }}>
                    📊 {t("dashboard")}
                  </button>
                  <button onClick={() => { logout(); navigate("/"); closeAll(); }}
                    style={{ width: "100%", padding: "13px 16px", background: "#FEF2F2", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#EF4444", textAlign: "left" }}>
                    🚪 {t("signOut")}
                  </button>
                </>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Link to="/login" onClick={closeAll} style={{ padding: "13px", border: `1.5px solid ${C.primary}`, color: C.primary, borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>{t("signIn")}</Link>
                  <Link to="/login" onClick={closeAll} style={{ padding: "13px", background: C.primary, color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>{t("register")}</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Overlay — close menus when tapping outside */}
      {(langMenuOpen || dropOpen) && (
        <div onClick={closeAll} style={{ position: "fixed", inset: 0, zIndex: 490 }} />
      )}

      {/* Responsive CSS */}
      <style>{`
        .nav-desktop { display: flex !important; }
        .nav-hamburger { display: none !important; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
