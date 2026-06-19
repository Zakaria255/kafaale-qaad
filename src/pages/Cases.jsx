import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cases as casesApi } from "../api/client";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";
import { useResponsive } from "../hooks/useResponsive.js";

const C = { navy: "#002651", primary: "#004B96", secondary: "#4B7D19", accent: "#E0AB21", danger: "#C0392B", muted: "#5A6E8A", bg: "#F4F7FC", border: "#D8E4F0", text: "#0D1F3C", gold: "#E0AB21", green: "#4B7D19", blue: "#004B96" };
const URGENCY_COLOR = { low: "#10B981", medium: "#F59E0B", high: "#C0392B", critical: "#7C3AED" };
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
  waiting_for_sponsor: "🤝 Open for Sponsorship", sponsored: "❤️ Sponsored", delivering: "📦 Aid in Delivery",
  proof_uploaded: "📸 Proof Uploaded", completed: "🏁 Completed",
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
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 3 }}>📍 {c.publicCity || "Somalia"}</div>
        </div>
      </div>

      <div style={{ padding: "16px 18px" }}>
        <p style={{ margin: "0 0 14px", color: "#374151", fontSize: 13, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {c.publicStory || "Case details are being prepared for public viewing."}
        </p>

        {/* Funding — % only; show goal $ only when fully funded */}
        {vis.showFundingBar !== false && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: full ? C.secondary : C.primary, lineHeight: 1 }}>
                {pct}%
              </span>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                {full ? `Goal: $${(c.targetGoal || 0).toLocaleString()} ✓` : "funded"}
              </span>
            </div>
            <div style={{ background: C.bg, borderRadius: 10, height: 7, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 10, transition: "width 0.6s ease" }} />
            </div>
            {full && <div style={{ fontSize: 11, color: C.secondary, fontWeight: 700, marginTop: 5 }}>🎉 Fully Funded</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/cases/${c.id}`}
            style={{ flex: 1, textAlign: "center", background: C.bg, color: C.primary, padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.border}` }}>
            View Details
          </Link>
          <Link to={`/donate?caseId=${c.id}`}
            style={{ flex: 1, textAlign: "center", background: C.primary, color: "#fff", padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
            onMouseOver={e => e.currentTarget.style.background = C.secondary}
            onMouseOut={e => e.currentTarget.style.background = C.primary}>
            {P.sponsor}
          </Link>
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

  const filtered = items.filter(c => {
    if (catFilter !== "all" && c.category !== catFilter) return false;
    if (urgFilter !== "all" && c.emergencyLevel !== urgFilter) return false;
    if (search && !(c.publicTitle?.toLowerCase().includes(search.toLowerCase()) || c.publicCity?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const TRUST_BADGES = [
    ["🔍", P.badge_verified],
    ["🏢", P.badge_approved],
    ["🔐", P.badge_privacy],
    ["💳", P.badge_escrow],
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: "#fff", padding: "60px 20px 40px", textAlign: "center" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(28px,5vw,44px)", fontWeight: 800 }}>{P.hero_title}</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: 16, maxWidth: 600, marginInline: "auto" }}>
          {P.hero_sub}
        </p>
        {vis.showTrustBadges && (
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
            {TRUST_BADGES.map(([icon, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", padding: "8px 16px", borderRadius: 20 }}>
                <span>{icon}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: isMobile ? "16px" : "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={P.search_ph}
              style={{ flex: 1, minWidth: 0, padding: "10px 16px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {vis.showCategoryFilter && (
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  style={{ flex: 1, minWidth: 110, padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 }}>
                  {cats.map(c => <option key={c} value={c}>{CAT_ICON[c] || "🌍"} {c === "all" ? P.cat_all : c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              )}
              {vis.showUrgencyFilter && (
                <select value={urgFilter} onChange={e => setUrgFilter(e.target.value)}
                  style={{ flex: 1, minWidth: 100, padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 }}>
                  {urgs.map(u => <option key={u} value={u}>{u === "all" ? P.urg_all : u.charAt(0).toUpperCase()+u.slice(1)}</option>)}
                </select>
              )}
              {vis.showTableView && (
                <div style={{ display: "flex", gap: 4 }}>
                  {[["⊞","grid"],["☰","table"]].map(([icon, v]) => (
                    <button key={v} onClick={() => setView(v)} style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: view===v ? C.primary : "#fff", color: view===v ? "#fff" : C.muted, cursor: "pointer" }}>{icon}</button>
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
                  {[P.th_cat, P.th_title, P.th_loc, P.th_urg, P.th_goal, P.th_raised, P.th_status, P.th_action].map(h => (
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
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>📍 {c.publicCity}</td>
                    <td style={{ padding: "12px 16px" }}><span style={{ color: URGENCY_COLOR[c.emergencyLevel], fontWeight: 700, textTransform: "capitalize" }}>{c.emergencyLevel}</span></td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: C.muted }}>{tpct >= 100 ? `$${(c.targetGoal||0).toLocaleString()}` : "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: tpct >= 100 ? C.secondary : C.primary }}>{tpct}%</td>
                    <td style={{ padding: "12px 16px", fontSize: 12 }}>{STATUS_LABEL[c.status] || c.status}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link to={`/donate?caseId=${c.id}`} style={{ background: C.primary, color: "#fff", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>{P.sponsor}</Link>
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
