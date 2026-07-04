import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { useResponsive } from "../hooks/useResponsive.js";

const C = {
  navy:"#002651", primary:"#004B96", secondary:"#4B7D19",
  gold:"#E0AB21", muted:"#5A6E8A", bg:"#F4F7FC",
  border:"#D8E4F0", text:"#0D1F3C",
};

const FAQ_DATA = [
  {
    category: "About Kafaala Qaad",
    icon: "ℹ️",
    items: [
      { q:"What is Kafaala Qaad?", a:"Kafaala Qaad (Hope Society) is a digital humanitarian aid platform that connects people in need in Somalia with verified donors and sponsors worldwide. We use an 11-step verified pipeline to ensure every case is real before funds are collected or distributed." },
      { q:"How is Kafaala Qaad different from other donation platforms?", a:"Unlike general crowdfunding sites, every case on Kafaala Qaad is physically verified by a trained field agent with GPS-tagged photos and a documented field report. Donors see the before and after — not just the request." },
      { q:"What regions do you currently serve?", a:"We currently operate across Somalia including Mogadishu, Baidoa, Kismayo, Garowe, and surrounding regions. We are expanding to new districts monthly." },
      { q:"Is Kafaala Qaad a registered organization?", a:"Yes. Kafaala Qaad Hope Society is a registered humanitarian organization operating under Somali law with international compliance standards." },
    ],
  },
  {
    category: "For Donors & Sponsors",
    icon: "❤️",
    items: [
      { q:"How do I know my donation is being used properly?", a:"Every case goes through physical field verification before it is published to donors. After aid delivery, field agents upload proof of delivery (photos, GPS coordinates, confirmation signatures). You receive a delivery report for any case you sponsor." },
      { q:"What payment methods are accepted?", a:"We accept credit/debit cards, bank transfers, EVC Plus, Hormuud Tele, and major international payment gateways. Contact us to discuss large or recurring donations." },
      { q:"Can I sponsor a specific child or family?", a:"Yes. Browse the Cases section and click 'Sponsor' on any verified, published case. You can filter by urgency, category (medical, food, shelter, etc.), and location." },
      { q:"Can I make a recurring monthly donation?", a:"Yes. When enrolling a sponsorship, you can choose a monthly recurring amount. This is ideal for child sponsorship and education programs." },
      { q:"Is my donation tax-deductible?", a:"This depends on your country of residence. Kafaala Qaad provides donation receipts for all transactions. Consult your local tax authority or accountant regarding deductibility." },
      { q:"What happens if a case is fully funded?", a:"When a case reaches its target goal, it is locked and moved to aid delivery. If a case receives more than needed, surplus funds go into the general emergency reserve for urgent future cases." },
    ],
  },
  {
    category: "Reporting a Case",
    icon: "📝",
    items: [
      { q:"Who can report a case?", a:"Any registered user with the Reporter role can submit a case. Registration is free and only requires an email, phone number, and basic profile. Reports can be submitted via the Contact page without login." },
      { q:"What information do I need to report a case?", a:"You need: a description of the need (at least 10 words), the person's general location (district), an urgency level, and ideally a photo. Private contact details for the person in need are kept confidential." },
      { q:"How long does verification take?", a:"After submission, cases are assigned to a field agent within 24–72 hours. The field investigation typically takes 3–7 days depending on location. Total time to publication is usually 7–14 days." },
      { q:"What happens after I submit a report?", a:"Your case enters 'Pending Review' status. A verification officer reviews it and assigns a field agent. The field agent visits, verifies, and submits a report. Once approved, the case is published for donors." },
      { q:"Will the person's name be made public?", a:"No. All personally identifying information (name, phone, address) is kept strictly private and is only accessible to verified staff. Donors only see anonymous summaries and category information." },
    ],
  },
  {
    category: "For Field Agents & Volunteers",
    icon: "🗺️",
    items: [
      { q:"How do I become a field agent?", a:"Apply via the Volunteer page. You'll go through a background check, a short orientation call, and platform training. Field agents are assigned to cases in their district." },
      { q:"Are field agents paid?", a:"Yes. Active field agents receive a per-case payment for verified and completed investigations. The rate depends on case type and distance. Contact us for current rates." },
      { q:"What tools do I need as a field agent?", a:"A smartphone with GPS, the Kafaala Qaad mobile-compatible platform, and reliable local transport. We provide training and a documentation template." },
      { q:"What if a case turns out to be fraudulent?", a:"Field agents are trained to identify fraud indicators. If a case cannot be verified, it is rejected with notes. The system has a fraud detection layer that flags suspicious patterns automatically." },
    ],
  },
  {
    category: "Privacy & Security",
    icon: "🔐",
    items: [
      { q:"How is my personal data protected?", a:"All user data is encrypted at rest and in transit (AES-256 + TLS). Personally identifying information about beneficiaries is only accessible to authorized staff. We do not sell or share user data." },
      { q:"How do you prevent duplicate or fraudulent cases?", a:"Our system checks for duplicate descriptions, locations, and reporter patterns. An AI layer scans all submissions for PII and inconsistencies. All cases require physical field verification before publication." },
      { q:"Can I delete my account?", a:"Yes. Contact kafaaleqaad@gmail.com with your account email to request account deletion. All personal data is removed within 30 days." },
    ],
  },
];

