import { useState, useEffect, useCallback } from "react";
import FixedSelect from "../components/FixedSelect.jsx";
import { Link } from "react-router-dom";
import { cases as casesApi } from "../api/client";
import { useLang } from "../context/LanguageContext.jsx";
import { useResponsive } from "../hooks/useResponsive.js";
import { C } from "../theme.js";
import { getStoryImg } from "../utils/storyImages.js";
import { getCat } from "../utils/categories.js";

// Community-story submissions are stored locally — no backend endpoint exists yet
// for public story submissions (flagged in the wiring audit). Left as-is.
const SUBMISSIONS_KEY = "kf_story_submissions";

const CATS = getCat("stories");

function StorySubmitSection({ isMobile }) {
  const EMPTY = { name:"", anonymous:false, title:"", category:"Medical", location:"", what:"", outcome:"", consent:false };
  const [form,    setForm]    = useState(EMPTY);
  const [phase,   setPhase]   = useState("form"); // form | success
  const [errors,  setErrors]  = useState({});

  const id = "share";

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim())   e.title   = "Please enter a story title";
    if (!form.what.trim())    e.what    = "Please describe what happened";
    if (!form.outcome.trim()) e.outcome = "Please describe the outcome";
    if (!form.consent)        e.consent = "Please confirm your consent";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const sub = {
      id: "sub_" + Date.now(),
      submittedAt: new Date().toISOString(),
      status: "pending",
      authorName: form.anonymous ? "Anonymous" : (form.name || "Community Member"),
      title: form.title,
      category: form.category,
      location: form.location,
      beforeDesc: form.what,
      afterDesc: form.outcome,
      icon: "",
      date: new Date().toLocaleDateString("en-GB", { month:"long", year:"numeric" }),
    };
    try {
      const existing = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || "[]");
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([sub, ...existing]));
      window.dispatchEvent(new Event("storage"));
    } catch {}
    setPhase("success");
  };

  const inp = (extra={}) => ({
    fontFamily:"inherit", fontSize:14, color:C.text, padding:"10px 14px",
    border:`1.5px solid ${C.border}`, borderRadius:10, width:"100%",
    background:"#fff", boxSizing:"border-box", outline:"none",
    ...extra,
  });

  return (
    <section id={id} style={{ background:C.bg, padding: isMobile?"48px 20px":"72px 32px" }}>
      <div style={{ maxWidth:760, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <span style={{ background:C.secondary+"20", color:C.secondary, borderRadius:99, padding:"5px 16px", fontSize:12, fontWeight:800, letterSpacing:1, textTransform:"uppercase" }}>
            Community Stories
          </span>
          <h2 style={{ fontSize:"clamp(24px,3.5vw,36px)", fontWeight:900, color:C.navy, margin:"14px 0 10px", letterSpacing:-0.4 }}>
            Share Your Story
          </h2>
          <p style={{ fontSize:15, color:C.muted, maxWidth:520, margin:"0 auto", lineHeight:1.7 }}>
            Are you a beneficiary, volunteer, or community member? Tell us what happened — our team reviews every submission and publishes verified stories to inspire more donors.
          </p>
        </div>

        {phase === "success" ? (
          <div style={{ background:"#fff", borderRadius:20, padding:"48px 32px", textAlign:"center", boxShadow:"0 4px 24px rgba(0,38,81,0.09)", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:64, marginBottom:16 }}></div>
            <h3 style={{ fontSize:24, fontWeight:900, color:C.navy, margin:"0 0 12px" }}>Story Submitted!</h3>
            <p style={{ fontSize:15, color:C.muted, maxWidth:400, margin:"0 auto 28px", lineHeight:1.7 }}>
              Thank you for sharing. Our team will review your submission and may reach out for more details before publishing.
            </p>
            <button onClick={() => { setForm(EMPTY); setPhase("form"); }} style={{
              padding:"12px 28px", borderRadius:10, border:`1.5px solid ${C.primary}`,
              color:C.primary, fontWeight:700, fontSize:14, cursor:"pointer", background:"#fff",
            }}>Submit Another Story</button>
          </div>
        ) : (
          <div style={{ background:"#fff", borderRadius:20, padding: isMobile?"24px 18px":"36px 40px", boxShadow:"0 4px 24px rgba(0,38,81,0.09)", border:`1px solid ${C.border}` }}>
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:18, marginBottom:18 }}>
              {/* Name */}
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>Your Name (optional)</label>
                <input value={form.name} onChange={e=>set("name",e.target.value)} disabled={form.anonymous}
                  placeholder="e.g. Halima Mohamed" style={{ ...inp(), opacity: form.anonymous ? 0.4 : 1 }} />
                <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:8, fontSize:13, color:C.muted, cursor:"pointer" }}>
                  <input type="checkbox" checked={form.anonymous} onChange={e=>set("anonymous",e.target.checked)} />
                  Submit anonymously
                </label>
              </div>
              {/* Category */}
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>Category *</label>
                <FixedSelect value={form.category} onChange={e=>set("category",e.target.value)} style={{ width:"100%", borderRadius:10, fontSize:14 }}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </FixedSelect>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>Story Title *</label>
              <input value={form.title} onChange={e=>set("title",e.target.value)}
                placeholder="e.g. My child received the surgery she needed" style={inp()} />
              {errors.title && <div style={{ fontSize:12, color:"#C0392B", marginTop:4 }}>{errors.title}</div>}
            </div>

            {/* Location */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>Location</label>
              <input value={form.location} onChange={e=>set("location",e.target.value)}
                placeholder="e.g. Mogadishu, Baidoa, Kismayo…" style={inp()} />
            </div>

            {/* What happened */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>What Happened? *</label>
              <textarea rows={4} value={form.what} onChange={e=>set("what",e.target.value)}
                placeholder="Describe the situation before help arrived — what was the challenge or hardship?"
                style={{ ...inp(), resize:"vertical", lineHeight:1.7 }} />
              {errors.what && <div style={{ fontSize:12, color:"#C0392B", marginTop:4 }}>{errors.what}</div>}
            </div>

            {/* Outcome */}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>What Changed? *</label>
              <textarea rows={4} value={form.outcome} onChange={e=>set("outcome",e.target.value)}
                placeholder="Describe the outcome — how did the support change the situation?"
                style={{ ...inp(), resize:"vertical", lineHeight:1.7 }} />
              {errors.outcome && <div style={{ fontSize:12, color:"#C0392B", marginTop:4 }}>{errors.outcome}</div>}
            </div>

            {/* Consent */}
            <div style={{ background:C.bg, borderRadius:12, padding:"14px 16px", marginBottom:24 }}>
              <label style={{ display:"flex", gap:10, cursor:"pointer", fontSize:13, color:C.text, lineHeight:1.6 }}>
                <input type="checkbox" checked={form.consent} onChange={e=>set("consent",e.target.checked)} style={{ marginTop:2, flexShrink:0 }} />
                <span>I confirm that this story is true and I consent to Kafaala Qaad reviewing and potentially publishing it on their platform and social media. My identity will remain protected unless I chose otherwise.</span>
              </label>
              {errors.consent && <div style={{ fontSize:12, color:"#C0392B", marginTop:6 }}>{errors.consent}</div>}
            </div>

            <button onClick={submit} style={{
              width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer",
              background:`linear-gradient(135deg,${C.primary},${C.navy})`,
              color:"#fff", fontWeight:800, fontSize:16,
              boxShadow:`0 4px 20px ${C.primary}40`,
            }}>
              Submit My Story →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Case category → display label / colour tone / stock image key ─────────────
// Keys are the real lowercase `Case.category` enum values (verified in
// backend/src/routes/cases.ts CreateCaseSchema). Tones use brand tokens only.
const CASE_CATEGORY = {
  food:              { label:{ en:"Food & Nutrition", so:"Cunto & Nafaqo" }, tone:C.gold,      img:"Food" },
  medical:           { label:{ en:"Medical",          so:"Caafimaad" },      tone:C.primary,   img:"Medical" },
  shelter:           { label:{ en:"Shelter",          so:"Hoy" },            tone:C.secondary, img:"Shelter" },
  orphan:            { label:{ en:"Orphan Care",      so:"Daryeel Agoon" },  tone:C.secondary, img:"Orphan" },
  disaster:          { label:{ en:"Disaster Relief",  so:"Gargaar Musiibo" },tone:C.navy,      img:"Emergency" },
  education:         { label:{ en:"Education",        so:"Waxbarasho" },     tone:C.gold,      img:"Education" },
  child_support:     { label:{ en:"Child Support",    so:"Taageero Caruur" },tone:C.secondary, img:"Orphan" },
  family_support:    { label:{ en:"Family Support",   so:"Taageero Qoys" },  tone:C.primary,   img:"Success Story" },
  emergency:         { label:{ en:"Emergency",        so:"Degdeg" },         tone:C.navy,      img:"Emergency" },
  water_project:     { label:{ en:"Water",            so:"Biyo" },           tone:C.primary,   img:"Water" },
  school_project:    { label:{ en:"School Project",   so:"Mashruuc Dugsi" }, tone:C.gold,      img:"Education" },
  community_project: { label:{ en:"Community",        so:"Bulsho" },         tone:C.secondary, img:"Success Story" },
  other:             { label:{ en:"Other",            so:"Kale" },           tone:C.muted,     img:"default" },
};
const catMeta  = (cat) => CASE_CATEGORY[cat] || CASE_CATEGORY.other;
const catLabel = (cat, lang) => { const m = catMeta(cat); return m.label[lang] || m.label.en; };

const money = (n) => "$" + Number(n || 0).toLocaleString();
const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }); }
  catch { return ""; }
};

