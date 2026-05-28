import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { useResponsive } from "../hooks/useResponsive.js";
import Logo from "./Logo.jsx";

// ── Brand colors from logo ─────────────────────────────────────────────
const B = {
  navy:   "#002651",
  blue:   "#004B96",
  green:  "#4B7D19",
  gold:   "#E0AB21",
  bg:     "#F4F7FC",
  border: "#D8E4F0",
  text:   "#0D1F3C",
  muted:  "#5A6E8A",
};

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const { t, lang, changeLang, LANGUAGES, currentLang } = useLang();

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropOpen,     setDropOpen]     = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const { isMobile } = useResponsive();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/",            label: t("navHome")           },
    { to: "/about",       label: t("navAbout")          },
    { to: "/how-it-works",label: t("navHowItWorks")     },
    { to: "/cases",       label: `🌍 ${t("navCases")}`  },
    { to: "/donate",      label: `❤️ ${t("navDonate")}` },
    { to: "/contact",     label: t("navContact")        },
    { to: "/partners",   label: `🤝 Partners`          },
  ];

  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  const closeAll = () => { setMenuOpen(false); setDropOpen(false); setLangMenuOpen(false); };

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 500,
        background: "#fff",
        borderBottom: scrolled ? `1px solid ${B.border}` : `2px solid ${B.border}`,
        boxShadow: scrolled ? `0 4px 28px rgba(0,38,81,0.13)` : `0 1px 4px rgba(0,38,81,0.06)`,
        transition: "box-shadow 0.25s ease, border 0.25s ease",
      }}>
        <div style={{
          maxWidth: 1340, margin: "0 auto", padding: "0 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: isMobile ? 72 : 96,
        }}>

          {/* ── Logo ── */}
          <div onClick={closeAll} style={{ flexShrink: 0 }}>
            <Logo size={isMobile ? "sm" : "md"} />
          </div>

          {/* ── Desktop nav links ── */}
          <div className="nav-desktop" style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} style={{
                textDecoration: "none",
                padding: "8px 13px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color:      isActive(l.to) ? B.blue   : B.muted,
                background: isActive(l.to) ? B.blue + "12" : "transparent",
                borderBottom: isActive(l.to) ? `2px solid ${B.blue}` : "2px solid transparent",
                transition: "all .15s",
                whiteSpace: "nowrap",
              }}>{l.label}</Link>
            ))}
          </div>

          {/* ── Right: Lang + Auth + Hamburger ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

            {/* Language switcher */}
            <div style={{ position: "relative" }}>
              <button onClick={() => { setLangMenuOpen(v => !v); setDropOpen(false); }}
                style={{
                  background: B.blue + "10", border: `1px solid ${B.blue}30`,
                  borderRadius: 8, padding: "7px 11px", cursor: "pointer",
                  fontSize: 14, display: "flex", alignItems: "center", gap: 5,
                  fontWeight: 700, color: B.blue,
                }}>
                {currentLang.flag}
                <span style={{ fontSize: 11 }}>{currentLang.code.toUpperCase()}</span>
                <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {langMenuOpen && (
                <div style={{
                  position: "absolute", right: 0, top: 46,
                  background: "#fff", borderRadius: 12,
                  boxShadow: `0 8px 32px rgba(0,38,81,0.18)`,
                  zIndex: 600, minWidth: 170,
                  border: `1px solid ${B.border}`, overflow: "hidden",
                }}>
                  {LANGUAGES.map(l => (
                    <div key={l.code} onClick={() => { changeLang(l.code); setLangMenuOpen(false); }}
                      style={{
                        padding: "11px 16px", fontSize: 13, cursor: "pointer",
                        background: lang === l.code ? B.blue + "10" : "#fff",
                        fontWeight: lang === l.code ? 700 : 400,
                        display: "flex", alignItems: "center", gap: 10,
                        color: B.text, borderBottom: `1px solid ${B.border}`,
                      }}>
                      <span style={{ fontSize: 18 }}>{l.flag}</span>
                      <span>{l.label}</span>
                      {lang === l.code && <span style={{ marginLeft: "auto", color: B.green, fontWeight: 800 }}>✓</span>}
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
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 14px",
                      background: B.blue + "10", border: `1px solid ${B.blue}30`,
                      borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: B.blue,
                    }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${B.blue}, ${B.green})`,
                      color: "#fff", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 13, fontWeight: 900,
                    }}>
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </span>
                    <span>{user.name?.split(" ")[0]}</span>
                    <span style={{ fontSize: 9 }}>▾</span>
                  </button>
                  {dropOpen && (
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 8px)",
                      background: "#fff", borderRadius: 14,
                      boxShadow: `0 8px 36px rgba(0,38,81,0.18)`,
                      padding: 8, minWidth: 210, zIndex: 600,
                      border: `1px solid ${B.border}`,
                    }}>
                      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${B.border}`, marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: B.navy }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: B.green, fontWeight: 600, textTransform: "capitalize" }}>{user.role?.replace(/_/g," ")}</div>
                        <div style={{ fontSize: 11, color: B.muted }}>{user.email}</div>
                      </div>
                      <button onClick={() => { navigate("/dashboard"); setDropOpen(false); }}
                        style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: 8, fontSize: 14, fontWeight: 600, color: B.blue }}>
                        📊 {t("dashboard")}
                      </button>
                      <button onClick={() => { logout(); navigate("/"); setDropOpen(false); }}
                        style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: 8, fontSize: 14, color: "#C0392B" }}>
                        🚪 {t("signOut")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Link to="/login" style={{
                    padding: "8px 16px", border: `1.5px solid ${B.blue}`,
                    color: B.blue, borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none",
                  }}>{t("signIn")}</Link>
                  <Link to="/login" style={{
                    padding: "8px 18px",
                    background: `linear-gradient(135deg, ${B.blue}, ${B.navy})`,
                    color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 800, textDecoration: "none",
                    boxShadow: `0 3px 10px ${B.blue}40`,
                  }}>{t("register")}</Link>
                </div>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button className="nav-hamburger"
              onClick={() => { setMenuOpen(v => !v); setDropOpen(false); setLangMenuOpen(false); }}
              style={{
                background: menuOpen ? B.blue + "10" : "none",
                border: `1px solid ${menuOpen ? B.blue + "30" : "transparent"}`,
                borderRadius: 8, cursor: "pointer", padding: "7px",
                display: "flex", flexDirection: "column", gap: 5,
                alignItems: "center", justifyContent: "center",
              }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  display: "block", width: 22, height: 2.5,
                  background: B.blue, borderRadius: 2, transition: "all .2s",
                  transform: menuOpen
                    ? i === 0 ? "rotate(45deg) translateY(7.5px)"
                    : i === 2 ? "rotate(-45deg) translateY(-7.5px)" : ""
                    : "none",
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }} />
              ))}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {menuOpen && (
          <div style={{ background: "#fff", borderTop: `2px solid ${B.border}`, padding: "12px 20px 24px" }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={closeAll} style={{
                display: "block", padding: "13px 16px", borderRadius: 10,
                fontSize: 15, fontWeight: 600, textDecoration: "none", marginBottom: 4,
                color:      isActive(l.to) ? B.blue : B.text,
                background: isActive(l.to) ? B.blue + "10" : "transparent",
                borderLeft: isActive(l.to) ? `3px solid ${B.blue}` : "3px solid transparent",
              }}>{l.label}</Link>
            ))}
            <div style={{ borderTop: `1px solid ${B.border}`, marginTop: 12, paddingTop: 14 }}>
              {user ? (
                <>
                  <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${B.blue}, ${B.green})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 16, fontWeight: 900, flexShrink: 0,
                    }}>{user.name?.[0]?.toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: B.navy }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: B.green, fontWeight: 600, textTransform: "capitalize" }}>{user.role?.replace(/_/g," ")}</div>
                    </div>
                  </div>
                  <button onClick={() => { navigate("/dashboard"); closeAll(); }}
                    style={{ width: "100%", padding: "13px 16px", background: B.blue + "10", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", color: B.blue, textAlign: "left", marginBottom: 8 }}>
                    📊 {t("dashboard")}
                  </button>
                  <button onClick={() => { logout(); navigate("/"); closeAll(); }}
                    style={{ width: "100%", padding: "13px 16px", background: "#FEF2F2", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#C0392B", textAlign: "left" }}>
                    🚪 {t("signOut")}
                  </button>
                </>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Link to="/login" onClick={closeAll} style={{
                    padding: "13px", border: `1.5px solid ${B.blue}`,
                    color: B.blue, borderRadius: 10, fontSize: 14, fontWeight: 700,
                    textDecoration: "none", textAlign: "center",
                  }}>{t("signIn")}</Link>
                  <Link to="/login" onClick={closeAll} style={{
                    padding: "13px",
                    background: `linear-gradient(135deg, ${B.blue}, ${B.navy})`,
                    color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 800,
                    textDecoration: "none", textAlign: "center",
                  }}>{t("register")}</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Close overlay */}
      {(langMenuOpen || dropOpen) && (
        <div onClick={closeAll} style={{ position: "fixed", inset: 0, zIndex: 490 }} />
      )}

      <style>{`
        .nav-desktop { display: flex !important; }
        .nav-hamburger { display: none !important; }
        @media (max-width: 768px) {
          .nav-desktop  { display: none !important; }
          .nav-hamburger{ display: flex !important; }
        }
      `}</style>
    </>
  );
}
