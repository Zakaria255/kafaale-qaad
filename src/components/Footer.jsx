import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";
import { useResponsive } from "../hooks/useResponsive.js";

const B = {
  navy:   "#002651",
  blue:   "#004B96",
  green:  "#4B7D19",
  gold:   "#E0AB21",
  border: "#D8E4F0",
};

export default function Footer() {
  const { lang } = useLang();
  const P = PT.footer[lang] || PT.footer.en;
  const { isMobile, isTablet } = useResponsive();
  const [logoHover, setLogoHover] = useState(false);

  const gridCols = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "2fr 1fr 1fr 1fr";

  return (
    <footer style={{
      background: `linear-gradient(180deg, ${B.navy} 0%, #001A40 100%)`,
      color: "#fff",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      marginTop: 80,
    }}>
      {/* Gold top accent line */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${B.blue}, ${B.green}, ${B.gold})` }} />

      <div style={{ maxWidth: 1340, margin: "0 auto", padding: isMobile ? "48px 20px 0" : "64px 32px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: isMobile ? 36 : 52, marginBottom: 52 }}>

          {/* ── Brand ── */}
          <div>
            <div style={{ marginBottom: 22 }}>
              <Logo size="lg" />
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.8, opacity: 0.65, maxWidth: 280, marginTop: 4 }}>{P.tagline}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {[
                { icon: "📘", label: "Facebook" },
                { icon: "🐦", label: "Twitter" },
                { icon: "💼", label: "LinkedIn" },
              ].map(s => (
                <span key={s.label} style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, padding: "6px 12px", fontSize: 12,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                }}>
                  {s.icon} {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Quick Links ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: B.gold, letterSpacing: 2, marginBottom: 18, textTransform: "uppercase" }}>
              {P.platform}
            </div>
            {[
              [P.link_home,   "/"],
              [P.link_about,  "/about"],
              [P.link_how,    "/how-it-works"],
              [P.link_cases,  "/cases"],
              [P.link_donate, "/donate"],
              ["🤝 Partners",  "/partners"],
            ].map(([label, to]) => (
              <div key={to} style={{ marginBottom: 12 }}>
                <Link to={to} style={{
                  color: "rgba(255,255,255,0.7)", textDecoration: "none",
                  fontSize: 14, transition: "color .15s",
                  display: "flex", alignItems: "center", gap: 6,
                }}
                  onMouseOver={e => e.currentTarget.style.color = B.gold}
                  onMouseOut={e  => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
                >
                  <span style={{ color: B.green, fontSize: 10 }}>▶</span> {label}
                </Link>
              </div>
            ))}
          </div>

          {/* ── Roles ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: B.gold, letterSpacing: 2, marginBottom: 18, textTransform: "uppercase" }}>
              {P.roles}
            </div>
            {[
              lang==="so"?"👁️ Warbixiye"      : lang==="ar"?"👁️ مراسل"       : lang==="tr"?"👁️ Muhabir"     : lang==="es"?"👁️ Reportero"    : lang==="fr"?"👁️ Rapporteur"   : "👁️ Reporter",
              lang==="so"?"🏛️ Xaqiijinta"     : lang==="ar"?"🏛️ التحقق"      : lang==="tr"?"🏛️ Doğrulama"   : lang==="es"?"🏛️ Verificación"  : lang==="fr"?"🏛️ Vérification"  : "🏛️ Verification",
              lang==="so"?"🗺️ Kooxda Goobta"  : lang==="ar"?"🗺️ الفريق الميداني": lang==="tr"?"🗺️ Saha Ekibi": lang==="es"?"🗺️ Equipo de Campo": lang==="fr"?"🗺️ Équipe Terrain" : "🗺️ Field Team",
              lang==="so"?"❤️ Deeq-bixiye"    : lang==="ar"?"❤️ متبرع"        : lang==="tr"?"❤️ Bağışçı"     : lang==="es"?"❤️ Donante"       : lang==="fr"?"❤️ Donateur"      : "❤️ Donor",
              lang==="so"?"🛡️ Maamulaha Sare" : lang==="ar"?"🛡️ المدير العام" : lang==="tr"?"🛡️ Süper Admin" : lang==="es"?"🛡️ Super Admin"   : lang==="fr"?"🛡️ Super Admin"   : "🛡️ Super Admin",
            ].map(r => (
              <div key={r} style={{ marginBottom: 10, fontSize: 14, opacity: 0.7, display: "flex", alignItems: "center", gap: 6 }}>
                {r}
              </div>
            ))}
          </div>

          {/* ── Contact ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: B.gold, letterSpacing: 2, marginBottom: 18, textTransform: "uppercase" }}>
              {P.contact}
            </div>
            <div style={{ fontSize: 14, lineHeight: 2.4 }}>
              {[
                ["📧", "support@kafaale.so"],
                ["📞", "+252 611 000 000"],
                ["📍", "Mogadishu, Somalia"],
                ["🌐", "kafaale.so"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.75 }}>
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Quick CTA */}
            <Link to="/donate" style={{
              display: "inline-block", marginTop: 20,
              padding: "10px 20px",
              background: `linear-gradient(135deg, ${B.gold}, #B8861A)`,
              color: "#fff", borderRadius: 10, textDecoration: "none",
              fontSize: 13, fontWeight: 800,
              boxShadow: `0 4px 16px ${B.gold}40`,
            }}>
              ❤️ Sponsor a Case
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "22px 0",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 10 : 0,
          fontSize: 12,
        }}>
          <span style={{ opacity: 0.45 }}>{P.copyright}</span>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: 0.45 }}>
            <span>🔐 OTP Auth</span>
            <span>·</span>
            <span>😶 Face Verify</span>
            <span>·</span>
            <span>💳 PCI DSS Level 1</span>
            <span>·</span>
            <span>🤖 AI Fraud Detection</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
