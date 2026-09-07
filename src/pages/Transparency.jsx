import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { useResponsive } from "../hooks/useResponsive.js";
import { C } from "../theme.js";
import { impact as impactApi } from "../api/client.js";

const money = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;

// No real backend source exists for a "how funds are used" percentage
// breakdown or for a list of downloadable report files (size/availability),
// so those widgets were removed rather than filled with invented numbers —
// see the real, backend-aggregated stats below instead.

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

  // Real, backend-aggregated impact numbers (GET /api/impact). No stat renders
  // until genuine data arrives — nothing here is invented.
  const [impactStats, setImpactStats] = useState(null);
  useEffect(() => { impactApi.stats().then(setImpactStats).catch(() => {}); }, []);
  const STATS = impactStats ? [
    { value: String(impactStats.casesCompleted ?? 0),  label:"Cases Completed & Delivered" },
    { value: money(impactStats.totalDelivered),         label:"Total Aid Delivered" },
    { value: money(impactStats.totalRaised),             label:"Total Raised" },
    { value: String(impactStats.totalDonations ?? 0),   label:"Confirmed Donations" },
  ] : [];

  return (
    <>
      {/* Hero */}
      <section style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.primary} 55%,${C.secondary} 100%)`, color:"#fff", padding: isMobile?"60px 16px 48px":"100px 32px 72px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"relative", maxWidth:700, margin:"0 auto" }}>
          <span style={{ background:"rgba(255,255,255,0.15)", borderRadius:100, padding:"6px 18px", fontSize:12, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase" }}>
            {lang==="so"?"Daahfurnaan & Xisaabteynta":lang==="ar"?"الشفافية والمساءلة":lang==="tr"?"Şeffaflık ve Hesap Verebilirlik":lang==="es"?"Transparencia y Rendición de Cuentas":lang==="fr"?"Transparence et Responsabilité":"Transparency & Accountability"}
          </span>
          <h1 style={{ fontSize:"clamp(28px,5vw,56px)", fontWeight:900, margin:"20px 0 18px", lineHeight:1.1, letterSpacing:-1, color:"#fff" }}>
            {lang==="so"?"Waxaad Siisaa, Waxaad Aragto":"See Where Every Dollar Goes"}
          </h1>
          <p style={{ fontSize:"clamp(14px,2vw,18px)", opacity:0.85, lineHeight:1.7, maxWidth:560, margin:"0 auto" }}>
            {lang==="so"?"Kafaala Qaad waxay amaanatad kuu hayaa xaqiijin, caddayn iyo faahfaahin buuxda dheef ahaan kasta.":"Kafaala Qaad holds itself to full accountability — verified delivery, photo proof, and public financial reporting."}
          </p>
        </div>
      </section>

      {/* Key stats — real, backend-aggregated numbers only */}
      {STATS.length > 0 && (
        <section style={sec("#fff")}>
          <div style={wrap}>
            <div style={{ textAlign:"center", marginBottom: isMobile?36:52 }}>
              <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:900, margin:"0 0 10px" }}>Our Impact, By the Numbers</h2>
              <p style={{ fontSize:15, color:C.muted }}>Live data from our platform</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(4,1fr)", gap: isMobile?14:24 }}>
              {STATS.map(s => (
                <div key={s.label} style={{ background:C.bg, borderRadius:16, padding: isMobile?18:28, textAlign:"center", border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:C.primary, marginBottom:6 }}>{s.value}</div>
                  <div style={{ fontSize:12, color:C.muted, fontWeight:600, lineHeight:1.4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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

      {/* Financial reports — requested by email; no fabricated file list */}
      <section style={sec(C.bg)}>
        <div style={wrap}>
          <div style={{ textAlign:"center", marginBottom: isMobile?36:52 }}>
            <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:900, margin:"0 0 10px" }}>Financial Reports & Documents</h2>
            <p style={{ fontSize:15, color:C.muted }}>Request our financial statements and impact reports.</p>
          </div>
          <div style={{ maxWidth:680, margin:"0 auto" }}>
            <div style={{ background:C.primary+"10", border:`1px dashed ${C.primary}`, borderRadius:12, padding:"20px 24px", fontSize:14, color:C.text, textAlign:"center", lineHeight:1.7 }}>
              Financial documents are available to donors, partners, and auditors on request. Email{" "}
              <a href="mailto:reports@kafaale.so" style={{ color:C.primary, fontWeight:700 }}>reports@kafaale.so</a>{" "}
              and our team will send the latest statements.
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background:`linear-gradient(135deg,${C.navy},${C.primary})`, color:"#fff", padding: isMobile?"48px 16px":"64px 32px", textAlign:"center" }}>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(22px,4vw,36px)", fontWeight:900, margin:"0 0 14px", color:"#fff" }}>Donate with Confidence</h2>
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
