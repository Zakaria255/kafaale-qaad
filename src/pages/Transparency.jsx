import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { useResponsive } from "../hooks/useResponsive.js";

const C = {
  navy:"#002651", primary:"#004B96", secondary:"#4B7D19",
  gold:"#E0AB21", muted:"#5A6E8A", bg:"#F4F7FC",
  border:"#D8E4F0", text:"#0D1F3C",
};

const FUND_BREAKDOWN = [
  { label:"Direct Aid to Beneficiaries", pct:72, color:"#4B7D19",   desc:"Food, medicine, shelter materials, school fees delivered directly to verified cases." },
  { label:"Field Verification Operations", pct:14, color:"#004B96",  desc:"Field agent travel, documentation, GPS equipment, and case investigation costs." },
  { label:"Platform & Technology",         pct:8,  color:"#E0AB21",  desc:"Server hosting, security, mobile app, AI verification infrastructure." },
  { label:"Administration & Compliance",   pct:6,  color:"#5A6E8A",  desc:"Legal, accounting, audit, and compliance with international humanitarian standards." },
];

const STATS = [
  { value:"500+",   label:"Cases Verified & Delivered", icon:"" },
  { value:"$380K+", label:"Total Aid Distributed",       icon:"" },
  { value:"12",     label:"Regions Covered",             icon:"" },
  { value:"97%",    label:"Delivery Verified Rate",      icon:"" },
  { value:"14 days",label:"Average Time to Delivery",    icon:"" },
  { value:"0",      label:"Unresolved Fraud Cases",      icon:"" },
];

const REPORTS = [
  { year:"2025", title:"Annual Impact Report 2025",  size:"2.4 MB", available:true  },
  { year:"2025", title:"Q1 2025 Financial Statement", size:"890 KB", available:true  },
  { year:"2025", title:"Q2 2025 Financial Statement", size:"910 KB", available:true  },
  { year:"2026", title:"Q1 2026 Financial Statement", size:"–",      available:false },
];

const PRINCIPLES = [
  { icon:"", title:"Open Financials",    desc:"Every quarter we publish a full breakdown of income, expenditure, and aid delivered. No hidden fees." },
  { icon:"", title:"Photo Proof",        desc:"Every case includes before/after photos, GPS coordinates, and delivery confirmation uploaded by field agents." },
  { icon:"", title:"Independent Audit",  desc:"Annual audit by an independent accounting firm. Results are published publicly on this page." },
  { icon:"", title:"Case Audit Trail",   desc:"Every action on every case is logged with timestamps. Full audit trail is preserved for 7 years." },
  { icon:"", title:"Zero Tolerance Fraud", desc:"Automated fraud detection + manual review for all cases. Any confirmed fraud case is immediately rejected and reported." },
  { icon:"", title:"Multi-language Reporting", desc:"Impact reports published in Somali, English, Arabic, and Turkish to serve all stakeholders." },
];

