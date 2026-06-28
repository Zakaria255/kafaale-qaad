import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";

const C = { navy:"#002651", primary:"#004B96", secondary:"#4B7D19", accent:"#E0AB21", muted:"#5A6E8A", bg:"#F4F7FC", border:"#D8E4F0", text:"#0D1F3C", gold:"#E0AB21", green:"#4B7D19", blue:"#004B96" };

const TEAM_KEY    = "kf_team_data";
const TEAM_VIS_KEY = "kf_team_visible";

const DEFAULT_TEAM = [
  { id:"t1", name:"Abdimalik Hassan", role:"Project Lead & CEO",       bio:"Humanitarian sector leader with 10+ years in crisis response across the Horn of Africa.", photo:"https://randomuser.me/api/portraits/men/32.jpg",  linkedin:"", show:true },
  { id:"t2", name:"Asha Mohammed",    role:"Product Manager",          bio:"Driving platform strategy and community partnerships across 4 countries.", photo:"https://randomuser.me/api/portraits/women/44.jpg", linkedin:"", show:true },
  { id:"t3", name:"Fatima Ali",       role:"Design Lead",              bio:"Award-winning UX designer focused on making aid technology accessible in low-connectivity environments.", photo:"https://randomuser.me/api/portraits/women/26.jpg", linkedin:"", show:true },
  { id:"t4", name:"Omar Ibrahim",     role:"Lead Backend Engineer",    bio:"Full-stack engineer specialising in secure, high-availability humanitarian platforms.", photo:"https://randomuser.me/api/portraits/men/68.jpg",  linkedin:"", show:true },
  { id:"t5", name:"Hodan Warsame",    role:"Field Operations Manager", bio:"Former UNHCR field officer with direct experience in IDP camp management and emergency response.", photo:"https://randomuser.me/api/portraits/women/62.jpg", linkedin:"", show:true },
  { id:"t6", name:"Mahad Yusuf",      role:"Security & DevOps",        bio:"Cybersecurity specialist ensuring donor data and beneficiary privacy across all systems.", photo:"https://randomuser.me/api/portraits/men/45.jpg",  linkedin:"", show:true },
];

const INITIALS_COLORS = [
  ["#DBEAFE","#1D4ED8"],["#D1FAE5","#065F46"],["#FCE7F3","#9D174D"],
  ["#EDE9FE","#5B21B6"],["#FEF3C7","#92400E"],["#FEE2E2","#991B1B"],
];

function getTeam() {
  try {
    const s = JSON.parse(localStorage.getItem(TEAM_KEY)||"null");
    if (!s) return DEFAULT_TEAM;
    // Backfill default photos for existing members that have no photo set
    return s.map(m => {
      const def = DEFAULT_TEAM.find(d => d.id === m.id);
      return (!m.photo && def?.photo) ? { ...m, photo: def.photo } : m;
    });
  } catch { return DEFAULT_TEAM; }
}
function getTeamVisible() {
  try { const s = localStorage.getItem(TEAM_VIS_KEY); return s === null ? true : s === "true"; } catch { return true; }
}

const IMPACT_STATS = [
  { val:"2,400+", label:"Cases Processed",    color:C.primary },
  { val:"98.8%",  label:"Verification Rate",  color:C.accent },
  { val:"6",      label:"Regions Covered",    color:"#8B5CF6" },
];

