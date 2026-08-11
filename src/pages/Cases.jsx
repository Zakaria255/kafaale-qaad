import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, BadgeCheck, MapPin, AlertTriangle, HeartHandshake, ArrowRight, UserCheck, FileCheck, HandHeart, Users } from "lucide-react";
import { cases as casesApi } from "../api/client";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";
import { useResponsive } from "../hooks/useResponsive.js";
import FixedSelect from "../components/FixedSelect.jsx";
import { C, URGENCY_COLOR } from "../theme.js";

// Vivid trust-green for the featured showcase accents (funding, verification badges).
const GREEN = "#2F9E44";
const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

// Human-friendly case reference derived from the DB id (e.g. "KQ-2026-A1B2").
function caseRef(c) {
  const tail = String(c.id || "").replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase() || "0000";
  return `KQ-2026-${tail}`;
}

const CAT_IMG = {
  food:      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=75",
  medical:   "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&q=75",
  shelter:   "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=75",
  orphan:    "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=600&q=75",
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=75",
  disaster:  "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&q=75",
  water:     "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=600&q=75",
  other:     "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=75",
};
const CASE_IMGS_KEY = "kf_case_cover_imgs";
function getCaseImg(c) {
  try {
    const saved = JSON.parse(localStorage.getItem(CASE_IMGS_KEY) || "{}");
    if (saved[c.id]) return saved[c.id];
    if (c.publicMediaUrls) {
      const arr = JSON.parse(c.publicMediaUrls);
      if (arr[0]) return arr[0];
    }
  } catch {}
  return CAT_IMG[c.category] || CAT_IMG.other;
}

const STATUS_LABEL = {
  waiting_for_sponsor: "Open for Sponsorship", sponsored: "Sponsored", delivering: "Aid in Delivery",
  proof_uploaded: "Proof Uploaded", completed: "Completed",
};
const CAT_ICON = { food: "🍚", medical: "🏥", shelter: "🏠", orphan: "👶", disaster: "🌪️", education: "📚", other: "🌍" };

