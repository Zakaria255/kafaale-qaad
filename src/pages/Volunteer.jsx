import { useState } from "react";

const C = { navy:"#002651", primary:"#004B96", secondary:"#4B7D19", accent:"#E0AB21", muted:"#5A6E8A", bg:"#F4F7FC", border:"#D8E4F0", text:"#0D1F3C", danger:"#C0392B" };

const VOL_KEY = "kf_volunteer_applications";

const CATEGORIES = [
  {
    id:"reporter", icon:"📝", color:"#3B82F6", bg:"#EFF6FF",
    title:"Community Reporter",
    subtitle:"Submit cases from your area",
    desc:"Use your smartphone to document and submit emergency cases from your community. No experience needed — just the will to help.",
    requirements:["Basic smartphone & internet access","Local community knowledge","Availability to document cases when needed"],
    commitment:"Flexible — report when you see need",
    perks:["Platform access","Impact certificates","Community recognition"],
    img:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=500&q=75",
  },
  {
    id:"field", icon:"🗺️", color:"#F59E0B", bg:"#FFFBEB",
    title:"Field Verification Agent",
    subtitle:"Visit & verify cases on the ground",
    desc:"Travel to reported cases, verify facts on the ground, collect GPS-tagged photo evidence, and upload field reports. This is a paid position.",
    requirements:["Transportation to case locations","GPS documentation skills","Interview and reporting ability","Physical fitness for field work"],
    commitment:"Part-time or full-time — paid role",
    perks:["Monthly stipend","Training provided","Official ID & equipment"],
    img:"https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=500&q=75",
  },
  {
    id:"medical", icon:"🏥", color:"#EF4444", bg:"#FEF2F2",
    title:"Medical Liaison",
    subtitle:"Connect patients with healthcare",
    desc:"Help medical cases navigate the healthcare system. Connect patients with clinics, verify medical needs, and coordinate treatment referrals.",
    requirements:["Medical or nursing background","Clinic connections in your region","Case coordination experience","Fluent Arabic or Somali"],
    commitment:"On-call as medical cases arise",
    perks:["CPD training credits","Professional network","Impact reports"],
    img:"https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=500&q=75",
  },
  {
    id:"education", icon:"🎓", color:"#8B5CF6", bg:"#F5F3FF",
    title:"Education Support",
    subtitle:"Help children access education",
    desc:"Help children access schooling — verify enrollment, liaise with schools, follow up on education cases, and ensure children stay in school.",
    requirements:["Connection to local schools","Child welfare experience","Follow-up and documentation skills","Patience and empathy"],
    commitment:"Flexible — school term aligned",
    perks:["Community impact","References provided","Training sessions"],
    img:"https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&q=75",
  },
  {
    id:"legal", icon:"⚖️", color:"#10B981", bg:"#ECFDF5",
    title:"Legal Aid Volunteer",
    subtitle:"Support vulnerable families legally",
    desc:"Assist families with documentation, property rights, inheritance issues, and access to legal protections — especially women and orphans.",
    requirements:["Legal or paralegal background","Understanding of Somali law","Discretion and confidentiality","Arabic or Somali language"],
    commitment:"2–4 hours per week remote/local",
    perks:["Pro bono hours logged","Legal network","Recognition awards"],
    img:"https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=500&q=75",
  },
  {
    id:"translator", icon:"🌐", color:"#06B6D4", bg:"#ECFEFF",
    title:"Platform Translator",
    subtitle:"Make aid multilingual",
    desc:"Help translate case descriptions and platform content into Somali, Arabic, Turkish, French, or other languages used by donors and communities.",
    requirements:["Fluency in two or more languages","Written communication skills","Available 5–10 hrs/week online"],
    commitment:"Fully remote — flexible hours",
    perks:["Remote work","Language certificates","Global network"],
    img:"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&q=75",
  },
  {
    id:"tech", icon:"💻", color:"#7C3AED", bg:"#EDE9FE",
    title:"Tech Volunteer",
    subtitle:"Build humanitarian technology",
    desc:"Contribute to our platform — front-end, back-end, data analysis, or cybersecurity. Help us scale our impact through better technology.",
    requirements:["Software development skills","Available 5–15 hrs/week","GitHub portfolio preferred"],
    commitment:"Remote, project-based",
    perks:["Open-source portfolio","Recommendation letter","Tech community"],
    img:"https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&q=75",
  },
  {
    id:"coordinator", icon:"🤝", color:"#EC4899", bg:"#FDF2F8",
    title:"District Coordinator",
    subtitle:"Lead a network of volunteers",
    desc:"Coordinate reporters and agents in your district. Recruit new volunteers, hold local training sessions, and act as the local Kafaale Qaad point of contact.",
    requirements:["Community leadership experience","Trusted local contacts","Organizational ability","Smartphone & internet"],
    commitment:"10–15 hrs/week regular commitment",
    perks:["Leadership stipend","Training","Official coordinator title"],
    img:"https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=500&q=75",
  },
];

