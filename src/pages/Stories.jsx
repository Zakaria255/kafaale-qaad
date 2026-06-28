import { useState, useEffect } from "react";
import FixedSelect from "../components/FixedSelect.jsx";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { useResponsive } from "../hooks/useResponsive.js";
import { C } from "../theme.js";
import { STORY_IMGS, getStoryImg } from "../utils/storyImages.js";
import { getCat } from "../utils/categories.js";

const STORIES_KEY = "kf_impact_stories";
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
      icon: "✍️",
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
            ✍️ Share Your Story
          </h2>
          <p style={{ fontSize:15, color:C.muted, maxWidth:520, margin:"0 auto", lineHeight:1.7 }}>
            Are you a beneficiary, volunteer, or community member? Tell us what happened — our team reviews every submission and publishes verified stories to inspire more donors.
          </p>
        </div>

        {phase === "success" ? (
          <div style={{ background:"#fff", borderRadius:20, padding:"48px 32px", textAlign:"center", boxShadow:"0 4px 24px rgba(0,38,81,0.09)", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
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
              {errors.title && <div style={{ fontSize:12, color:"#C0392B", marginTop:4 }}>⚠ {errors.title}</div>}
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
              {errors.what && <div style={{ fontSize:12, color:"#C0392B", marginTop:4 }}>⚠ {errors.what}</div>}
            </div>

            {/* Outcome */}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>What Changed? *</label>
              <textarea rows={4} value={form.outcome} onChange={e=>set("outcome",e.target.value)}
                placeholder="Describe the outcome — how did the support change the situation?"
                style={{ ...inp(), resize:"vertical", lineHeight:1.7 }} />
              {errors.outcome && <div style={{ fontSize:12, color:"#C0392B", marginTop:4 }}>⚠ {errors.outcome}</div>}
            </div>

            {/* Consent */}
            <div style={{ background:C.bg, borderRadius:12, padding:"14px 16px", marginBottom:24 }}>
              <label style={{ display:"flex", gap:10, cursor:"pointer", fontSize:13, color:C.text, lineHeight:1.6 }}>
                <input type="checkbox" checked={form.consent} onChange={e=>set("consent",e.target.checked)} style={{ marginTop:2, flexShrink:0 }} />
                <span>I confirm that this story is true and I consent to Kafaala Qaad reviewing and potentially publishing it on their platform and social media. My identity will remain protected unless I chose otherwise.</span>
              </label>
              {errors.consent && <div style={{ fontSize:12, color:"#C0392B", marginTop:6 }}>⚠ {errors.consent}</div>}
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

const STATIC_STORIES = [
  {
    id:"st1", category:"Success Story", date:"2026-05-12", location:"Mogadishu",
    title:"Family of Seven Finds Safety After Flood Displacement",
    excerpt:"After losing their home to seasonal flooding, a family of seven was living in a collapsed structure. Within 14 days of verification, Kafaala Qaad delivered emergency shelter, three months of food supplies, and clothing for all children.",
    beforeImg:null, afterImg:null,
    beforeDesc:"Family of 7 living in collapsed structure with no clean water or food.",
    afterDesc:"Temporary shelter erected, food supply secured for 3 months, children back in school.",
    daysToDeliver:"14", amountDistributed:"$820",
    tags:["shelter","food","emergency"],
    featured: true,
  },
  {
    id:"st2", category:"Medical", date:"2026-04-28", location:"Baidoa",
    title:"8-Year-Old Girl Receives Critical Medication",
    excerpt:"A young girl in Baidoa had been without essential medication for weeks, causing rapid health deterioration. After case verification, sponsors covered four months of doctor visits and medication costs.",
    beforeImg:null, afterImg:null,
    beforeDesc:"Critical medication unavailable, health deteriorating rapidly.",
    afterDesc:"Full medication course delivered, 4 months of specialist visits funded.",
    daysToDeliver:"9", amountDistributed:"$540",
    tags:["medical","child"],
    featured: false,
  },
  {
    id:"st3", category:"Education", date:"2026-04-10", location:"Kismayo",
    title:"Three Orphaned Brothers Return to School",
    excerpt:"Three brothers aged 9, 11, and 13 had dropped out after losing both parents. An education program sponsor covered school fees, uniforms, and stationery for a full academic year.",
    beforeImg:null, afterImg:null,
    beforeDesc:"Three brothers out of school, surviving on charity from neighbours.",
    afterDesc:"All three enrolled, school fees paid, uniforms and supplies provided.",
    daysToDeliver:"21", amountDistributed:"$960",
    tags:["education","orphan","children"],
    featured: true,
  },
  {
    id:"st4", category:"Food & Nutrition", date:"2026-03-22", location:"Garowe",
    title:"Weekly Food Deliveries Reach Isolated Elder",
    excerpt:"A 78-year-old man living alone with no income had no reliable access to food. A monthly food program now ensures weekly deliveries and a community health worker visits regularly.",
    beforeImg:null, afterImg:null,
    beforeDesc:"No food security, no family contact, deteriorating health.",
    afterDesc:"Weekly food delivery, monthly health check, reconnected with distant family.",
    daysToDeliver:"11", amountDistributed:"$460",
    tags:["food","elderly"],
    featured: false,
  },
  {
    id:"st5", category:"Press Release", date:"2026-03-05", location:"Mogadishu",
    title:"Kafaala Qaad Reaches 500 Verified Cases Milestone",
    excerpt:"The platform announces the verification and aid delivery for its 500th case, representing families in 12 regions across Somalia. Total funds distributed exceed $380,000.",
    beforeImg:null, afterImg:null,
    beforeDesc:"", afterDesc:"",
    daysToDeliver:null, amountDistributed:"$380,000+",
    tags:["milestone","platform"],
    featured: true,
  },
  {
    id:"st6", category:"Partnership", date:"2026-02-18", location:"",
    title:"New Partnership with Regional Health Ministry",
    excerpt:"A formal agreement enables Kafaala Qaad field agents to coordinate directly with regional health clinics for medical cases, reducing verification time from 14 days to under 5 days.",
    beforeImg:null, afterImg:null,
    beforeDesc:"", afterDesc:"",
    daysToDeliver:null, amountDistributed:null,
    tags:["partnership","health"],
    featured: false,
  },
];

const CAT_COLORS = {
  "Success Story":    { bg:"#D1FAE5", text:"#065F46" },
  "Medical":          { bg:"#DBEAFE", text:"#1E40AF" },
  "Education":        { bg:"#FEF3C7", text:"#92400E" },
  "Food & Nutrition": { bg:"#FDE8D8", text:"#9A3412" },
  "Press Release":    { bg:"#EDE9FE", text:"#5B21B6" },
  "Partnership":      { bg:"#FCE7F3", text:"#831843" },
  "Emergency":        { bg:"#FEE2E2", text:"#991B1B" },
  "Program Update":   { bg:"#ECFDF5", text:"#065F46" },
};
const catStyle = (cat) => CAT_COLORS[cat] || { bg:"#F3F4F6", text:"#374151" };

const fmt = (d) => {
  try { return new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }); }
  catch { return d; }
};

const PUB_KEY = "kf_published_stories";

const parseAdminStories = () => {
  try {
    return JSON.parse(localStorage.getItem(STORIES_KEY) || "[]").map(s => ({
      ...s,
      source:   "admin",
      date:     s.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
      excerpt:  [s.beforeDesc, s.afterDesc].filter(Boolean).join(" → ").slice(0, 160) + "…",
      tags:     [s.category?.toLowerCase().replace(/\s+/g,"-")].filter(Boolean),
      featured: Boolean(s.featured), // respect admin-set flag
    }));
  } catch { return []; }
};

const parsePubStories = () => {
  try {
    return JSON.parse(localStorage.getItem(PUB_KEY) || "[]").map(s => ({
      ...s,
      source:   "community",
      date:     s.publishedAt?.split("T")[0] || s.submittedAt?.split("T")[0] || new Date().toISOString().split("T")[0],
      excerpt:  (s.afterDesc || s.beforeDesc || s.what || "").slice(0, 160) + "…",
      tags:     [s.category?.toLowerCase().replace(/\s+/g,"-")].filter(Boolean),
      featured: Boolean(s.featured), // respect admin-set flag
    }));
  } catch { return []; }
};

export default function Stories() {
  const { lang } = useLang();
  const { isMobile, isTablet } = useResponsive();

  const [adminStories, setAdminStories] = useState(parseAdminStories);
  const [pubStories,   setPubStories]   = useState(parsePubStories);

  useEffect(() => {
    const sync = () => {
      setAdminStories(parseAdminStories());
      setPubStories(parsePubStories());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const allStories = [...adminStories, ...pubStories, ...STATIC_STORIES];
  const CATEGORIES = ["All", ...Array.from(new Set(allStories.map(s => s.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");

  const displayed = allStories.filter(s => {
    const matchCat = activeCat === "All" || s.category === activeCat;
    const q = search.toLowerCase();
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.excerpt?.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const featured = displayed.filter(s => s.featured);
  const rest     = displayed.filter(s => !s.featured);

  const wrap  = { maxWidth:1200, margin:"0 auto", padding: isMobile?"0 16px":"0 32px" };
  const sec   = (bg) => ({ background:bg, padding: isMobile?"48px 0":"72px 0" });

  return (
    <>
      {/* Hero — tree image as full-bleed background */}
      <section style={{ position:"relative", overflow:"hidden", minHeight: isMobile?360:480, display:"flex", alignItems:"center" }}>
        {/* Tree image — full cover */}
        <img src="/stories-hero.jpg" alt=""
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }} />
        {/* Dark gradient overlay — heavier on text side so copy is readable */}
        <div style={{ position:"absolute", inset:0, background: isMobile
          ? "linear-gradient(to bottom, rgba(0,14,40,0.72) 0%, rgba(0,25,60,0.85) 100%)"
          : "linear-gradient(to right, rgba(0,14,40,0.18) 0%, rgba(0,25,60,0.55) 40%, rgba(0,14,40,0.88) 65%, rgba(0,10,30,0.95) 100%)"
        }} />
        {/* Content — pushed to right on desktop, centered on mobile */}
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
              <span style={{ position:"absolute", right:18, top:"50%", transform:"translateY(-50%)", fontSize:18, opacity:0.45 }}>🔍</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category filter */}
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
                {cat}
                <span style={{ marginLeft:6, fontSize:11, opacity:0.6 }}>
                  ({cat==="All" ? allStories.length : allStories.filter(s=>s.category===cat).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured stories */}
      {featured.length > 0 && (
        <section style={sec("#fff")}>
          <div style={wrap}>
            <h2 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:24 }}>
              ⭐ {lang==="so"?"Xikaayada Muhiimka ah":lang==="ar"?"القصص المميزة":lang==="tr"?"Öne Çıkan Hikayeler":lang==="es"?"Historias Destacadas":lang==="fr"?"Histoires à la Une":"Featured Stories"}
            </h2>
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": featured.length===1?"1fr":"1fr 1fr", gap:24 }}>
              {featured.slice(0,2).map(story => {
                const cs = catStyle(story.category);
                const ICON = story.category==="Education"?"🎓":story.category==="Medical"?"🩺":story.category==="Press Release"?"📣":story.category==="Partnership"?"🤝":"❤️";
                return (
                  <Link key={story.id} to={`/stories/${story.id}`}
                    style={{ background:"#fff", borderRadius:18, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,38,81,0.10)", border:`1px solid ${C.border}`, textDecoration:"none", display:"block", transition:"transform .15s, box-shadow .15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,38,81,0.14)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 24px rgba(0,38,81,0.10)";}}>
                    <img src={getStoryImg(story)} alt={story.title} style={{ width:"100%", height:220, objectFit:"cover", display:"block" }} />
                    <div style={{ padding:"20px 24px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                        <span style={{ background:cs.bg, color:cs.text, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 }}>{story.category}</span>
                        <span style={{ fontSize:11, color:C.muted }}>{fmt(story.date)}</span>
                        {story.location && <span style={{ fontSize:11, color:C.muted }}>📍 {story.location}</span>}
                      </div>
                      <h3 style={{ fontSize:20, fontWeight:800, color:C.text, margin:"0 0 10px", lineHeight:1.3 }}>{story.title}</h3>
                      <p style={{ fontSize:14, color:C.muted, lineHeight:1.7, margin:"0 0 16px" }}>{story.excerpt}</p>
                      <span style={{ fontSize:13, fontWeight:700, color:C.primary }}>Read now →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* All stories grid */}
      <section style={sec(C.bg)}>
        <div style={wrap}>
          {rest.length > 0 && (
            <h2 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:24 }}>
              {lang==="so"?"Dhammaan Xikaayada":lang==="ar"?"جميع القصص":lang==="tr"?"Tüm Hikayeler":lang==="es"?"Todas las Historias":lang==="fr"?"Toutes les Histoires":"All Stories"}
              <span style={{ fontSize:14, color:C.muted, fontWeight:400, marginLeft:10 }}>({rest.length})</span>
            </h2>
          )}
          {displayed.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
              <div style={{ fontSize:18, fontWeight:700 }}>No stories found</div>
              <div style={{ fontSize:14, marginTop:8 }}>Try a different search or category</div>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":"repeat(3,1fr)", gap: isMobile?16:24 }}>
            {rest.map(story => {
              const cs = catStyle(story.category);
              const ICON = story.category==="Education"?"🎓":story.category==="Medical"?"🩺":story.category==="Press Release"?"📣":story.category==="Partnership"?"🤝":story.category==="Emergency"?"🚨":"❤️";
              return (
                <Link key={story.id} to={`/stories/${story.id}`}
                  style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,38,81,0.07)", border:`1px solid ${C.border}`, textDecoration:"none", display:"block", transition:"transform .15s, box-shadow .15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 24px rgba(0,38,81,0.12)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,38,81,0.07)";}}>
                  <img src={getStoryImg(story)} alt={story.title} style={{ width:"100%", height:160, objectFit:"cover", display:"block" }} />
                  <div style={{ padding:"16px 18px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <span style={{ background:cs.bg, color:cs.text, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{story.category}</span>
                      <span style={{ fontSize:11, color:C.muted }}>{fmt(story.date)}</span>
                    </div>
                    {story.location && <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>📍 {story.location}</div>}
                    <h3 style={{ fontSize:15, fontWeight:800, color:C.text, margin:"0 0 8px", lineHeight:1.35 }}>{story.title}</h3>
                    <p style={{ fontSize:13, color:C.muted, lineHeight:1.65, margin:"0 0 14px", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {story.excerpt}
                    </p>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:12, fontWeight:700, color:C.primary }}>Read now →</span>
                      {(story.daysToDeliver || story.amountDistributed) && (
                        <span style={{ fontSize:11, color:C.muted }}>
                          {story.daysToDeliver ? `${story.daysToDeliver}d · ` : ""}{story.amountDistributed || ""}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

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
              ❤️ Sponsor a Case
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}
