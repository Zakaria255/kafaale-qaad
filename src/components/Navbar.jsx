import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { useResponsive } from "../hooks/useResponsive.js";
import Logo from "./Logo.jsx";

const B = {
  navy:   "#002651", blue:   "#004B96", green:  "#4B7D19",
  gold:   "#E0AB21", bg:     "#F4F7FC", border: "#D8E4F0",
  text:   "#0D1F3C", muted:  "#5A6E8A",
};

// All navigable pages with their default visibility state
const ALL_PAGES = {
  about:        true,
  howItWorks:   true,
  cases:        true,
  programs:     true,
  projects:     true,
  donate:       true,
  partners:     true,
  stories:      true,
  volunteer:    true,
  faq:          true,
  transparency: true,
  updates:      true,
  contact:      true,
};

function loadPageSettings() {
  try { return { ...ALL_PAGES, ...JSON.parse(localStorage.getItem("kf_page_settings") || "{}") }; }
  catch { return { ...ALL_PAGES }; }
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, lang, changeLang, LANGUAGES, currentLang } = useLang();

  const [openDrop,     setOpenDrop]     = useState(null);   // "about"|"ops"|"give"|"more"|"user"|"lang"|null
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [pageVis,      setPageVis]      = useState(loadPageSettings);
  const { isMobile } = useResponsive();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Re-read visibility when localStorage changes (admin toggles a page)
  useEffect(() => {
    const onStorage = () => setPageVis(loadPageSettings());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const show = (key) => pageVis[key] !== false;

  // ── Nav structure ──────────────────────────────────────────────────────────
  const NAV = [
    {
      id: "about", label: "About",
      items: [
        show("about")      && { to: "/about",        label: "About Us",    icon: "🏛️", desc: "Our mission, team & values" },
        show("howItWorks") && { to: "/how-it-works",  label: "How We Work", icon: "⚙️", desc: "The 11-step verification pipeline" },
      ].filter(Boolean),
    },
    {
      id: "ops", label: "Operations",
      items: [
        show("cases")    && { to: "/cases",    label: "Cases",    icon: "📋", desc: "Verified emergency cases" },
        show("programs") && { to: "/programs", label: "Programs", icon: "🌱", desc: "Group sponsorship programs" },
        show("projects") && { to: "/projects", label: "Projects", icon: "🏗️", desc: "Community infrastructure" },
      ].filter(Boolean),
    },
    {
      id: "give", label: "Give",
      items: [
        show("donate")   && { to: "/donate",   label: "Donate",   icon: "❤️", desc: "Sponsor a case directly" },
        show("partners") && { to: "/partners", label: "Partners", icon: "🌐", desc: "Join as an NGO partner" },
      ].filter(Boolean),
    },
    {
      id: "more", label: "More",
      items: [
        show("stories")      && { to: "/stories",      label: "Stories",      icon: "📰", desc: "Impact & success stories" },
        show("volunteer")    && { to: "/volunteer",     label: "Volunteer",    icon: "🤝", desc: "Join our field team" },
        show("faq")          && { to: "/faq",           label: "FAQ",          icon: "❓", desc: "Frequently asked questions" },
        show("transparency") && { to: "/transparency",  label: "Transparency", icon: "📊", desc: "Financial reports" },
        show("updates")      && { to: "/updates",        label: "Updates",      icon: "🚨", desc: "Field updates & emergency alerts" },
                                 { to: "/media",          label: "Media",        icon: "📱", desc: "Photos, videos & community posts" },
      ].filter(Boolean),
    },
    show("contact") && { id: "contact", label: "Contact", to: "/contact", direct: true },
  ].filter(Boolean).filter(item => !item.items || item.items.length > 0);

  // Mobile flat list
  const mobileLinks = [
    { to: "/",             label: "Home"         },
    show("about")      && { to: "/about",        label: "About Us"    },
    show("howItWorks") && { to: "/how-it-works",  label: "How We Work" },
    show("cases")      && { to: "/cases",         label: "Cases"       },
    show("programs")   && { to: "/programs",      label: "Programs"    },
    show("projects")   && { to: "/projects",      label: "Projects"    },
    show("donate")     && { to: "/donate",        label: "Donate"      },
    show("partners")   && { to: "/partners",      label: "Partners"    },
    show("stories")    && { to: "/stories",       label: "Stories"     },
    show("volunteer")  && { to: "/volunteer",     label: "Volunteer"   },
    show("faq")        && { to: "/faq",           label: "FAQ"         },
    show("transparency")&& { to: "/transparency", label: "Transparency"},
    show("updates")    && { to: "/updates",       label: "Updates"     },
                          { to: "/media",         label: "Media"       },
    show("contact")    && { to: "/contact",       label: "Contact"     },
  ].filter(Boolean);

  const isActive    = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  const groupActive = (items) => items?.some(i => i.to && isActive(i.to));
  const closeAll    = () => { setOpenDrop(null); setMenuOpen(false); };
  const toggle      = (id) => { setOpenDrop(v => v === id ? null : id); setMenuOpen(false); };

  // Hover helpers — small delay so moving from button to panel doesn't flicker
  const hoverTimers = {};
  const hoverOpen  = (id) => {
    clearTimeout(hoverTimers[id]);
    setOpenDrop(id);
  };
  const hoverClose = (id) => {
    hoverTimers[id] = setTimeout(() => setOpenDrop(v => v === id ? null : v), 120);
  };

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 500,
        background: "#fff",
        borderBottom: scrolled ? `1px solid ${B.border}` : `2px solid ${B.border}`,
        boxShadow: scrolled ? "0 4px 28px rgba(0,38,81,0.13)" : "0 1px 4px rgba(0,38,81,0.06)",
        transition: "box-shadow 0.25s, border 0.25s",
      }}>
        <div style={{
          maxWidth: 1340, margin: "0 auto", padding: "0 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: isMobile ? 72 : 88,
        }}>

          {/* Logo */}
          <div onClick={closeAll} style={{ flexShrink: 0 }}>
            <Logo size={isMobile ? "sm" : "md"} />
          </div>

          {/* Desktop nav */}
          <div className="nav-desktop" style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {NAV.map(item => {
              if (item.direct) {
                return (
                  <Link key={item.id} to={item.to} onClick={closeAll} style={{
                    textDecoration: "none", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    color:        isActive(item.to) ? B.blue : B.muted,
                    background:   isActive(item.to) ? B.blue + "12" : "transparent",
                    borderBottom: isActive(item.to) ? `2px solid ${B.blue}` : "2px solid transparent",
                    transition: "all .15s", whiteSpace: "nowrap",
                  }}>{item.label}</Link>
                );
              }
              const active = groupActive(item.items);
              const isOpen = openDrop === item.id;
              return (
                <div key={item.id} style={{ position: "relative" }}
                  onMouseEnter={() => hoverOpen(item.id)}
                  onMouseLeave={() => hoverClose(item.id)}
                >
                  <button style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: "none", cursor: "pointer", whiteSpace: "nowrap",
                    color:        active ? B.blue : B.muted,
                    background:   active ? B.blue + "12" : "transparent",
                    borderBottom: active ? `2px solid ${B.blue}` : "2px solid transparent",
                    transition: "all .15s",
                  }}>
                    {item.label}
                    <span style={{ fontSize: 9, transition: "transform .2s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                  </button>
                  {isOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 2px)",
                      left: item.id === "more" ? "auto" : "50%",
                      right: item.id === "more" ? 0 : "auto",
                      transform: item.id === "more" ? "none" : "translateX(-50%)",
                      background: "#fff", borderRadius: 14,
                      boxShadow: "0 8px 40px rgba(0,38,81,0.16)",
                      zIndex: 600, minWidth: 210,
                      border: `1px solid ${B.border}`, overflow: "hidden",
                      paddingTop: 4, paddingBottom: 4,
                    }}>
                      {item.items.map((sub, si) => (
                        <Link key={sub.to} to={sub.to} onClick={closeAll} style={{
                          display: "block", padding: "11px 18px",
                          textDecoration: "none",
                          color: isActive(sub.to) ? B.blue : B.text,
                          background: isActive(sub.to) ? B.blue + "08" : "transparent",
                          borderBottom: si < item.items.length - 1 ? `1px solid ${B.border}` : "none",
                          transition: "background .12s",
                          fontSize: 13, fontWeight: isActive(sub.to) ? 700 : 600,
                        }}
                          onMouseOver={e => { if (!isActive(sub.to)) e.currentTarget.style.background = B.bg; }}
                          onMouseOut={e  => { if (!isActive(sub.to)) e.currentTarget.style.background = "transparent"; }}
                        >
                          {sub.label}
                          {sub.desc && <div style={{ fontSize: 11, color: B.muted, marginTop: 2, fontWeight: 400 }}>{sub.desc}</div>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Donate CTA always visible */}
            {show("donate") && (
              <Link to="/donate" onClick={closeAll} style={{
                marginLeft: 6, textDecoration: "none", padding: "9px 20px", borderRadius: 10,
                fontSize: 13, fontWeight: 800,
                background: `linear-gradient(135deg, ${B.gold}, #C8961C)`,
                color: "#fff", whiteSpace: "nowrap",
                boxShadow: `0 3px 10px ${B.gold}50`,
              }}>Donate Now</Link>
            )}
          </div>

          {/* Right: Lang + Auth + Hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

            {/* Language switcher */}
            <div style={{ position: "relative" }}>
              <button onClick={() => toggle("lang")} style={{
                background: B.blue + "10", border: `1px solid ${B.blue}30`,
                borderRadius: 8, padding: "7px 11px", cursor: "pointer",
                fontSize: 14, display: "flex", alignItems: "center", gap: 5,
                fontWeight: 700, color: B.blue,
              }}>
                {currentLang.flag}
                <span style={{ fontSize: 11 }}>{currentLang.code.toUpperCase()}</span>
                <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {openDrop === "lang" && (
                <div style={{
                  position: "absolute", right: 0, top: 46,
                  background: "#fff", borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(0,38,81,0.18)",
                  zIndex: 600, minWidth: 170,
                  border: `1px solid ${B.border}`, overflow: "hidden",
                }}>
                  {LANGUAGES.map(l => (
                    <div key={l.code} onClick={() => { changeLang(l.code); setOpenDrop(null); }}
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
                  <button onClick={() => toggle("user")} style={{
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
                  {openDrop === "user" && (
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 8px)",
                      background: "#fff", borderRadius: 14,
                      boxShadow: "0 8px 36px rgba(0,38,81,0.18)",
                      padding: 8, minWidth: 210, zIndex: 600,
                      border: `1px solid ${B.border}`,
                    }}>
                      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${B.border}`, marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: B.navy }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: B.green, fontWeight: 600, textTransform: "capitalize" }}>{user.role?.replace(/_/g, " ")}</div>
                        <div style={{ fontSize: 11, color: B.muted }}>{user.email}</div>
                      </div>
                      <button onClick={() => { navigate("/dashboard"); setOpenDrop(null); }}
                        style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: 8, fontSize: 14, fontWeight: 600, color: B.blue }}>
                        📊 {t("dashboard")}
                      </button>
                      {(user.role === "super_admin" || user.role === "admin") && (
                        <button onClick={() => { navigate("/dashboard?tab=settings"); setOpenDrop(null); }}
                          style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: 8, fontSize: 14, fontWeight: 600, color: B.muted }}>
                          ⚙️ Site Settings
                        </button>
                      )}
                      <button onClick={() => { logout(); navigate("/"); setOpenDrop(null); }}
                        style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: 8, fontSize: 14, color: "#C0392B" }}>
                        🚪 {t("signOut")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" style={{
                  padding: "9px 22px",
                  background: `linear-gradient(135deg, ${B.blue}, ${B.navy})`,
                  color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 800, textDecoration: "none",
                  boxShadow: `0 3px 10px ${B.blue}40`,
                }}>Sign In</Link>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button className="nav-hamburger"
              onClick={() => { setMenuOpen(v => !v); setOpenDrop(null); }}
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

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: "#fff", borderTop: `2px solid ${B.border}`, padding: "12px 20px 24px", maxHeight: "80vh", overflowY: "auto" }}>
            {mobileLinks.map(l => (
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
                      <div style={{ fontSize: 12, color: B.green, fontWeight: 600, textTransform: "capitalize" }}>{user.role?.replace(/_/g, " ")}</div>
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
                  <Link to="/login?tab=register" onClick={closeAll} style={{
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
      {(openDrop || menuOpen) && (
        <div onClick={closeAll} style={{ position: "fixed", inset: 0, zIndex: 490 }} />
      )}

      <style>{`
        .nav-desktop { display: flex !important; }
        .nav-hamburger { display: none !important; }
        @media (max-width: 900px) {
          .nav-desktop  { display: none !important; }
          .nav-hamburger{ display: flex !important; }
        }
      `}</style>
    </>
  );
}