export default function About() {
  const { lang } = useLang();
  const P = PT.about[lang] || PT.about.en;

  const [team, setTeam] = useState(getTeam);
  const [teamVisible, setTeamVisible] = useState(getTeamVisible);

  useEffect(() => {
    const fn = () => { setTeam(getTeam()); setTeamVisible(getTeamVisible()); };
    window.addEventListener("storage", fn);
    return () => window.removeEventListener("storage", fn);
  }, []);

  const VALUES = [
    { icon:"🔍", svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
      title:"Transparency", color:"#3B82F6",
      desc:"Every case, transaction, and action is logged and publicly auditable. Donors see exactly where their money goes." },
    { icon:"🛡️", svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
      title:"Trust", color:"#10B981",
      desc:"Multi-layer verification, fraud detection and encrypted payments build unshakeable donor confidence." },
    { icon:"⚡", svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
      title:"Efficiency", color:"#F59E0B",
      desc:"8-step automated workflow reduces manual work, speeds aid delivery and eliminates bottlenecks." },
    { icon:"🌍", svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
      title:"Impact", color:"#8B5CF6",
      desc:"Real impact measured with GPS-verified proof-of-delivery photos and transparent impact reports." },
    { icon:"🤝", svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
      title:"Collaboration", color:"#EC4899",
      desc:"Connecting reporters, field teams, donors, and administrators in one seamless platform." },
    { icon:"📱", svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
      title:"Accessibility", color:"#06B6D4",
      desc:"Web, mobile, and offline-capable. Works in low-connectivity field environments across the region." },
  ];

  const PROBLEMS = [
    { icon:"🚨",
      title:"Fraud & Duplicates", color:"#C0392B", bg:"#FEF2F2",
      img:"https://images.unsplash.com/photo-1614107707982-51ac42f4fcdb?w=600&q=75",
      desc:"Fake cases and duplicate applications drain aid budgets. Without verification, resources go to the wrong people.",
      solution:"Multi-layer AI verification flags duplicates before a single dollar leaves the donor." },
    { icon:"🌫️",
      title:"No Transparency", color:"#D97706", bg:"#FFFBEB",
      img:"https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=75",
      desc:"Donors have no way to verify their money reached beneficiaries. Trust erodes, donations decline.",
      solution:"GPS-tagged proof of delivery and immutable audit logs give donors real-time visibility." },
    { icon:"🐢",
      title:"Slow Manual Processes", color:"#7C3AED", bg:"#F5F3FF",
      img:"https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&q=75",
      desc:"Paper-based systems slow down aid delivery. Cases sit in queues for weeks unnecessarily.",
      solution:"8-step digital workflow cuts case-to-delivery time from weeks to days." },
  ];

  return (
    <div style={{ color:C.text }}>

      {/* ── Hero ── */}
      <section style={{ position:"relative", overflow:"hidden", color:"#fff", padding:"92px 24px 72px", textAlign:"center" }}>
        {/* Photo */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"url('/about-hero-bg.jpg')", backgroundSize:"cover", backgroundPosition:"center 35%", transform:"scale(1.03)" }} />
        {/* Overlay — dark enough for text, preserves the warm silhouette tones */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,20,55,0.72) 0%, rgba(0,38,81,0.62) 50%, rgba(0,20,55,0.80) 100%)" }} />
        <div style={{ position:"relative", zIndex:1, maxWidth:760, margin:"0 auto" }}>
          <span className="kf-badge" style={{ background:"rgba(255,255,255,.14)", border:"1px solid rgba(255,255,255,.28)", color:"#fff", backdropFilter:"blur(6px)" }}>{P.hero_badge}</span>
          <h1 style={{ fontSize:"clamp(30px,5vw,52px)", fontWeight:900, margin:"20px 0 16px", lineHeight:1.1, letterSpacing:-1, textShadow:"0 2px 24px rgba(0,0,0,0.5)" }}>
            {P.hero_title} <span style={{ color:C.accent }}>{P.hero_title2}</span>
          </h1>
          <p style={{ fontSize:17, opacity:0.88, lineHeight:1.8, maxWidth:580, margin:"0 auto", textShadow:"0 1px 8px rgba(0,0,0,0.4)" }}>{P.hero_sub}</p>
        </div>
      </section>

      {/* ── Mission — centered with real photo ── */}
      <section style={{ padding:"0", background:"#fff", overflow:"hidden", marginTop:64 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:480 }}>
          {/* Real photo side */}
          <div style={{ position:"relative", overflow:"hidden", minHeight:320 }}>
            <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=900&q=80" alt="Aid delivery" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(0,38,81,0.3), rgba(75,125,25,0.25))" }} />
            <div style={{ position:"absolute", bottom:24, left:24, right:24 }}>
              <div style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)", borderRadius:12, padding:"12px 18px" }}>
                <div style={{ color:"rgba(255,255,255,0.9)", fontSize:13, fontWeight:700 }}>📍 Somalia, East Africa</div>
                <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, marginTop:2 }}>Field verified · GPS tracked · Delivered</div>
              </div>
            </div>
          </div>
          {/* Text side */}
          <div style={{ padding:"72px 48px", display:"flex", flexDirection:"column", justifyContent:"center", background:"#fff" }}>
            <span className="kf-badge" style={{ background:C.primary+"15", color:C.primary, marginBottom:20, alignSelf:"flex-start" }}>{P.mission_badge}</span>
            <h2 style={{ fontSize:"clamp(22px,3.5vw,40px)", fontWeight:900, margin:"0 0 16px", lineHeight:1.1, letterSpacing:-0.5 }}>
              Every dollar, every family — fully accountable
            </h2>
            <p style={{ fontSize:"clamp(15px,1.8vw,18px)", fontStyle:"italic", color:C.muted, lineHeight:1.85, margin:"0 0 20px", fontWeight:300 }}>
              "{P.mission_p1}"
            </p>
            <p style={{ fontSize:15, color:C.muted, lineHeight:1.8 }}>{P.mission_p2}</p>
          </div>
        </div>
      </section>
      <style>{`@media(max-width:768px){.about-mission-grid{grid-template-columns:1fr !important;}}`}</style>

      {/* ── Why Kafaale Qaad Exists ── */}
      <section style={{ padding:"56px 24px", background:C.bg }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <span className="kf-badge" style={{ background:"#FEE2E2", color:"#991B1B", marginBottom:12 }}>{P.prob_badge}</span>
            <hr className="kf-rule-center" />
            <h2 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:900, margin:"0 0 10px", letterSpacing:-0.5 }}>{P.prob_title}</h2>
            <p style={{ fontSize:15, color:C.muted, maxWidth:520, margin:"0 auto" }}>Three systemic failures keep aid from reaching those who need it most.</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:28 }}>
            {PROBLEMS.map((p, i) => (
              <div key={i} style={{ background:"#fff", borderRadius:24, overflow:"hidden", border:`1px solid ${C.border}`, boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
                {/* Real photo header with icon overlay */}
                <div style={{ position:"relative", height:200, overflow:"hidden" }}>
                  <img src={p.img} alt={p.title} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                  <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)` }} />
                  <div style={{ position:"absolute", bottom:18, left:0, right:0, textAlign:"center" }}>
                    <div style={{
                      width:72, height:72, margin:"0 auto 12px",
                      background:`linear-gradient(135deg, ${p.color}cc, ${p.color})`,
                      borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:32, boxShadow:`0 8px 24px rgba(0,0,0,0.4)`,
                      border:"3px solid rgba(255,255,255,0.3)",
                    }}>{p.icon}</div>
                    <h3 style={{ fontSize:20, fontWeight:900, color:"#fff", margin:0, textShadow:"0 2px 8px rgba(0,0,0,0.5)" }}>{p.title}</h3>
                  </div>
                </div>
                {/* Body */}
                <div style={{ padding:"22px 26px 28px", textAlign:"center" }}>
                  <p style={{ fontSize:14, color:C.muted, lineHeight:1.75, margin:"0 0 18px" }}>{p.desc}</p>
                  <div style={{ background:p.bg, borderRadius:12, padding:"12px 16px", fontSize:13, color:p.color, fontWeight:700, lineHeight:1.6 }}>
                    ✓ {p.solution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Values — centered ── */}
      <section style={{ padding:"56px 24px", background:"#fff" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:900, margin:"0 0 10px", letterSpacing:-0.5 }}>{P.values_title}</h2>
            <hr className="kf-rule-center" />
            <p style={{ fontSize:15, color:C.muted, maxWidth:480, margin:"0 auto" }}>The principles that guide every decision we make.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:20 }}>
            {VALUES.map((v, i) => (
              <div key={i} className="kf-card" style={{
                padding:"32px 20px", borderRadius:20, border:`1px solid ${C.border}`,
                background:"#FAFBFF", textAlign:"center",
                boxShadow:"0 2px 12px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width:68, height:68, borderRadius:18, margin:"0 auto 16px",
                  background:`linear-gradient(135deg, ${v.color}18, ${v.color}30)`,
                  border:`1.5px solid ${v.color}30`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:v.color, boxShadow:`0 4px 16px ${v.color}20`,
                }}>
                  {v.svg}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:8 }}>{v.title}</div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.65 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Impact Numbers (replaces Roadmap) ── */}
      <section style={{ position:"relative", overflow:"hidden", padding:"56px 24px", color:"#fff", margin:"0 16px", borderRadius:24, boxShadow:"0 12px 40px rgba(0,38,81,0.18)" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"url('/impact-bg.jpg')", backgroundSize:"cover", backgroundPosition:"center center" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(0,22,60,0.82) 0%, rgba(0,38,81,0.75) 60%, rgba(0,40,20,0.78) 100%)" }} />
        <div style={{ position:"relative", zIndex:1, maxWidth:1000, margin:"0 auto", textAlign:"center" }}>
          <span className="kf-badge" style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.22)", color:"#fff", marginBottom:18 }}>OUR IMPACT</span>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:900, margin:"0 0 12px", letterSpacing:-0.5, textShadow:"0 2px 16px rgba(0,0,0,0.5)" }}>Aid That Moves at the Speed of Need</h2>
          <p style={{ fontSize:16, opacity:0.82, maxWidth:520, margin:"0 auto 56px", lineHeight:1.7 }}>Every number below represents a real person whose situation was verified, funded, and delivered with full transparency.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:2 }}>
            {IMPACT_STATS.map((s, i) => (
              <div key={i} style={{
                padding:"36px 24px", textAlign:"center",
                borderRight: i < IMPACT_STATS.length-1 ? "1px solid rgba(255,255,255,0.15)" : "none",
              }}>
                <div style={{ fontSize:"clamp(36px,5vw,56px)", fontWeight:900, lineHeight:1, color:s.color === C.accent ? C.accent : "#fff", letterSpacing:-2 }}>{s.val}</div>
                <div style={{ fontSize:13, opacity:0.7, marginTop:8, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      {teamVisible && (
        <section style={{ padding:"56px 24px", background:"#fff" }}>
          <div style={{ maxWidth:1200, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <h2 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:900, margin:"0 0 10px", letterSpacing:-0.5 }}>{P.team_title}</h2>
              <hr className="kf-rule-center" />
              <p style={{ fontSize:15, color:C.muted }}>{P.team_sub}</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:22 }}>
              {team.filter(t => t.show !== false).map((t, i) => {
                const [bg, color] = INITIALS_COLORS[i % INITIALS_COLORS.length];
                const initials = t.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
                return (
                  <div key={t.id || i} className="kf-card" style={{ textAlign:"center", padding:"32px 22px", background:"#FAFBFF", borderRadius:22, border:`1px solid ${C.border}` }}>
                    <div style={{ width:110, height:110, borderRadius:"50%", margin:"0 auto 18px", overflow:"hidden", boxShadow:`0 6px 24px ${color}33`, border:`3px solid ${bg}` }}>
                      {t.photo ? (
                        <img src={t.photo} alt={t.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      ) : (
                        <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg, ${bg}, ${color}30)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, fontWeight:900, color }}>
                          {initials}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{t.name}</div>
                    <div style={{ fontSize:12, color, fontWeight:700, marginTop:4, marginBottom: t.bio ? 10 : 0 }}>{t.role}</div>
                    {t.bio && <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{t.bio}</div>}
                    {t.linkedin && (
                      <a href={t.linkedin} target="_blank" rel="noopener noreferrer" style={{ display:"inline-block", marginTop:10, fontSize:11, color:C.primary, fontWeight:700, textDecoration:"none" }}>LinkedIn →</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Join the Mission — cinematic video slideshow background ── */}
      <style>{`
        @keyframes kfAboutSlide1 {
          0%   { opacity:0; transform:scale(1.0) translateX(0); }
          5%   { opacity:1; }
          33%  { opacity:1; transform:scale(1.12) translateX(-2%); }
          40%  { opacity:0; transform:scale(1.15) translateX(-3%); }
          100% { opacity:0; }
        }
        @keyframes kfAboutSlide2 {
          0%,33% { opacity:0; transform:scale(1.05) translateX(2%); }
          38%  { opacity:1; }
          66%  { opacity:1; transform:scale(1.13) translateX(0); }
          72%  { opacity:0; transform:scale(1.16) translateX(-1%); }
          100% { opacity:0; }
        }
        @keyframes kfAboutSlide3 {
          0%,66% { opacity:0; transform:scale(1.0) translateY(-1%); }
          71%  { opacity:1; }
          100% { opacity:1; transform:scale(1.1) translateY(1%); }
        }
        .kf-about-slide { position:absolute; inset:0; background-size:cover; background-position:center; animation-duration:24s; animation-timing-function:ease-in-out; animation-iteration-count:infinite; }
      `}</style>
      <section style={{ position:"relative", overflow:"hidden", padding:"64px 24px", textAlign:"center", color:"#fff", minHeight:360, display:"flex", alignItems:"center", background:"#001A40", margin:"28px 16px 0", borderRadius:24, boxShadow:"0 12px 40px rgba(0,38,81,0.18)" }}>
        {/* Background photo */}
        <div className="kf-about-slide" style={{ backgroundImage:"url('/cta-bg.jpg')", backgroundPosition:"center 35%", animationName:"none", opacity:1 }} />

        {/* Dark overlay */}
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg, rgba(0,38,81,0.80) 0%, rgba(0,75,150,0.68) 50%, rgba(75,125,25,0.60) 100%)`, zIndex:5 }} />
        {/* Subtle dot texture */}
        <div style={{ position:"absolute", inset:0, zIndex:6, backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize:"38px 38px" }} />

        <div style={{ position:"relative", zIndex:10, maxWidth:700, margin:"0 auto" }}>
          <span className="kf-badge" style={{ background:"rgba(224,171,33,0.22)", border:"1px solid rgba(224,171,33,0.45)", color:C.accent, marginBottom:24 }}>JOIN US</span>
          <h2 style={{ fontSize:"clamp(28px,4.5vw,52px)", fontWeight:900, margin:"0 0 20px", lineHeight:1.1, letterSpacing:-1 }}>{P.cta_title}</h2>
          <p style={{ fontSize:18, opacity:0.88, lineHeight:1.75, maxWidth:520, margin:"0 auto 44px" }}>{P.cta_sub}</p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <Link to="/donate" className="kf-btn kf-btn-gold" style={{ padding:"16px 40px", borderRadius:14, fontWeight:800, fontSize:16, boxShadow:"0 8px 30px rgba(224,171,33,0.45)" }}>{P.cta_donor}</Link>
            <Link to="/contact" className="kf-btn kf-btn-ghost" style={{ padding:"16px 40px", borderRadius:14, fontWeight:700, fontSize:16 }}>{P.cta_contact}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