export default function Transparency() {
  const { lang } = useLang();
  const { isMobile, isTablet } = useResponsive();
  const wrap = { maxWidth:1100, margin:"0 auto", padding: isMobile?"0 16px":"0 32px" };
  const sec  = (bg) => ({ background:bg, padding: isMobile?"48px 0":"72px 0" });

  return (
    <>
      {/* Hero */}
      <section style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.primary} 55%,${C.secondary} 100%)`, color:"#fff", padding: isMobile?"60px 16px 48px":"100px 32px 72px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"relative", maxWidth:700, margin:"0 auto" }}>
          <span style={{ background:"rgba(255,255,255,0.15)", borderRadius:100, padding:"6px 18px", fontSize:12, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase" }}>
            {lang==="so"?"Daahfurnaan & Xisaabteynta":lang==="ar"?"الشفافية والمساءلة":lang==="tr"?"Şeffaflık ve Hesap Verebilirlik":lang==="es"?"Transparencia y Rendición de Cuentas":lang==="fr"?"Transparence et Responsabilité":"Transparency & Accountability"}
          </span>
          <h1 style={{ fontSize:"clamp(28px,5vw,56px)", fontWeight:900, margin:"20px 0 18px", lineHeight:1.1, letterSpacing:-1 }}>
            {lang==="so"?"Waxaad Siisaa, Waxaad Aragto":"See Where Every Dollar Goes"}
          </h1>
          <p style={{ fontSize:"clamp(14px,2vw,18px)", opacity:0.85, lineHeight:1.7, maxWidth:560, margin:"0 auto" }}>
            {lang==="so"?"Kafaala Qaad waxay amaanatad kuu hayaa xaqiijin, caddayn iyo faahfaahin buuxda dheef ahaan kasta.":"Kafaala Qaad holds itself to full accountability — verified delivery, photo proof, and public financial reporting."}
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section style={sec("#fff")}>
        <div style={wrap}>
          <div style={{ textAlign:"center", marginBottom: isMobile?36:52 }}>
            <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:900, margin:"0 0 10px" }}>Our Impact, By the Numbers</h2>
            <p style={{ fontSize:15, color:C.muted }}>Verified data as of June 2026</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(3,1fr)", gap: isMobile?14:24 }}>
            {STATS.map(s => (
              <div key={s.label} style={{ background:C.bg, borderRadius:16, padding: isMobile?18:28, textAlign:"center", border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:32, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:C.primary, marginBottom:6 }}>{s.value}</div>
                <div style={{ fontSize:12, color:C.muted, fontWeight:600, lineHeight:1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fund breakdown */}
      <section style={sec(C.bg)}>
        <div style={wrap}>
          <div style={{ textAlign:"center", marginBottom: isMobile?36:52 }}>
            <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:900, margin:"0 0 10px" }}>How Funds Are Used</h2>
            <p style={{ fontSize:15, color:C.muted }}>Every dollar received is allocated according to the following breakdown.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":"1fr 1fr", gap:24, alignItems:"center" }}>
            {/* Bar chart */}
            <div style={{ background:"#fff", borderRadius:16, padding:28, border:`1px solid ${C.border}` }}>
              {FUND_BREAKDOWN.map(item => (
                <div key={item.label} style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{item.label}</span>
                    <span style={{ fontSize:16, fontWeight:900, color:item.color }}>{item.pct}%</span>
                  </div>
                  <div style={{ height:10, background:"#F3F4F6", borderRadius:100, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${item.pct}%`, background:item.color, borderRadius:100, transition:"width 0.8s ease" }} />
                  </div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:5, lineHeight:1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Donut / visual */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {FUND_BREAKDOWN.map(item => (
                <div key={item.label} style={{ display:"flex", alignItems:"center", gap:14, background:"#fff", borderRadius:12, padding:"16px 20px", border:`1px solid ${C.border}` }}>
                  <div style={{ width:48, height:48, borderRadius:12, background:item.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                    {item.pct >= 60 ? "" : item.pct >= 12 ? "" : item.pct >= 7 ? "" : ""}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{item.label}</div>
                    <div style={{ fontSize:12, color:C.muted }}>{item.desc.slice(0,70)}…</div>
                  </div>
                  <div style={{ fontSize:22, fontWeight:900, color:item.color, flexShrink:0 }}>{item.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our principles */}
      <section style={sec("#fff")}>
        <div style={wrap}>
          <div style={{ textAlign:"center", marginBottom: isMobile?36:52 }}>
            <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:900, margin:"0 0 10px" }}>Our Accountability Principles</h2>
            <p style={{ fontSize:15, color:C.muted }}>Six commitments we make to every donor, beneficiary, and partner.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":"repeat(3,1fr)", gap: isMobile?16:22 }}>
            {PRINCIPLES.map(p => (
              <div key={p.title} style={{ background:C.bg, borderRadius:16, padding: isMobile?18:24, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:32, marginBottom:12 }}>{p.icon}</div>
                <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:8 }}>{p.title}</div>
                <div style={{ fontSize:13, color:C.muted, lineHeight:1.65 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Annual reports */}
      <section style={sec(C.bg)}>
        <div style={wrap}>
          <div style={{ textAlign:"center", marginBottom: isMobile?36:52 }}>
            <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:900, margin:"0 0 10px" }}>Financial Reports & Documents</h2>
            <p style={{ fontSize:15, color:C.muted }}>Download our public financial statements and impact reports.</p>
          </div>
          <div style={{ maxWidth:680, margin:"0 auto" }}>
            {REPORTS.map(r => (
              <div key={r.title} style={{ background:"#fff", borderRadius:14, padding:"18px 22px", marginBottom:12, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:10, background:r.available?C.primary+"15":"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {r.available ? "" : ""}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{r.title}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{r.year} · {r.size}</div>
                </div>
                {r.available
                  ? <a href={`mailto:reports@kafaale.so?subject=Request: ${r.title}`}
                      style={{ padding:"8px 18px", background:C.primary, color:"#fff", borderRadius:8, fontSize:12, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}>
                      Request
                    </a>
                  : <span style={{ fontSize:12, color:C.muted, fontStyle:"italic" }}>Coming soon</span>
                }
              </div>
            ))}
            <div style={{ background:C.primary+"10", border:`1px dashed ${C.primary}`, borderRadius:12, padding:"14px 20px", marginTop:16, fontSize:13, color:C.muted, textAlign:"center" }}>
              All financial documents are available to donors, partners, and auditors on request. Email{" "}
              <a href="mailto:reports@kafaale.so" style={{ color:C.primary, fontWeight:700 }}>reports@kafaale.so</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background:`linear-gradient(135deg,${C.navy},${C.primary})`, color:"#fff", padding: isMobile?"48px 16px":"64px 32px", textAlign:"center" }}>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(22px,4vw,36px)", fontWeight:900, margin:"0 0 14px" }}>Donate with Confidence</h2>
          <p style={{ fontSize:16, opacity:0.85, lineHeight:1.7, marginBottom:28 }}>
            Every dollar is tracked, verified, and reported. You'll receive a delivery confirmation for every case you sponsor.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link to="/cases" style={{ padding:"14px 32px", background:C.gold, color:"#fff", borderRadius:12, fontWeight:800, fontSize:15, textDecoration:"none" }}>Sponsor a Case</Link>
            <Link to="/contact" style={{ padding:"14px 32px", background:"rgba(255,255,255,0.15)", color:"#fff", borderRadius:12, fontWeight:700, fontSize:15, textDecoration:"none", border:"1px solid rgba(255,255,255,0.3)" }}>Ask a Question</Link>
          </div>
        </div>
      </section>
    </>
  );
}