// Map a public Case (from GET /api/cases) to the card view-model this page renders.
// Only public* fields are read — the server select never exposes private* PII.
const caseToStory = (c) => ({
  id:        c.id,
  title:     c.publicTitle || "Verified Case",
  excerpt:   c.publicStory || "",
  category:  c.category,
  location:  [c.publicCity, c.publicCountry].filter(Boolean).join(", "),
  date:      c.adminPublishedAt,
  raised:    c.totalRaised,
  donations: c._count?.donations ?? 0,
});

export default function Stories() {
  const { lang } = useLang();
  const { isMobile, isTablet } = useResponsive();

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    // Public impact stories = completed cases (aid delivered). The /cases feed
    // returns only public statuses; we keep the completed ones for this page.
    casesApi.list({ limit: 60 })
      .then(d => {
        const completed = (d.cases || []).filter(c => c.status === "completed");
        setStories(completed.map(caseToStory));
      })
      .catch(() => setError(lang==="so" ? "Xikaayadaha lama soo dejin karin." : "We couldn't load stories right now."))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  // Category tabs derived from the real categories present in the data.
  const presentCats = Array.from(new Set(stories.map(s => s.category)));
  const CATEGORIES = ["All", ...presentCats];

  const displayed = stories.filter(s => {
    const matchCat = activeCat === "All" || s.category === activeCat;
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || s.title.toLowerCase().includes(q)
      || s.excerpt.toLowerCase().includes(q)
      || s.location.toLowerCase().includes(q)
      || catLabel(s.category, lang).toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Editorial highlight: the two most recent stories (feed is ordered newest-first).
  const featured = displayed.slice(0, 2);
  const rest     = displayed.slice(2);

  const wrap = { maxWidth:1200, margin:"0 auto", padding: isMobile?"0 16px":"0 32px" };
  const sec  = (bg) => ({ background:bg, padding: isMobile?"48px 0":"72px 0" });

  const catCount = (cat) => cat==="All" ? stories.length : stories.filter(s=>s.category===cat).length;

  // ── Card renderer (shared between featured + grid) ──────────────────────────
  const StoryCard = (story, big) => {
    const m = catMeta(story.category);
    return (
      <Link key={story.id} to={`/cases/${story.id}`}
        style={{ background:"#fff", borderRadius: big?18:16, overflow:"hidden",
          boxShadow: big?"0 4px 24px rgba(0,38,81,0.10)":"0 2px 12px rgba(0,38,81,0.07)",
          border:`1px solid ${C.border}`, textDecoration:"none", display:"block", transition:"transform .15s, box-shadow .15s" }}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,38,81,0.14)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=big?"0 4px 24px rgba(0,38,81,0.10)":"0 2px 12px rgba(0,38,81,0.07)";}}>
        <div style={{ position:"relative" }}>
          <img src={getStoryImg({ category:m.img })} alt={story.title} loading="lazy"
            style={{ width:"100%", height: big?220:160, objectFit:"cover", display:"block" }} />
          <span style={{ position:"absolute", top:12, right:12, background:C.secondary+"E6", color:"#fff", borderRadius:99, padding:"3px 11px", fontSize:11, fontWeight:800 }}>
            ✓ {lang==="so"?"La xaqiijiyay":"Verified"}
          </span>
        </div>
        <div style={{ padding: big?"20px 24px":"16px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
            <span style={{ background:m.tone+"18", color:m.tone, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 }}>{catLabel(story.category, lang)}</span>
            {story.date && <span style={{ fontSize:11, color:C.muted }}>{fmtDate(story.date)}</span>}
            {story.location && <span style={{ fontSize:11, color:C.muted }}>{story.location}</span>}
          </div>
          <h3 style={{ fontSize: big?20:15, fontWeight:800, color:C.text, margin:"0 0 8px", lineHeight:1.35 }}>{story.title}</h3>
          {story.excerpt && (
            <p style={{ fontSize: big?14:13, color:C.muted, lineHeight:1.65, margin:"0 0 14px", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
              {story.excerpt}
            </p>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize: big?13:12, fontWeight:700, color:C.primary }}>{lang==="so"?"Akhri →":"Read now →"}</span>
            {story.raised > 0 && (
              <span style={{ fontSize:11, color:C.muted }}>
                {money(story.raised)} {lang==="so"?"la ururiyay":"raised"}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Hero — tree image as full-bleed background */}
      <section style={{ position:"relative", overflow:"hidden", minHeight: isMobile?360:480, display:"flex", alignItems:"center" }}>
        <img src="/stories-hero.jpg" alt=""
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }} />
        <div style={{ position:"absolute", inset:0, background: isMobile
          ? "linear-gradient(to bottom, rgba(0,14,40,0.72) 0%, rgba(0,25,60,0.85) 100%)"
          : "linear-gradient(to right, rgba(0,14,40,0.18) 0%, rgba(0,25,60,0.55) 40%, rgba(0,14,40,0.88) 65%, rgba(0,10,30,0.95) 100%)"
        }} />
        <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:1200, margin:"0 auto", padding: isMobile?"48px 24px":"72px 48px", display:"flex", justifyContent: isMobile?"center":"flex-end" }}>
          <div style={{ maxWidth:480, color:"#fff", textAlign: isMobile?"center":"left" }}>
            <span style={{ display:"inline-block", background:"rgba(255,255,255,0.14)", border:"1.5px solid rgba(255,255,255,0.32)", borderRadius:24, padding:"5px 18px", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:22, backdropFilter:"blur(8px)" }}>
              {lang==="so"?"Wararkii & Xikaayada":"News & Stories"}
            </span>
            <h1 style={{ fontSize:"clamp(28px,4vw,52px)", fontWeight:900, margin:"0 0 18px", lineHeight:1.08, letterSpacing:-1.5, textShadow:"0 2px 24px rgba(0,0,0,0.5)" }}>
              {lang==="so"?"Xikaayada Saameynta Dhabta ah":"Real Impact Stories"}
            </h1>
            <p style={{ fontSize:16, color:"rgba(255,255,255,0.88)", lineHeight:1.85, margin:"0 0 32px" }}>
              {lang==="so"?"Xaaladda la xaqiijiyay kasta waxay bedeshaa nolosha.":"Every verified case transforms a life. These are the stories behind the numbers — real people, real crises, real outcomes made possible by verified giving."}
            </p>
            {/* Search */}
            <div style={{ maxWidth:420, position:"relative" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder={lang==="so"?"Raadi xikaayo...":"Search stories…"}
                style={{ width:"100%", padding:"14px 48px 14px 18px", borderRadius:50, border:"none", fontSize:14, boxSizing:"border-box", outline:"none", boxShadow:"0 6px 24px rgba(0,0,0,0.35)" }}
              />
              <span style={{ position:"absolute", right:18, top:"50%", transform:"translateY(-50%)", fontSize:18, opacity:0.45 }}></span>
            </div>
          </div>
        </div>
      </section>

      {/* Category filter — only meaningful once real stories exist */}
      {!loading && !error && stories.length > 0 && (
        <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:10 }}>
          <div style={{ ...wrap, paddingTop:0, paddingBottom:0 }}>
            <div style={{ display:"flex", gap:0, overflowX:"auto", scrollbarWidth:"none" }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  style={{
                    padding:"14px 20px", background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap",
                    fontSize:13, fontWeight:700,
                    color:      activeCat===cat ? C.primary : C.muted,
                    borderBottom: activeCat===cat ? `3px solid ${C.primary}` : "3px solid transparent",
                    transition:"all .15s",
                  }}>
                  {cat==="All" ? (lang==="so"?"Dhammaan":"All") : catLabel(cat, lang)}
                  <span style={{ marginLeft:6, fontSize:11, opacity:0.6 }}>({catCount(cat)})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <section style={sec(C.bg)}>
          <div style={wrap}>
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":"repeat(3,1fr)", gap: isMobile?16:24 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ background:"#fff", borderRadius:16, overflow:"hidden", border:`1px solid ${C.border}` }}>
                  <div style={{ height:160, background:C.border, opacity:0.5 }} />
                  <div style={{ padding:"16px 18px" }}>
                    <div style={{ height:12, width:"40%", background:C.border, borderRadius:6, marginBottom:12 }} />
                    <div style={{ height:16, width:"85%", background:C.border, borderRadius:6, marginBottom:10 }} />
                    <div style={{ height:12, width:"100%", background:C.border, borderRadius:6, marginBottom:6, opacity:0.6 }} />
                    <div style={{ height:12, width:"70%", background:C.border, borderRadius:6, opacity:0.6 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <section style={sec(C.bg)}>
          <div style={{ ...wrap, textAlign:"center", padding: isMobile?"64px 16px":"96px 32px" }}>
            <div style={{ fontSize:44, marginBottom:14 }}>⚠️</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:8 }}>{error}</div>
            <div style={{ fontSize:14, color:C.muted, marginBottom:24 }}>
              {lang==="so"?"Fadlan mar kale isku day.":"Please check your connection and try again."}
            </div>
            <button onClick={load} style={{ padding:"11px 26px", borderRadius:10, border:"none", background:C.primary, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              {lang==="so"?"Mar kale isku day":"Retry"}
            </button>
          </div>
        </section>
      )}

      {/* ── Featured stories ── */}
      {!loading && !error && featured.length > 0 && (
        <section style={sec("#fff")}>
          <div style={wrap}>
            <h2 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:24 }}>
              {lang==="so"?"Xikaayada Muhiimka ah":"Featured Stories"}
            </h2>
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": featured.length===1?"1fr":"1fr 1fr", gap:24 }}>
              {featured.map(story => StoryCard(story, true))}
            </div>
          </div>
        </section>
      )}

      {/* ── All stories grid + empty state ── */}
      {!loading && !error && (
        <section style={sec(C.bg)}>
          <div style={wrap}>
            {rest.length > 0 && (
              <h2 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:24 }}>
                {lang==="so"?"Dhammaan Xikaayada":"All Stories"}
                <span style={{ fontSize:14, color:C.muted, fontWeight:400, marginLeft:10 }}>({rest.length})</span>
              </h2>
            )}

            {/* No stories at all (feed empty) vs. no match for current filter */}
            {displayed.length === 0 && (
              <div style={{ textAlign:"center", padding:"72px 0", color:C.muted }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📖</div>
                {stories.length === 0 ? (
                  <>
                    <div style={{ fontSize:18, fontWeight:700, color:C.text }}>
                      {lang==="so"?"Weli xikaayo lama daabicin":"No published stories yet"}
                    </div>
                    <div style={{ fontSize:14, marginTop:8, maxWidth:440, marginLeft:"auto", marginRight:"auto", lineHeight:1.7 }}>
                      {lang==="so"
                        ? "Marka xaaladaha la xaqiijiyay la dhammeeyo, xikaayadooda saameynta ayaa halkan ka soo muuqan doonta."
                        : "As verified cases are completed, their impact stories will appear here. Explore open cases you can support in the meantime."}
                    </div>
                    <Link to="/cases" style={{ display:"inline-block", marginTop:24, padding:"12px 28px", background:C.primary, color:"#fff", borderRadius:12, fontWeight:700, fontSize:14, textDecoration:"none" }}>
                      {lang==="so"?"Fiiri xaaladaha":"Browse open cases"}
                    </Link>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:18, fontWeight:700, color:C.text }}>{lang==="so"?"Wax xikaayo ah lama helin":"No stories found"}</div>
                    <div style={{ fontSize:14, marginTop:8 }}>{lang==="so"?"Isku day raadin ama qaybta kale":"Try a different search or category"}</div>
                  </>
                )}
              </div>
            )}

            {rest.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":"repeat(3,1fr)", gap: isMobile?16:24 }}>
                {rest.map(story => StoryCard(story, false))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══ SHARE YOUR STORY FORM ══ */}
      <StorySubmitSection isMobile={isMobile} />

      {/* CTA section */}
      <section style={{ background:`linear-gradient(135deg,${C.navy},${C.primary})`, color:"#fff", padding: isMobile?"48px 16px":"64px 32px", textAlign:"center" }}>
        <div style={{ maxWidth:640, margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(22px,4vw,38px)", fontWeight:900, margin:"0 0 16px" }}>
            {lang==="so"?"Noqo Qayb Ka Mid ah Xikaayadan":"Be Part of the Next Story"}
          </h2>
          <p style={{ fontSize:16, opacity:0.85, lineHeight:1.75, marginBottom:32 }}>
            {lang==="so"?"Deeqadaada ayaa abuuraysa xikaayo cusub. Taageer xaaladda xaqiijisan maanta.":"Your donation creates the next story. Sponsor a verified case today."}
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link to="/cases" style={{ padding:"14px 32px", background:C.gold, color:"#fff", borderRadius:12, fontWeight:800, fontSize:15, textDecoration:"none" }}>
              {lang==="so"?"Taageer Xaalad":"Sponsor a Case"}
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}
