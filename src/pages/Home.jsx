import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";
import { useResponsive } from "../hooks/useResponsive.js";
import { cases as casesApi } from "../api/client.js";

const C = {
  navy: "#002651", primary: "#004B96", secondary: "#4B7D19",
  accent: "#E0AB21", gold: "#E0AB21", green: "#4B7D19", blue: "#004B96",
  danger: "#C0392B", muted: "#5A6E8A", bg: "#F4F7FC",
  border: "#D8E4F0", text: "#0D1F3C",
};

const URGENCY_COLOR = { Low: "#10B981", Medium: "#F59E0B", High: "#C0392B", Critical: "#7C3AED" };
const URGENCY_BG    = { Low: "#D1FAE5", Medium: "#FEF3C7", High: "#FEE2E2", Critical: "#EDE9FE" };

// Fallback demo cases shown only when API has no published cases yet
const DEMO_CASES = [
  { id: null, location: "Mogadishu Region", urgency: "High",     funded: 68, goal: 850,   desc: "Elderly community member with chronic illness needs medication and food support. Case verified.",         img: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&q=75" },
  { id: null, location: "Mogadishu Region", urgency: "Critical", funded: 45, goal: 1200,  desc: "Family displaced by flooding needs immediate shelter and essential supplies. Situation confirmed.",        img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=75" },
  { id: null, location: "Mogadishu Region", urgency: "Medium",   funded: 82, goal: 600,   desc: "Young person with no family support seeking education assistance and safe shelter.", img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=75" },
];


export default function Home() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const P = PT.home[lang] || PT.home.en;
  const { isMobile, isTablet } = useResponsive();
  const [featuredCases, setFeaturedCases] = useState(DEMO_CASES);

  useEffect(() => {
    casesApi.list({ limit: 6 }).then(d => {
      const real = (d?.cases || []).filter(c => c.status === "waiting_for_sponsor" || c.status === "sponsored");
      if (real.length > 0) {
        setFeaturedCases(real.slice(0, 3).map(c => ({
          id:       c.id,
          location: c.publicCity || "Somalia",
          urgency:  c.emergencyLevel ? c.emergencyLevel.charAt(0).toUpperCase() + c.emergencyLevel.slice(1) : "Medium",
          funded:   c.targetGoal > 0 ? Math.round((c.totalRaised / c.targetGoal) * 100) : 0,
          goal:     c.targetGoal || 0,
          desc:     c.publicStory || c.publicTitle || "Verified case awaiting sponsorship.",
          img:      null,
        })));
      }
    }).catch(() => {});
  }, []);


  /* ─── data arrays (translations inline) ─────────────────────────────── */
  const WORKFLOW = [
    { n:1,  icon:"📝", color:"#3B82F6",  label: lang==="so"?"Abuurista Warbixinta"    :lang==="ar"?"إنشاء التقرير"         :lang==="tr"?"Rapor Oluşturma"       :lang==="es"?"Creación del Reporte" :lang==="fr"?"Création du Rapport"   :"Report Creation",     desc: lang==="so"?"Warbixiyuhu wuxuu soo gudbinaayaa xaaladda oo leh faahfaahinta, sawirrada iyo goobta":lang==="ar"?"يقدم المُبلِّغ حالة مع التفاصيل والصور والموقع":lang==="tr"?"Muhabir ayrıntılar, fotoğraflar ve konum ile vaka gönderir":lang==="es"?"El reportero envía un caso con detalles, fotos y ubicación":lang==="fr"?"Le rapporteur soumet un cas avec détails, photos et localisation":"Reporter submits a case with details, photos and location" },
    { n:2,  icon:"🏛️", color:"#8B5CF6",  label: lang==="so"?"Xafiiska Xaqiijinta"     :lang==="ar"?"مكتب التحقق"           :lang==="tr"?"Doğrulama Ofisi"        :lang==="es"?"Oficina de Verificación":lang==="fr"?"Bureau de Vérification" :"Verification Office", desc: lang==="so"?"Saraakiishu waxay dib u eegayaan warbixinta oo u xilsaarayaan koox goobta":lang==="ar"?"يراجع المسؤولون التقرير ويعيّنون فريقًا ميدانيًا":lang==="tr"?"Yetkililer raporu inceler ve saha ekibi atar":lang==="es"?"Los oficiales revisan el reporte y asignan equipo de campo":lang==="fr"?"Les officiers examinent le rapport et assignent une équipe de terrain":"Officers review the report and assign a field team" },
    { n:3,  icon:"🔍", color:"#F59E0B",  label: lang==="so"?"Baarista Goobta"          :lang==="ar"?"التحقيق الميداني"      :lang==="tr"?"Saha Soruşturması"      :lang==="es"?"Investigación de Campo":lang==="fr"?"Enquête de Terrain"     :"Field Investigation", desc: lang==="so"?"Wakiilku waxuu booqanayaa, xaqiijinayaa oo dukumeentinaayaa iyada oo leh GPS + caddayn sawir":lang==="ar"?"يزور العملاء الميدانيون ويتحققون ويوثقون بـGPS + دليل صوري":lang==="tr"?"Saha ajanları ziyaret eder, doğrular ve GPS + fotoğraf kanıtıyla belgeler":lang==="es"?"Agentes visitan, verifican y documentan con GPS + prueba fotográfica":lang==="fr"?"Les agents visitent, vérifient et documentent avec GPS + preuve photo":"Field agents visit, verify and document with GPS + photo proof" },
    { n:4,  icon:"✅", color:"#10B981",  label: lang==="so"?"Xaqiijisan"               :lang==="ar"?"تم التحقق"             :lang==="tr"?"Doğrulandı"             :lang==="es"?"Verificado"           :lang==="fr"?"Vérifié"               :"Verified",            desc: lang==="so"?"Xaaladda waxaa la xaqiijiyay oo la muujiyay deeq-bixiyeyaasha si ay u taageeraan":lang==="ar"?"تم تأكيد الحالة وأصبحت مرئية للمانحين للرعاية":lang==="tr"?"Vaka onaylandı ve sponsorlar için bağışçılara görünür hale getirildi":lang==="es"?"Caso confirmado y visible para donantes para apadrinamiento":lang==="fr"?"Cas confirmé et rendu visible aux donateurs pour parrainage":"Case confirmed and made visible to donors for sponsorship" },
    { n:5,  icon:"👥", color:"#EC4899",  label: lang==="so"?"Safka Deeq-bixiyeyaasha"  :lang==="ar"?"قائمة انتظار المانحين":lang==="tr"?"Bağışçı Kuyruğu"        :lang==="es"?"Cola de Donantes"     :lang==="fr"?"File des Donateurs"    :"Donor Queue",         desc: lang==="so"?"Xaaladda waxay galaysaa baanka deeq-bixiyeyaasha — deeq-bixiyeyaashu waxay ka baadhi karaan oo dooranayaan":lang==="ar"?"تدخل الحالة تجمع المانحين — يمكن للرعاة التصفح والاختيار":lang==="tr"?"Vaka bağışçı havuzuna girer — sponsorlar göz atabilir ve seçebilir":lang==="es"?"El caso entra al fondo de donantes — patrocinadores pueden explorar y seleccionar":lang==="fr"?"Le cas entre dans le pool des donateurs — les sponsors peuvent parcourir et sélectionner":"Case enters the donor pool — sponsors can browse and select" },
    { n:6,  icon:"❤️", color:"#C0392B",  label: lang==="so"?"Taageerada"               :lang==="ar"?"الرعاية"               :lang==="tr"?"Sponsorluk"             :lang==="es"?"Apadrinamiento"       :lang==="fr"?"Parrainage"            :"Sponsorship",         desc: lang==="so"?"Deeq-bixiyuhu wuxuu taageeraa xaaladda oo lacagtu si amaahday loo daabacanayaa":lang==="ar"?"يرعى المانح الحالة ويتم معالجة الدفع بأمان":lang==="tr"?"Bağışçı vakayı destekler ve ödeme güvenli şekilde işlenir":lang==="es"?"El donante patrocina el caso y el pago se procesa de forma segura":lang==="fr"?"Le donateur parraine le cas et le paiement est traité en toute sécurité":"Donor sponsors the case and payment is securely processed" },
    { n:7,  icon:"📦", color:"#06B6D4",  label: lang==="so"?"Gaarsiinta Gargaarka"     :lang==="ar"?"تسليم المساعدة"        :lang==="tr"?"Yardım Teslimatı"       :lang==="es"?"Entrega de Ayuda"     :lang==="fr"?"Livraison de l'Aide"   :"Aid Delivery",        desc: lang==="so"?"Kooxda goobtu waxay gaarsiisaa gargaarka oo soo raraysaa caddaynta gaarsiinta":lang==="ar"?"يسلم الفريق الميداني المساعدة ويرفع دليل التسليم":lang==="tr"?"Saha ekibi yardımı teslim eder ve teslimat kanıtı yükler":lang==="es"?"El equipo de campo entrega la ayuda y sube prueba de entrega":lang==="fr"?"L'équipe de terrain livre l'aide et télécharge la preuve de livraison":"Field team delivers aid and uploads proof of delivery" },
    { n:8,  icon:"🏁", color:"#5A6E8A",  label: lang==="so"?"La Dhammeeyay"            :lang==="ar"?"مكتملة"                :lang==="tr"?"Tamamlandı"             :lang==="es"?"Completado"           :lang==="fr"?"Terminé"               :"Completed",           desc: lang==="so"?"Xaaladda waxaa lagu kaydiyaa warbixin saameyn leh — xadhkaha buuxa oo ilaalinaya":lang==="ar"?"تُؤرشف الحالة مع تقرير التأثير — يُحفظ سجل التدقيق الكامل":lang==="tr"?"Vaka etki raporu ile arşivlenir — tam denetim izi korunur":lang==="es"?"Caso archivado con informe de impacto — rastro de auditoría completo preservado":lang==="fr"?"Cas archivé avec rapport d'impact — piste d'audit complète préservée":"Case archived with impact report — full audit trail preserved" },
  ];

  const ROLES = [
    { icon:"👁️", color:"#3B82F6", bg:"#EFF6FF", role: lang==="so"?"Warbixiye":lang==="ar"?"مراسل":lang==="tr"?"Muhabir":lang==="es"?"Reportero":lang==="fr"?"Rapporteur":"Reporter", desc: lang==="so"?"Soo gudbi xaaladaha & qaado sawiro GPS ah":"Submit cases & take GPS photos" },
    { icon:"🏛️", color:"#8B5CF6", bg:"#F5F3FF", role: lang==="so"?"Xafiiska":lang==="ar"?"التحقق":lang==="tr"?"Doğrulama":lang==="es"?"Verificación":lang==="fr"?"Vérification":"Verification", desc: lang==="so"?"Xaqiiji & xilsaar kooxaha goobta":"Verify & assign field teams" },
    { icon:"🗺️", color:"#F59E0B", bg:"#FFFBEB", role: lang==="so"?"Kooxda Goobta":lang==="ar"?"الفريق الميداني":lang==="tr"?"Saha Ekibi":lang==="es"?"Equipo de Campo":lang==="fr"?"Équipe Terrain":"Field Team", desc: lang==="so"?"Booqo, xaqiiji & soo rar caddaynta":"Visit, verify & upload proof" },
    { icon:"❤️", color:"#EC4899", bg:"#FDF2F8", role: lang==="so"?"Deeq-bixiye":lang==="ar"?"متبرع":lang==="tr"?"Bağışçı":lang==="es"?"Donante":lang==="fr"?"Donateur":"Donor", desc: lang==="so"?"Taageer xaaladaha xaqiijisan":"Sponsor verified cases securely" },
    { icon:"🛡️", color:"#C0392B", bg:"#FEF2F2", role: lang==="so"?"Super Admin":lang==="ar"?"المدير العام":lang==="tr"?"Süper Admin":lang==="es"?"Super Admin":lang==="fr"?"Super Admin":"Super Admin", desc: lang==="so"?"Xukumaad buuxda ee platform-ka":"Full platform control & analytics" },
  ];

  const FEATURES = [
    { icon:"🔐", color:"#004B96", title:lang==="so"?"Amni Badan":lang==="ar"?"أمان متعدد الطبقات":lang==="tr"?"Güvenlik":lang==="es"?"Seguridad":lang==="fr"?"Sécurité":"Multi-Layer Security", desc:lang==="so"?"OTP, xaqiijinta wejigu & AES-256":"OTP login, face verify & AES-256 encryption on every account." },
    { icon:"💰", color:"#4B7D19", title:lang==="so"?"Lacag-bixiyooyin Ammaan":"Secure Payments",                    desc:"Stripe, PayPal, Bank Transfer & Ama Gateway — PCI DSS Level 1." },
    { icon:"🗺️", color:"#E0AB21", title:lang==="so"?"GPS Goobta":"GPS Field Tracking",                              desc:"Real-time GPS navigation with geofencing to verify on-site presence." },
    { icon:"📊", color:"#8B5CF6", title:lang==="so"?"Falanqaynta":"Real-Time Analytics",                            desc:"Live dashboards for every role — case pipeline, donations, KPIs." },
    { icon:"🤖", color:"#06B6D4", title:lang==="so"?"AI Ogaanshaha":"AI Fraud Detection",                           desc:"Anomaly engine flags duplicates, suspicious patterns & irregularities." },
    { icon:"📱", color:"#EC4899", title:lang==="so"?"App Mobile-ka":"Mobile App",                                   desc:"Offline-capable React Native app — works without internet, syncs on reconnect." },
    { icon:"📋", color:"#F59E0B", title:lang==="so"?"Diiwaanka Buuxa":"Full Audit Trail",                           desc:"Every action logged — immutable trail with timestamps & transaction hashes." },
    { icon:"🌍", color:"#10B981", title:lang==="so"?"Luqaddo Badan":"Multi-Language",                              desc:"Somali, Arabic, English, Turkish, Spanish & French across all roles." },
  ];

  const STATS = [
    { val:"2,400+", label:P.stat_cases,  icon:"📋", color:C.primary   },
    { val:"$1.2M",  label:P.stat_aid,    icon:"💰", color:C.secondary },
    { val:"98.8%",  label:P.stat_verify, icon:"✅", color:"#10B981"   },
    { val:"6",      label:P.stat_cities, icon:"📍", color:C.accent    },
  ];

  const TRUST = [
    "100% field-verified cases",
    "GPS-tracked deliveries",
    "Secure escrow payments",
    "Real-time donor updates",
  ];

  // Stats bar visibility from admin settings
  const [showStats] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("kf_site_settings") || "{}"); return s.showStats !== false; }
    catch { return true; }
  });
  const [showAidStat] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("kf_site_settings") || "{}"); return s.showAidStat !== false; }
    catch { return true; }
  });

  /* ─── Shared style atoms ──────────────────────────────────────────────── */
  const pad  = isMobile ? "0 20px" : "0 32px";
  const wrap = { maxWidth: 1280, margin: "0 auto", padding: pad };
  const sec  = (bg, py=56) => ({ background: bg, padding: isMobile ? `${py*.75}px 0` : `${py}px 0` });

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text }}>

      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <style>{`
        @keyframes kfZoom1 {
          0%   { opacity:0; transform:scale(1.0) translateX(0); }
          6%   { opacity:1; }
          22%  { opacity:1; transform:scale(1.12) translateX(-2%); }
          28%  { opacity:0; transform:scale(1.15) translateX(-3%); }
          100% { opacity:0; }
        }
        @keyframes kfZoom2 {
          0%,20% { opacity:0; transform:scale(1.05) translateX(2%); }
          26%  { opacity:1; }
          42%  { opacity:1; transform:scale(1.14) translateX(0%); }
          48%  { opacity:0; transform:scale(1.18) translateX(-1%); }
          100% { opacity:0; }
        }
        @keyframes kfZoom3 {
          0%,40% { opacity:0; transform:scale(1.0) translateY(-2%); }
          46%  { opacity:1; }
          62%  { opacity:1; transform:scale(1.1) translateY(1%); }
          68%  { opacity:0; transform:scale(1.13) translateY(2%); }
          100% { opacity:0; }
        }
        @keyframes kfZoom4 {
          0%,60% { opacity:0; transform:scale(1.08) translateX(-1%); }
          66%  { opacity:1; }
          82%  { opacity:1; transform:scale(1.16) translateX(2%); }
          88%  { opacity:0; transform:scale(1.18) translateX(3%); }
          100% { opacity:0; }
        }
        @keyframes kfZoom5 {
          0%,80% { opacity:0; transform:scale(1.0) translateY(1%); }
          86%  { opacity:1; }
          100% { opacity:1; transform:scale(1.1) translateY(-1%); }
        }
        .kf-slide { position:absolute; inset:0; background-size:cover; background-position:center; animation-duration:30s; animation-timing-function:ease-in-out; animation-iteration-count:infinite; }
      `}</style>
      <section style={{
        position: "relative", overflow: "hidden",
        color: "#fff",
        minHeight: isMobile ? 560 : 680,
        display: "flex", alignItems: "center",
        background: "#001A40",
      }}>
        {/* ── Cinematic slideshow (video effect) ── */}
        <div className="kf-slide" style={{ backgroundImage:"url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1400&q=80')", animationName:"kfZoom1" }} />
        <div className="kf-slide" style={{ backgroundImage:"url('https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1400&q=80')", animationName:"kfZoom2" }} />
        <div className="kf-slide" style={{ backgroundImage:"url('https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=1400&q=80')", animationName:"kfZoom3" }} />
        <div className="kf-slide" style={{ backgroundImage:"url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1400&q=80')", animationName:"kfZoom4" }} />
        <div className="kf-slide" style={{ backgroundImage:"url('https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1400&q=80')", animationName:"kfZoom5" }} />

        {/* ── Dark overlay with gradient ── */}
        <div style={{
          position:"absolute", inset:0, zIndex:5,
          background:`linear-gradient(145deg,rgba(0,38,81,0.70) 0%,rgba(0,75,150,0.58) 50%,rgba(75,125,25,0.48) 100%)`,
        }} />

        {/* ── Content ── */}
        <div style={{ position:"relative", zIndex:10, width:"100%", padding: isMobile?"72px 20px 60px":"110px 32px 90px" }}>
          <div style={{ maxWidth:820, margin:"0 auto", textAlign:"center" }}>

            {/* Live indicator */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:20 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"#EF4444", display:"inline-block", boxShadow:"0 0 0 3px rgba(239,68,68,0.3)", animation:"kfPulse 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.8)", letterSpacing:2, textTransform:"uppercase" }}>Live Field Operations</span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize:"clamp(36px,6vw,68px)", fontWeight:900, margin:"0 0 24px", lineHeight:1.08, letterSpacing:-1.5 }}>
              {P.hero_title1}<br />
              <span style={{ color:C.gold }}>{P.hero_title2}</span>
            </h1>

            <p style={{ fontSize:"clamp(16px,2.2vw,20px)", opacity:0.88, maxWidth:640, margin:"0 auto 44px", lineHeight:1.75 }}>
              {P.hero_sub}
            </p>

            {/* CTA row */}
            <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
              <button className="kf-btn kf-btn-gold" onClick={() => navigate("/cases")}
                style={{ padding:isMobile?"14px 28px":"17px 40px", borderRadius:14, fontSize:isMobile?14:16, fontWeight:800, border:"none", boxShadow:`0 8px 28px rgba(224,171,33,0.45)` }}>
                {P.btn_sponsor}
              </button>
              <button className="kf-btn kf-btn-ghost" onClick={() => navigate("/how-it-works")}
                style={{ padding:isMobile?"14px 28px":"17px 40px", borderRadius:14, fontSize:isMobile?14:16, fontWeight:700, border:"none" }}>
                {P.btn_how}
              </button>
            </div>

            {/* Trust strip */}
            <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:isMobile?10:28, marginTop:44, paddingTop:36, borderTop:"1px solid rgba(255,255,255,0.14)" }}>
              {TRUST.map(t => (
                <span key={t} style={{ fontSize:12, fontWeight:600, opacity:0.82 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ STATS ══════════════════════════════ */}
      {showStats && (
        <section style={{ background:"#fff", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding: isMobile?"0 20px":"0 32px",
            display:"grid", gridTemplateColumns: isMobile?"repeat(2,1fr)":"repeat(4,1fr)" }}>
            {STATS.filter(s => showAidStat || s.label !== P.stat_aid).map((s, i) => (
              <div key={i} style={{
                padding: isMobile?"28px 16px":"40px 28px", textAlign:"center",
                borderRight: (!isMobile && i<3) ? `1px solid ${C.border}` : "none",
                borderBottom: (isMobile && i<2) ? `1px solid ${C.border}` : "none",
              }}>
                <div className="kf-stat-num" style={{ color:s.color }}>{s.val}</div>
                <div style={{ fontSize:13, color:C.muted, fontWeight:500, marginTop:5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════ TRUST BADGE STRIP ══════════════════ */}
      <section style={{ background:C.bg, borderBottom:`1px solid ${C.border}`, padding: isMobile?"16px 20px":"14px 32px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center", gap: isMobile?10:20, flexWrap:"wrap" }}>
          {[
            "100% Field Verified",
            "GPS-Tracked Delivery",
            "Encrypted Payments",
            "Full Audit Trail",
            "No Hidden Fees",
          ].map((label, i) => (
            <div key={i} className="kf-trust-badge">{label}</div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════ STORIES FROM THE FIELD ════════════════════ */}
      {(() => {
        let raw = [];
        try {
          const published = JSON.parse(localStorage.getItem("kf_published_stories") || "[]");
          const impact    = JSON.parse(localStorage.getItem("kf_impact_stories") || "[]");
          raw = [...published, ...impact];
        } catch {}
        const STORY_FALLBACK = [
          { id:"sf1", category:"Medical",   location:"Mogadishu", date:"June 2026",  color:"#3B82F6", icon:"🩺",
            title:"Eight-Year-Old Receives Life-Saving Heart Surgery",
            afterDesc:"After a field agent documented the case and donors stepped in within 72 hours, young Fatima underwent successful cardiac surgery. She is now recovering at home with her family.",
            beforeDesc:"Fatima's family had no means to afford the $2,100 procedure. She was deteriorating fast.",
            amountDistributed:"$2,100", daysToDeliver:"9", afterImg:null },
          { id:"sf2", category:"Shelter",   location:"Baidoa",    date:"May 2026",   color:"#10B981", icon:"🏠",
            title:"Family of Six Rehoused After Flash Flooding",
            afterDesc:"Within two weeks of the case being verified, a new shelter was constructed and the family moved in with three months of food supplies.",
            beforeDesc:"Six family members were sleeping in a collapsed structure after floods swept through their neighbourhood.",
            amountDistributed:"$780",   daysToDeliver:"12", afterImg:null },
          { id:"sf3", category:"Education", location:"Garowe",    date:"June 2026",  color:"#F59E0B", icon:"📚",
            title:"Three Orphaned Siblings Return to School",
            afterDesc:"School fees, uniforms and books were fully covered. All three children are now enrolled and attending daily.",
            beforeDesc:"After losing both parents the siblings had been out of school for two years.",
            amountDistributed:"$540",   daysToDeliver:"7",  afterImg:null },
          { id:"sf4", category:"Water",     location:"Kismayo",   date:"April 2026", color:"#06B6D4", icon:"💧",
            title:"Clean Water Reaches 280 Families in Kismayo",
            afterDesc:"A deep borehole was drilled and tested clean. Waterborne disease rates in the area have dropped by an estimated 60%.",
            beforeDesc:"Community members walked 4 km daily for unsafe water. Children were missing school to help collect water.",
            amountDistributed:"$3,200", daysToDeliver:"21", afterImg:null },
          { id:"sf5", category:"Food",      location:"Beledweyne", date:"May 2026",  color:"#EC4899", icon:"🌾",
            title:"Elderly Widow Receives Monthly Food Support",
            afterDesc:"78-year-old Halima now receives a monthly food basket. Her health has improved significantly over three months.",
            beforeDesc:"Living alone with no income, Halima had gone days without food before a community member filed a case.",
            amountDistributed:"$460",   daysToDeliver:"11", afterImg:null },
          { id:"sf6", category:"Orphan",    location:"Afgooye",   date:"June 2026",  color:"#8B5CF6", icon:"👶",
            title:"Infant Orphan Given Safe Home and Monthly Care",
            afterDesc:"14-month-old Ibrahim is now cared for by a verified foster family with monthly sponsorship covering nutrition and health checks.",
            beforeDesc:"Ibrahim's elderly grandmother had no income and could not afford formula or medical visits.",
            amountDistributed:"$360",   daysToDeliver:"5",  afterImg:null },
          { id:"sf7", category:"Medical",   location:"Mogadishu", date:"March 2026", color:"#C0392B", icon:"🦽",
            title:"Dialysis Lifeline for 68-Year-Old Patient",
            afterDesc:"Sponsorship covers bi-weekly dialysis sessions for six months, giving Rooda a new lease on life.",
            beforeDesc:"Without dialysis twice weekly, Rooda's life was at serious risk. Her family had exhausted every option.",
            amountDistributed:"$1,800", daysToDeliver:"4",  afterImg:null },
        ];
        const stories = raw.length >= 3 ? raw : STORY_FALLBACK;
        const CAT_COLORS = { Medical:"#3B82F6", Shelter:"#10B981", Education:"#F59E0B", Water:"#06B6D4", Food:"#EC4899", Orphan:"#8B5CF6", Emergency:"#C0392B", Other:"#5A6E8A" };
        const catColor = (cat) => CAT_COLORS[cat] || "#5A6E8A";

        // UNICEF-style card: image top → category+date → bold title → excerpt → "Read now"
        const StoryCard = ({ st, featured = false }) => {
          const col = catColor(st.category);
          const imgH = featured ? (isMobile ? 200 : 260) : (isMobile ? 160 : 200);
          return (
            <Link to={`/stories/${st.id}`} style={{
              display:"flex", flexDirection:"column", textDecoration:"none",
              background:"#fff", borderRadius:16, overflow:"hidden",
              border:`1px solid ${C.border}`,
              boxShadow:"0 2px 14px rgba(0,38,81,0.07)",
              transition:"box-shadow .2s, transform .18s",
            }}
              onMouseOver={e => { e.currentTarget.style.boxShadow="0 10px 36px rgba(0,38,81,0.14)"; e.currentTarget.style.transform="translateY(-3px)"; }}
              onMouseOut={e  => { e.currentTarget.style.boxShadow="0 2px 14px rgba(0,38,81,0.07)"; e.currentTarget.style.transform="none"; }}
            >
              {/* Image / Gradient top */}
              <div style={{ position:"relative", flexShrink:0 }}>
                {st.afterImg
                  ? <img src={st.afterImg} alt={st.title} style={{ width:"100%", height:imgH, objectFit:"cover", display:"block" }} />
                  : <div style={{ height:imgH, background:`linear-gradient(145deg,${col}25 0%,${col}60 60%,${col}30 100%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize: featured ? 72 : 52 }}>
                      {st.icon || "✨"}
                    </div>
                }
                {/* Category tag — top-left over image */}
                <span style={{
                  position:"absolute", top:14, left:14,
                  background:col, color:"#fff",
                  borderRadius:6, padding:"4px 12px", fontSize:11, fontWeight:800,
                  boxShadow:"0 2px 8px rgba(0,0,0,0.18)",
                }}>{st.category}</span>
              </div>

              {/* Text body — clean white area like UNICEF */}
              <div style={{ padding: featured ? "20px 22px 18px" : "16px 18px 16px", flex:1, display:"flex", flexDirection:"column" }}>
                {/* Date + location row */}
                <div style={{ display:"flex", gap:10, marginBottom:10, fontSize:11, color:C.muted, flexWrap:"wrap" }}>
                  {st.date && <span>🗓 {st.date}</span>}
                  {st.location && <span>📍 {st.location}</span>}
                </div>
                {/* Title */}
                <div style={{
                  fontSize: featured ? (isMobile?16:20) : (isMobile?14:15),
                  fontWeight:900, color:C.navy, lineHeight:1.35,
                  marginBottom:10, letterSpacing:-0.2,
                }}>{st.title}</div>
                {/* Excerpt */}
                <div style={{
                  fontSize:13, color:C.muted, lineHeight:1.7, flex:1,
                  display:"-webkit-box", WebkitLineClamp: featured?3:2, WebkitBoxOrient:"vertical", overflow:"hidden",
                }}>{st.afterDesc || st.beforeDesc}</div>
                {/* Stats row */}
                {(st.amountDistributed || st.daysToDeliver) && (
                  <div style={{ display:"flex", gap:14, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`, fontSize:11 }}>
                    {st.amountDistributed && <span style={{ color:C.secondary, fontWeight:700 }}>💰 {st.amountDistributed}</span>}
                    {st.daysToDeliver && <span style={{ color:C.muted }}>⚡ {st.daysToDeliver} days</span>}
                  </div>
                )}
                {/* "Read now" link — UNICEF style */}
                <div style={{ marginTop:14, fontSize:13, fontWeight:700, color:C.primary, display:"flex", alignItems:"center", gap:5 }}>
                  Read now <span style={{ fontSize:15 }}>→</span>
                </div>
              </div>
            </Link>
          );
        };

        return (
          <section style={sec("#fff")}>
            <div style={wrap}>
              {/* ── Header row ── */}
              <div className="kf-reveal" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: isMobile?28:44, flexWrap:"wrap", gap:12 }}>
                <div>
                  <span className="kf-badge" style={{ background:"#FEF3C7", color:"#92400E", marginBottom:10 }}>
                    📰 Stories from the Field
                  </span>
                  <h2 style={{ fontSize:"clamp(24px,3vw,38px)", fontWeight:900, margin:"8px 0 8px", letterSpacing:-0.4, color:C.navy }}>
                    Real Lives. Real Impact.
                  </h2>
                  <p style={{ fontSize:15, color:C.muted, margin:0, maxWidth:460 }}>
                    Field-verified stories of lives changed by your support.
                  </p>
                </div>
                <Link to="/stories" style={{ padding:"10px 22px", borderRadius:10, border:`1.5px solid ${C.border}`, color:C.primary, fontWeight:700, fontSize:13, textDecoration:"none", whiteSpace:"nowrap" }}>
                  View All Stories →
                </Link>
              </div>

              {/* ── UNICEF-style grid ── */}
              {/* Row 1: 1 featured (wide) + 2 regular */}
              <div className="kf-reveal-stagger" style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":`2fr 1fr 1fr`, gap:20, marginBottom:20 }}>
                <StoryCard st={stories[0]} featured={true} />
                {stories[1] && <StoryCard st={stories[1]} />}
                {stories[2] && <StoryCard st={stories[2]} />}
              </div>

              {/* Row 2: 4 equal cards */}
              {stories.length > 3 && (
                <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":"repeat(4,1fr)", gap:20, marginBottom:8 }}>
                  {stories.slice(3, 7).map(st => <StoryCard key={st.id} st={st} />)}
                </div>
              )}

            </div>
          </section>
        );
      })()}

      {/* ══════════════════════════ FEATURED CASES ══════════════════════════ */}
      <section style={sec(C.bg)}>
        <div style={wrap}>
          <div className="kf-reveal" style={{ display:"flex", flexDirection: isMobile?"column":"row", justifyContent:"space-between", alignItems: isMobile?"flex-start":"flex-end", gap:16, marginBottom: isMobile?32:48 }}>
            <div>
              <span className="kf-badge" style={{ background:"#FDF2F8", color:"#9D174D" }}>{P.cases_badge}</span>
              <hr className="kf-rule" />
              <h2 style={{ fontSize:"clamp(24px,3vw,38px)", fontWeight:900, margin:"0 0 8px", letterSpacing:-0.4 }}>{P.cases_title}</h2>
              <p style={{ fontSize:15, color:C.muted, margin:0 }}>{P.cases_sub}</p>
            </div>
            <Link to="/cases" className="kf-btn kf-btn-outline"
              style={{ padding:"11px 24px", borderRadius:10, fontSize:13, fontWeight:700, whiteSpace:"nowrap", border:`2px solid ${C.primary}` }}>
              {P.cases_viewall} →
            </Link>
          </div>
          <div className="kf-reveal-stagger" style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":"repeat(3,1fr)", gap: isMobile?16:24 }}>
            {featuredCases.map((c, idx) => (
              <div key={c.id || idx} className="kf-card" style={{
                background:"#fff", borderRadius:20, overflow:"hidden",
                boxShadow:"0 2px 16px rgba(0,38,81,0.07)", border:`1px solid ${C.border}`,
              }}>
                {/* Cover image */}
                <div style={{ position:"relative", height:180, overflow:"hidden", background:C.bg }}>
                  {c.img ? (
                    <img src={c.img} alt="" loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                  ) : (
                    <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg,${URGENCY_COLOR[c.urgency]}22,${URGENCY_COLOR[c.urgency]}44)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:56 }}>
                      {{ High:"🏥", Critical:"🚨", Medium:"📚", Low:"🏠" }[c.urgency] || "❤️"}
                    </div>
                  )}
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.52) 100%)" }} />
                  <span style={{ position:"absolute", top:10, left:10, background:URGENCY_COLOR[c.urgency], color:"#fff", padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:800 }}>{c.urgency}</span>
                  <span style={{ position:"absolute", top:10, right:10, background:"rgba(6,95,70,0.75)", backdropFilter:"blur(4px)", color:"#D1FAE5", padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700 }}>✓ Field Verified</span>
                  <div style={{ position:"absolute", bottom:10, left:14, color:"rgba(255,255,255,0.8)", fontSize:12 }}>📍 {c.location}</div>
                </div>

                <div style={{ padding: isMobile?16:20 }}>
                  <p style={{ fontSize:13, color:"#4A5568", lineHeight:1.65, margin:"0 0 14px" }}>{(c.desc||"").slice(0,120)}{(c.desc||"").length>120?"…":""}</p>

                  {/* % funded + goal amount */}
                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
                      <span style={{ fontSize:22, fontWeight:900, color: c.funded >= 100 ? C.green : C.primary, lineHeight:1 }}>
                        {c.funded}% <span style={{ fontSize:12, fontWeight:600, color:C.muted }}>funded</span>
                      </span>
                      {c.goal > 0 && (
                        <span style={{ fontSize:12, fontWeight:700, color:C.text }}>
                          ${c.goal.toLocaleString()} {c.funded >= 100 ? "✓" : "needed"}
                        </span>
                      )}
                    </div>
                    <div className="kf-prog-track">
                      <div className="kf-prog-fill" style={{ width:`${Math.min(c.funded,100)}%`, background:`linear-gradient(90deg, ${URGENCY_COLOR[c.urgency]}90, ${URGENCY_COLOR[c.urgency]})` }} />
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:11, color:C.muted }}>
                      <span>${Math.round((c.funded/100)*(c.goal||0)).toLocaleString()} raised</span>
                      {c.funded >= 100
                        ? <span style={{ color:C.green, fontWeight:700 }}>🎉 Fully Funded</span>
                        : c.goal > 0 && <span>${Math.max(0, c.goal - Math.round((c.funded/100)*c.goal)).toLocaleString()} remaining</span>
                      }
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:10 }}>
                    <Link to={c.id ? `/cases/${c.id}` : "/cases"} className="kf-btn kf-btn-outline" style={{ flex:1, padding:"10px 0", borderRadius:10, fontSize:13, fontWeight:700, textAlign:"center", border:`1.5px solid ${C.primary}` }}>{P.case_view}</Link>
                    <Link to={c.id ? `/donate?caseId=${c.id}` : "/donate"} className="kf-btn kf-btn-gold" style={{ flex:1, padding:"10px 0", borderRadius:10, fontSize:13, fontWeight:800, textAlign:"center", border:"none" }}>{P.case_sponsor}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Our Mission — sits right below the cases ── */}
          <div className="kf-reveal" style={{
            marginTop: isMobile ? 40 : 52,
            borderRadius: 20,
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            boxShadow: "0 4px 32px rgba(0,38,81,0.13)",
          }}>
            {/* Left: dark message */}
            <div style={{
              background: `linear-gradient(135deg, ${C.navy} 0%, #0f3460 60%, ${C.secondary}99 100%)`,
              padding: isMobile ? "40px 28px" : "48px 48px",
              display: "flex", flexDirection: "column", justifyContent: "center", color: "#fff",
            }}>
              <span style={{
                display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: 2,
                textTransform: "uppercase", color: C.gold, marginBottom: 16,
                background: "rgba(224,171,33,0.12)", border: "1px solid rgba(224,171,33,0.3)",
                borderRadius: 6, padding: "4px 12px", width: "fit-content",
              }}>Our Mission in Action</span>
              <h3 style={{ fontSize: isMobile ? 22 : "clamp(22px,2.5vw,32px)", fontWeight: 900, lineHeight: 1.25, margin: "0 0 16px", letterSpacing: -0.4 }}>
                Every Child Deserves<br/>
                <span style={{ color: C.gold }}>a Meal, Safety,</span><br/>
                and a Future.
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.8, opacity: 0.82, margin: "0 0 14px", maxWidth: 360 }}>
                Behind every number in our system is a real child — hungry, hopeful, and waiting.
                With your support, we make sure they never have to share from an empty bowl.
              </p>
              <p style={{ fontSize: 12, lineHeight: 1.8, opacity: 0.6, margin: "0 0 28px", fontStyle: "italic", borderLeft: "3px solid rgba(224,171,33,0.5)", paddingLeft: 12 }}>
                "Whoever saves a soul, it is as if he has saved all mankind." — Quran 5:32
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/donate" style={{ padding: "11px 26px", borderRadius: 10, fontWeight: 800, fontSize: 13, background: `linear-gradient(135deg,${C.secondary},#3A6214)`, color: "#fff", textDecoration: "none", boxShadow: `0 4px 16px rgba(75,125,25,0.4)` }}>Donate Now →</Link>
                <Link to="/cases" style={{ padding: "11px 26px", borderRadius: 10, fontWeight: 700, fontSize: 13, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", textDecoration: "none" }}>See Their Stories →</Link>
              </div>
            </div>
            {/* Right: children photo */}
            <div style={{ position: "relative", minHeight: isMobile ? 240 : 360, overflow: "hidden" }}>
              <img src="/children-sharing.jpg" alt="Children sharing a meal" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, transparent 60%, rgba(0,38,81,0.15))" }} />
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════ CTA BANNER — real photo background ═════ */}
      <section style={{ position:"relative", overflow:"hidden", minHeight: isMobile?300:380, display:"flex", alignItems:"center" }}>
        {/* Real photo bg */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"url('https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1400&q=80')", backgroundSize:"cover", backgroundPosition:"center 40%" }} />
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg, rgba(0,38,81,0.82) 0%, rgba(0,75,150,0.72) 50%, rgba(75,125,25,0.65) 100%)` }} />
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize:"36px 36px" }} />

        <div style={{ position:"relative", zIndex:2, width:"100%", padding: isMobile?"44px 20px":"56px 32px", textAlign:"center", color:"#fff" }}>
          <div style={{ maxWidth:700, margin:"0 auto" }}>
            <span style={{ display:"inline-block", background:"rgba(224,171,33,0.2)", border:"1px solid rgba(224,171,33,0.5)", color:C.gold, borderRadius:20, padding:"6px 18px", fontSize:12, fontWeight:800, letterSpacing:1, textTransform:"uppercase", marginBottom:24 }}>MAKE AN IMPACT</span>
            <h2 style={{ fontSize:"clamp(28px,4vw,50px)", fontWeight:900, margin:"0 0 18px", lineHeight:1.1, letterSpacing:-1 }}>{P.cta_title}</h2>
            <p style={{ fontSize: isMobile?15:18, opacity:0.88, marginBottom:44, lineHeight:1.7, maxWidth:520, margin:"0 auto 44px" }}>{P.cta_sub}</p>
            <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
              <button className="kf-btn kf-btn-gold" onClick={() => navigate("/donate")}
                style={{ padding: isMobile?"14px 28px":"16px 40px", borderRadius:14, fontSize: isMobile?14:16, fontWeight:800, border:"none", boxShadow:`0 8px 28px rgba(224,171,33,0.4)` }}>
                ❤️ {P.cta_donor}
              </button>
              <button className="kf-btn kf-btn-ghost" onClick={() => navigate("/contact")}
                style={{ padding: isMobile?"14px 28px":"16px 40px", borderRadius:14, fontSize: isMobile?14:16, fontWeight:700, border:"none" }}>
                {P.cta_report}
              </button>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
