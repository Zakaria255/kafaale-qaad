import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { projects as projectsApi } from "../api/client.js";
import { useResponsive } from "../hooks/useResponsive.js";
import FixedSelect from "../components/FixedSelect.jsx";
import { getCat } from "../utils/categories.js";
import { BRAND as C } from "../brand.js";

// Category → accent color. Real project categories come from admin settings
// (water/school/health/agriculture/shelter/energy); a couple of extra buckets
// are kept for demo data variety and any future category additions.
const PROJECT_COLORS = {
  water:          "#06B6D4",
  health:         "#EC4899",
  school:         "#8B5CF6",
  education:      "#8B5CF6",
  shelter:        "#F59E0B",
  infrastructure: "#10B981",
  livelihood:     "#3B82F6",
  energy:         "#EF4444",
  agriculture:    "#84CC16",
};
const colorFor = (cat) => PROJECT_COLORS[cat] || C.blue;

// Real backend statuses (see api/client.js `projects`) mapped to a label + color.
const STATUS_META = {
  seeking_funding: { label: "Seeking Funding", color: C.gold },
  funded:          { label: "Funded",          color: C.blue },
  in_progress:     { label: "In Progress",     color: "#0E7490" },
  completed:       { label: "Completed",       color: C.green },
};
const statusMeta = (s) => STATUS_META[s] || { label: (s || "Unknown").replace(/_/g, " "), color: C.muted };

const BUDGET_BUCKETS = [
  { value: "", label: "All budgets" },
  { value: "lt100k",  label: "< $100K" },
  { value: "100to500",label: "$100K – $500K" },
  { value: "500to1m", label: "$500K – $1M" },
  { value: "gt1m",    label: "$1M+" },
];
function inBudgetBucket(goal, bucket) {
  if (!bucket) return true;
  const g = goal || 0;
  if (bucket === "lt100k")   return g < 100000;
  if (bucket === "100to500") return g >= 100000 && g < 500000;
  if (bucket === "500to1m")  return g >= 500000 && g < 1000000;
  if (bucket === "gt1m")     return g >= 1000000;
  return true;
}

const SORTS = [
  { value: "newest",  label: "Sort by: Newest" },
  { value: "oldest",  label: "Sort by: Oldest" },
  { value: "funded",  label: "Sort by: Most funded" },
  { value: "people",  label: "Sort by: Most beneficiaries" },
  { value: "alpha",   label: "Sort by: Alphabetical" },
];

// Fallback showcase data — used only when the API returns no live projects.
const DEMO_PROJECTS = [
  { id: "demo-p1", title: "Baidoa District Water Well", category: "water", status: "in_progress",
    location: "Baidoa", region: "Bay Region", populationSize: 1280, fundingGoal: 8000, totalRaised: 6400, durationMonths: 6,
    image: "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800&q=75",
    description: "Deep borehole well providing clean drinking water to 4 neighbouring villages. Reduces waterborne disease and travel time for women and children.",
    updates: ["Foundation dug — 18 June 2026", "Pump equipment delivered — 5 June 2026"] },
  { id: "demo-p2", title: "Garowe Primary School Renovation", category: "school", status: "in_progress",
    location: "Garowe", region: "Nugaal Region", populationSize: 480, fundingGoal: 15000, totalRaised: 9300, durationMonths: 8,
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=75",
    description: "Rebuilding 3 collapsed classrooms, installing desks and solar lighting for 480 students. IDP-host community school running 2 shifts.",
    updates: ["Roof installed on block A — 12 June 2026", "Materials delivered — 28 May 2026"] },
  { id: "demo-p3", title: "Kismayo Mobile Clinic", category: "health", status: "completed",
    location: "Kismayo", region: "Lower Jubba", populationSize: 1200, fundingGoal: 12000, totalRaised: 12000, durationMonths: 12,
    image: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=800&q=75",
    description: "Monthly mobile clinic providing maternal health, vaccinations and basic medicine to 5 underserved communities. Fully funded and operational.",
    updates: ["Month 6 completed — 1 June 2026", "Fully funded — April 2026"] },
  { id: "demo-p4", title: "Beledweyne Community Centre", category: "shelter", status: "seeking_funding",
    location: "Beledweyne", region: "Hiran", populationSize: 600, fundingGoal: 6500, totalRaised: 1950, durationMonths: 5,
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=75",
    description: "Multi-purpose community hall for women's literacy classes, youth skills training, and community meetings. Currently in fundraising phase.",
    updates: ["Land identified and cleared — 10 June 2026"] },
  { id: "demo-p5", title: "Afgooye Irrigation Scheme", category: "agriculture", status: "seeking_funding",
    location: "Afgooye", region: "Lower Shabelle", populationSize: 85, fundingGoal: 20000, totalRaised: 4000, durationMonths: 10,
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=75",
    description: "Micro-irrigation canals and seed distribution for 85 farming families recovering from drought. Expected to triple crop yield by harvest season.",
    updates: ["Survey complete — 14 June 2026"] },
  { id: "demo-p6", title: "Mogadishu IDP Camp Solar", category: "energy", status: "completed",
    location: "Mogadishu", region: "Benadir", populationSize: 210, fundingGoal: 9500, totalRaised: 9500, durationMonths: 3,
    image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=75",
    description: "Solar panel installation providing lighting to 210 IDP camp families, reducing safety incidents at night. Fully funded and commissioned.",
    updates: ["Commissioned — 20 May 2026", "Installation complete — 15 May 2026"] },
];