function CaseCard({ c, P, vis = {} }) {
  const pct = c.targetGoal > 0 ? Math.min(100, Math.round((c.totalRaised / c.targetGoal) * 100)) : 0;
  const full = pct >= 100;
  const barColor = full ? C.secondary : `linear-gradient(90deg, ${C.primary}, ${C.accent})`;
  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${C.border}`, transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.12)"; }}
      onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}>
      {/* Cover image */}
      <div style={{ position: "relative", height: 180, overflow: "hidden", background: C.bg }}>
        <img src={getCaseImg(c)} alt="" loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.5) 100%)" }} />
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
          <span style={{ background: (URGENCY_COLOR[c.emergencyLevel] || "#999"), color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
            {c.emergencyLevel}
          </span>
        </div>
        {vis.showVerificationBadge !== false && (
          <span style={{ position: "absolute", top: 10, right: 10, background: "#065F4690", backdropFilter: "blur(4px)", color: "#D1FAE5", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
            ✓ {P.field_verified}
          </span>
        )}
        <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.35, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {c.publicTitle || "Emergency Case"}
          </h3>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 3 }}>{c.publicCity || "Somalia"}</div>
        </div>
      </div>

      <div style={{ padding: "16px 18px" }}>
        <p style={{ margin: "0 0 14px", color: "#374151", fontSize: 13, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {c.publicStory || "Case details are being prepared for public viewing."}
        </p>

        {/* Funding — percentage + goal amount always visible */}
        {vis.showFundingBar !== false && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: full ? C.secondary : C.primary, lineHeight: 1 }}>
                {pct}% <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>funded</span>
              </span>
              {c.targetGoal > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                  ${(c.targetGoal).toLocaleString()} {full ? "✓" : "needed"}
                </span>
              )}
            </div>
            <div style={{ background: C.bg, borderRadius: 10, height: 7, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 10, transition: "width 0.6s ease" }} />
            </div>
            {full && (
              <div style={{ marginTop: 5, fontSize: 11, color: C.secondary, fontWeight: 700 }}>Fully Funded</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/cases/${c.id}`}
            style={{ flex: 1, textAlign: "center", background: C.bg, color: C.primary, padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.border}` }}>
            View Details
          </Link>
          {!full && (
            <Link to={`/donate?caseId=${c.id}`}
              style={{ flex: 1, textAlign: "center", background: C.primary, color: "#fff", padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
              onMouseOver={e => e.currentTarget.style.background = C.secondary}
              onMouseOut={e => e.currentTarget.style.background = C.primary}>
              {P.sponsor}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

const CASES_VIS_KEY = "kf_cases_display";
const CASES_VIS_DEFAULTS = {
  showTrustBadges: true, showVerificationBadge: true,
  showFundingBar: true, showCategoryFilter: true,
  showUrgencyFilter: true, showTableView: true,
};
function loadCasesVis() {
  try { return { ...CASES_VIS_DEFAULTS, ...JSON.parse(localStorage.getItem(CASES_VIS_KEY) || "{}") }; }
  catch { return CASES_VIS_DEFAULTS; }
}

// Premium spotlight card for the single most-urgent verified case.
function FeaturedCase({ c, isMobile }) {
  const pct = c.targetGoal > 0 ? Math.min(100, Math.round((c.totalRaised / c.targetGoal) * 100)) : 0;
  const crit = c.emergencyLevel === "critical";
  const urgencyName = (c.emergencyLevel || "high").charAt(0).toUpperCase() + (c.emergencyLevel || "high").slice(1);
  const alertLabel = crit ? "Critical — Immediate Support Needed" : `${urgencyName} Priority — Support Needed`;

  const TRUST = [
    { icon: ShieldCheck, title: "Field Verified",     sub: "Our team verified this case on-site" },
    { icon: Lock,        title: "Identity Protected", sub: "Beneficiary identity is protected" },
    { icon: BadgeCheck,  title: "Needs Confirmed",    sub: "Needs assessed and confirmed" },
  ];

  return (
    <div style={{ background: C.darkBg, borderRadius: 26, padding: isMobile ? 6 : 10, boxShadow: "0 20px 50px rgba(10,29,69,0.28)" }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,0.88fr) minmax(0,1.12fr)", background: "#fff", borderRadius: 18, overflow: "hidden" }}>

        {/* ── LEFT · photo ── */}
        <div style={{ position: "relative", minHeight: isMobile ? 300 : 500 }}>
          <img src={getCaseImg(c)} alt="" loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,20,50,0.62) 0%, rgba(0,20,50,0.04) 48%)" }} />

          {/* urgency badge */}
          <div style={{ position: "absolute", top: 18, left: 18, display: "flex", alignItems: "center", gap: 9, background: C.danger, color: "#fff", padding: "9px 15px", borderRadius: 12, boxShadow: "0 6px 18px rgba(192,57,43,0.45)" }}>
            <AlertTriangle size={20} strokeWidth={2.4} />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0.5 }}>{(c.emergencyLevel || "urgent").toUpperCase()}</div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.92, letterSpacing: 1.2 }}>VERIFIED CASE</div>
            </div>
          </div>

          {/* glass reassurance card */}
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(10,29,69,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: "14px 16px" }}>
            <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: "rgba(250,165,40,0.18)", border: "1px solid rgba(250,165,40,0.42)", display: "grid", placeItems: "center" }}>
              <ShieldCheck size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ color: C.accent, fontWeight: 800, fontSize: 14 }}>Your support can save a life</div>
              <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>Every contribution brings hope, healing, and a brighter future.</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT · details ── */}
        <div style={{ padding: isMobile ? "22px 20px" : "30px 34px", display: "flex", flexDirection: "column" }}>
          {/* top row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "#FBEFD0", color: "#8A6410", fontWeight: 800, fontSize: 11, letterSpacing: 1, padding: "5px 12px", borderRadius: 20 }}>CASE ID</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{caseRef(c)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EAF6EE", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <ShieldCheck size={19} color={GREEN} />
              </div>
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: GREEN, letterSpacing: 0.3 }}>VERIFIED BY KAFAALA QAAD</div>
                <div style={{ fontSize: 11, color: C.muted }}>Your trust. Their hope.</div>
              </div>
            </div>
          </div>

          {/* title */}
          <h2 style={{ fontSize: "clamp(23px,2.6vw,36px)", fontWeight: 900, lineHeight: 1.12, color: C.navy, margin: "0 0 12px" }}>
            {c.publicTitle || "Verified Emergency Case"}
          </h2>

          {/* location */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            <MapPin size={18} color={C.accent} />
            {[c.publicCity, c.publicCountry].filter(Boolean).join(", ") || "Somalia"}
          </div>

          {/* description */}
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "#3A4A63", margin: "0 0 18px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {c.publicStory || "Our field team has verified this case on-site and confirmed the family's immediate needs."}
          </p>

          {/* alert banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FCEEEC", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
            <AlertTriangle size={18} color={C.danger} />
            <span style={{ color: C.danger, fontWeight: 800, fontSize: 15 }}>{alertLabel}</span>
          </div>

          {/* funding box */}
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: GREEN, lineHeight: 1 }}>${(c.totalRaised || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>raised</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: C.navy, lineHeight: 1 }}>{pct}%</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Funded</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: C.navy, lineHeight: 1 }}>${(c.targetGoal || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>goal</div>
              </div>
            </div>

            {/* progress with bubble marker */}
            <div style={{ position: "relative", background: "#E6ECF3", borderRadius: 20, height: 10, marginBottom: 22, marginTop: 6 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: GREEN, borderRadius: 20, transition: "width 0.6s ease" }} />
              <div style={{ position: "absolute", top: "50%", left: `${Math.min(96, Math.max(8, pct))}%`, transform: "translate(-50%,-50%)", background: "#fff", border: `2px solid ${GREEN}`, color: GREEN, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>{pct}%</div>
            </div>

            {/* trust indicators */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              {TRUST.map(t => (
                <div key={t.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", background: "#EAF6EE", display: "grid", placeItems: "center" }}>
                    <t.icon size={18} color={GREEN} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: GREEN }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: "auto" }}>
            <Link to={`/donate?caseId=${c.id}`}
              style={{ flex: "1 1 240px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: C.accent, color: C.navy, fontWeight: 800, fontSize: 16, padding: "15px 22px", borderRadius: 14, textDecoration: "none", boxShadow: "0 8px 24px rgba(250,165,40,0.42)" }}>
              <HeartHandshake size={20} /> Sponsor This Case <ArrowRight size={18} />
            </Link>
            <Link to={`/cases/${c.id}`}
              style={{ flex: "0 1 190px", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", color: C.navy, fontWeight: 800, fontSize: 16, padding: "15px 22px", borderRadius: 14, textDecoration: "none", border: `1.5px solid ${C.border}` }}>
              View Full Case
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Cases() {
  const { lang } = useLang();
  const P = PT.cases[lang] || PT.cases.en;
  const { isMobile } = useResponsive();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [urgFilter, setUrgFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [vis, setVis] = useState(loadCasesVis);

  useEffect(() => {
    const sync = () => setVis(loadCasesVis());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    casesApi.list()
      .then(d => setItems(d.cases || []))
      .catch(() => setError("Failed to load cases"))
      .finally(() => setLoading(false));
  }, []);

  const cats = ["all","food","medical","shelter","orphan","disaster","education"];
  const urgs = ["all","critical","high","medium","low"];

  const filtered = items
    .filter(c => {
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (urgFilter !== "all" && c.emergencyLevel !== urgFilter) return false;
      if (search && !(c.publicTitle?.toLowerCase().includes(search.toLowerCase()) || c.publicCity?.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    })
    .sort((a, b) => {
      const pctA = a.targetGoal > 0 ? (a.totalRaised / a.targetGoal) : 0;
      const pctB = b.targetGoal > 0 ? (b.totalRaised / b.targetGoal) : 0;
      const fullA = pctA >= 1 ? 1 : 0;
      const fullB = pctB >= 1 ? 1 : 0;
      return fullA - fullB;
    });

  const TRUST_BADGES = [
    ["", P.badge_verified],
    ["", P.badge_approved],
    ["", P.badge_privacy],
    ["", P.badge_escrow],
  ];

  // Spotlight the most-urgent, not-yet-funded case — only on the default (unfiltered) view.
  const noFilters = catFilter === "all" && urgFilter === "all" && !search;
  const featured = noFilters
    ? [...items]
        .filter(c => (c.targetGoal > 0 ? c.totalRaised / c.targetGoal : 0) < 1)
        .sort((a, b) => (URGENCY_RANK[b.emergencyLevel] || 0) - (URGENCY_RANK[a.emergencyLevel] || 0))[0]
    : null;

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Hero — Verified Emergency Cases */}
      <section style={{ position: "relative", overflow: "hidden", background: "#F5FAF6", padding: isMobile ? "48px 20px 36px" : "72px 24px 56px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Shield */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: isMobile ? 18 : 24 }}>
            <div style={{ width: 76, height: 76, borderRadius: 20, background: "rgba(15,119,60,.10)", display: "grid", placeItems: "center" }}>
              <ShieldCheck size={40} color="#0F773C" strokeWidth={2} aria-hidden="true" />
            </div>
          </div>

          {/* Heading */}
          <h1 style={{ textAlign: "center", fontFamily: "var(--kf-font-display)", fontSize: isMobile ? 34 : "clamp(40px, 5.4vw, 64px)", lineHeight: 1.05, fontWeight: 800, letterSpacing: "-.02em", color: "#0C4A2B", margin: 0 }}>
            Verified Emergency Cases
          </h1>
          <div aria-hidden="true" style={{ width: 84, height: 4, background: "#17924A", borderRadius: 3, margin: "18px auto 22px" }} />
          <p style={{ textAlign: "center", maxWidth: 720, margin: "0 auto", fontSize: isMobile ? 16 : 19, lineHeight: 1.65, color: "#4B5563" }}>
            Every case below has been physically verified by our field team and approved by our office. Your sponsorship goes directly to those in need.
          </p>

          {/* Pillar cards */}
          <div style={{ marginTop: isMobile ? 28 : 44, display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 14 : 24 }}>
            {[
              { icon: UserCheck, title: "Physically Verified", desc: "Our field team visits and verifies every case." },
              { icon: FileCheck, title: "Carefully Reviewed",  desc: "Each case is reviewed and approved by our office." },
              { icon: HandHeart, title: "Direct Support",      desc: "Your sponsorship goes directly to the beneficiary." },
              { icon: Users,     title: "Real Impact",         desc: "You help real people and real families in critical need." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: "#fff", borderRadius: 18, padding: isMobile ? "22px 16px" : "30px 22px", textAlign: "center", border: "1px solid rgba(15,119,60,.10)", boxShadow: "0 10px 30px -18px rgba(12,74,43,.28)" }}>
                <div style={{ width: 66, height: 66, borderRadius: "50%", background: "rgba(15,119,60,.10)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                  <Icon size={30} color="#0F773C" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0C4A2B" }}>{title}</div>
                <div aria-hidden="true" style={{ width: 26, height: 3, background: "#17924A", borderRadius: 2, margin: "8px auto 12px" }} />
                <div style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* soft green wave at the base */}
        <svg aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ position: "absolute", insetInline: 0, insetBlockEnd: -1, width: "100%", height: 70, display: "block" }}>
          <path d="M0,60 C280,110 520,20 760,50 C1000,80 1220,120 1440,70 L1440,120 L0,120 Z" fill="rgba(15,119,60,.10)" />
        </svg>
      </section>

      {/* Featured — most urgent verified case */}
      {!loading && featured && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "24px 16px 0" : "36px 20px 0" }}>
          <FeaturedCase c={featured} isMobile={isMobile} />
        </div>
      )}

      {/* Filters */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: isMobile ? "10px" : "10px 12px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={P.search_ph}
              style={{ flex: "1 1 200px", minWidth: 0, boxSizing: "border-box", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
              {vis.showCategoryFilter && (
                <FixedSelect value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  style={{ width: isMobile ? "100%" : 160, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                  {cats.map(c => (
                    <option key={c} value={c}>{(CAT_ICON[c] || "🌍") + " " + (c === "all" ? P.cat_all : c.charAt(0).toUpperCase()+c.slice(1))}</option>
                  ))}
                </FixedSelect>
              )}
              {vis.showUrgencyFilter && (
                <FixedSelect value={urgFilter} onChange={e => setUrgFilter(e.target.value)}
                  style={{ width: isMobile ? "100%" : 130, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                  {urgs.map(u => (
                    <option key={u} value={u}>{u === "all" ? P.urg_all : u.charAt(0).toUpperCase()+u.slice(1)}</option>
                  ))}
                </FixedSelect>
              )}
              {vis.showTableView && (
                <div style={{ display: "flex", gap: 3, background: C.bg, borderRadius: 8, padding: 3 }}>
                  {[["⊞","grid"],["☰","table"]].map(([icon, v]) => (
                    <button key={v} onClick={() => setView(v)} aria-pressed={view===v} aria-label={v === "grid" ? "Grid view" : "Table view"}
                      style={{ padding: "6px 11px", border: "none", borderRadius: 6, fontSize: 13, lineHeight: 1, background: view===v ? "#fff" : "transparent", color: view===v ? C.primary : C.muted, boxShadow: view===v ? "0 1px 3px rgba(0,0,0,0.1)" : "none", cursor: "pointer", transition: "all 0.15s" }}>{icon}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 18 }}>{P.loading}</div>}
        {error && <div style={{ textAlign: "center", padding: "60px 0", color: C.danger }}>{error}</div>}
        {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>{P.no_cases}</div>}

        {!loading && filtered.length > 0 && view === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 16 : 24 }}>
            {filtered.map(c => <CaseCard key={c.id} c={c} P={P} vis={vis} />)}
          </div>
        )}

        {!loading && filtered.length > 0 && view === "table" && (
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.primary, color: "#fff" }}>
                  {[P.th_cat, P.th_title, P.th_loc, P.th_urg, P.th_goal, P.th_status, P.th_action].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const tpct = c.targetGoal > 0 ? Math.min(100, Math.round((c.totalRaised / c.targetGoal) * 100)) : 0;
                  return (
                  <tr key={c.id} style={{ background: i%2===0 ? "#fff" : C.bg, borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 16px" }}>{CAT_ICON[c.category]} {c.category}</td>
                    <td style={{ padding: "12px 16px", maxWidth: 200, fontSize: 13 }}>{c.publicTitle || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{c.publicCity}</td>
                    <td style={{ padding: "12px 16px" }}><span style={{ color: URGENCY_COLOR[c.emergencyLevel], fontWeight: 700, textTransform: "capitalize" }}>{c.emergencyLevel}</span></td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: tpct >= 100 ? C.secondary : C.primary }}>{tpct}%</span>
                      <span style={{ fontSize: 11, color: C.muted }}> · ${(c.targetGoal||0).toLocaleString()} goal</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12 }}>{STATUS_LABEL[c.status] || c.status}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {tpct < 100 && <Link to={`/donate?caseId=${c.id}`} style={{ background: C.primary, color: "#fff", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>{P.sponsor}</Link>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