function Accordion({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:`1px solid ${C.border}` }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width:"100%", padding:"18px 0", background:"none", border:"none", textAlign:"left", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:15, fontWeight:700, color:open?C.primary:C.text, lineHeight:1.4, flex:1 }}>{q}</span>
        <span style={{ flexShrink:0, fontSize:18, color:C.muted, transition:"transform .2s", transform:open?"rotate(45deg)":"none", display:"flex", alignItems:"center", justifyContent:"center", width:24, height:24, background:open?C.primary+"15":"#F3F4F6", borderRadius:"50%" }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom:18, fontSize:14, color:C.muted, lineHeight:1.75 }}>{a}</div>
      )}
    </div>
  );
}

export default function FAQ() {
  const { lang } = useLang();
  const { isMobile } = useResponsive();
  const [activeSection, setActiveSection] = useState("All");
  const [search, setSearch] = useState("");

  const sections = ["All", ...FAQ_DATA.map(s => s.category)];

  const filteredData = FAQ_DATA
    .filter(s => activeSection === "All" || s.category === activeSection)
    .map(s => ({
      ...s,
      items: s.items.filter(item => {
        const q = search.toLowerCase();
        return !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
      }),
    }))
    .filter(s => s.items.length > 0);

  const wrap = { maxWidth:900, margin:"0 auto", padding: isMobile?"0 16px":"0 32px" };
  const sec  = (bg) => ({ background:bg, padding: isMobile?"48px 0":"72px 0" });

  return (
    <>
      {/* Hero */}
      <section style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.primary} 60%,${C.secondary} 100%)`, color:"#fff", padding: isMobile?"60px 16px 48px":"90px 32px 64px", textAlign:"center" }}>
        <div style={{ maxWidth:640, margin:"0 auto" }}>
          <h1 style={{ fontSize:"clamp(28px,5vw,52px)", fontWeight:900, margin:"0 0 18px", lineHeight:1.1, letterSpacing:-1 }}>
            {lang==="so"?"Su'aalaha Badanaa la Is Weydiiyo":"Frequently Asked Questions"}
          </h1>
          <p style={{ fontSize:"clamp(14px,2vw,17px)", opacity:0.85, lineHeight:1.7, marginBottom:28 }}>
            {lang==="so"?"Hel jawaabta su'aaladaada degdeg. Haddaad weli su'aal qabto, nala xiriir.":"Find answers fast. If you still have questions, contact us."}
          </p>
          <div style={{ maxWidth:440, margin:"0 auto", position:"relative" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search questions…"
              style={{ width:"100%", padding:"13px 46px 13px 16px", borderRadius:12, border:"none", fontSize:14, boxSizing:"border-box", outline:"none" }}
            />
            <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:18, opacity:0.5 }}>🔍</span>
          </div>
        </div>
      </section>

      {/* Category tabs */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:10 }}>
        <div style={{ ...wrap, paddingTop:0, paddingBottom:0 }}>
          <div style={{ display:"flex", gap:0, overflowX:"auto", scrollbarWidth:"none" }}>
            {sections.map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                style={{ padding:"14px 18px", background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap", fontSize:13, fontWeight:700, color:activeSection===s?C.primary:C.muted, borderBottom:activeSection===s?`3px solid ${C.primary}`:"3px solid transparent", transition:"all .15s" }}>
                {FAQ_DATA.find(d=>d.category===s)?.icon || "📌"} {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ content */}
      <section style={sec(C.bg)}>
        <div style={wrap}>
          {filteredData.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
              <div style={{ fontSize:18, fontWeight:700 }}>No results found</div>
              <div style={{ fontSize:14, marginTop:8 }}>Try a different search term</div>
            </div>
          )}
          {filteredData.map(section => (
            <div key={section.category} style={{ background:"#fff", borderRadius:16, padding: isMobile?20:32, marginBottom:24, border:`1px solid ${C.border}`, boxShadow:"0 2px 8px rgba(0,38,81,0.04)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, paddingBottom:16, borderBottom:`2px solid ${C.border}` }}>
                <span style={{ fontSize:24 }}>{section.icon}</span>
                <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>{section.category}</h2>
                <span style={{ marginLeft:"auto", fontSize:12, color:C.muted, background:C.bg, borderRadius:20, padding:"3px 10px", fontWeight:600 }}>{section.items.length} questions</span>
              </div>
              {section.items.map((item, i) => <Accordion key={i} q={item.q} a={item.a} />)}
            </div>
          ))}

          {/* Still have questions */}
          <div style={{ background:`linear-gradient(135deg,${C.primary}10,${C.secondary}10)`, borderRadius:16, padding: isMobile?20:32, textAlign:"center", border:`1px solid ${C.border}`, marginTop:8 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
            <h3 style={{ fontSize:20, fontWeight:800, margin:"0 0 10px" }}>Still have a question?</h3>
            <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>Our team responds within 24 hours.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <Link to="/contact" style={{ padding:"12px 24px", background:C.primary, color:"#fff", borderRadius:10, fontWeight:700, fontSize:14, textDecoration:"none" }}>📬 Contact Us</Link>
              <a href="mailto:kafaaleqaad@gmail.com" style={{ padding:"12px 24px", background:"none", border:`1.5px solid ${C.primary}`, color:C.primary, borderRadius:10, fontWeight:600, fontSize:14, textDecoration:"none" }}>✉️ Email Support</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