const IMG_FALLBACK = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=75";
const VIEW_KEY = "kf_projects_view";
const PAGE_SIZE = 9;

function fundedPct(p) {
  return p.fundingGoal > 0 ? Math.min(100, Math.round((p.totalRaised / p.fundingGoal) * 100)) : 0;
}

function StatusPill({ status, style }) {
  const m = statusMeta(status);
  return (
    <span style={{ background: m.color, color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, ...style }}>
      {m.label}
    </span>
  );
}
function CategoryPill({ category, style }) {
  const color = colorFor(category);
  return (
    <span style={{ background: color, color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, ...style }}>
      {category}
    </span>
  );
}

function MetricBox({ value, label, color }) {
  return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: C.bg, borderRadius: 4, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 4, transition: "width 0.3s ease" }} />
    </div>
  );
}

function ProjectCard({ p, onOpen }) {
  const color = colorFor(p.category);
  const pct = fundedPct(p);
  const [hover, setHover] = useState(false);
  return (
    <article
      role="button" tabIndex={0}
      aria-label={`${p.title}, ${statusMeta(p.status).label}, ${pct}% funded`}
      onClick={() => onOpen(p)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(p); } }}
      style={{
        background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer",
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
        boxShadow: hover ? "0 12px 32px rgba(17,42,99,0.15)" : "0 2px 10px rgba(17,42,99,0.06)",
        transform: hover ? "translateY(-4px)" : "none",
      }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    >
      <div style={{ position: "relative", height: 200, background: C.bg }}>
        <img src={p.image || IMG_FALLBACK} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <StatusPill status={p.status} style={{ position: "absolute", top: 12, left: 12 }} />
        <CategoryPill category={p.category} style={{ position: "absolute", top: 12, right: 12 }} />
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 8 }}>📍 {p.location}{p.region ? `, ${p.region}` : ""}</div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 6px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h3>
        <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 12, textTransform: "capitalize" }}>{p.category}</div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <MetricBox value={p.populationSize ? p.populationSize.toLocaleString() : "—"} label="People" color={color} />
          <MetricBox value={`$${Math.round(p.totalRaised / 1000)}K`} label="Funded" color={color} />
          <MetricBox value={p.durationMonths ? `${p.durationMonths} mo` : "—"} label="Duration" color={color} />
        </div>

        <ProgressBar pct={pct} color={pct >= 100 ? C.green : color} />
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: "8px 0 14px" }}>{pct}% funded</div>

        <Link
          to={`/donate?projectId=${p.id}&title=${encodeURIComponent(p.title)}&goal=${p.fundingGoal}&location=${encodeURIComponent(p.location)}`}
          onClick={(e) => e.stopPropagation()}
          style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "12px 16px", background: color, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none" }}
        >
          {pct >= 100 ? "Fully funded — Thank you!" : "Contribute"}
        </Link>
      </div>
    </article>
  );
}

