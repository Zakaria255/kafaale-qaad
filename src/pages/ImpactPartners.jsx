import { useState, useRef } from "react";
import FixedSelect from "../components/FixedSelect.jsx";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ContractModal from "../components/ContractModal.jsx";
import { getCat } from "../utils/categories.js";

const C = { navy:"#002651", primary:"#004B96", secondary:"#4B7D19", accent:"#E0AB21", muted:"#5A6E8A", bg:"#F4F7FC", border:"#D8E4F0", text:"#0D1F3C", danger:"#C0392B" };

const PARTNER_REG_KEY = "kf_partner_applications";
const ADMIN_PARTNERS_KEY = "kf_admin_partners";

const ALL_COUNTRIES = [
  "Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahrain","Bangladesh","Belgium","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Bulgaria",
  "Cambodia","Cameroon","Canada","Chad","Chile","China","Colombia","Congo (DRC)","Costa Rica","Côte d'Ivoire",
  "Croatia","Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador",
  "Ethiopia","Finland","France","Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea",
  "Haiti","Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Italy","Japan","Jordan",
  "Kazakhstan","Kenya","Kuwait","Lebanon","Liberia","Libya","Madagascar","Malawi","Malaysia","Mali",
  "Mauritania","Mexico","Morocco","Mozambique","Myanmar","Nepal","Netherlands","New Zealand","Nicaragua",
  "Niger","Nigeria","Norway","Oman","Pakistan","Palestine","Panama","Peru","Philippines","Poland",
  "Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Sierra Leone",
  "Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria",
  "Tanzania","Thailand","Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

const ORG_TYPES = getCat("partnerTypes");

const FOCUS_AREAS = [
  "Emergency Relief","Food Security","Healthcare","Education","Shelter","Water & Sanitation",
  "Child Protection","Women's Empowerment","Disability Support","Mental Health","Livelihoods",
  "Disaster Risk Reduction","Refugee Support","Orphan Care","Legal Aid","Other",
];

const EXISTING_PARTNERS = [
  { id:1, name:"Al-Khair Foundation",     type:"International NGO",        country:"United Kingdom",   color:"#3B82F6", focus:["Food Aid","Medical","Shelter"],          cases:312, img:"🏛️", verified:true },
  { id:2, name:"Somali Medical Relief",   type:"Healthcare Organization",  country:"Somalia",          color:"#10B981", focus:["Medical","Emergency Care"],              cases:198, img:"🏥", verified:true },
  { id:3, name:"Horn of Africa NGO",      type:"Local NGO",                country:"Kenya",            color:"#F59E0B", focus:["Education","Child Protection"],          cases:145, img:"🌍", verified:true },
  { id:4, name:"Gulf Charity Alliance",   type:"Foundation",               country:"Qatar",            color:"#8B5CF6", focus:["Emergency Relief","Water & Sanitation"], cases:421, img:"🤝", verified:true },
  { id:5, name:"UK Aid Direct",           type:"Government Agency",        country:"United Kingdom",   color:"#06B6D4", focus:["Livelihoods","Food Security"],           cases:89,  img:"🇬🇧", verified:true },
  { id:6, name:"Turkish Red Crescent",    type:"International NGO",        country:"Turkey",           color:"#C0392B", focus:["Emergency Relief","Healthcare"],         cases:267, img:"🏅", verified:true },
];

const BLANK = {
  orgName:"", type:"", country:"", website:"", regNumber:"", yearFounded:"",
  contactName:"", contactTitle:"", contactEmail:"", contactPhone:"",
  focusAreas:[], operatingRegions:"", description:"", annualBudget:"", staffCount:"",
  hasFieldTeam:false, previousSomalia:false, acceptsTerms:false, logoUrl:"",
};

const BLANK_PARTNER = {
  name:"", type:"", country:"", website:"", focusAreas:[], description:"", cases:0, logoUrl:"", color:"#004B96", published:false,
};

const STEPS = ["Organisation","Contact Person","Operations","Review & Submit"];

export default function ImpactPartners() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [tab, setTab]       = useState("partners");   // "partners" | "register" | "admin"
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState(BLANK);
  const [submitted, setSubmitted] = useState(false);
  const [showPartnerContract, setShowPartnerContract] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [errors, setErrors] = useState({});

  const getAdminPartners = () => { try { return JSON.parse(localStorage.getItem(ADMIN_PARTNERS_KEY)||"[]"); } catch { return []; } };
  const saveAdminPartners = (list) => localStorage.setItem(ADMIN_PARTNERS_KEY, JSON.stringify(list));

  const [adminPartners, setAdminPartners] = useState(getAdminPartners);
  const [apForm, setApForm] = useState(BLANK_PARTNER);
  const [apErrors, setApErrors] = useState({});
  const [apSaved, setApSaved] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const logoInputRef = useRef(null);
  const regLogoInputRef = useRef(null);

  const setAp = (k, v) => setApForm(f => ({ ...f, [k]: v }));
  const toggleApFocus = (f) => setApForm(prev => ({
    ...prev, focusAreas: prev.focusAreas.includes(f) ? prev.focusAreas.filter(x=>x!==f) : [...prev.focusAreas, f],
  }));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAp("logoUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRegLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("logoUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  const validateAp = () => {
    const e = {};
    if (!apForm.name.trim()) e.name = "Required";
    if (!apForm.type) e.type = "Required";
    if (!apForm.country) e.country = "Required";
    if (!apForm.description.trim()) e.description = "Required";
    setApErrors(e);
    return Object.keys(e).length === 0;
  };

  const savePartner = (publish) => {
    if (!validateAp()) return;
    const partner = { ...apForm, published: publish, id: editingId || "ap-"+Date.now(), createdAt: new Date().toISOString() };
    const updated = editingId
      ? adminPartners.map(p => p.id === editingId ? partner : p)
      : [partner, ...adminPartners];
    saveAdminPartners(updated);
    setAdminPartners(updated);
    setApForm(BLANK_PARTNER);
    setEditingId(null);
    setApSaved(true);
    setTimeout(() => setApSaved(false), 3000);
  };

  const deletePartner = (id) => {
    const updated = adminPartners.filter(p => p.id !== id);
    saveAdminPartners(updated);
    setAdminPartners(updated);
  };

  const togglePublish = (id) => {
    const updated = adminPartners.map(p => p.id === id ? { ...p, published: !p.published } : p);
    saveAdminPartners(updated);
    setAdminPartners(updated);
  };

  const startEdit = (p) => {
    setApForm({ ...p });
    setEditingId(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const allPublishedPartners = [...EXISTING_PARTNERS, ...adminPartners.filter(p => p.published).map((p, i) => ({
    ...p, img: p.logoUrl || "🤝", verified: true, focus: p.focusAreas, cases: Number(p.cases) || 0,
  }))];

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const toggleFocus = (f) => setForm(prev => ({
    ...prev,
    focusAreas: prev.focusAreas.includes(f) ? prev.focusAreas.filter(x=>x!==f) : [...prev.focusAreas, f],
  }));

  const validate = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.orgName.trim())  e.orgName  = "Required";
      if (!form.type)            e.type     = "Required";
      if (!form.country)         e.country  = "Required";
    }
    if (s === 1) {
      if (!form.contactName.trim())  e.contactName  = "Required";
      if (!form.contactEmail.trim()) e.contactEmail = "Required";
      if (!form.contactPhone.trim()) e.contactPhone = "Required";
    }
    if (s === 2) {
      if (form.focusAreas.length === 0) e.focusAreas = "Select at least one";
      if (!form.description.trim())     e.description = "Required";
    }
    if (s === 3) {
      if (!form.acceptsTerms) e.acceptsTerms = "You must accept the terms";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep(s => Math.min(s+1, 3)); };
  const back = () => setStep(s => Math.max(s-1, 0));

  const submit = () => {
    if (!validate(3)) return;
    const app = { ...form, id:"app-"+Date.now(), submittedAt:new Date().toISOString(), status:"pending" };
    try {
      const existing = JSON.parse(localStorage.getItem(PARTNER_REG_KEY)||"[]");
      localStorage.setItem(PARTNER_REG_KEY, JSON.stringify([app, ...existing]));
    } catch {}
    const pendingPartner = {
      id: app.id,
      name: form.orgName,
      type: form.type,
      country: form.country,
      website: form.website,
      focusAreas: form.focusAreas,
      description: form.description,
      cases: 0,
      logoUrl: form.logoUrl || "",
      color: "#004B96",
      published: false,
      status: "pending",
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      regNumber: form.regNumber,
      yearFounded: form.yearFounded,
      annualBudget: form.annualBudget,
      staffCount: form.staffCount,
      operatingRegions: form.operatingRegions,
      submittedAt: app.submittedAt,
    };
    const updatedPartners = [pendingPartner, ...adminPartners];
    saveAdminPartners(updatedPartners);
    setAdminPartners(updatedPartners);
    setSubmitted(true);
  };

  const field = (key, label, type="text", placeholder="") => (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>
        {label} {["orgName","type","country","contactName","contactEmail","contactPhone","description"].includes(key) ? <span style={{color:C.danger}}>*</span>:""}
      </label>
      {type==="textarea"
        ? <textarea rows={4} value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={placeholder}
            style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${errors[key]?C.danger:C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }} />
        : <input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={placeholder}
            style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${errors[key]?C.danger:C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
      }
      {errors[key] && <div style={{ fontSize:11, color:C.danger, marginTop:4 }}>⚠ {errors[key]}</div>}
    </div>
  );

  const select = (key, label, options) => (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>
        {label} <span style={{color:C.danger}}>*</span>
      </label>
      <FixedSelect value={form[key]} onChange={e=>set(key,e.target.value)} style={{ width:"100%", borderRadius:10, fontSize:14, border:`1.5px solid ${errors[key]?C.danger:C.border}` }}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </FixedSelect>
      {errors[key] && <div style={{ fontSize:11, color:C.danger, marginTop:4 }}>⚠ {errors[key]}</div>}
    </div>
  );

  const toggle = (key, label, desc) => (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
      <button onClick={() => set(key, !form[key])} style={{
        width:44, height:24, borderRadius:99, border:"none", cursor:"pointer",
        background: form[key] ? C.secondary : "#D1D5DB", position:"relative", transition:"background .2s", flexShrink:0, marginTop:2,
      }}>
        <span style={{ position:"absolute", top:3, left: form[key]?22:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{label}</div>
        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{desc}</div>
      </div>
    </div>
  );

  return (
    <div style={{ color:C.text }}>

      {/* ── Hero ── */}
      <style>{`
        @keyframes kfPtnSlide1{ 0%{opacity:0;transform:scale(1)translateX(0)} 5%{opacity:1} 33%{opacity:1;transform:scale(1.1)translateX(-2%)} 40%{opacity:0} 100%{opacity:0} }
        @keyframes kfPtnSlide2{ 0%,33%{opacity:0;transform:scale(1.04)translateX(2%)} 38%{opacity:1} 66%{opacity:1;transform:scale(1.12)translateX(0)} 72%{opacity:0} 100%{opacity:0} }
        @keyframes kfPtnSlide3{ 0%,66%{opacity:0;transform:scale(1)translateY(-1%)} 71%{opacity:1} 100%{opacity:1;transform:scale(1.09)translateY(1%)} }
        .kf-ptn-slide{ position:absolute;inset:0;background-size:cover;background-position:center;animation-duration:24s;animation-timing-function:ease-in-out;animation-iteration-count:infinite; }
      `}</style>
      <section style={{ position:"relative", overflow:"hidden", minHeight:360, display:"flex", alignItems:"center", background:"#001A40" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"url('/partners-bg.jpg')", backgroundSize:"cover", backgroundPosition:"center center" }} />
        <div style={{ position:"absolute", inset:0, zIndex:5, background:"linear-gradient(135deg, rgba(0,38,81,0.82) 0%, rgba(0,75,150,0.72) 55%, rgba(75,125,25,0.65) 100%)" }} />
        <div style={{ position:"relative", zIndex:10, padding:"80px 24px", width:"100%", textAlign:"center", color:"#fff" }}>
          <div style={{ maxWidth:760, margin:"0 auto" }}>
            <span style={{ display:"inline-block", background:"rgba(224,171,33,0.2)", border:"1px solid rgba(224,171,33,0.4)", color:C.accent, borderRadius:20, padding:"6px 18px", fontSize:12, fontWeight:800, letterSpacing:1, textTransform:"uppercase", marginBottom:20 }}>IMPACT PARTNERS</span>
            <h1 style={{ fontSize:"clamp(28px,5vw,52px)", fontWeight:900, margin:"0 0 16px", lineHeight:1.1, letterSpacing:-1 }}>Partner with Kafaale Qaad</h1>
            <p style={{ fontSize:17, opacity:0.85, lineHeight:1.7, maxWidth:540, margin:"0 auto 32px" }}>Join our network of verified NGOs, foundations, and agencies delivering impact across Somalia and East Africa.</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={() => setTab("partners")} style={{ padding:"12px 28px", borderRadius:12, fontWeight:800, fontSize:14, border:"none", cursor:"pointer", background: tab==="partners" ? C.accent : "rgba(255,255,255,0.15)", color:"#fff" }}>View Partners</button>
              <button onClick={() => setTab("register")} style={{ padding:"12px 28px", borderRadius:12, fontWeight:800, fontSize:14, border:"none", cursor:"pointer", background: tab==="register" ? C.accent : "rgba(255,255,255,0.15)", color:"#fff" }}>Register as Partner</button>
              {isAdmin && <button onClick={() => setTab("admin")} style={{ padding:"12px 28px", borderRadius:12, fontWeight:800, fontSize:14, border:"none", cursor:"pointer", background: tab==="admin" ? "#C0392B" : "rgba(255,255,255,0.15)", color:"#fff" }}>Admin Panel</button>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1000, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[["280+","Active Partners"],["14","Countries"],["5,200+","Aid Deliveries"],["98.8%","Verification Rate"]].map(([v,l]) => (
            <div key={l} style={{ padding:"28px 20px", textAlign:"center", borderRight:`1px solid ${C.border}` }}>
              <div style={{ fontSize:28, fontWeight:900, color:C.primary, lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:5, fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {tab === "partners" && (
        <section style={{ padding:"64px 24px 80px", background:C.bg }}>
          <div style={{ maxWidth:1200, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <h2 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:900, margin:"0 0 10px", letterSpacing:-0.5 }}>Our Impact Network</h2>
              <p style={{ fontSize:15, color:C.muted }}>Verified partners delivering aid across the region.</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:22 }}>
              {allPublishedPartners.map(p => (
                <div key={p.id} style={{ background:"#fff", borderRadius:18, overflow:"hidden", border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,.06)" }}>
                  <div style={{ background:`linear-gradient(135deg, ${p.color}18, ${p.color}08)`, padding:"28px 24px 22px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                      <div style={{ width:56, height:56, borderRadius:14, background:`linear-gradient(135deg,${p.color}30,${p.color}60)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0, overflow:"hidden" }}>
                        {p.logoUrl && p.logoUrl.startsWith("data:")
                          ? <img src={p.logoUrl} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                          : p.img}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{p.name}</div>
                        <div style={{ fontSize:12, color:p.color, fontWeight:700, marginTop:2 }}>{p.type}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{p.country}</div>
                      </div>
                      {p.verified && <span style={{ background:"#D1FAE5", color:"#065F46", borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:800 }}>✓ Verified</span>}
                    </div>
                  </div>
                  <div style={{ padding:"16px 24px 22px" }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                      {p.focus.map(f => <span key={f} style={{ background:p.color+"15", color:p.color, borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:700 }}>{f}</span>)}
                    </div>
                    <div style={{ fontSize:13, color:C.muted, fontWeight:600 }}>{p.cases} cases supported</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign:"center", marginTop:48 }}>
              <div style={{ background:"#fff", borderRadius:18, border:`2px dashed ${C.border}`, padding:"40px 24px", display:"inline-block", maxWidth:480 }}>
                <div style={{ fontSize:42, marginBottom:12 }}>🤝</div>
                <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800 }}>Become a Partner</h3>
                <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>Join our growing network of verified impact partners.</p>
                <button onClick={() => setTab("register")} style={{ padding:"12px 28px", background:C.primary, color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontWeight:800, fontSize:14 }}>Register Your Organisation →</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === "register" && (
        <section style={{ padding:"64px 24px 80px", background:C.bg }}>
          <div style={{ maxWidth:760, margin:"0 auto" }}>
            {submitted && showPartnerContract && (
              <ContractModal
                type="partner_agreement"
                data={{
                  orgName: form.orgName,
                  orgType: form.type,
                  country: form.country,
                  contactName: form.contactName,
                  contactEmail: form.contactEmail,
                  focusAreas: form.focusAreas,
                  operatingRegions: form.operatingRegions,
                }}
                onClose={() => { setSubmitted(false); setStep(0); setForm(BLANK); setTab("partners"); setShowPartnerContract(false); }}
                onAccept={() => {}}
              />
            )}

            {submitted && !showPartnerContract ? (
              <div style={{ background:"#fff", borderRadius:22, padding:"56px 32px", textAlign:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
                <div style={{ width:80, height:80, borderRadius:"50%", background:"#D1FAE5", margin:"0 auto 20px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>✅</div>
                <h2 style={{ fontSize:28, fontWeight:900, margin:"0 0 12px", color:C.secondary }}>Application Submitted!</h2>
                <p style={{ fontSize:15, color:C.muted, lineHeight:1.7, maxWidth:440, margin:"0 auto 24px" }}>
                  Thank you, <strong>{form.contactName}</strong>. Your partnership application for <strong>{form.orgName}</strong> is under review. Our team will contact you within 3–5 business days at <strong>{form.contactEmail}</strong>.
                </p>
                <div style={{ background:C.bg, borderRadius:12, padding:"16px 20px", marginBottom:24, textAlign:"left", maxWidth:400, margin:"0 auto 24px" }}>
                  <div style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Application Reference</div>
                  <div style={{ fontSize:13, color:C.text }}>{form.orgName} · {form.country}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Submitted {new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
                </div>
                <div style={{ background:"#EFF6FF", border:`1px solid ${C.primary}30`, borderRadius:14, padding:"20px 24px", marginBottom:24, maxWidth:440, margin:"0 auto 24px" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.primary, marginBottom:6 }}>Sign Your Partner Agreement</div>
                  <p style={{ fontSize:13, color:C.muted, margin:"0 0 14px", lineHeight:1.6 }}>
                    As a long-term partner, a formal agreement is required. This documents your commitment and activates your partnership.
                  </p>
                  <button onClick={() => setShowPartnerContract(true)} style={{ width:"100%", padding:"12px", background:C.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:800 }}>
                    View & Sign Partner Agreement →
                  </button>
                </div>
                <button onClick={() => { setSubmitted(false); setStep(0); setForm(BLANK); setTab("partners"); }} style={{ padding:"12px 28px", background:"#F3F4F6", color:C.muted, border:"none", borderRadius:12, cursor:"pointer", fontWeight:700, fontSize:14 }}>Skip for now</button>
              </div>
            ) : !submitted ? (
              <div>
                <div style={{ textAlign:"center", marginBottom:36 }}>
                  <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:900, margin:"0 0 10px" }}>Partnership Registration</h2>
                  <p style={{ fontSize:15, color:C.muted }}>Fill in your organisation's details. Applications are reviewed within 3–5 business days.</p>
                </div>

                {/* Progress steps */}
                <div style={{ display:"flex", gap:0, marginBottom:36, overflow:"hidden", borderRadius:14, border:`1px solid ${C.border}` }}>
                  {STEPS.map((s, i) => (
                    <div key={i} style={{
                      flex:1, padding:"12px 8px", textAlign:"center", fontSize:12, fontWeight:700,
                      background: i<step ? C.secondary : i===step ? C.primary : "#fff",
                      color: i<=step ? "#fff" : C.muted,
                      borderRight: i < STEPS.length-1 ? `1px solid ${C.border}` : "none",
                    }}>
                      <div style={{ fontSize:16, marginBottom:3 }}>{["🏛️","👤","⚙️","✅"][i]}</div>
                      {s}
                    </div>
                  ))}
                </div>

                <div style={{ background:"#fff", borderRadius:20, padding:"36px 32px", boxShadow:"0 4px 24px rgba(0,0,0,.07)", border:`1px solid ${C.border}` }}>

                  {/* Step 0: Organisation */}
                  {step === 0 && (
                    <div style={{ display:"grid", gap:18 }}>
                      <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800 }}>🏛️ Organisation Information</h3>

                      {/* Logo upload */}
                      <div>
                        <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Organisation Logo</label>
                        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                          <div style={{ width:72, height:72, borderRadius:14, border:`2px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", background:C.bg, cursor:"pointer", flexShrink:0 }}
                            onClick={() => regLogoInputRef.current?.click()}>
                            {form.logoUrl
                              ? <img src={form.logoUrl} alt="logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                              : <span style={{ fontSize:28, color:C.muted }}>+</span>}
                          </div>
                          <div>
                            <button type="button" onClick={() => regLogoInputRef.current?.click()} style={{ padding:"9px 18px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                              Upload Logo
                            </button>
                            {form.logoUrl && <button type="button" onClick={() => set("logoUrl","")} style={{ marginLeft:8, padding:"9px 14px", borderRadius:9, border:`1.5px solid ${C.danger}`, background:"#fff", color:C.danger, fontWeight:700, fontSize:12, cursor:"pointer" }}>Remove</button>}
                            <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>PNG or JPG, max 2MB</div>
                          </div>
                          <input ref={regLogoInputRef} type="file" accept="image/*" onChange={handleRegLogoUpload} style={{ display:"none" }} />
                        </div>
                      </div>

                      {field("orgName", "Organisation Name", "text", "e.g. Al-Khair Foundation")}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        {select("type", "Organisation Type", ORG_TYPES)}
                        {select("country", "Country of Registration", ALL_COUNTRIES)}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        {field("website", "Website", "url", "https://example.org")}
                        {field("regNumber", "Registration Number", "text", "NGO-12345")}
                      </div>
                      {field("yearFounded", "Year Founded", "number", "e.g. 2010")}
                    </div>
                  )}

                  {/* Step 1: Contact */}
                  {step === 1 && (
                    <div style={{ display:"grid", gap:18 }}>
                      <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800 }}>👤 Primary Contact Person</h3>
                      {field("contactName", "Full Name", "text", "e.g. Ahmed Hassan")}
                      {field("contactTitle", "Job Title / Position", "text", "e.g. Country Director")}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        {field("contactEmail", "Email Address", "email", "contact@org.org")}
                        {field("contactPhone", "Phone Number", "tel", "+252 61 xxx xxxx")}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Operations */}
                  {step === 2 && (
                    <div style={{ display:"grid", gap:18 }}>
                      <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800 }}>⚙️ Operations & Focus</h3>
                      <div>
                        <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Focus Areas <span style={{color:C.danger}}>*</span></label>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                          {FOCUS_AREAS.map(f => (
                            <button key={f} onClick={() => toggleFocus(f)} style={{
                              padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:700, border:"1.5px solid", cursor:"pointer", transition:"all .15s",
                              background: form.focusAreas.includes(f) ? C.primary : "#fff",
                              color: form.focusAreas.includes(f) ? "#fff" : C.muted,
                              borderColor: form.focusAreas.includes(f) ? C.primary : C.border,
                            }}>{f}</button>
                          ))}
                        </div>
                        {errors.focusAreas && <div style={{ fontSize:11, color:C.danger, marginTop:6 }}>⚠ {errors.focusAreas}</div>}
                      </div>
                      {field("operatingRegions", "Regions You Operate In", "text", "e.g. Mogadishu, Baidoa, Kismayo")}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        {field("annualBudget", "Annual Aid Budget (USD)", "text", "e.g. $500,000")}
                        {field("staffCount", "Number of Staff / Volunteers", "number", "e.g. 25")}
                      </div>
                      {field("description", "Brief Description of Your Work", "textarea", "Describe your organisation's mission, key programmes, and impact in Somalia or East Africa…")}
                      <div style={{ display:"grid", gap:12 }}>
                        {toggle("hasFieldTeam", "We have field teams on the ground", "We can conduct physical verification and aid delivery.")}
                        {toggle("previousSomalia", "We have previous experience in Somalia", "We have worked in Somalia or East Africa before.")}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review */}
                  {step === 3 && (
                    <div>
                      <h3 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800 }}>✅ Review & Submit</h3>
                      <div style={{ background:C.bg, borderRadius:14, padding:"20px 22px", marginBottom:18 }}>
                        {[
                          ["Organisation", form.orgName],
                          ["Type", form.type],
                          ["Country", form.country],
                          ["Registration No.", form.regNumber],
                          ["Contact", `${form.contactName} (${form.contactTitle})`],
                          ["Email", form.contactEmail],
                          ["Phone", form.contactPhone],
                          ["Focus Areas", form.focusAreas.join(", ")],
                          ["Regions", form.operatingRegions],
                          ["Annual Budget", form.annualBudget],
                          ["Staff", form.staffCount],
                        ].filter(([,v])=>v).map(([k,v]) => (
                          <div key={k} style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:12, marginBottom:10, fontSize:14 }}>
                            <span style={{ color:C.muted, fontWeight:700 }}>{k}</span>
                            <span style={{ color:C.text }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
                          <input type="checkbox" checked={form.acceptsTerms} onChange={e=>set("acceptsTerms",e.target.checked)}
                            style={{ marginTop:3, width:18, height:18, cursor:"pointer" }} />
                          <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>
                            I confirm that all information provided is accurate. I accept the <a href="#" onClick={e=>{e.preventDefault();setShowTerms(true);}} style={{ color:C.primary, fontWeight:700, textDecoration:"underline", cursor:"pointer" }}>Partner Terms & Conditions</a> and understand that Kafaale Qaad will review this application before granting access.
                          </div>
                        </label>
                        {errors.acceptsTerms && <div style={{ fontSize:11, color:C.danger, marginTop:6 }}>⚠ {errors.acceptsTerms}</div>}
                      </div>
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div style={{ display:"flex", gap:12, marginTop:28, justifyContent:"space-between" }}>
                    <button onClick={back} disabled={step===0}
                      style={{ padding:"12px 24px", borderRadius:11, border:`1.5px solid ${C.border}`, background:"#fff", fontWeight:700, fontSize:14, cursor: step===0 ? "default" : "pointer", opacity: step===0 ? 0.4 : 1 }}>
                      ← Back
                    </button>
                    {step < 3
                      ? <button onClick={next} style={{ padding:"12px 32px", borderRadius:11, background:C.primary, color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer" }}>
                          Continue →
                        </button>
                      : <button onClick={submit} style={{ padding:"12px 32px", borderRadius:11, background:C.secondary, color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer" }}>
                          ✅ Submit Application
                        </button>
                    }
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Admin Panel ── */}
      {tab === "admin" && isAdmin && (
        <section style={{ padding:"64px 24px 80px", background:C.bg }}>
          <div style={{ maxWidth:900, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:40 }}>
              <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:900, margin:"0 0 8px" }}>Partner Management</h2>
              <p style={{ fontSize:14, color:C.muted }}>Create partners and publish them to the public listing.</p>
            </div>

            {apSaved && (
              <div style={{ background:"#D1FAE5", border:"1px solid #6EE7B7", borderRadius:12, padding:"14px 20px", marginBottom:24, color:"#065F46", fontWeight:700, fontSize:14 }}>
                Partner saved successfully!
              </div>
            )}

            {/* Create / Edit Form */}
            <div style={{ background:"#fff", borderRadius:20, padding:"32px", boxShadow:"0 4px 24px rgba(0,0,0,.07)", border:`1px solid ${C.border}`, marginBottom:40 }}>
              <h3 style={{ margin:"0 0 24px", fontSize:18, fontWeight:800 }}>{editingId ? "Edit Partner" : "Create New Partner"}</h3>

              {/* Logo upload */}
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Partner Logo</label>
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:72, height:72, borderRadius:14, border:`2px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", background:C.bg, cursor:"pointer", flexShrink:0 }}
                    onClick={() => logoInputRef.current?.click()}>
                    {apForm.logoUrl
                      ? <img src={apForm.logoUrl} alt="logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                      : <span style={{ fontSize:28, color:C.muted }}>+</span>}
                  </div>
                  <div>
                    <button onClick={() => logoInputRef.current?.click()} style={{ padding:"9px 18px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                      Upload Logo
                    </button>
                    {apForm.logoUrl && <button onClick={() => setAp("logoUrl","")} style={{ marginLeft:8, padding:"9px 14px", borderRadius:9, border:`1.5px solid ${C.danger}`, background:"#fff", color:C.danger, fontWeight:700, fontSize:12, cursor:"pointer" }}>Remove</button>}
                    <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>PNG or JPG, max 2MB</div>
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:"none" }} />
                </div>
              </div>

              <div style={{ display:"grid", gap:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Organisation Name <span style={{color:C.danger}}>*</span></label>
                    <input value={apForm.name} onChange={e=>setAp("name",e.target.value)} placeholder="e.g. Al-Khair Foundation"
                      style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${apErrors.name?C.danger:C.border}`, fontSize:14, boxSizing:"border-box" }} />
                    {apErrors.name && <div style={{ fontSize:11, color:C.danger, marginTop:3 }}>Required</div>}
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Organisation Type <span style={{color:C.danger}}>*</span></label>
                    <FixedSelect value={apForm.type} onChange={e=>setAp("type",e.target.value)} style={{ width:"100%", borderRadius:10, fontSize:14, border:`1.5px solid ${apErrors.type?C.danger:C.border}` }}>
                      <option value="">Select…</option>
                      {ORG_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
                    </FixedSelect>
                    {apErrors.type && <div style={{ fontSize:11, color:C.danger, marginTop:3 }}>Required</div>}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Country <span style={{color:C.danger}}>*</span></label>
                    <FixedSelect value={apForm.country} onChange={e=>setAp("country",e.target.value)} style={{ width:"100%", borderRadius:10, fontSize:14, border:`1.5px solid ${apErrors.country?C.danger:C.border}` }}>
                      <option value="">Select…</option>
                      {ALL_COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </FixedSelect>
                    {apErrors.country && <div style={{ fontSize:11, color:C.danger, marginTop:3 }}>Required</div>}
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Website</label>
                    <input value={apForm.website} onChange={e=>setAp("website",e.target.value)} placeholder="https://example.org"
                      style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, boxSizing:"border-box" }} />
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Cases Supported</label>
                    <input type="number" value={apForm.cases} onChange={e=>setAp("cases",e.target.value)} placeholder="0"
                      style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, boxSizing:"border-box" }} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Brand Color</label>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <input type="color" value={apForm.color} onChange={e=>setAp("color",e.target.value)}
                        style={{ width:44, height:44, borderRadius:8, border:"none", cursor:"pointer", padding:2 }} />
                      <span style={{ fontSize:13, color:C.muted }}>{apForm.color}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Focus Areas</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {FOCUS_AREAS.map(f => (
                      <button key={f} onClick={() => toggleApFocus(f)} style={{
                        padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:700, border:"1.5px solid", cursor:"pointer",
                        background: apForm.focusAreas.includes(f) ? C.primary : "#fff",
                        color: apForm.focusAreas.includes(f) ? "#fff" : C.muted,
                        borderColor: apForm.focusAreas.includes(f) ? C.primary : C.border,
                      }}>{f}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Description <span style={{color:C.danger}}>*</span></label>
                  <textarea rows={4} value={apForm.description} onChange={e=>setAp("description",e.target.value)} placeholder="Describe this partner organisation…"
                    style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${apErrors.description?C.danger:C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }} />
                  {apErrors.description && <div style={{ fontSize:11, color:C.danger, marginTop:3 }}>Required</div>}
                </div>

                <div style={{ display:"flex", gap:12, justifyContent:"flex-end", flexWrap:"wrap" }}>
                  {editingId && <button onClick={() => { setApForm(BLANK_PARTNER); setEditingId(null); }} style={{ padding:"11px 22px", borderRadius:10, border:`1.5px solid ${C.border}`, background:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>Cancel</button>}
                  <button onClick={() => savePartner(false)} style={{ padding:"11px 22px", borderRadius:10, background:C.muted, color:"#fff", border:"none", fontWeight:700, fontSize:14, cursor:"pointer" }}>Save as Draft</button>
                  <button onClick={() => savePartner(true)} style={{ padding:"11px 24px", borderRadius:10, background:C.secondary, color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer" }}>Publish Partner</button>
                </div>
              </div>
            </div>

            {/* Pending registrations */}
            {adminPartners.filter(p => p.status === "pending").length > 0 && (
              <div style={{ marginBottom:40 }}>
                <h3 style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>Pending Registrations ({adminPartners.filter(p=>p.status==="pending").length})</h3>
                <p style={{ fontSize:13, color:C.muted, marginBottom:18 }}>These organisations registered and are waiting for your approval. Edit their info then publish to make them live.</p>
                <div style={{ display:"grid", gap:14 }}>
                  {adminPartners.filter(p => p.status === "pending").map(p => (
                    <div key={p.id} style={{ background:"#FFFBEB", borderRadius:14, padding:"20px 24px", border:`1.5px solid #FCD34D`, boxShadow:"0 2px 8px rgba(0,0,0,.04)", display:"flex", alignItems:"center", gap:16 }}>
                      <div style={{ width:52, height:52, borderRadius:12, background:"#FEF3C7", border:`1.5px solid #F59E0B`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                        {p.logoUrl ? <img src={p.logoUrl} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} /> : <span style={{ fontSize:22 }}>🕐</span>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{p.name}</div>
                        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{p.type} · {p.country}</div>
                        {p.contactEmail && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Contact: {p.contactName} · {p.contactEmail}</div>}
                        <div style={{ fontSize:11, color:"#92400E", marginTop:4, fontWeight:700 }}>Submitted {new Date(p.submittedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                        <span style={{ background:"#FEF3C7", color:"#92400E", borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800 }}>Pending</span>
                        <button onClick={() => startEdit(p)} style={{ padding:"7px 14px", borderRadius:8, border:`1.5px solid ${C.primary}`, background:C.primary, color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>Edit & Review</button>
                        <button onClick={() => { const updated = adminPartners.map(x => x.id===p.id ? {...x, status:"approved", published:true} : x); saveAdminPartners(updated); setAdminPartners(updated); }} style={{ padding:"7px 14px", borderRadius:8, border:`1.5px solid ${C.secondary}`, background:C.secondary, color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>Approve & Publish</button>
                        <button onClick={() => deletePartner(p.id)} style={{ padding:"7px 14px", borderRadius:8, border:`1.5px solid ${C.danger}`, background:"#fff", color:C.danger, fontWeight:700, fontSize:12, cursor:"pointer" }}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Managed partners — card view matching public listing */}
            {adminPartners.filter(p => p.status !== "pending").length > 0 && (
              <div>
                <h3 style={{ fontSize:18, fontWeight:800, marginBottom:18 }}>Managed Partners ({adminPartners.filter(p=>p.status!=="pending").length})</h3>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:22 }}>
                  {adminPartners.filter(p => p.status !== "pending").map(p => (
                    <div key={p.id} style={{ background:"#fff", borderRadius:18, overflow:"hidden", border:`2px solid ${p.published ? C.secondary+"40" : C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,.06)", display:"flex", flexDirection:"column" }}>
                      {/* Card header — same as public */}
                      <div style={{ background:`linear-gradient(135deg, ${p.color}18, ${p.color}08)`, padding:"24px 20px 18px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          <div style={{ width:56, height:56, borderRadius:14, background:`linear-gradient(135deg,${p.color}30,${p.color}60)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0, overflow:"hidden" }}>
                            {p.logoUrl
                              ? <img src={p.logoUrl} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                              : <span>🤝</span>}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:15, fontWeight:800, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                            <div style={{ fontSize:12, color:p.color, fontWeight:700, marginTop:2 }}>{p.type}</div>
                            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{p.country}</div>
                          </div>
                          <span style={{ background: p.published ? "#D1FAE5" : "#FEF3C7", color: p.published ? "#065F46" : "#92400E", borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:800, flexShrink:0 }}>
                            {p.published ? "✓ Published" : "Draft"}
                          </span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div style={{ padding:"14px 20px 18px", flex:1 }}>
                        {p.focusAreas?.length > 0 && (
                          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                            {p.focusAreas.slice(0,3).map(f=><span key={f} style={{ background:p.color+"15", color:p.color, borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:700 }}>{f}</span>)}
                            {p.focusAreas.length > 3 && <span style={{ fontSize:10, color:C.muted }}>+{p.focusAreas.length-3}</span>}
                          </div>
                        )}
                        {p.description && (
                          <div style={{ fontSize:12, color:C.muted, lineHeight:1.5, marginBottom:10, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                            {p.description}
                          </div>
                        )}
                        <div style={{ fontSize:12, color:C.muted, fontWeight:600 }}>{Number(p.cases)||0} cases supported</div>
                      </div>

                      {/* Admin actions */}
                      <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 16px", display:"flex", gap:8, flexWrap:"wrap" }}>
                        <button onClick={() => togglePublish(p.id)} style={{ flex:1, padding:"8px 10px", borderRadius:9, border:`1.5px solid ${p.published ? C.danger : C.secondary}`, background: p.published ? "#FEF2F2" : "#ECFDF5", color: p.published ? C.danger : C.secondary, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                          {p.published ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => startEdit(p)} style={{ flex:1, padding:"8px 10px", borderRadius:9, border:`1.5px solid ${C.primary}`, background:"#EFF6FF", color:C.primary, fontWeight:700, fontSize:12, cursor:"pointer" }}>Edit</button>
                        <button onClick={() => deletePartner(p.id)} style={{ padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.danger}`, background:"#fff", color:C.danger, fontWeight:700, fontSize:12, cursor:"pointer" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Partner Value Proposition — split layout ── */}
      {tab === "partners" && (
        <section style={{ background:"#001A40", overflow:"hidden" }}>
          <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:460, alignItems:"center" }}>
            {/* Left — message */}
            <div style={{ padding:"72px 56px 72px 32px", color:"#fff" }}>
              <span style={{ display:"inline-block", background:"rgba(0,200,255,0.15)", border:"1.5px solid rgba(0,200,255,0.4)", borderRadius:24, padding:"6px 20px", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:24, color:"#00D4FF" }}>Global Impact Network</span>
              <h2 style={{ fontSize:"clamp(26px,3.5vw,44px)", fontWeight:900, margin:"0 0 20px", lineHeight:1.1, letterSpacing:-1, textShadow:"0 2px 20px rgba(0,0,0,0.4)" }}>
                Connect to a Network That Delivers — Every Time
              </h2>
              <p style={{ fontSize:16, color:"rgba(255,255,255,0.82)", lineHeight:1.85, margin:"0 0 32px", maxWidth:440 }}>
                When you partner with Kafaale Qaad, your organisation gains instant access to 14 verified regions, a fully auditable pipeline, and GPS-confirmed proof of every delivery. Your impact is real, measurable, and publicly recognised.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, maxWidth:440 }}>
                {[
                  { label:"Verified Pipeline",     desc:"Multi-layer case verification before funds release" },
                  { label:"GPS Proof of Delivery", desc:"Every delivery confirmed with coordinates & photos" },
                  { label:"Co-Branded Impact",     desc:"Your logo on every case you sponsor" },
                  { label:"Full Audit Access",     desc:"Immutable records available on request" },
                ].map((f,i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(0,200,255,0.2)", borderRadius:12, padding:"14px 16px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"#00D4FF", marginBottom:4 }}>{f.label}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", lineHeight:1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Right — glowing globe */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
              <img src="/partners-globe.jpg" alt="Global partner network"
                style={{ width:"100%", maxWidth:460, height:"auto", objectFit:"contain", borderRadius:20, display:"block" }} />
            </div>
          </div>
        </section>
      )}

      {/* ── Partner Terms & Conditions Modal ── */}
      {showTerms && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={() => setShowTerms(false)}>
          <div style={{ background:"#fff", borderRadius:20, maxWidth:720, width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>

            {/* Header */}
            <div style={{ background:`linear-gradient(135deg, ${C.navy}, ${C.primary})`, color:"#fff", padding:"28px 32px", borderRadius:"20px 20px 0 0", position:"sticky", top:0, zIndex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", opacity:0.7, marginBottom:4 }}>Kafaale Qaad HOPE Society</div>
                  <div style={{ fontSize:22, fontWeight:900 }}>Partner Terms & Conditions</div>
                  <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>Effective Date: January 1, 2025 · Version 2.1</div>
                </div>
                <button onClick={()=>setShowTerms(false)} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:10, width:40, height:40, cursor:"pointer", fontSize:20, color:"#fff" }}>×</button>
              </div>
            </div>

            <div style={{ padding:"32px" }}>
              {[
                {
                  title:"1. Definitions",
                  body:`"Kafaale Qaad" refers to Kafaale Qaad HOPE Society, a registered humanitarian organisation based in Mogadishu, Somalia. "Partner" refers to any organisation accepted into the Kafaale Qaad partner network. "Platform" refers to the Kafaale Qaad digital platform and case management system. "Beneficiary" refers to individuals or families receiving aid through the Platform.`
                },
                {
                  title:"2. Eligibility & Admission",
                  body:`2.1 Applicants must be a registered legal entity (NGO, foundation, government body, or recognised institution) in their country of operation.\n2.2 Partners must not appear on any international sanctions lists (UN, EU, OFAC).\n2.3 Kafaale Qaad reserves the right to approve, reject, or conditionally accept any application without providing reasons.\n2.4 Approval is not guaranteed and is subject to due-diligence verification including field visits and document checks.`
                },
                {
                  title:"3. Partner Obligations",
                  body:`3.1 Partners must conduct all humanitarian activities in accordance with the Core Humanitarian Standard (CHS) and Do No Harm principles.\n3.2 Partners must submit monthly delivery reports including GPS-confirmed delivery photographs within 7 days of each aid delivery.\n3.3 Partners must maintain accurate beneficiary records and make them available to Kafaale Qaad upon request with 48 hours notice.\n3.4 Partners must not use Kafaale Qaad funds for administrative overhead exceeding 10% of any disbursement.\n3.5 Partners must report any security incident, fraud suspicion, or programme disruption to Kafaale Qaad within 24 hours.\n3.6 Partners must not sub-grant funds to third parties without prior written approval from Kafaale Qaad.`
                },
                {
                  title:"4. Financial & Accountability Standards",
                  body:`4.1 All funds received through the Platform must be used exclusively for the approved case or programme they were designated for.\n4.2 Partners must maintain a separate bank account or fund ledger for Kafaale Qaad disbursements.\n4.3 Partners consent to independent financial audits by Kafaale Qaad or a third-party auditor, with 14 days notice.\n4.4 Unexpended funds at programme closure must be returned within 30 days or reallocated with written approval.\n4.5 Partners must issue official receipts for all aid deliveries and provide copies to Kafaale Qaad.`
                },
                {
                  title:"5. Data Protection & Beneficiary Privacy",
                  body:`5.1 Partners must comply with applicable data protection laws in their jurisdiction.\n5.2 Beneficiary personal information (names, photos, medical data) must not be shared with any third party, media, or social media without explicit written consent from the beneficiary or their legal guardian.\n5.3 Partners must implement reasonable security measures to protect beneficiary data from unauthorised access.\n5.4 Data breaches affecting beneficiary information must be reported to Kafaale Qaad within 72 hours.`
                },
                {
                  title:"6. Branding & Communications",
                  body:`6.1 Partners may use the "Kafaale Qaad Verified Partner" badge in communications related to joint programmes only.\n6.2 Partners must not misrepresent their relationship with Kafaale Qaad or imply endorsement beyond the scope of the partnership.\n6.3 All public communications referencing joint activities require review and approval from Kafaale Qaad's communications team with 5 business days lead time.\n6.4 Kafaale Qaad may feature the Partner's name, logo, and impact statistics on the Platform and in public reports.`
                },
                {
                  title:"7. Suspension & Termination",
                  body:`7.1 Kafaale Qaad may immediately suspend a partner account if there is evidence of fraud, fund misuse, beneficiary harm, or violation of these Terms.\n7.2 Either party may terminate the partnership with 60 days written notice.\n7.3 Upon termination, the Partner must: (a) complete or properly hand over all active cases, (b) submit a final financial report, (c) return all unexpended funds, and (d) cease use of Kafaale Qaad branding.\n7.4 Termination does not affect obligations arising from activities conducted during the partnership period.`
                },
                {
                  title:"8. Conflict of Interest",
                  body:`8.1 Partners must disclose any real or potential conflict of interest that may affect programme delivery, including family relationships with beneficiaries, financial interests in suppliers, or political affiliations that could compromise neutrality.\n8.2 Undisclosed conflicts of interest are grounds for immediate termination.`
                },
                {
                  title:"9. Dispute Resolution",
                  body:`9.1 Disputes shall first be addressed through good-faith negotiation within 30 days of written notice.\n9.2 If unresolved, disputes shall be referred to mediation under the rules of the Somali National Mediation Centre.\n9.3 If mediation fails, disputes shall be submitted to binding arbitration in Mogadishu, Somalia, under Somali law.\n9.4 Nothing in this clause prevents either party from seeking urgent injunctive relief from a competent court.`
                },
                {
                  title:"10. Governing Law",
                  body:`These Terms are governed by the laws of the Federal Republic of Somalia and internationally recognised principles of humanitarian law. Partners operating outside Somalia also agree to comply with all applicable local laws in their jurisdiction.`
                },
                {
                  title:"11. Amendments",
                  body:`Kafaale Qaad reserves the right to amend these Terms at any time. Partners will be notified of material changes via email at least 30 days before they take effect. Continued participation after the effective date constitutes acceptance of the amended Terms.`
                },
                {
                  title:"12. Contact",
                  body:`For questions regarding these Terms, contact: legal@kafaale.so · Kafaale Qaad HOPE Society, Mogadishu, Somalia.`
                },
              ].map(({ title, body }) => (
                <div key={title} style={{ marginBottom:24, paddingBottom:24, borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.navy, marginBottom:10 }}>{title}</div>
                  <div style={{ fontSize:13, color:"#374151", lineHeight:1.85, whiteSpace:"pre-line" }}>{body}</div>
                </div>
              ))}

              <div style={{ background:"#EFF6FF", borderRadius:12, padding:"16px 20px", marginTop:8 }}>
                <div style={{ fontSize:12, color:C.primary, fontWeight:700, marginBottom:4 }}>Acceptance</div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>
                  By submitting a partnership application and ticking the acceptance checkbox, you confirm that you have read, understood, and agree to be bound by these Partner Terms & Conditions on behalf of your organisation.
                </div>
              </div>

              <div style={{ display:"flex", justifyContent:"center", marginTop:24 }}>
                <button onClick={()=>setShowTerms(false)} style={{ padding:"13px 40px", background:C.primary, color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontWeight:800, fontSize:15 }}>
                  I Have Read the Terms
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
