import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FilePen, SearchCheck, ClipboardCheck, HeartHandshake, PackageCheck } from "lucide-react";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";
import { BRAND } from "../brand.js";
import { useResponsive } from "../hooks/useResponsive.js";
import { HowItWorks, SectionHeader } from "../ui/index.js";

// Enterprise design system — single source of colour truth.
const C = BRAND;

// Urgency palette (kept on-page so workflow/queue references stay consistent).
const URGENCY_COLOR = {
  critical: "#C0392B",
  high:     "#FAA528",
  medium:   "#F59E0B",
  low:      "#10B981",
};

// The complete verification workflow (merges the old "How It Works" page).
const WORKFLOW = [
  { label: "Report Creation",     who: "Reporter",
    detail: "A reporter submits a case via web or mobile with full details, photos, and GPS location.",
    actions: ["Open the report form (web or mobile)", "Enter victim/community details and needs", "Attach photos and pin the location", "Submit for office review"] },
  { label: "Verification Office", who: "Verification Officer",
    detail: "An officer reviews the submission, runs AI duplicate checks, then approves or rejects it.",
    actions: ["Review reported details and media", "Run AI duplicate & fraud screening", "Request more info if needed", "Approve and assign a field team"] },
  { label: "Field Investigation", who: "Field Team",
    detail: "The field team travels to the location, verifies the situation physically, and uploads proof.",
    actions: ["Travel to the GPS location", "Verify the person and situation on site", "Capture GPS-tagged photo evidence", "Upload written findings + proof"] },
  { label: "Verified",            who: "Verification Officer",
    detail: "Officers confirm the field evidence, mark the case verified, and make it visible to donors.",
    actions: ["Cross-check field evidence", "Confirm victim & situation accuracy", "Mark the case verified", "Publish to the donor portal"] },
  { label: "Donor Queue",         who: "Donors",
    detail: "Verified cases appear in the donor dashboard, filterable by urgency, location, and type.",
    actions: ["Browse verified cases", "Filter by urgency / region / category", "Review case story and goal", "Choose a case to sponsor"] },
  { label: "Sponsorship",         who: "Donor",
    detail: "A donor selects a case and pays securely via Stripe, PayPal, Bank Transfer, or Ama Gateway.",
    actions: ["Select full, partial, or custom amount", "Pay via Stripe / PayPal / Bank / Ama", "Funds are held in secure escrow", "Receive a confirmation + tax receipt"] },
  { label: "Aid Delivery",        who: "Field Team",
    detail: "The field team delivers the aid and uploads GPS-tagged proof of delivery.",
    actions: ["Dispatch aid to the beneficiary", "Deliver on the ground", "Capture GPS-tagged delivery photos", "Upload proof of delivery"] },
  { label: "Completed",           who: "System",
    detail: "The case is marked complete, an impact report is auto-generated, and the full journey is visible.",
    actions: ["Admin confirms delivery proof", "Escrow funds are released", "Impact report auto-generated", "Full audit trail preserved"] },
];

// Five milestone steps for the animated scattered-card "journey" visual —
// same curation and component as the Home page's How-It-Works section.
const JOURNEY_STEPS = [0, 1, 2, 5, 6].map((idx, i) => ({
  icon:  [FilePen, SearchCheck, ClipboardCheck, HeartHandshake, PackageCheck][i],
  title: WORKFLOW[idx].label,
  desc:  WORKFLOW[idx].detail,
  theme: ["gold", "blue", "green", "gold", "blue"][i],
}));