function ProjectRow({ p, onOpen }) {
  const color = colorFor(p.category);
  const pct = fundedPct(p);
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(p)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(p); } }}
      style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.4fr 1fr", gap: 12, alignItems: "center", padding: "16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
      onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
      </div>
      <div style={{ fontSize: 13, color: C.muted }}>{p.location}</div>
      <div><StatusPill status={p.status} /></div>
      <div style={{ fontSize: 13, color: C.text }}>{p.populationSize ? p.populationSize.toLocaleString() : "—"}</div>
      <div>
        <ProgressBar pct={pct} color={pct >= 100 ? C.green : color} />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{pct}% · ${p.fundingGoal.toLocaleString()} goal</div>
      </div>
      <div>
        <Link
          to={`/donate?projectId=${p.id}&title=${encodeURIComponent(p.title)}&goal=${p.fundingGoal}&location=${encodeURIComponent(p.location)}`}
          onClick={(e) => e.stopPropagation()}
          style={{ display: "inline-block", padding: "8px 14px", background: color, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
        >Contribute</Link>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div className="kf-shimmer" style={{ height: 200, background: C.bg }} />
      <div style={{ padding: 20 }}>
        <div className="kf-shimmer" style={{ height: 12, width: "60%", background: C.bg, borderRadius: 4, marginBottom: 10 }} />
        <div className="kf-shimmer" style={{ height: 16, width: "85%", background: C.bg, borderRadius: 4, marginBottom: 14 }} />
        <div className="kf-shimmer" style={{ height: 40, background: C.bg, borderRadius: 8 }} />
      </div>
    </div>
  );
}

function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;
  const nums = Array.from({ length: pageCount }, (_, i) => i + 1);
  const btn = (active) => ({
    padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", margin: "0 4px",
    background: active ? C.blue : C.bg, color: active ? "#fff" : C.text, border: `1px solid ${active ? C.blue : C.border}`,
  });
  return (
    <nav aria-label="Pagination" style={{ padding: "32px 24px", textAlign: "center" }}>
      <button aria-label="Previous page" disabled={page === 1} onClick={() => onChange(page - 1)}
        style={{ ...btn(false), opacity: page === 1 ? 0.45 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}>← Prev</button>
      {nums.map(n => (
        <button key={n} aria-current={n === page ? "page" : undefined} onClick={() => onChange(n)} style={btn(n === page)}>{n}</button>
      ))}
      <button aria-label="Next page" disabled={page === pageCount} onClick={() => onChange(page + 1)}
        style={{ ...btn(false), opacity: page === pageCount ? 0.45 : 1, cursor: page === pageCount ? "not-allowed" : "pointer" }}>Next →</button>
    </nav>
  );
}

