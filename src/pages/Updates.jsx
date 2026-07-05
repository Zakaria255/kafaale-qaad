import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const C = { navy:"#002651", primary:"#004B96", secondary:"#4B7D19", accent:"#E0AB21", muted:"#5A6E8A", bg:"#F4F7FC", border:"#D8E4F0", text:"#0D1F3C", danger:"#C0392B" };

const UPDATES_KEY = "kf_updates";

const TYPE_META = {
  Disaster:  { color:"#C0392B", bg:"#FEF2F2", icon:"🚨" },
  Flood:     { color:"#1D4ED8", bg:"#DBEAFE", icon:"" },
  Drought:   { color:"#D97706", bg:"#FEF3C7", icon:"" },
  Emergency: { color:"#7C3AED", bg:"#EDE9FE", icon:"" },
  Conflict:  { color:"#374151", bg:"#F3F4F6", icon:"" },
  Disease:   { color:"#065F46", bg:"#D1FAE5", icon:"🏥" },
  General:   { color:"#0369A1", bg:"#E0F2FE", icon:"" },
};

const DEFAULT_UPDATES = [
  {
    id:"upd-1", type:"Flood", published:true,
    title:"Severe Flooding Displaces 3,000+ Families in Beledweyne",
    date:"2026-06-15", location:"Beledweyne, Hiran Region",
    severity:"critical",
    body:"Unprecedented flooding along the Shabelle River has displaced over 3,000 families in Beledweyne. Access roads are cut off. Emergency food, shelter, and clean water are urgently needed. Kafaale Qaad field teams are on the ground assessing and registering affected families.",
    img:"https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=700&q=75",
    needs:["Emergency Shelter Kits","Clean Water","Food Packages"],
  },
  {
    id:"upd-2", type:"Drought", published:true,
    title:"Drought Alert: Bay Region Facing Critical Food Shortage",
    date:"2026-06-10", location:"Baidoa, Bay Region",
    severity:"high",
    body:"Three consecutive failed rainy seasons have pushed Bay Region into a severe food crisis. Over 15,000 people face acute malnutrition. Livestock losses exceed 60%. Our teams are expanding food distribution and opening new cases for the most vulnerable.",
    img:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=75",
    needs:["Food Packages","Livestock Feed","Water Trucking"],
  },
  {
    id:"upd-3", type:"Emergency", published:true,
    title:"IDP Camp Medical Emergency — Mogadishu North",
    date:"2026-06-05", location:"Mogadishu, Benadir",
    severity:"high",
    body:"A disease outbreak in Mogadishu North IDP camp is affecting hundreds of families. Medical supplies are critically low. Our partners are requesting immediate support for medicine, oral rehydration kits, and mobile clinic deployment.",
    img:"https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=700&q=75",
    needs:["Medicine","ORS Kits","Mobile Clinic"],
  },
  {
    id:"upd-4", type:"General", published:true,
    title:"Kafaale Qaad Expands to Lower Jubba Region",
    date:"2026-05-28", location:"Kismayo, Lower Jubba",
    severity:"info",
    body:"We are proud to announce our expansion into the Lower Jubba region. Local field agents have been trained and onboarded. Case submissions from Kismayo, Jamaame, and Jilib are now accepted through our platform.",
    img:"https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=700&q=75",
    needs:[],
  },
];

const SEV_LABELS = { critical:"🔴 Critical", high:"🟠 High Priority", medium:"🟡 Medium", info:"🔵 Update", low:"⚪ Low" };

function getUpdates() {
  try {
    const saved = JSON.parse(localStorage.getItem(UPDATES_KEY) || "null");
    return saved || DEFAULT_UPDATES;
  } catch { return DEFAULT_UPDATES; }
}