// Core values (icon SVGs are inline so no icon dependency is required).
const VALUES = [
  { title: "Transparency", color: "#3B82F6",
    desc: "Every case, transaction, and action is logged and publicly auditable. Donors see exactly where their money goes.",
    svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { title: "Trust", color: "#10B981",
    desc: "Multi-layer verification, fraud detection, and encrypted payments build unshakeable donor confidence.",
    svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { title: "Efficiency", color: "#F59E0B",
    desc: "An 8-step automated workflow reduces manual work, speeds aid delivery, and eliminates bottlenecks.",
    svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { title: "Impact", color: "#8B5CF6",
    desc: "Real impact measured with GPS-verified proof-of-delivery photos and transparent reports.",
    svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { title: "Collaboration", color: "#EC4899",
    desc: "Connecting reporters, field teams, donors, and administrators in one seamless platform.",
    svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { title: "Accessibility", color: "#06B6D4",
    desc: "Web, mobile, and offline-capable. Works in low-connectivity field environments across the region.",
    svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
];

const IMPACT_STATS = [
  { val: "2,400+", label: "Cases Processed",   color: C.blue },
  { val: "98.8%",  label: "Verification Rate", color: C.gold },
  { val: "6",      label: "Regions Covered",   color: "#8B5CF6" },
];

// ── Team (admin-managed via localStorage) ─────────────────────────────────
const TEAM_KEY     = "kf_team_data";
const TEAM_VIS_KEY = "kf_team_visible";

const DEFAULT_TEAM = [
  { id: "t1", name: "Abdimalik Hassan", role: "Project Lead & CEO",       bio: "Humanitarian sector leader with 10+ years in crisis response across the Horn of Africa.", photo: "https://randomuser.me/api/portraits/men/32.jpg",   linkedin: "", show: true },
  { id: "t2", name: "Asha Mohammed",    role: "Product Manager",          bio: "Driving platform strategy and community partnerships across 4 countries.", photo: "https://randomuser.me/api/portraits/women/44.jpg", linkedin: "", show: true },
  { id: "t3", name: "Fatima Ali",       role: "Design Lead",              bio: "Award-winning UX designer focused on making aid technology accessible in low-connectivity environments.", photo: "https://randomuser.me/api/portraits/women/26.jpg", linkedin: "", show: true },
  { id: "t4", name: "Omar Ibrahim",     role: "Lead Backend Engineer",    bio: "Full-stack engineer specialising in secure, high-availability humanitarian platforms.", photo: "https://randomuser.me/api/portraits/men/68.jpg",   linkedin: "", show: true },
  { id: "t5", name: "Hodan Warsame",    role: "Field Operations Manager", bio: "Former UNHCR field officer with direct experience in IDP camp management and emergency response.", photo: "https://randomuser.me/api/portraits/women/62.jpg", linkedin: "", show: true },
  { id: "t6", name: "Mahad Yusuf",      role: "Security & DevOps",        bio: "Cybersecurity specialist ensuring donor data and beneficiary privacy across all systems.", photo: "https://randomuser.me/api/portraits/men/45.jpg",   linkedin: "", show: true },
];

const INITIALS_COLORS = [
  ["#DBEAFE", "#1D4ED8"], ["#D1FAE5", "#065F46"], ["#FCE7F3", "#9D174D"],
  ["#EDE9FE", "#5B21B6"], ["#FEF3C7", "#92400E"], ["#FEE2E2", "#991B1B"],
];

function getTeam() {
  try {
    const s = JSON.parse(localStorage.getItem(TEAM_KEY) || "null");
    if (!s) return DEFAULT_TEAM;
    return s.map((m) => {
      const def = DEFAULT_TEAM.find((d) => d.id === m.id);
      return (!m.photo && def?.photo) ? { ...m, photo: def.photo } : m;
    });
  } catch { return DEFAULT_TEAM; }
}
function getTeamVisible() {
  try { const s = localStorage.getItem(TEAM_VIS_KEY); return s === null ? true : s === "true"; }
  catch { return true; }
}

// ── Reusable style fragments (keeps inline objects small & consistent) ─────
const section    = { padding: "56px 24px" };
const wrap       = { maxWidth: 1200, margin: "0 auto" };
const centerHead = { textAlign: "center", marginBottom: 44 };
const h2Style    = { fontSize: "clamp(24px, 3.5vw, 42px)", fontWeight: 900, margin: "0 0 12px", letterSpacing: -0.5, color: C.text, lineHeight: 1.12 };
const subStyle   = { fontSize: "clamp(14px, 1.7vw, 16px)", color: C.muted, maxWidth: 620, margin: "0 auto", lineHeight: 1.7 };
const badge      = (bg, color, extra = {}) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 15px", borderRadius: 100, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", background: bg, color, ...extra });
const overlay    = (gradient) => ({ position: "absolute", inset: 0, zIndex: 5, background: gradient });
const bgLayer    = (url, pos = "center") => ({ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `var(--kf-img-grade), url('${url}')`, backgroundSize: "cover", backgroundPosition: pos });

export default function About() {
  const { lang } = useLang();
  const P = PT.about[lang] || PT.about.en;
  const { isMobile } = useResponsive();

  const [team, setTeam]               = useState(getTeam);
  const [teamVisible, setTeamVisible] = useState(getTeamVisible);

  // Keep team + visibility in sync when the admin edits settings in another tab.
  useEffect(() => {
    const fn = () => { setTeam(getTeam()); setTeamVisible(getTeamVisible()); };
    window.addEventListener("storage", fn);
    return () => window.removeEventListener("storage", fn);
  }, []);

  return (
    <div style={{ color: C.text }}>

      {/* ═══════════ 1 · HERO ═══════════ */}
      <section style={{ position: "relative", overflow: "hidden", padding: "92px 24px 72px", textAlign: "center", color: "#fff", background: C.navy }}>
        <div aria-hidden="true" style={bgLayer("/about-hero-bg.jpg", "center 35%")} />
        <div aria-hidden="true" style={overlay("linear-gradient(to bottom, rgba(0,20,55,0.72) 0%, rgba(17,42,99,0.62) 50%, rgba(0,20,55,0.80) 100%)")} />
        <div style={{ position: "relative", zIndex: 10, maxWidth: 760, margin: "0 auto" }}>
          <span style={badge("rgba(255,255,255,0.14)", "#fff", { border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(6px)" })}>
            {P.hero_badge}
          </span>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 900, margin: "20px 0 16px", lineHeight: 1.1, letterSpacing: -1, textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}>
            {P.hero_title} <span style={{ color: C.gold }}>{P.hero_title2}</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 1.9vw, 18px)", opacity: 0.9, lineHeight: 1.8, maxWidth: 600, margin: "0 auto", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
            {P.hero_sub}
          </p>
        </div>
      </section>

      {/* ═══════════ 2 · MISSION ═══════════ */}
      <section style={{ ...section, background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <span style={badge(C.gold, "#fff")}>{P.mission_badge}</span>
          <h2 style={{ ...h2Style, margin: "18px 0 16px" }}>{P.mission_title}</h2>
          <p style={{ ...subStyle, maxWidth: 760, fontSize: "clamp(15px, 1.8vw, 17px)" }}>{P.mission_p1}</p>
          <p style={{ ...subStyle, maxWidth: 760, marginTop: 16 }}>{P.mission_p2}</p>
        </div>
      </section>

      {/* ═══════════ 3 · THE VERIFICATION JOURNEY ═══════════ */}
      <section style={{ ...section, background: C.bg }}>
        <div style={wrap}>
          <div style={{ ...centerHead, marginBottom: 40 }}>
            <SectionHeader align="center" overline="The verification journey" title="How Kafaala Qaad Works"
              lede="Every case follows a strict, transparent pipeline — from first report to verified delivery." />
          </div>
          <HowItWorks steps={JOURNEY_STEPS} isMobile={isMobile} />
        </div>
      </section>

      {/* ═══════════ 4 · OUR VALUES ═══════════ */}
      <section style={{ ...section, background: "#fff" }}>
        <div style={wrap}>
          <div style={centerHead}>
            <span style={badge(C.green, "#fff")}>Our Values</span>
            <h2 style={{ ...h2Style, margin: "14px 0 12px" }}>{P.values_title}</h2>
            <p style={subStyle}>The principles that guide every decision we make — engineered for enterprise-grade humanitarian operations.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
            {VALUES.map((v) => (
              <div key={v.title} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: v.color, background: `${v.color}1F`, marginBottom: 16 }}>
                  {v.svg}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: "0 0 8px" }}>{v.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 5 · IMPACT STATISTICS ═══════════ */}
      <section style={{ position: "relative", overflow: "hidden", padding: "56px 24px", margin: "0 16px", borderRadius: 24, color: "#fff", background: C.navy, boxShadow: "0 12px 40px rgba(17,42,99,0.18)" }}>
        <div aria-hidden="true" style={bgLayer("/impact-bg.jpg")} />
        <div aria-hidden="true" style={overlay("linear-gradient(135deg, rgba(0,22,60,0.82) 0%, rgba(17,42,99,0.75) 60%, rgba(0,40,20,0.78) 100%)")} />
        <div style={{ position: "relative", zIndex: 10, maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <span style={badge("rgba(255,255,255,0.12)", "#fff", { border: "1px solid rgba(255,255,255,0.22)" })}>Our Impact</span>
          <h2 style={{ ...h2Style, color: "#fff", margin: "16px 0 12px", textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}>Aid That Moves at the Speed of Need</h2>
          <p style={{ fontSize: 16, opacity: 0.82, maxWidth: 560, margin: "0 auto 44px", lineHeight: 1.7 }}>
            Every number below represents a real person whose situation was verified, funded, and delivered with full transparency.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2 }}>
            {IMPACT_STATS.map((s, i) => (
              <div key={s.label} style={{ padding: "34px 24px", borderRight: i < IMPACT_STATS.length - 1 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
                <div style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 900, lineHeight: 1, letterSpacing: -2, color: s.color === C.gold ? C.gold : "#fff" }}>{s.val}</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 6 · TEAM (admin-toggleable) ═══════════ */}
      {teamVisible && (
        <section style={{ ...section, background: "#fff" }}>
          <div style={wrap}>
            <div style={centerHead}>
              <span style={badge(C.gold, "#fff")}>Our Team</span>
              <h2 style={{ ...h2Style, margin: "14px 0 12px" }}>{P.team_title}</h2>
              <p style={subStyle}>{P.team_sub}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 22 }}>
              {team.filter((t) => t.show !== false).map((t, i) => {
                const [bg, color] = INITIALS_COLORS[i % INITIALS_COLORS.length];
                const initials = t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={t.id || i} style={{ textAlign: "center", padding: "32px 22px", background: "#FAFBFF", borderRadius: 22, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 110, height: 110, borderRadius: "50%", margin: "0 auto 18px", overflow: "hidden", boxShadow: `0 6px 24px ${color}33`, border: `3px solid ${bg}` }}>
                      {t.photo ? (
                        <img src={t.photo} alt={`${t.name}, ${t.role}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${bg}, ${color}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color }}>
                          {initials}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{t.name}</div>
                    <div style={{ fontSize: 12, color, fontWeight: 700, margin: `4px 0 ${t.bio ? 10 : 0}px` }}>{t.role}</div>
                    {t.bio && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{t.bio}</div>}
                    {t.linkedin && (
                      <a href={t.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: C.blue, fontWeight: 700, textDecoration: "none" }}>LinkedIn →</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ 7 · CTA — JOIN US ═══════════ */}
      <section style={{ position: "relative", overflow: "hidden", padding: "64px 24px", margin: "28px 16px 0", borderRadius: 24, color: "#fff", textAlign: "center", display: "flex", alignItems: "center", background: C.darkBg, boxShadow: "0 12px 40px rgba(17,42,99,0.18)" }}>
        <div aria-hidden="true" style={bgLayer("/cta-bg.jpg", "center 35%")} />
        <div aria-hidden="true" style={overlay("linear-gradient(135deg, rgba(17,42,99,0.80) 0%, rgba(0,75,150,0.68) 50%, rgba(75,125,25,0.60) 100%)")} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 6, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "38px 38px" }} />
        <div style={{ position: "relative", zIndex: 10, maxWidth: 700, margin: "0 auto" }}>
          <span style={badge("rgba(250,165,40,0.22)", C.gold, { border: "1px solid rgba(250,165,40,0.45)" })}>Join Us</span>
          <h2 style={{ ...h2Style, color: "#fff", fontSize: "clamp(28px, 4.5vw, 52px)", margin: "22px 0 20px", letterSpacing: -1 }}>{P.cta_title}</h2>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", opacity: 0.9, lineHeight: 1.75, maxWidth: 520, margin: "0 auto 40px" }}>{P.cta_sub}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/donate" style={{ padding: "16px 40px", borderRadius: 14, fontWeight: 800, fontSize: 16, background: C.gold, color: C.navy, textDecoration: "none", boxShadow: "0 8px 30px rgba(250,165,40,0.45)" }}>{P.cta_donor}</Link>
            <Link to="/contact" style={{ padding: "16px 40px", borderRadius: 14, fontWeight: 700, fontSize: 16, background: "transparent", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,0.4)" }}>{P.cta_contact}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
