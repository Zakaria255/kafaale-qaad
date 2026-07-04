import { useState } from "react";
import FixedSelect from "../components/FixedSelect.jsx";
import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";
import { useAuth } from "../context/AuthContext.jsx";
import { cases as casesApi } from "../api/client.js";

const C = { navy: "#002651", primary: "#004B96", secondary: "#4B7D19", accent: "#E0AB21", danger: "#C0392B", muted: "#5A6E8A", bg: "#F4F7FC", border: "#D8E4F0", text: "#0D1F3C", gold: "#E0AB21", green: "#4B7D19", blue: "#004B96" };

export default function Contact() {
  const { lang } = useLang();
  const P = PT.contact[lang] || PT.contact.en;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab,       setTab]      = useState("report");
  const [form,      setForm]     = useState({ name: "", age: "", gender: P.gender_female, location: "", urgency: "Medium", desc: "", phone: "" });
  const [contact,   setContact]  = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted]= useState(false);
  const [cSubmit,   setCSubmit]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [refNum, setRefNum] = useState("");

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setC = (k, v) => setContact(c => ({ ...c, [k]: v }));

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.desc) return alert("Please fill required fields");
    if (!user) { navigate("/login?tab=register"); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        privateDescription: `Reporter: ${form.name}${form.age ? `, Age: ${form.age}` : ""}, Gender: ${form.gender}, Phone: ${form.phone || "N/A"}\n\n${form.desc}`,
        category: "other",
        emergencyLevel: form.urgency.toLowerCase(),
        privateDistrict: form.location,
      };
      const res = await casesApi.submit(payload);
      setRefNum(res?.caseRef || res?.id || `RPT-${Math.floor(Math.random()*90000)+10000}`);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(contact.subject || "Contact from Kafaale Qaad website");
    const body = encodeURIComponent(`Name: ${contact.name}\nEmail: ${contact.email}\n\n${contact.message}`);
    window.open(`mailto:kafaaleqaad@gmail.com?subject=${subject}&body=${body}`, "_blank");
    setCSubmit(true);
  };

  const HOW_STEPS = [
    { n: 1, icon: "📝", title: P.step1_title, desc: P.step1_desc },
    { n: 2, icon: "🏛️", title: P.step2_title, desc: P.step2_desc },
    { n: 3, icon: "🔍", title: P.step3_title, desc: P.step3_desc },
    { n: 4, icon: "❤️", title: P.step4_title, desc: P.step4_desc },
  ];

  const CONTACT_INFO = [
    { icon: "📧", label: lang==="so"?"Emailka":lang==="ar"?"البريد الإلكتروني":lang==="tr"?"E-posta":lang==="es"?"Correo":lang==="fr"?"E-mail":"Email",   val: "kafaaleqaad@gmail.com"  },
    { icon: "📞", label: lang==="so"?"Taleefanka":lang==="ar"?"الهاتف":lang==="tr"?"Telefon":lang==="es"?"Teléfono":lang==="fr"?"Téléphone":"Phone",        val: "+252 61 502 4050"       },
    { icon: "📍", label: lang==="so"?"Cinwaanka":lang==="ar"?"العنوان":lang==="tr"?"Adres":lang==="es"?"Dirección":lang==="fr"?"Adresse":"Address",          val: "Juma Tower, Room 403, Howl-wadaag, Mogadishu" },
    { icon: "🌐", label: lang==="so"?"Websaydka":lang==="ar"?"الموقع":lang==="tr"?"Web Sitesi":lang==="es"?"Sitio Web":lang==="fr"?"Site Web":"Website",     val: "kafaale.so"             },
    { icon: "⏰", label: lang==="so"?"Saacadaha":lang==="ar"?"ساعات العمل":lang==="tr"?"Çalışma Saatleri":lang==="es"?"Horarios":lang==="fr"?"Horaires":"Hours", val: lang==="so"?"Isniin–Jimce, 8GH – 6GH EAT":lang==="ar"?"الإثنين–الجمعة، 8ص – 6م EAT":lang==="tr"?"Pzt–Cum, 08:00 – 18:00 EAT":lang==="es"?"Lun–Vie, 8am – 6pm EAT":lang==="fr"?"Lun–Ven, 8h – 18h EAT":"Mon–Fri, 8am – 6pm EAT" },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0D1F3C" }}>

      {/* Hero */}
      <section style={{ backgroundImage: "url('/contact-hero.jpg')", backgroundSize: "cover", backgroundPosition: "center", position: "relative", color: "#fff", padding: "120px 24px 100px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,20,60,0.60)" }} />
        <div style={{ maxWidth: 660, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, margin: "0 0 14px" }}>{P.hero_title}</h1>
          <p style={{ fontSize: 17, opacity: 0.85, lineHeight: 1.7 }}>{P.hero_sub}</p>
        </div>
      </section>

      {/* Tab selector */}
      <section style={{ background: "#fff", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4 }}>
          {[
            { id: "report",  label: P.tab_report  },
            { id: "contact", label: P.tab_contact },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "16px 24px", fontSize: 15, fontWeight: 700, border: "none", background: "none", cursor: "pointer", color: tab === t.id ? C.primary : C.muted, borderBottom: tab === t.id ? `3px solid ${C.primary}` : "3px solid transparent", marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ padding: "60px 24px 80px", background: C.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 36, alignItems: "start" }}>

          {/* Left info panel */}
          <div>
            {tab === "report" ? (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>{P.how_title}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {HOW_STEPS.map(s => (
                    <div key={s.n} style={{ display: "flex", gap: 14, background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.primary + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{P.step_lbl} {s.n}: {s.title}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 12, padding: 16, marginTop: 20, fontSize: 13, color: "#92400E" }}>
                  {P.warning}
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px" }}>{P.contact_title}</h3>
                {CONTACT_INFO.map(i => (
                  <div key={i.label} style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: C.primary + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{i.icon}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{i.label.toUpperCase()}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{i.val}</div>
                    </div>
                  </div>
                ))}
                <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 14, padding: 20, marginTop: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.secondary, marginBottom: 10 }}>{P.for_donors}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{P.for_donors_desc}</div>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 36, boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
            {tab === "report" ? (
              submitted ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: C.secondary, margin: "0 0 10px" }}>{P.success_title}</h3>
                  <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>{P.success_sub}</p>
                  <div style={{ background: "#F0FDF4", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "left", fontSize: 13, lineHeight: 2 }}>
                    <div>🔖 {P.ref_lbl} <strong>{refNum}</strong></div>
                    <div>📅 {P.submitted_lbl} <strong>{new Date().toLocaleString()}</strong></div>
                    <div>📍 {P.location_lbl} <strong>{form.location}</strong></div>
                    <div>⚡ {P.urgency_lbl} <strong>{form.urgency}</strong></div>
                  </div>
                  <button onClick={() => { setSubmitted(false); setForm({ name:"", age:"", gender: P.gender_female, location:"", urgency:"Medium", desc:"", phone:"" }); }}
                    style={{ padding: "12px 28px", background: C.primary, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {P.another_report}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 24px" }}>{P.report_form_title}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{P.lbl_name}</label>
                      <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder={P.ph_name}
                        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{P.lbl_age}</label>
                      <input type="number" value={form.age} onChange={e => set("age", e.target.value)} placeholder={P.ph_age}
                        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{P.lbl_gender}</label>
                      <FixedSelect value={form.gender} onChange={e => set("gender", e.target.value)} style={{ width: "100%", borderRadius: 10, fontSize: 14 }}>
                        <option>{P.gender_female}</option><option>{P.gender_male}</option><option>{P.gender_other}</option>
                      </FixedSelect>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{P.lbl_urgency}</label>
                      <FixedSelect value={form.urgency} onChange={e => set("urgency", e.target.value)} style={{ width: "100%", borderRadius: 10, fontSize: 14 }}>
                        <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                      </FixedSelect>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{P.lbl_location}</label>
                    <input required value={form.location} onChange={e => set("location", e.target.value)} placeholder={P.ph_location}
                      style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{P.lbl_phone}</label>
                    <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder={P.ph_phone}
                      style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{P.lbl_desc}</label>
                    <textarea required value={form.desc} onChange={e => set("desc", e.target.value)} rows={4} placeholder={P.ph_desc}
                      style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                  {submitError && (
                    <div style={{ background: "#FEF2F2", border: `1px solid ${C.danger}30`, color: C.danger, padding: "10px 14px", borderRadius: 10, fontSize: 13, marginTop: 12 }}>
                      ⚠️ {submitError}
                    </div>
                  )}
                  {!user && (
                    <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400E", marginTop: 12 }}>
                      ℹ️ You must be <strong>signed in as a reporter</strong> to submit cases.
                    </div>
                  )}
                  <button type="submit" disabled={submitting} style={{ width: "100%", marginTop: 20, padding: "14px", background: C.primary, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "⏳ Submitting…" : P.submit_report}
                  </button>
                </form>
              )
            ) : (
              cSubmit ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>📬</div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: C.primary, margin: "0 0 10px" }}>{P.msg_sent_title}</h3>
                  <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.7 }}>{P.msg_sent_sub} <strong>{contact.email}</strong> {P.msg_sent_hours}</p>
                  <button onClick={() => { setCSubmit(false); setContact({ name:"", email:"", subject:"", message:"" }); }}
                    style={{ padding: "12px 28px", background: C.primary, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {P.another_msg}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 24px" }}>{P.contact_form_title}</h3>
                  {[
                    { key: "name",    label: P.lbl_cname,   type: "text",  required: true },
                    { key: "email",   label: P.lbl_email,   type: "email", required: true },
                    { key: "subject", label: P.lbl_subject, type: "text",  required: true },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{f.label}</label>
                      <input required={f.required} type={f.type} value={contact[f.key]} onChange={e => setC(f.key, e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>{P.lbl_message}</label>
                    <textarea required value={contact.message} onChange={e => setC("message", e.target.value)} rows={5}
                      style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                  <button type="submit" style={{ width: "100%", padding: "14px", background: C.primary, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                    {P.submit_msg}
                  </button>
                </form>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