function DetailModal({ p, onClose }) {
  const color = colorFor(p.category);
  const pct = fundedPct(p);
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 800, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}
      role="dialog" aria-modal="true" aria-label={p.title}
    >
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 600, width: "100%", overflow: "hidden", position: "relative" }}>
        <div style={{ height: 200, position: "relative" }}>
          <img src={p.image || IMG_FALLBACK} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>✕</button>
          <StatusPill status={p.status} style={{ position: "absolute", bottom: 14, left: 14 }} />
          <CategoryPill category={p.category} style={{ position: "absolute", bottom: 14, left: 100 }} />
        </div>
        <div style={{ padding: "24px 28px 28px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: C.text }}>{p.title}</h2>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>📍 {p.location}{p.region ? `, ${p.region}` : ""}</div>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: C.text, marginBottom: 22 }}>{p.description}</p>

          <div style={{ background: C.bg, borderRadius: 12, padding: "16px 18px", marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: pct >= 100 ? C.green : color }}>{pct}%</span>
              <span style={{ fontSize: 12, color: C.muted }}>{pct >= 100 ? `Goal: $${p.fundingGoal.toLocaleString()} ✓` : `of $${p.fundingGoal.toLocaleString()} goal`}</span>
            </div>
            <ProgressBar pct={pct} color={pct >= 100 ? C.green : color} />
            <div style={{ marginTop: 8, fontSize: 12, color: C.muted, textAlign: "right" }}>
              {p.populationSize ? `${p.populationSize.toLocaleString()} people impacted` : ""}
            </div>
          </div>

          {p.updates?.length > 0 && (
            <>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Latest Updates</h4>
              {p.updates.map((u) => (
                <div key={u} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: C.green, fontWeight: 800, flexShrink: 0 }}>✓</span>
                  <span style={{ color: C.text }}>{u}</span>
                </div>
              ))}
            </>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <Link
              to={`/donate?projectId=${p.id}&title=${encodeURIComponent(p.title)}&goal=${p.fundingGoal}&location=${encodeURIComponent(p.location)}`}
              onClick={onClose}
              style={{ flex: 1, padding: "13px", background: color, color: "#fff", borderRadius: 12, textDecoration: "none", textAlign: "center", fontWeight: 800, fontSize: 15 }}
            >Contribute to this project</Link>
            <button onClick={onClose} style={{ padding: "13px 24px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14, color: C.text }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { isMobile, isTablet } = useResponsive();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [region, setRegion] = useState("");
  const [budget, setBudget] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || "grid"; } catch { return "grid"; } });
  const [page, setPage] = useState(1);
  const [openProject, setOpenProject] = useState(null);

  useEffect(() => {
    projectsApi.list({ limit: "50" })
      .then((r) => setItems(r.projects?.length ? r.projects : DEMO_PROJECTS))
      .catch(() => setItems(DEMO_PROJECTS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch {} }, [view]);
  useEffect(() => { setPage(1); }, [debouncedSearch, category, status, region, budget, sort]);

  const regions = useMemo(() => Array.from(new Set(items.map((p) => p.region).filter(Boolean))).sort(), [items]);
  const categoryOptions = useMemo(() => [{ value: "", label: "All categories" }, ...getCat("projectCats")], []);
  const statusOptions = useMemo(() => {
    const seen = new Set(items.map((p) => p.status).filter(Boolean));
    return [{ value: "", label: "All status" }, ...Array.from(seen).map((s) => ({ value: s, label: statusMeta(s).label }))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = items.filter((p) => {
      if (category && p.category !== category) return false;
      if (status && p.status !== status) return false;
      if (region && p.region !== region) return false;
      if (!inBudgetBucket(p.fundingGoal, budget)) return false;
      if (q && !(p.title?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "funded")  return (b.totalRaised || 0) - (a.totalRaised || 0);
      if (sort === "people")  return (b.populationSize || 0) - (a.populationSize || 0);
      if (sort === "alpha")   return (a.title || "").localeCompare(b.title || "");
      if (sort === "oldest")  return items.indexOf(a) - items.indexOf(b);
      return items.indexOf(b) - items.indexOf(a); // newest = reverse of load order
    });
    return list;
  }, [items, debouncedSearch, category, status, region, budget, sort]);

  const activeFilters = [
    category && { key: "category", label: categoryOptions.find((c) => c.value === category)?.label || category, clear: () => setCategory("") },
    status   && { key: "status",   label: statusMeta(status).label, clear: () => setStatus("") },
    region   && { key: "region",   label: region, clear: () => setRegion("") },
    budget   && { key: "budget",   label: BUDGET_BUCKETS.find((b) => b.value === budget)?.label, clear: () => setBudget("") },
  ].filter(Boolean);

  const clearAll = () => { setCategory(""); setStatus(""); setRegion(""); setBudget(""); setSearch(""); };

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const noFiltersActive = !debouncedSearch && !category && !status && !region && !budget;
  const featured = noFiltersActive
    ? [...items].filter((p) => p.status !== "completed").sort((a, b) => fundedPct(b) - fundedPct(a))[0]
    : null;


  const dropdownStyle = { fontSize: 13, borderRadius: 8, padding: "10px 14px" };
  const filterItemStyle = { flex: "0 1 170px", minWidth: 140 };

  return (
    <div style={{ color: C.text }}>
      <style>{`
        @keyframes kfShimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
        .kf-shimmer { background-image: linear-gradient(90deg, ${C.bg} 0px, #eef2f9 40px, ${C.bg} 80px); background-size: 400px; animation: kfShimmer 1.4s infinite; }
      `}</style>

      {/* 1 — Hero */}
      <section style={{ position: "relative", overflow: "hidden", padding: isMobile ? "56px 16px 48px" : isTablet ? "64px 20px 56px" : "92px 24px 72px", textAlign: "center", color: "#fff" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "var(--kf-img-grade), url('/projects-hero-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,20,55,0.76) 0%, rgba(17,42,99,0.70) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
          <span style={{ display: "inline-block", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 100, padding: "6px 16px", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>Infrastructure Projects</span>
          <h1 style={{ fontSize: "clamp(32px, 5.5vw, 56px)", fontWeight: 900, margin: "20px 0 16px", lineHeight: 1.1, color: "#fff" }}>
            Building Tomorrow <span style={{ color: C.gold }}>Today</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 1.9vw, 18px)", opacity: 0.9, lineHeight: 1.8, margin: 0 }}>
            Large-scale infrastructure and community projects that create lasting impact. From water systems to schools, we're rebuilding communities brick by brick.
          </p>
        </div>
      </section>

      {/* 3 — Featured project */}
      {featured && (
        <section style={{ background: "#fff", padding: "32px 24px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 32, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 20 : 28, boxShadow: "0 4px 24px rgba(17,42,99,0.06)" }}>
              <div style={{ position: "relative", height: isMobile ? 220 : 360, borderRadius: 16, overflow: "hidden" }}>
                <img src={featured.image || IMG_FALLBACK} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <StatusPill status={featured.status} style={{ position: "absolute", top: 14, left: 14 }} />
                <CategoryPill category={featured.category} style={{ position: "absolute", top: 14, right: 14 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: colorFor(featured.category) }}>Featured Project</span>
                  <h2 style={{ fontSize: "clamp(22px,3vw,28px)", fontWeight: 900, margin: "8px 0 12px", lineHeight: 1.2 }}>{featured.title}</h2>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.muted, fontWeight: 500, marginBottom: 16 }}>
                    <span>📍 {featured.location}{featured.region ? `, ${featured.region}` : ""}</span>
                  </div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, marginBottom: 20 }}>{featured.description}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <MetricBox value={featured.populationSize ? featured.populationSize.toLocaleString() : "—"} label="Beneficiaries" color={colorFor(featured.category)} />
                    <MetricBox value={`$${Math.round(featured.totalRaised / 1000)}K`} label="Funded" color={colorFor(featured.category)} />
                    <MetricBox value={featured.durationMonths ? `${featured.durationMonths} mo` : "—"} label="Timeline" color={colorFor(featured.category)} />
                  </div>
                </div>
                <Link
                  to={`/donate?projectId=${featured.id}&title=${encodeURIComponent(featured.title)}&goal=${featured.fundingGoal}&location=${encodeURIComponent(featured.location)}`}
                  style={{ display: "inline-block", padding: "14px 32px", background: colorFor(featured.category), color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", textAlign: "center" }}
                >Support this project</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4 — Filters & search */}
      <section style={{ background: C.bg, padding: "28px 24px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 400 }}>
              <span aria-hidden="true" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>🔍</span>
              <input
                type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects by name or location…" aria-label="Search projects"
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px 12px 38px", border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, background: "#fff" }}
              />
            </div>
            <div style={filterItemStyle}>
              <FixedSelect value={category} onChange={(e) => setCategory(e.target.value)} style={dropdownStyle}>
                {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FixedSelect>
            </div>
            <div style={filterItemStyle}>
              <FixedSelect value={status} onChange={(e) => setStatus(e.target.value)} style={dropdownStyle}>
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FixedSelect>
            </div>
            <div style={filterItemStyle}>
              <FixedSelect value={region} onChange={(e) => setRegion(e.target.value)} style={dropdownStyle}>
                <option value="">All regions</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </FixedSelect>
            </div>
            <div style={filterItemStyle}>
              <FixedSelect value={budget} onChange={(e) => setBudget(e.target.value)} style={dropdownStyle}>
                {BUDGET_BUCKETS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FixedSelect>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {activeFilters.map((f) => (
                <span key={f.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: C.text, border: `1px solid ${C.border}`, padding: "6px 12px", borderRadius: 20, fontSize: 12 }}>
                  {f.label}
                  <button onClick={f.clear} aria-label={`Remove filter ${f.label}`} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
              <button onClick={clearAll} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Clear all</button>
            </div>
          )}
        </div>
      </section>

      {/* 5 — Results header */}
      <section style={{ background: "#fff", padding: "16px 24px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>{filtered.length} project{filtered.length === 1 ? "" : "s"} found</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <FixedSelect value={sort} onChange={(e) => setSort(e.target.value)} style={{ fontSize: 13, borderRadius: 8, padding: "8px 12px", minWidth: 190 }}>
              {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FixedSelect>
            {!isMobile && (
              <div style={{ display: "flex", gap: 4 }} role="group" aria-label="View mode">
                {[["grid", "▦ Grid"], ["list", "☰ List"]].map(([v, label]) => (
                  <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
                    style={{ background: view === v ? C.blue : C.bg, color: view === v ? "#fff" : C.text, border: `1px solid ${view === v ? C.blue : C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6/7 — Grid or list */}
      <section style={{ background: view === "list" ? "#fff" : "#fff", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 260 : 320}px, 1fr))`, gap: 28 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: "60px 24px", textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
              <div style={{ fontSize: 52, color: C.muted, opacity: 0.4, marginBottom: 12 }} aria-hidden="true">💼</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>No projects found</h3>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Try adjusting your filters to find projects that match your interests.</p>
              <button onClick={clearAll} style={{ padding: "10px 22px", background: C.blue, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Clear filters</button>
            </div>
          )}

          {!loading && filtered.length > 0 && (isMobile || view === "grid") && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 260 : 320}px, 1fr))`, gap: 28 }}>
              {pageItems.map((p) => <ProjectCard key={p.id} p={p} onOpen={setOpenProject} />)}
            </div>
          )}

          {!loading && filtered.length > 0 && !isMobile && view === "list" && (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.4fr 1fr", gap: 12, padding: "12px 16px", background: C.navy, color: "#fff", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                <span>Project</span><span>Location</span><span>Status</span><span>People</span><span>Funding</span><span>Action</span>
              </div>
              {pageItems.map((p) => <ProjectRow key={p.id} p={p} onOpen={setOpenProject} />)}
            </div>
          )}

          {!loading && filtered.length > 0 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}
        </div>
      </section>

      {/* CTA */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 24px 64px" }}>
        <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, borderRadius: 20, padding: "40px 32px", textAlign: "center", color: "#fff" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px", color: "#fff" }}>Know a Community in Need?</h2>
          <p style={{ opacity: 0.8, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.7 }}>
            Field agents, local leaders, and community members can submit a project for review. Our team verifies and connects it with donors.
          </p>
          <Link to="/contact" style={{ display: "inline-block", padding: "13px 32px", borderRadius: 12, background: C.gold, color: "#fff", fontWeight: 800, textDecoration: "none", fontSize: 15, boxShadow: `0 4px 16px ${C.gold}50` }}>
            Submit a Project Idea
          </Link>
        </div>
      </div>

      {openProject && <DetailModal p={openProject} onClose={() => setOpenProject(null)} />}
    </div>
  );
}