export default function Updates() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setItems(getUpdates().filter(u => u.published));
    const fn = () => setItems(getUpdates().filter(u => u.published));
    window.addEventListener("storage", fn);
    return () => window.removeEventListener("storage", fn);
  }, []);

  const types = ["All", ...Array.from(new Set(items.map(u => u.type)))];
  const visible = filter === "All" ? items : items.filter(u => u.type === filter);
  const modal = selected ? items.find(u => u.id === selected) : null;

  return (
    <div style={{ color: C.text }}>

      {/* ── Hero ── */}
      <section style={{
        padding: "80px 24px 64px", textAlign: "center", color: "#fff",
        position: "relative", overflow: "hidden", background: "#0a1628",
      }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"url('/updates-hero-img0.png')", backgroundSize:"cover", backgroundPosition:"center" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(10,22,40,0.88) 0%, rgba(26,58,110,0.78) 55%, rgba(80,20,100,0.65) 100%)" }} />
        <div style={{ position:"relative", maxWidth:700, margin:"0 auto" }}>
          <span style={{ display:"inline-block", background:"rgba(224,171,33,0.18)", border:"1px solid rgba(224,171,33,0.4)", color:"#F4D04A", borderRadius:20, padding:"6px 18px", fontSize:12, fontWeight:800, letterSpacing:1, textTransform:"uppercase", marginBottom:20 }}>
            LIVE UPDATES
          </span>
          <h1 style={{ fontSize:"clamp(28px,5vw,52px)", fontWeight:900, margin:"0 0 16px", lineHeight:1.1, letterSpacing:-1 }}>
            Field Updates &<br /><span style={{ color:C.accent }}>Emergency Alerts</span>
          </h1>
          <p style={{ fontSize:17, opacity:0.82, lineHeight:1.75, maxWidth:540, margin:"0 auto" }}>
            Real-time news on disasters, floods, emergencies, and ongoing operations from our field teams across Somalia and the region.
          </p>
        </div>
      </section>

      {/* ── Filter bar ── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, padding:"16px 24px", position:"sticky", top:0, zIndex:10, display:"flex", gap:8, overflowX:"auto" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", gap:8, width:"100%" }}>
          {types.map(t => {
            const m = TYPE_META[t];
            return (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding:"7px 16px", borderRadius:99, fontSize:12, fontWeight:700, border:"1.5px solid",
                cursor:"pointer", whiteSpace:"nowrap", transition:"all .15s",
                background: filter===t ? (m?.color||C.primary) : "#fff",
                color: filter===t ? "#fff" : (m?.color||C.muted),
                borderColor: filter===t ? (m?.color||C.primary) : C.border,
              }}>{m?.icon||""} {t}</button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      <section style={{ padding:"48px 24px 80px", background:C.bg, minHeight:"60vh" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          {visible.length === 0 && (
            <div style={{ textAlign:"center", padding:"80px 0", color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:16 }}></div>
              <div style={{ fontSize:18, fontWeight:700 }}>No updates found for this filter.</div>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:24 }}>
            {visible.map(u => {
              const m = TYPE_META[u.type] || TYPE_META.General;
              return (
                <div key={u.id} onClick={() => setSelected(u.id)}
                  style={{ background:"#fff", borderRadius:18, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", border:`1px solid ${C.border}`, cursor:"pointer", transition:"transform .2s, box-shadow .2s" }}
                  onMouseOver={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 12px 36px rgba(0,0,0,0.13)"; }}
                  onMouseOut={e  => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"; }}>
                  {/* Image */}
                  <div style={{ position:"relative", height:200, overflow:"hidden", background:C.bg }}>
                    <img src={u.img} alt="" loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55))" }} />
                    <div style={{ position:"absolute", top:12, left:12, display:"flex", gap:6 }}>
                      <span style={{ background:m.color, color:"#fff", borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:800 }}>{m.icon} {u.type}</span>
                      {u.severity && u.severity !== "info" && (
                        <span style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", color:"#fff", borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:700 }}>{SEV_LABELS[u.severity]}</span>
                      )}
                    </div>
                    <div style={{ position:"absolute", bottom:10, left:14, color:"rgba(255,255,255,0.8)", fontSize:11 }}>{u.location}</div>
                  </div>
                  <div style={{ padding:"18px 20px 20px" }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{new Date(u.date).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
                    <h3 style={{ margin:"0 0 10px", fontSize:16, fontWeight:800, color:C.text, lineHeight:1.4 }}>{u.title}</h3>
                    <p style={{ margin:"0 0 14px", fontSize:13, color:C.muted, lineHeight:1.65, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{u.body}</p>
                    {u.needs?.length > 0 && (
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {u.needs.slice(0,3).map(n => (
                          <span key={n} style={{ background:m.bg, color:m.color, borderRadius:20, padding:"3px 9px", fontSize:10, fontWeight:700 }}>{n}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop:14, display:"flex", justifyContent:"flex-end" }}>
                      <span style={{ color:C.primary, fontSize:12, fontWeight:700 }}>Read full update →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Donate CTA */}
          <div style={{ marginTop:56, background:`linear-gradient(135deg,${C.navy},${C.primary})`, borderRadius:20, padding:"40px 32px", textAlign:"center", color:"#fff" }}>
            <div style={{ fontSize:36, marginBottom:12 }}></div>
            <h2 style={{ fontSize:26, fontWeight:900, margin:"0 0 10px" }}>Every Emergency Needs an Immediate Response</h2>
            <p style={{ opacity:0.82, maxWidth:480, margin:"0 auto 24px", lineHeight:1.7, fontSize:15 }}>
              Your donation is verified, tracked, and delivered with GPS-confirmed proof. No middlemen.
            </p>
            <Link to="/donate" style={{ display:"inline-block", padding:"13px 36px", background:C.accent, color:"#fff", borderRadius:12, fontWeight:800, fontSize:15, textDecoration:"none", boxShadow:`0 4px 16px ${C.accent}50` }}>
              Donate Now
            </Link>
          </div>
        </div>
      </section>

      {/* ── Detail Modal ── */}
      {modal && (
        <div onClick={e => { if(e.target===e.currentTarget) setSelected(null); }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:900, overflowY:"auto", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px" }}>
          <div style={{ background:"#fff", borderRadius:22, maxWidth:680, width:"100%", overflow:"hidden", position:"relative" }}>
            {(() => { const m = TYPE_META[modal.type]||TYPE_META.General; return (<>
              <div style={{ position:"relative", height:260, overflow:"hidden" }}>
                <img src={modal.img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65))" }} />
                <button onClick={() => setSelected(null)} style={{ position:"absolute", top:14, right:14, background:"rgba(0,0,0,0.5)", border:"none", borderRadius:8, padding:"6px 12px", color:"#fff", cursor:"pointer", fontSize:16, fontWeight:700 }}>✕</button>
                <div style={{ position:"absolute", bottom:16, left:20, right:20 }}>
                  <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <span style={{ background:m.color, color:"#fff", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:800 }}>{m.icon} {modal.type}</span>
                    {modal.severity && <span style={{ background:"rgba(255,255,255,0.2)", color:"#fff", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 }}>{SEV_LABELS[modal.severity]}</span>}
                  </div>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:"#fff", lineHeight:1.3, textShadow:"0 2px 8px rgba(0,0,0,0.5)" }}>{modal.title}</h2>
                </div>
              </div>
              <div style={{ padding:"24px 28px 32px" }}>
                <div style={{ display:"flex", gap:16, fontSize:12, color:C.muted, marginBottom:18 }}>
                  <span>{new Date(modal.date).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</span>
                  <span>{modal.location}</span>
                </div>
                <p style={{ fontSize:15, lineHeight:1.8, color:C.text, margin:"0 0 20px" }}>{modal.body}</p>
                {modal.needs?.length > 0 && (
                  <div style={{ background:m.bg, borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:m.color, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Urgent Needs</div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {modal.needs.map(n => <span key={n} style={{ background:"#fff", color:m.color, border:`1px solid ${m.color}30`, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700 }}>{n}</span>)}
                    </div>
                  </div>
                )}
                <div style={{ display:"flex", gap:12 }}>
                  <Link to="/donate" onClick={() => setSelected(null)} style={{ flex:1, padding:"13px", background:C.accent, color:"#fff", borderRadius:12, textDecoration:"none", textAlign:"center", fontWeight:800, fontSize:14 }}>Donate to This Emergency</Link>
                  <button onClick={() => setSelected(null)} style={{ padding:"13px 20px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, cursor:"pointer", fontWeight:700, fontSize:13, color:C.text }}>Close</button>
                </div>
              </div>
            </>); })()}
          </div>
        </div>
      )}
    </div>
  );
}