const BLANK_FORM = {
  name:"", email:"", phone:"", city:"", country:"", category:"",
  experience:"", availability:"", motivation:"", hasDevice:false,
  hasTransport:false, acceptsTerms:false,
};

export default function Volunteer() {
  const [selected, setSelected]   = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(BLANK_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors]       = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const startApplication = (cat) => {
    setSelected(cat);
    setForm({ ...BLANK_FORM, category: cat.id });
    setShowForm(true);
    setSubmitted(false);
    setErrors({});
    window.scrollTo({ top: 400, behavior:"smooth" });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = "Required";
    if (!form.email.trim())    e.email    = "Required";
    if (!form.phone.trim())    e.phone    = "Required";
    if (!form.city.trim())     e.city     = "Required";
    if (!form.country.trim())  e.country  = "Required";
    if (!form.motivation.trim()) e.motivation = "Required";
    if (!form.acceptsTerms)    e.acceptsTerms = "You must agree to the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const app = { ...form, id:"vol-"+Date.now(), submittedAt:new Date().toISOString(), status:"pending" };
    try {
      const ex = JSON.parse(localStorage.getItem(VOL_KEY)||"[]");
      localStorage.setItem(VOL_KEY, JSON.stringify([app, ...ex]));
    } catch {}
    setSubmitted(true);
  };

  const inp = (key, label, type="text", placeholder="") => (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>
        {label} {["name","email","phone","city","country","motivation"].includes(key) && <span style={{color:C.danger}}>*</span>}
      </label>
      {type==="textarea"
        ? <textarea rows={4} value={form[key]} onChange={ev=>set(key,ev.target.value)} placeholder={placeholder}
            style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${errors[key]?C.danger:C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }} />
        : <input type={type} value={form[key]} onChange={ev=>set(key,ev.target.value)} placeholder={placeholder}
            style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${errors[key]?C.danger:C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
      }
      {errors[key] && <div style={{ fontSize:11, color:C.danger, marginTop:4 }}>⚠ {errors[key]}</div>}
    </div>
  );

  return (
    <div style={{ color:C.text }}>

      {/* ── Hero ── */}
      <style>{`
        @keyframes kfVolSlide1{ 0%{opacity:0;transform:scale(1)translateX(0)} 5%{opacity:1} 33%{opacity:1;transform:scale(1.12)translateX(-2%)} 40%{opacity:0} 100%{opacity:0} }
        @keyframes kfVolSlide2{ 0%,33%{opacity:0;transform:scale(1.05)translateX(2%)} 38%{opacity:1} 66%{opacity:1;transform:scale(1.13)translateX(0)} 72%{opacity:0} 100%{opacity:0} }
        @keyframes kfVolSlide3{ 0%,66%{opacity:0;transform:scale(1)translateY(-1%)} 71%{opacity:1} 100%{opacity:1;transform:scale(1.1)translateY(1%)} }
        .kf-vol-slide{ position:absolute;inset:0;background-size:cover;background-position:center;animation-duration:24s;animation-timing-function:ease-in-out;animation-iteration-count:infinite; }
      `}</style>
      <section style={{ position:"relative", overflow:"hidden", minHeight:380, display:"flex", alignItems:"center", background:"#001A40" }}>
        <div className="kf-vol-slide" style={{ backgroundImage:"url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1400&q=80')", animationName:"kfVolSlide1" }} />
        <div className="kf-vol-slide" style={{ backgroundImage:"url('https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1400&q=80')", animationName:"kfVolSlide2" }} />
        <div className="kf-vol-slide" style={{ backgroundImage:"url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1400&q=80')", animationName:"kfVolSlide3" }} />
        <div style={{ position:"absolute", inset:0, zIndex:5, background:"linear-gradient(135deg, rgba(0,38,81,0.88) 0%, rgba(0,75,150,0.75) 60%, rgba(75,125,25,0.6) 100%)" }} />
        <div style={{ position:"relative", zIndex:10, padding:"88px 24px 72px", width:"100%", textAlign:"center", color:"#fff" }}>
          <div style={{ maxWidth:720, margin:"0 auto" }}>
            <span style={{ display:"inline-block", background:"rgba(224,171,33,0.2)", border:"1px solid rgba(224,171,33,0.4)", color:C.accent, borderRadius:20, padding:"6px 18px", fontSize:12, fontWeight:800, letterSpacing:1, textTransform:"uppercase", marginBottom:20 }}>JOIN OUR TEAM</span>
            <h1 style={{ fontSize:"clamp(28px,5vw,54px)", fontWeight:900, margin:"0 0 16px", lineHeight:1.08, letterSpacing:-1 }}>Volunteer With Kafaale Qaad</h1>
            <p style={{ fontSize:17, opacity:0.85, lineHeight:1.75, maxWidth:540, margin:"0 auto" }}>Choose your role below. From field agents to tech volunteers — every skill matters in the fight against poverty.</p>
          </div>
        </div>
      </section>

      {/* ── Process steps ── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, padding:"28px 24px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0 }}>
          {[["1","Choose Role","📋"],["2","Apply Online","📝"],["3","We Contact You","📞"],["4","Start Helping","🌍"]].map(([n,l,ic],i) => (
            <div key={n} style={{ textAlign:"center", padding:"0 12px", borderRight: i<3 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{ic}</div>
              <div style={{ fontSize:11, fontWeight:800, color:C.primary, textTransform:"uppercase", letterSpacing:1 }}>Step {n}</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category cards ── */}
      <section style={{ padding:"64px 24px", background:C.bg }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,42px)", fontWeight:900, margin:"0 0 10px", letterSpacing:-0.5 }}>Choose Your Volunteer Role</h2>
            <p style={{ fontSize:15, color:C.muted, maxWidth:520, margin:"0 auto" }}>Each role makes a specific kind of impact. Find the one that matches your skills and availability.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:22 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.id} style={{
                background:"#fff", borderRadius:22, overflow:"hidden",
                border:`1px solid ${cat.color}25`,
                boxShadow:`0 4px 20px ${cat.color}15, 0 1px 4px rgba(0,0,0,0.05)`,
                transition:"transform .25s, box-shadow .25s",
              }}
                onMouseOver={e => { e.currentTarget.style.transform="translateY(-6px)"; e.currentTarget.style.boxShadow=`0 16px 40px ${cat.color}25`; }}
                onMouseOut={e  => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=`0 4px 20px ${cat.color}15`; }}
              >
                {/* Photo */}
                <div style={{ position:"relative", height:170, overflow:"hidden" }}>
                  <img src={cat.img} alt={cat.title} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.55))` }} />
                  <div style={{ position:"absolute", top:12, left:12, display:"flex", gap:6 }}>
                    <span style={{ background:cat.color, color:"#fff", borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:800 }}>{cat.icon} {cat.title}</span>
                  </div>
                  <div style={{ position:"absolute", bottom:10, left:14, color:"rgba(255,255,255,0.8)", fontSize:11, fontWeight:600 }}>{cat.commitment}</div>
                </div>

                {/* Body */}
                <div style={{ padding:"18px 20px 22px" }}>
                  <p style={{ fontSize:13, color:C.muted, lineHeight:1.65, margin:"0 0 14px" }}>{cat.desc}</p>

                  {/* Requirements */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:C.text, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>Requirements</div>
                    {cat.requirements.slice(0,3).map((r, i) => (
                      <div key={i} style={{ display:"flex", gap:6, fontSize:12, color:C.muted, marginBottom:4 }}>
                        <span style={{ color:cat.color, fontWeight:900, flexShrink:0 }}>✓</span> {r}
                      </div>
                    ))}
                  </div>

                  {/* Perks */}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                    {cat.perks.map(p => (
                      <span key={p} style={{ background:cat.color+"14", color:cat.color, borderRadius:20, padding:"2px 9px", fontSize:10, fontWeight:700 }}>{p}</span>
                    ))}
                  </div>

                  <button onClick={() => startApplication(cat)} style={{
                    width:"100%", padding:"11px", borderRadius:11, border:"none", cursor:"pointer",
                    background:`linear-gradient(135deg, ${cat.color}, ${cat.color}cc)`,
                    color:"#fff", fontWeight:800, fontSize:13,
                    boxShadow:`0 4px 14px ${cat.color}35`,
                  }}>
                    Apply for This Role →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Application form ── */}
      {showForm && selected && (
        <section style={{ padding:"64px 24px 80px", background:"#fff", borderTop:`4px solid ${selected.color}` }}>
          <div style={{ maxWidth:680, margin:"0 auto" }}>
            {submitted ? (
              <div style={{ textAlign:"center", padding:"48px 24px" }}>
                <div style={{ width:80, height:80, borderRadius:"50%", background:"#D1FAE5", margin:"0 auto 20px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>✅</div>
                <h2 style={{ fontSize:26, fontWeight:900, margin:"0 0 12px", color:C.secondary }}>Application Received!</h2>
                <p style={{ fontSize:15, color:C.muted, lineHeight:1.7, maxWidth:400, margin:"0 auto 24px" }}>
                  Thank you, <strong>{form.name}</strong>! Your application to volunteer as a <strong style={{color:selected.color}}>{selected.title}</strong> has been submitted. We'll contact you at <strong>{form.email}</strong> within 3 business days.
                </p>
                <button onClick={() => { setShowForm(false); setSubmitted(false); setForm(BLANK_FORM); }}
                  style={{ padding:"12px 28px", background:C.primary, color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontWeight:800, fontSize:14 }}>
                  Apply for Another Role
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:32, padding:"18px 22px", background:`linear-gradient(135deg, ${selected.color}12, ${selected.color}06)`, borderRadius:16, border:`1px solid ${selected.color}25` }}>
                  <div style={{ width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg,${selected.color}30,${selected.color}60)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{selected.icon}</div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:selected.color }}>{selected.title}</div>
                    <div style={{ fontSize:13, color:C.muted }}>{selected.commitment}</div>
                  </div>
                </div>

                <div style={{ display:"grid", gap:18 }}>
                  <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>📝 Your Details</h3>
                  {inp("name", "Full Name", "text", "e.g. Ahmed Hassan")}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    {inp("email", "Email Address", "email", "you@example.com")}
                    {inp("phone", "Phone Number", "tel", "+252 61 xxx xxxx")}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    {inp("city", "City / District", "text", "e.g. Mogadishu")}
                    {inp("country", "Country", "text", "e.g. Somalia")}
                  </div>

                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Availability</label>
                    <select value={form.availability} onChange={e=>set("availability",e.target.value)}
                      style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", background:"#fff" }}>
                      <option value="">Select…</option>
                      {["Part-time (5–10 hrs/week)","Full-time (30–40 hrs/week)","Weekends only","Flexible / project-based","On-call"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  {inp("experience", "Relevant Experience (optional)", "textarea", `Describe any relevant experience for the ${selected.title} role…`)}
                  {inp("motivation", "Why do you want to volunteer?", "textarea", "Tell us what drives you to help…")}

                  <div style={{ display:"grid", gap:10 }}>
                    {[
                      ["hasDevice",    "I have a smartphone and internet access"],
                      ["hasTransport", "I have access to transportation for field visits"],
                    ].map(([key, label]) => (
                      <label key={key} style={{ display:"flex", gap:12, alignItems:"center", cursor:"pointer", padding:"11px 14px", background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
                        <input type="checkbox" checked={form[key]} onChange={e=>set(key,e.target.checked)} style={{ width:18, height:18, cursor:"pointer" }} />
                        <span style={{ fontSize:14, color:C.text }}>{label}</span>
                      </label>
                    ))}
                    <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
                      <input type="checkbox" checked={form.acceptsTerms} onChange={e=>set("acceptsTerms",e.target.checked)} style={{ marginTop:3, width:18, height:18, cursor:"pointer" }} />
                      <span style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>
                        I agree to the volunteer terms and understand that my application will be reviewed before I receive access to the platform.
                      </span>
                    </label>
                    {errors.acceptsTerms && <div style={{ fontSize:11, color:C.danger }}>⚠ {errors.acceptsTerms}</div>}
                  </div>

                  <button type="submit" style={{ padding:"14px", background:`linear-gradient(135deg, ${selected.color}, ${selected.color}cc)`, color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontWeight:800, fontSize:15, boxShadow:`0 6px 20px ${selected.color}40` }}>
                    ✅ Submit Volunteer Application
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      {/* ── Impact numbers ── */}
      <section style={{ background:`linear-gradient(135deg, ${C.navy} 0%, #0f3460 100%)`, padding:"64px 24px", textAlign:"center", color:"#fff" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:900, margin:"0 0 12px" }}>Our Volunteer Impact</h2>
          <p style={{ opacity:0.7, marginBottom:48, fontSize:15 }}>Thousands of volunteers have helped us reach more families in need.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:2 }}>
            {[["840+","Active Volunteers"],["14","Countries"],["2,400+","Cases Documented"],["98.8%","Satisfaction Rate"]].map(([v,l],i) => (
              <div key={l} style={{ padding:"28px 16px", borderRight:`1px solid rgba(255,255,255,0.1)` }}>
                <div style={{ fontSize:"clamp(30px,4vw,48px)", fontWeight:900, color:C.accent, lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:12, opacity:0.65, marginTop:8, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
