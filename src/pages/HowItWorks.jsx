import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";

const C = { navy:"#002651", primary:"#004B96", secondary:"#4B7D19", accent:"#E0AB21", muted:"#5A6E8A", bg:"#F4F7FC", border:"#D8E4F0", text:"#0D1F3C", gold:"#E0AB21", green:"#4B7D19", blue:"#004B96" };

const STEP_COLORS = ["#3B82F6","#8B5CF6","#F59E0B","#10B981","#EC4899","#C0392B","#06B6D4","#5A6E8A"];

export default function HowItWorks() {
  const { lang } = useLang();
  const P = PT.howitworks[lang] || PT.howitworks.en;
  const [activeStep, setActiveStep] = useState(null);

  const STEPS = [
    { n:1, icon:"", color:STEP_COLORS[0],
      label:  lang==="so"?"Abuurista Warbixinta" :lang==="ar"?"إنشاء التقرير"    :lang==="tr"?"Rapor Oluşturma"     :lang==="es"?"Creación del Reporte"  :lang==="fr"?"Création du Rapport"    :"Report Creation",
      who:    lang==="so"?"Warbixiye"            :lang==="ar"?"مراسل"             :lang==="tr"?"Muhabir"             :lang==="es"?"Reportero"              :lang==="fr"?"Rapporteur"              :"Reporter",
      detail: lang==="so"?"Warbixiye (xubinta bulshada ama shaqaale NGO) wuxuu soo gudbiyaa xaalad iyada oo ah web ama app mobile. Waxay buuxiyaan magaca faa'iideyaha, da'da, goobta, heerka deg-degga, sharraxaadda xaaladda, oo soo raraan sawirro."
             :lang==="ar"?"يقدم المُبلِّغ حالة عبر الويب أو التطبيق مع اسم المستفيد والعمر والموقع ومستوى الإلحاح والصور."
             :lang==="tr"?"Bir muhabir vakayı web veya mobil uygulama üzerinden gönderir."
             :lang==="es"?"Un reportero envía un caso a través de la web o la app con todos los detalles del beneficiario."
             :lang==="fr"?"Un rapporteur soumet un cas via l'application avec tous les détails."
             :"A reporter submits a case through the web or mobile app with beneficiary details, urgency level, and supporting photos.",
      actions:["Fill in beneficiary details","Upload supporting photos","Set urgency level","Submit — case enters review"],
    },
    { n:2, icon:"", color:STEP_COLORS[1],
      label:  lang==="so"?"Xafiiska Xaqiijinta"  :lang==="ar"?"مكتب التحقق"       :lang==="tr"?"Doğrulama Ofisi"    :lang==="es"?"Oficina de Verificación":lang==="fr"?"Bureau de Vérification" :"Verification Office",
      who:    lang==="so"?"Xaqiijiye"            :lang==="ar"?"محقق"              :lang==="tr"?"Doğrulayıcı"        :lang==="es"?"Verificador"            :lang==="fr"?"Vérificateur"           :"Verifier",
      detail: lang==="so"?"Saraakiisha xaqiijinta waxay dib u eegayaan warbixinta, hubiyaan xaaladaha laba jibbaaran iyaga oo kaalmaysanaya AI, waxayna go'aaminayaan inay ansixiyaan ama diiyo."
             :lang==="ar"?"يراجع ضابط التحقق التقرير ويتحقق من الازدواجية بمساعدة الذكاء الاصطناعي ويقرر الموافقة أو الرفض."
             :lang==="tr"?"Doğrulama subayı raporu inceler, AI destekli tekrar kontrolü yapar ve onay/red kararı verir."
             :lang==="es"?"Un oficial revisa el reporte, verifica duplicados con IA y decide aprobar o rechazar."
             :lang==="fr"?"L'officier examine le rapport, vérifie les doublons avec IA et décide d'approuver ou rejeter."
             :"A verification officer reviews the report, AI-checks for duplicates, and approves or rejects the case.",
      actions:["Review report details and photos","Check for duplicates (AI-assisted)","Approve → assign field team","Reject → archive with reason"],
    },
    { n:3, icon:"", color:STEP_COLORS[2],
      label:  lang==="so"?"Baarista Goobta"      :lang==="ar"?"التحقيق الميداني"  :lang==="tr"?"Saha Soruşturması"  :lang==="es"?"Investigación de Campo":lang==="fr"?"Enquête de Terrain"    :"Field Investigation",
      who:    lang==="so"?"Kooxda Goobta"        :lang==="ar"?"الفريق الميداني"   :lang==="tr"?"Saha Ekibi"         :lang==="es"?"Equipo de Campo"       :lang==="fr"?"Équipe de Terrain"     :"Field Team",
      detail: lang==="so"?"Xubinta kooxda goobta ee loo xilsaaray waxay ku socodsiisaa goobta adeegsanaysa socodsiinta GPS. Waxay si jireed u xaqiijinayaan xaaladda oo soo raraan sawirro/muuqaal caddayn ahaan."
             :lang==="ar"?"ينتقل عضو الفريق الميداني إلى الموقع عبر GPS ويتحقق فيزيائياً ويلتقط الأدلة."
             :lang==="tr"?"Saha ekibi GPS ile konuma gider, fiziksel doğrulama yapar ve delil toplar."
             :lang==="es"?"El equipo de campo viaja al lugar via GPS, verifica físicamente y recolecta evidencia."
             :lang==="fr"?"L'équipe terrain se rend sur place via GPS, vérifie physiquement et collecte les preuves."
             :"Field agent travels to the location via GPS, physically verifies the situation, and uploads photo/video evidence.",
      actions:["Receive mission on mobile app","Navigate to location via GPS","Conduct investigation + take photos","Upload findings with GPS coordinates"],
    },
    { n:4, icon:"", color:STEP_COLORS[3],
      label:  lang==="so"?"Xaqiijisan"           :lang==="ar"?"تم التحقق"         :lang==="tr"?"Doğrulandı"         :lang==="es"?"Verificado"            :lang==="fr"?"Vérifié"               :"Verified",
      who:    lang==="so"?"Xaqiijiye"            :lang==="ar"?"محقق"              :lang==="tr"?"Doğrulayıcı"        :lang==="es"?"Verificador"           :lang==="fr"?"Vérificateur"          :"Verifier",
      detail: lang==="so"?"Saraakiisha xaqiijintu waxay dib u eegayaan caddaynta goobta. Haddii la xaqiijiyo, xaaladda waxaa la calaamadeeyaa 'Xaqiijisan' oo waxay u muuqdaa deeq-bixiyeyaasha."
             :lang==="ar"?"يراجع ضباط التحقق أدلة الميدان ويؤكدون إحداثيات GPS ويوسمون الحالة موثقة للمانحين."
             :lang==="tr"?"Saha bulguları ve GPS koordinatları onaylanır, vaka bağışçılara görünür hale gelir."
             :lang==="es"?"Los oficiales revisan las evidencias de campo, confirman GPS y marcan el caso como verificado para donantes."
             :lang==="fr"?"Les officiers examinent les preuves terrain, confirment le GPS et marquent le cas vérifié pour les donateurs."
             :"Officers review field evidence, confirm GPS coordinates, and mark the case Verified — making it visible to donors.",
      actions:["Review field findings and photos","Confirm GPS coordinates","Mark case as Verified","Case becomes visible to donors"],
    },
    { n:5, icon:"", color:STEP_COLORS[4],
      label:  lang==="so"?"Safka Deeq-bixiyeyaasha":lang==="ar"?"قائمة المانحين":lang==="tr"?"Bağışçı Kuyruğu"    :lang==="es"?"Cola de Donantes"     :lang==="fr"?"File des Donateurs"    :"Donor Queue",
      who:    lang==="so"?"Deeq-bixiye"           :lang==="ar"?"متبرع"            :lang==="tr"?"Bağışçı"            :lang==="es"?"Donante"              :lang==="fr"?"Donateur"              :"Donor",
      detail: lang==="so"?"Xaaladaha xaqiijisan waxay ka muuqdaan xaashida deeq-bixiyeyaasha. Deeq-bixiyeyaashu waxay ka baadhi karaan deg-deg, goob, da', ama nooca baahida."
             :lang==="ar"?"تظهر الحالات الموثقة في لوحة تحكم المانحين للتصفح حسب الإلحاح والموقع والنوع."
             :lang==="tr"?"Doğrulanmış vakalar bağışçı panelinde aciliyet, konum ve türe göre filtrelenebilir."
             :lang==="es"?"Los casos verificados aparecen en el panel de donantes y pueden filtrarse por urgencia, ubicación y tipo."
             :lang==="fr"?"Les cas vérifiés apparaissent dans le tableau de bord des donateurs avec filtres par urgence, lieu et type."
             :"Verified cases appear in the donor dashboard, filterable by urgency, location, age, or type of need.",
      actions:["Browse verified cases in donor dashboard","Filter by urgency, location, type","View full case details + evidence","Choose sponsorship type"],
    },
    { n:6, icon:"", color:STEP_COLORS[5],
      label:  lang==="so"?"Taageerada"            :lang==="ar"?"الرعاية"          :lang==="tr"?"Sponsorluk"         :lang==="es"?"Apadrinamiento"        :lang==="fr"?"Parrainage"            :"Sponsorship",
      who:    lang==="so"?"Deeq-bixiye"           :lang==="ar"?"متبرع"            :lang==="tr"?"Bağışçı"            :lang==="es"?"Donante"              :lang==="fr"?"Donateur"              :"Donor",
      detail: lang==="so"?"Deeq-bixiyuhu wuxuu dooranayaa xaalad oo lacag bixinayaa si amaahdan iyada oo loo marayo Stripe, PayPal, Wareejinta Bangiga, ama Ama Gateway."
             :lang==="ar"?"يختار المانح حالة ويقوم بدفع آمن عبر Stripe أو PayPal أو التحويل البنكي."
             :lang==="tr"?"Bağışçı vaka seçer ve Stripe, PayPal veya Banka Transferi ile güvenli ödeme yapar."
             :lang==="es"?"El donante selecciona un caso y realiza pago seguro via Stripe, PayPal o Transferencia Bancaria."
             :lang==="fr"?"Le donateur sélectionne un cas et effectue un paiement sécurisé via Stripe, PayPal ou virement."
             :"The donor selects a case and makes a secure payment via Stripe, PayPal, Bank Transfer, or Ama Gateway.",
      actions:["Select case to sponsor","Choose sponsorship type (Full / Partial)","Make secure payment","Receive confirmation + tax certificate"],
    },
    { n:7, icon:"", color:STEP_COLORS[6],
      label:  lang==="so"?"Gaarsiinta Gargaarka" :lang==="ar"?"تسليم المساعدة"   :lang==="tr"?"Yardım Teslimatı"   :lang==="es"?"Entrega de Ayuda"     :lang==="fr"?"Livraison de l'Aide"   :"Aid Delivery",
      who:    lang==="so"?"Kooxda Goobta"        :lang==="ar"?"الفريق الميداني"   :lang==="tr"?"Saha Ekibi"         :lang==="es"?"Equipo de Campo"      :lang==="fr"?"Équipe de Terrain"     :"Field Team",
      detail: lang==="so"?"Kooxda goobta ama kooxda qaybinta gargaarka waxay gaarsiisaa gargaarka faa'iideyaha. Waxay soo raraan caddaynta gaarsiinta — sawirro goobta, xariiqa GPS, iyo saxeexa faa'iideyaha."
             :lang==="ar"?"يسلم الفريق الميداني المساعدة ويرفع دليل التسليم مع صور وإحداثيات GPS وتأكيد المستفيد."
             :lang==="tr"?"Saha ekibi yardımı teslim eder ve GPS etiketli fotoğraflarla teslimat kanıtı yükler."
             :lang==="es"?"El equipo entrega la ayuda y sube prueba de entrega con fotos GPS y confirmación del beneficiario."
             :lang==="fr"?"L'équipe livre l'aide et télécharge la preuve de livraison avec photos GPS et confirmation."
             :"Field team delivers aid and uploads GPS-tagged proof of delivery — photos, coordinates, beneficiary confirmation.",
      actions:["Receive delivery assignment","Navigate to beneficiary location","Deliver aid + take proof photos","Upload GPS-tagged delivery confirmation"],
    },
    { n:8, icon:"", color:STEP_COLORS[7],
      label:  lang==="so"?"La Dhammeeyay"        :lang==="ar"?"مكتملة"           :lang==="tr"?"Tamamlandı"         :lang==="es"?"Completado"           :lang==="fr"?"Terminé"               :"Completed",
      who:    lang==="so"?"Nidaamka"              :lang==="ar"?"النظام"           :lang==="tr"?"Sistem"             :lang==="es"?"Sistema"              :lang==="fr"?"Système"               :"System",
      detail: lang==="so"?"Xaaladda waxaa la calaamadeeyaa inay dhammaatay. Warbixin saameyn ah ayaa si toos ah loo sameeyaa oo muujinaysa safarka oo dhan — soo gudbinta ilaa gaarsiinta. Deeq-bixiyuhu wuxuu helayaa warbirin ugu dambayn."
             :lang==="ar"?"تُوسَم الحالة مكتملة ويُولَّد تقرير تأثير تلقائياً مع الرحلة كاملة. يتلقى المانح التقرير النهائي."
             :lang==="tr"?"Vaka tamamlandı işaretlenir, tam yolculuğu gösteren etki raporu otomatik oluşturulur."
             :lang==="es"?"El caso se completa y se genera automáticamente un informe de impacto con todo el recorrido."
             :lang==="fr"?"Le cas est complété et un rapport d'impact est généré automatiquement avec le parcours complet."
             :"Case marked complete. Impact report auto-generated showing the full journey from submission to delivery. Donor receives final proof.",
      actions:["Auto-generate impact report","Notify donor with final proof","Archive case with full audit trail","Analytics updated in real time"],
    },
  ];

  const ROLES_FLOW = [
    { icon:"", color:"#3B82F6", steps:[1],   role:"Reporter",     desc:"Submits the case and tracks its progress" },
    { icon:"", color:"#8B5CF6", steps:[2,4], role:"Verifier",    desc:"Approves/rejects, assigns teams, releases to donors" },
    { icon:"", color:"#F59E0B", steps:[3,7], role:"Field Team",  desc:"Investigates on-site, delivers aid" },
    { icon:"", color:"#EC4899", steps:[5,6], role:"Donor",       desc:"Browses verified cases, makes secure payments" },
    { icon:"", color:"#C0392B", steps:[8],   role:"Admin",       desc:"Oversees everything, monitors fraud, generates reports" },
  ];

  const SECURITY = [
    { icon:"", title:"OTP 2FA",             color:"#3B82F6", desc:"Every login requires a one-time password sent to your phone." },
    { icon:"", title:"ID Verification",     color:"#8B5CF6", desc:"All users identity-verified before gaining platform access." },
    { icon:"", title:"Face Verification",   color:"#10B981", desc:"AWS Rekognition powers biometric login checks." },
    { icon:"", title:"AES-256 Encryption",  color:"#F59E0B", desc:"All data encrypted at rest and in transit via TLS 1.3." },
    { icon:"", title:"AI Fraud Detection",  color:"#C0392B", desc:"Real-time anomaly detection flags suspicious patterns." },
    { icon:"", title:"Immutable Audit Log", color:"#06B6D4", desc:"Every action logged with timestamp, user ID, and hash." },
    { icon:"", title:"GDPR Compliant",      color:"#065F46", desc:"Full data privacy compliance — right to erasure supported." },
    { icon:"", title:"Secure Payments",     color:"#D97706", desc:"Stripe, PayPal, and bank transfers — end-to-end encrypted." },
  ];

  return (
    <div style={{ color:C.text }}>

      {/* ── Hero — split layout: text left, illustration right ── */}
      <section style={{ background:`linear-gradient(135deg,${C.primary} 0%,${C.secondary} 100%)`, color:"#fff", overflow:"hidden", minHeight:360 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", alignItems:"center", minHeight:360 }}>
          {/* Left: text */}
          <div style={{ padding:"80px 48px 60px 32px" }}>
            <span style={{ display:"inline-block", background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.28)", borderRadius:20, padding:"6px 18px", fontSize:12, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", marginBottom:24, backdropFilter:"blur(6px)" }}>{P.hero_badge}</span>
            <h1 style={{ fontSize:"clamp(28px,3.8vw,48px)", fontWeight:900, margin:"0 0 18px", lineHeight:1.1, letterSpacing:-1, textShadow:"0 2px 16px rgba(0,0,0,0.3)" }}>{P.hero_title}</h1>
            <p style={{ fontSize:17, opacity:0.88, lineHeight:1.8, maxWidth:460, margin:0 }}>{P.hero_sub}</p>
          </div>
          {/* Right: photo — full bleed, cover fit */}
          <div style={{ position:"relative", height:"100%", minHeight:400, overflow:"hidden" }}>
            <img src="/howitworks-bg.jpg" alt="A hand holding a child's hand"
              style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block", position:"absolute", inset:0 }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to left, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 100%)" }} />
          </div>
        </div>
      </section>

      {/* ── Step Cards — dimensional, no connecting lines ── */}
      <style>{`
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .step-card { transition: transform 0.28s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.28s ease; }
        .step-card:hover { transform: translateY(-10px) scale(1.02); }
        .step-icon-wrap { animation: floatIcon 3.5s ease-in-out infinite; }
        .step-card:hover .step-icon-wrap { animation-play-state: paused; transform: scale(1.15); }
      `}</style>

      <section style={{ padding:"80px 24px", background:C.bg }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <p style={{ fontSize:16, color:C.muted, maxWidth:520, margin:"0 auto" }}>Every case follows the same transparent, AI-assisted journey — no shortcuts, no exceptions.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:24 }}>
            {STEPS.map(s => (
              <div key={s.n} className="step-card" onClick={() => setActiveStep(activeStep===s.n ? null : s.n)}
                style={{
                  background:"#fff", borderRadius:24, overflow:"hidden",
                  boxShadow:`0 4px 24px ${s.color}20, 0 1px 4px rgba(0,0,0,0.06)`,
                  border:`1px solid ${s.color}20`, cursor:"pointer",
                }}>
                {/* Card top — gradient band */}
                <div style={{
                  background:`linear-gradient(135deg, ${s.color}18 0%, ${s.color}08 100%)`,
                  padding:"32px 24px 24px", textAlign:"center", position:"relative",
                }}>
                  {/* Step number badge */}
                  <div style={{
                    position:"absolute", top:16, left:16,
                    width:36, height:36, borderRadius:10,
                    background:`linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
                    color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:14, fontWeight:900, boxShadow:`0 4px 12px ${s.color}40`,
                  }}>
                    {String(s.n).padStart(2,"0")}
                  </div>
                  {/* Who badge */}
                  <div style={{ position:"absolute", top:18, right:14, background:s.color+"18", color:s.color, borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:700 }}>
                    {s.who}
                  </div>
                  {/* Floating icon */}
                  <div className="step-icon-wrap" style={{
                    width:80, height:80, margin:"8px auto 16px",
                    borderRadius:"50%",
                    background:`linear-gradient(135deg, ${s.color}22, ${s.color}44)`,
                    border:`2px solid ${s.color}30`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:38, boxShadow:`0 8px 24px ${s.color}30, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    animationDelay: `${s.n * 0.3}s`,
                  }}>{s.icon}</div>
                  <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:s.color, lineHeight:1.3 }}>{s.label}</h3>
                </div>

                {/* Card body */}
                <div style={{ padding:"18px 22px 22px" }}>
                  <p style={{ margin:"0 0 14px", fontSize:13, color:C.muted, lineHeight:1.7, display:"-webkit-box", WebkitLineClamp: activeStep===s.n ? 99 : 2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                    {s.detail}
                  </p>
                  {activeStep === s.n && (
                    <div style={{ borderTop:`1px solid ${s.color}20`, paddingTop:14, marginTop:4 }}>
                      {s.actions.map((a, j) => (
                        <div key={j} style={{ display:"flex", gap:8, alignItems:"flex-start", fontSize:12, color:C.muted, marginBottom:7 }}>
                          <span style={{ width:18, height:18, borderRadius:"50%", background:s.color+"18", color:s.color, fontWeight:900, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✓</span>
                          {a}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ textAlign:"right", marginTop:8 }}>
                    <span style={{ fontSize:11, color:s.color, fontWeight:700 }}>{activeStep===s.n ? "Show less ↑" : "Details ↓"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security at Every Step ── */}
      <section style={{ padding:"80px 24px", background:`linear-gradient(135deg, ${C.navy} 0%, #0a1e3d 50%, #071428 100%)` }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div style={{ fontSize:52, marginBottom:16 }}></div>
            <span style={{ display:"inline-block", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", borderRadius:20, padding:"5px 16px", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>ENTERPRISE GRADE</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,44px)", fontWeight:900, margin:"0 0 14px", color:"#fff", letterSpacing:-0.5 }}>Security at Every Step</h2>
            <p style={{ fontSize:16, color:"rgba(255,255,255,0.6)", maxWidth:540, margin:"0 auto", lineHeight:1.7 }}>Every interaction, payment, and piece of data is protected by multiple layers of security — from report to delivery.</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:18 }}>
            {SECURITY.map((f, i) => (
              <div key={i} style={{
                background:"rgba(255,255,255,0.05)", backdropFilter:"blur(12px)",
                borderRadius:18, padding:"26px 22px",
                border:`1px solid ${f.color}30`,
                boxShadow:`0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
                transition:"transform 0.22s, box-shadow 0.22s",
              }}
              onMouseOver={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 12px 36px rgba(0,0,0,0.3), 0 0 0 1px ${f.color}50`; }}
              onMouseOut={e =>  { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=`0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`; }}>
                <div style={{
                  width:52, height:52, borderRadius:14, marginBottom:16,
                  background:`linear-gradient(135deg, ${f.color}25, ${f.color}45)`,
                  border:`1px solid ${f.color}40`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26, boxShadow:`0 4px 14px ${f.color}30`,
                }}>{f.icon}</div>
                <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:8 }}>{f.title}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.65 }}>{f.desc}</div>
                <div style={{ marginTop:14, height:2, background:`linear-gradient(90deg, ${f.color}60, transparent)`, borderRadius:1 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
