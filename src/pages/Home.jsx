import { useEffect, useState } from "react";
import {
  BadgeCheck, MapPin, Lock, ScrollText,
  FilePen, SearchCheck, ClipboardCheck, Users, HeartHandshake, PackageCheck, Archive,
  ShieldCheck, ChartNoAxesColumn, ScanEye, Globe, Settings2,
  ArrowRight,
} from "lucide-react";
import { useLang } from "../context/LanguageContext.jsx";
import { PT } from "../translations.js";
import { useResponsive } from "../hooks/useResponsive.js";
import { useReveal, usePrefersReducedMotion } from "../hooks/useReveal.js";
import { cases as casesApi } from "../api/client.js";
import {
  Button, SectionHeader, SunriseRule, CaseCard, StatItem, Ticker, Arc, Timeline, HowItWorks, GuidedByQuran,
} from "../ui/index.js";

const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

/* Shown until the API returns published cases. Cities and case refs only. */
const DEMO_CASES = [
  { id: null, title: "Emergency shelter after flooding", location: "Mogadishu", urgency: "critical", funded: 45, goal: 1200,
    story: "Family displaced by flooding needs immediate shelter and essential supplies. Verified on site 12 July." },
  { id: null, title: "Chronic medication and food support", location: "Baidoa", urgency: "high", funded: 68, goal: 850,
    story: "Elderly community member with a chronic illness needs ongoing medication and monthly food support." },
  { id: null, title: "Community hall for women's literacy", location: "Beledweyne", urgency: "medium", funded: 30, goal: 6500,
    story: "Multi-purpose hall for women's literacy classes and youth skills training, serving 480 people." },
];

function Reveal({ children, delay = 0, style }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="kf-reveal" style={{ "--kf-reveal-delay": `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

export default function Home() {
  const { lang } = useLang();
  const P = PT.home[lang] || PT.home.en;
  const { isMobile } = useResponsive();
  const reduced = usePrefersReducedMotion();
  const [featured, setFeatured] = useState(DEMO_CASES);

  /* Hero entrance fires once, on the frame after mount. */
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    casesApi.list({ limit: 20 }).then((d) => {
      const active = (d?.cases || []).filter(
        (c) => c.status === "waiting_for_sponsor" || c.status === "sponsored" || c.status === "active"
      );
      const normalized = active.map((c) => ({
        id: c.id,
        title: c.publicTitle || "Verified case awaiting sponsorship",
        story: c.publicStory || "",
        location: c.publicCity || "Somalia",
        urgency: (c.emergencyLevel || "medium").toLowerCase(),
        funded: c.targetGoal > 0 ? Math.round((c.totalRaised / c.targetGoal) * 100) : 0,
        raised: c.totalRaised || 0,
        goal: c.targetGoal || 0,
        verifiedAt: c.adminPublishedAt || null,
        image: c.mediaFiles?.[0]?.url || null,
      }));
      const sorted = normalized.sort((a, b) => (URGENCY_RANK[b.urgency] || 0) - (URGENCY_RANK[a.urgency] || 0));
      if (sorted.length > 0) setFeatured(sorted.slice(0, 3));
    }).catch(() => {});
  }, []);

  const [showStats] = useState(() => {
    // Off by default — the impact-counters strip only shows when site settings
    // explicitly enable it (showStats === true).
    try {
      const s = JSON.parse(localStorage.getItem("kf_site_settings") || "{}");
      return s.showStats === true;
    } catch { return false; }
  });

  const cardLabels = {
    sponsor: P.card_sponsor, details: P.card_details, verified: P.card_verified,
    goalOf: P.card_goal_of,
    critical: P.urg_critical, high: P.urg_high, medium: P.urg_medium, low: P.urg_low,
  };
  const tickerLabels = {
    ev_verified: P.ev_verified, ev_delivered: P.ev_delivered, ev_sponsor: P.ev_sponsor,
    ev_dispatch: P.ev_dispatch, ev_min: P.ev_min, ev_label: P.ev_label,
  };

  const flagship = featured[0];

  /* ── Data ───────────────────────────────────────────────────────────────── */

  const TRUST = [
    { icon: BadgeCheck, label: P.trust_verified },
    { icon: MapPin,     label: P.trust_gps },
    { icon: Lock,       label: P.trust_escrow },
    { icon: ScrollText, label: P.trust_audit },
  ];

  const STATS = [
    { val: "2,400+", label: P.stat_sponsored },
    { val: "98.8%",  label: P.stat_success },
    { val: "6",      label: P.stat_regions },
    { val: "100%",   label: P.stat_proofrate },
  ];

  // Existing 8-step pipeline; all six translations preserved verbatim.
  const WORKFLOW = [
    { n:1, icon:FilePen,        label: lang==="so"?"Abuurista Warbixinta":lang==="ar"?"إنشاء التقرير":lang==="tr"?"Rapor Oluşturma":lang==="es"?"Creación del Reporte":lang==="fr"?"Création du Rapport":"Report Creation",     desc: lang==="so"?"Warbixiyuhu wuxuu soo gudbinaayaa xaaladda oo leh faahfaahinta, sawirrada iyo goobta":lang==="ar"?"يقدم المُبلِّغ حالة مع التفاصيل والصور والموقع":lang==="tr"?"Muhabir ayrıntılar, fotoğraflar ve konum ile vaka gönderir":lang==="es"?"El reportero envía un caso con detalles, fotos y ubicación":lang==="fr"?"Le rapporteur soumet un cas avec détails, photos et localisation":"Reporter submits a case with details, photos and location" },
    { n:2, icon:SearchCheck,    label: lang==="so"?"Xafiiska Xaqiijinta":lang==="ar"?"مكتب التحقق":lang==="tr"?"Doğrulama Ofisi":lang==="es"?"Oficina de Verificación":lang==="fr"?"Bureau de Vérification":"Verification Office", desc: lang==="so"?"Saraakiishu waxay dib u eegayaan warbixinta oo u xilsaarayaan koox goobta":lang==="ar"?"يراجع المسؤولون التقرير ويعيّنون فريقًا ميدانيًا":lang==="tr"?"Yetkililer raporu inceler ve saha ekibi atar":lang==="es"?"Los oficiales revisan el reporte y asignan equipo de campo":lang==="fr"?"Les officiers examinent le rapport et assignent une équipe de terrain":"Officers review the report and assign a field team" },
    { n:3, icon:ClipboardCheck, label: lang==="so"?"Baarista Goobta":lang==="ar"?"التحقيق الميداني":lang==="tr"?"Saha Soruşturması":lang==="es"?"Investigación de Campo":lang==="fr"?"Enquête de Terrain":"Field Investigation", desc: lang==="so"?"Wakiilku waxuu booqanayaa, xaqiijinayaa oo dukumeentinaayaa iyada oo leh GPS + caddayn sawir":lang==="ar"?"يزور العملاء الميدانيون ويتحققون ويوثقون بـGPS + دليل صوري":lang==="tr"?"Saha ajanları ziyaret eder, doğrular ve GPS + fotoğraf kanıtıyla belgeler":lang==="es"?"Agentes visitan, verifican y documentan con GPS + prueba fotográfica":lang==="fr"?"Les agents visitent, vérifient et documentent avec GPS + preuve photo":"Field agents visit, verify and document with GPS + photo proof" },
    { n:4, icon:BadgeCheck,     label: lang==="so"?"Xaqiijisan":lang==="ar"?"تم التحقق":lang==="tr"?"Doğrulandı":lang==="es"?"Verificado":lang==="fr"?"Vérifié":"Verified",            desc: lang==="so"?"Xaaladda waxaa la xaqiijiyay oo la muujiyay deeq-bixiyeyaasha si ay u taageeraan":lang==="ar"?"تم تأكيد الحالة وأصبحت مرئية للمانحين للرعاية":lang==="tr"?"Vaka onaylandı ve sponsorlar için bağışçılara görünür hale getirildi":lang==="es"?"Caso confirmado y visible para donantes para apadrinamiento":lang==="fr"?"Cas confirmé et rendu visible aux donateurs pour parrainage":"Case confirmed and made visible to donors for sponsorship" },
    { n:5, icon:Users,          label: lang==="so"?"Safka Deeq-bixiyeyaasha":lang==="ar"?"قائمة انتظار المانحين":lang==="tr"?"Bağışçı Kuyruğu":lang==="es"?"Cola de Donantes":lang==="fr"?"File des Donateurs":"Donor Queue",         desc: lang==="so"?"Xaaladda waxay galaysaa baanka deeq-bixiyeyaasha — deeq-bixiyeyaashu waxay ka baadhi karaan oo dooranayaan":lang==="ar"?"تدخل الحالة تجمع المانحين — يمكن للرعاة التصفح والاختيار":lang==="tr"?"Vaka bağışçı havuzuna girer — sponsorlar göz atabilir ve seçebilir":lang==="es"?"El caso entra al fondo de donantes — patrocinadores pueden explorar y seleccionar":lang==="fr"?"Le cas entre dans le pool des donateurs — les sponsors peuvent parcourir et sélectionner":"Case enters the donor pool — sponsors can browse and select" },
    { n:6, icon:HeartHandshake, label: lang==="so"?"Taageerada":lang==="ar"?"الرعاية":lang==="tr"?"Sponsorluk":lang==="es"?"Apadrinamiento":lang==="fr"?"Parrainage":"Sponsorship",         desc: lang==="so"?"Deeq-bixiyuhu wuxuu taageeraa xaaladda oo lacagtu si amaahday loo daabacanayaa":lang==="ar"?"يرعى المانح الحالة ويتم معالجة الدفع بأمان":lang==="tr"?"Bağışçı vakayı destekler ve ödeme güvenli şekilde işlenir":lang==="es"?"El donante patrocina el caso y el pago se procesa de forma segura":lang==="fr"?"Le donateur parraine le cas et le paiement est traité en toute sécurité":"Donor sponsors the case and payment is securely processed" },
    { n:7, icon:PackageCheck,   label: lang==="so"?"Gaarsiinta Gargaarka":lang==="ar"?"تسليم المساعدة":lang==="tr"?"Yardım Teslimatı":lang==="es"?"Entrega de Ayuda":lang==="fr"?"Livraison de l'Aide":"Aid Delivery",        desc: lang==="so"?"Kooxda goobtu waxay gaarsiisaa gargaarka oo soo raraysaa caddaynta gaarsiinta":lang==="ar"?"يسلم الفريق الميداني المساعدة ويرفع دليل التسليم":lang==="tr"?"Saha ekibi yardımı teslim eder ve teslimat kanıtı yükler":lang==="es"?"El equipo de campo entrega la ayuda y sube prueba de entrega":lang==="fr"?"L'équipe de terrain livre l'aide et télécharge la preuve de livraison":"Field team delivers aid and uploads proof of delivery" },
    { n:8, icon:Archive,        label: lang==="so"?"La Dhammeeyay":lang==="ar"?"مكتملة":lang==="tr"?"Tamamlandı":lang==="es"?"Completado":lang==="fr"?"Terminé":"Completed",           desc: lang==="so"?"Xaaladda waxaa lagu kaydiyaa warbixin saameyn leh — xadhkaha buuxa oo ilaalinaya":lang==="ar"?"تُؤرشف الحالة مع تقرير التأثير — يُحفظ سجل التدقيق الكامل":lang==="tr"?"Vaka etki raporu ile arşivlenir — tam denetim izi korunur":lang==="es"?"Caso archivado con informe de impacto — rastro de auditoría completo preservado":lang==="fr"?"Cas archivé avec rapport d'impact — piste d'audit complète préservée":"Case archived with impact report — full audit trail preserved" },
  ];

  // Five milestone steps for the animated How-it-works stage (subset of WORKFLOW).
  const HIW_STEPS = [0, 1, 2, 5, 6].map((idx, i) => ({
    icon:  WORKFLOW[idx].icon,
    title: WORKFLOW[idx].label,
    desc:  WORKFLOW[idx].desc,
    theme: ["gold", "blue", "green", "gold", "blue"][i],
  }));

  const ROLES = [
    { icon: FilePen,        label: lang==="so"?"Warbixiye":lang==="ar"?"مراسل":lang==="tr"?"Muhabir":lang==="es"?"Reportero":lang==="fr"?"Rapporteur":"Reporter" },
    { icon: SearchCheck,    label: lang==="so"?"Xafiiska":lang==="ar"?"التحقق":lang==="tr"?"Doğrulama":lang==="es"?"Verificación":lang==="fr"?"Vérification":"Verification" },
    { icon: ClipboardCheck, label: lang==="so"?"Kooxda Goobta":lang==="ar"?"الفريق الميداني":lang==="tr"?"Saha Ekibi":lang==="es"?"Equipo de Campo":lang==="fr"?"Équipe Terrain":"Field Team" },
    { icon: HeartHandshake, label: lang==="so"?"Deeq-bixiye":lang==="ar"?"متبرع":lang==="tr"?"Bağışçı":lang==="es"?"Donante":lang==="fr"?"Donateur":"Donor" },
    { icon: Settings2,      label: lang==="so"?"Super Admin":lang==="ar"?"المدير العام":lang==="tr"?"Süper Admin":lang==="es"?"Super Admin":lang==="fr"?"Super Admin":"Super Admin" },
  ];

  const CAPABILITIES = [
    { icon: ShieldCheck,       title: lang==="so"?"Amni Badan":lang==="ar"?"أمان متعدد الطبقات":lang==="tr"?"Çok katmanlı güvenlik":lang==="es"?"Seguridad multicapa":lang==="fr"?"Sécurité multicouche":"Multi-layer security", desc: "OTP sign-in, face verification and AES-256 at rest on every account." },
    { icon: Lock,              title: lang==="so"?"Lacag Ammaan":lang==="ar"?"مدفوعات بضمان":lang==="tr"?"Emanet ödemeler":lang==="es"?"Pagos en depósito":lang==="fr"?"Paiements sous séquestre":"Escrow payments",   desc: "Funds are held until delivery proof is filed. PCI DSS Level 1." },
    { icon: MapPin,            title: lang==="so"?"Raadraaca GPS":lang==="ar"?"تتبع ميداني بـGPS":lang==="tr"?"GPS saha takibi":lang==="es"?"Seguimiento GPS":lang==="fr"?"Suivi GPS":"GPS field tracking",       desc: "Geofenced check-ins prove an agent stood where the report claims." },
    { icon: ScanEye,           title: lang==="so"?"Ogaanshaha Khiyaanada":lang==="ar"?"كشف الاحتيال":lang==="tr"?"Sahtekârlık tespiti":lang==="es"?"Detección de fraude":lang==="fr"?"Détection de fraude":"AI fraud detection", desc: "Anomaly scoring flags duplicates and irregular funding patterns." },
    { icon: ChartNoAxesColumn, title: lang==="so"?"Falanqayn Waqti-dhab":lang==="ar"?"تحليلات فورية":lang==="tr"?"Gerçek zamanlı analiz":lang==="es"?"Analítica en tiempo real":lang==="fr"?"Analytique temps réel":"Real-time analytics", desc: "Pipeline, disbursement and delivery metrics per role, live." },
    { icon: Globe,             title: lang==="so"?"Lix Luqadood":lang==="ar"?"ست لغات":lang==="tr"?"Altı dil":lang==="es"?"Seis idiomas":lang==="fr"?"Six langues":"Six languages", desc: "Somali, Arabic, English, Turkish, Spanish and French, including RTL." },
  ];

  /* ── Layout atoms ───────────────────────────────────────────────────────── */
  const container = { maxInlineSize: "var(--kf-container)", marginInline: "auto", paddingInline: "var(--kf-gutter)" };
  const section = (bg) => ({ background: bg, paddingBlock: "var(--kf-section-pad)" });
  const glow = {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(55% 45% at 12% 0%, rgba(26,108,181,.07), transparent 70%)",
  };
  /* Hero field photo. The image's bright open space sits on the left, so the
     headline reads over solid navy while the family shows through the sheer
     scrim on the right, behind the floating live-case card. CSS background
     degrades to plain navy if the asset is missing — the hero never breaks. */
  const heroPhoto = {
    position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: "url('/assets/hero/field-delivery.jpg')",
    backgroundSize: "cover",
    backgroundPosition: isMobile ? "center" : "center right",
    backgroundRepeat: "no-repeat",
  };
  const heroScrim = {
    position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
    background: isMobile
      ? "linear-gradient(180deg, #002651 0%, rgba(0,38,81,.4) 16%, rgba(0,38,81,.55) 60%, rgba(0,26,64,.94) 100%)"
      // Horizontal: solid navy behind the text, clearing over the subjects, with a
      // gentle navy return at the far-right edge so the photo never hard-stops.
      : "linear-gradient(90deg, #002651 0%, rgba(0,38,81,.93) 20%, rgba(0,38,81,.6) 40%, rgba(0,38,81,.16) 62%, rgba(0,38,81,0) 82%, rgba(0,38,81,.32) 100%)," +
        // Vertical: the photo melts into navy at the top and bottom so it reads as
        // part of the page rather than a pasted rectangle.
        "linear-gradient(180deg, #002651 0%, rgba(0,38,81,0) 20%, rgba(0,38,81,0) 66%, rgba(0,26,64,.92) 100%)",
  };

  return (
    <div style={{ fontFamily: "var(--kf-font-body)", color: "var(--kf-ink-900)" }}>

      {/* ═══════════ §3-A HERO ═══════════ */}
      <section
        className={`kf-on-dark${lit || reduced ? " kf-lit" : ""}`}
        style={{
          background: "var(--kf-navy-900)", position: "relative", overflow: "hidden",
          minBlockSize: isMobile ? "auto" : "92vh",
          display: "flex", alignItems: "center",
          paddingBlock: "var(--kf-section-pad)",
        }}
      >
        <div aria-hidden="true" style={heroPhoto} />
        <div aria-hidden="true" style={heroScrim} />
        <div style={glow} />
        <div className="kf-dotgrid" />

        <div style={{ ...container, position: "relative", zIndex: 1, inlineSize: "100%" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            alignItems: "center",
          }}>
            {/* The message — held to the left so the field photo breathes on the right */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--kf-s5)", maxInlineSize: isMobile ? "100%" : "min(600px, 52%)" }}>
              {/* transform-origin is set to inline-start in global.css so the
                  rule draws outward from the text edge in both directions. */}
              <SunriseRule className="kf-draw" />

              <div className="kf-rise" style={{ "--kf-rise-delay": "100ms",
                fontSize: "var(--kf-fs-overline)", fontWeight: 700,
                letterSpacing: "var(--kf-ls-overline)", textTransform: "uppercase",
                color: "var(--kf-gold-500)",
              }}>
                {P.hero_overline}
              </div>

              <h1 style={{
                fontFamily: "var(--kf-font-display)",
                fontSize: "var(--kf-fs-display)", lineHeight: "var(--kf-lh-display)",
                fontWeight: 800, letterSpacing: "var(--kf-ls-display)", color: "var(--kf-surface)",
              }}>
                <span className="kf-line-mask">
                  <span className="kf-line" style={{ "--kf-line-delay": "200ms" }}>{P.hero_title1}</span>
                </span>
                <span className="kf-line-mask">
                  <span className="kf-line" style={{ "--kf-line-delay": "320ms", color: "var(--kf-gold-500)" }}>
                    {P.hero_title2}
                  </span>
                </span>
              </h1>

              <p className="kf-rise" style={{ "--kf-rise-delay": "500ms",
                margin: 0, maxInlineSize: "52ch",
                fontSize: "var(--kf-fs-body-lg)", lineHeight: "var(--kf-lh-body-lg)",
                color: "rgba(255,255,255,.78)",
              }}>
                {P.hero_sub}
              </p>

              <div className="kf-rise" style={{ "--kf-rise-delay": "560ms", display: "flex", flexWrap: "wrap", gap: "var(--kf-s3)" }}>
                <Button to="/donate" variant="cta" size="lg">{P.btn_sponsor}</Button>
                <Button to="/how-it-works" variant="secondary" size="lg">{P.btn_how}</Button>
              </div>

              <div style={{ borderBlockStart: "1px solid var(--kf-on-dark-14)", paddingBlockStart: "var(--kf-s5)" }}>
                <ul style={{
                  listStyle: "none", margin: 0, padding: 0, display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "var(--kf-s3) var(--kf-s5)",
                }}>
                  {TRUST.map(({ icon: Icon, label }, i) => (
                    <li key={label} className="kf-rise" style={{ "--kf-rise-delay": `${900 + i * 60}ms`,
                      display: "flex", alignItems: "center", gap: "var(--kf-s2)",
                      fontSize: "var(--kf-fs-caption)", color: "var(--kf-on-dark-75)",
                    }}>
                      <Icon size={16} strokeWidth={2} aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ §3-B LIVE TICKER ═══════════ */}
      <Ticker labels={tickerLabels} />

      {/* ═══════════ §3-C IMPACT COUNTERS ═══════════ */}
      {showStats && (
        <section style={section("var(--kf-surface)")}>
          <div style={container}>
            <Reveal>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
                gap: isMobile ? "var(--kf-s7)" : 0,
              }}>
                {STATS.map((s, i) => (
                  <div key={s.label} style={{
                    paddingInline: isMobile ? 0 : "var(--kf-s6)",
                    borderInlineStart: !isMobile && i > 0 ? "1px solid var(--kf-ink-200)" : "none",
                  }}>
                    <StatItem value={s.val} label={s.label} />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ═══════════ §3-D THE VERIFICATION JOURNEY ═══════════ */}
      <section style={section("var(--kf-canvas)")}>
        <div style={container}>
          <Reveal>
            <SectionHeader align="center" overline={P.journey_overline}
              title={P.workflow_title} lede={P.workflow_sub} />
          </Reveal>

          <HowItWorks steps={HIW_STEPS} isMobile={isMobile} />

          <div style={{ marginBlockStart: "var(--kf-s8)", display: "flex", justifyContent: "center" }}>
            <Button to="/how-it-works" variant="ghost" size="md" iconEnd={ArrowRight}>
              {P.how_link}
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════ §3-E FEATURED CASES ═══════════ */}
      <section style={section("var(--kf-surface)")}>
        <div style={container}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--kf-s5)", flexWrap: "wrap" }}>
              <SectionHeader overline={P.cases_overline} title={P.cases_title} lede={P.cases_sub} />
              <Button to="/cases" variant="ghost" size="md" iconEnd={ArrowRight}>{P.cases_viewall}</Button>
            </div>
          </Reveal>

          <div style={{
            marginBlockStart: "var(--kf-s8)", display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "var(--kf-s6)",
          }}>
            {featured.map((c, i) => (
              <Reveal key={c.id ?? `demo-${i}`} delay={i * 60}>
                <CaseCard {...c} percent={c.funded} lang={lang} labels={cardLabels} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ §3-F GUIDED BY THE QUR'AN AND SUNNAH ═══════════ */}
      <Reveal>
        <GuidedByQuran isMobile={isMobile} />
      </Reveal>

      {/* ═══════════ §3-H PRE-FOOTER CTA ═══════════ */}
      <section className="kf-on-dark" style={{ ...section("var(--kf-navy-950)"), position: "relative", overflow: "hidden" }}>
        {/* The Arc, oversized and cropped — the logo's sunrise closing the page. */}
        <div aria-hidden="true" style={{
          position: "absolute", insetBlockEnd: "-12%", insetInlineStart: "50%",
          transform: "translateX(-50%)", pointerEvents: "none",
        }}>
          <Arc mode="static" size={900} stroke={1.5} color="var(--kf-surface)" opacity={0.06} />
        </div>

        <div style={{ ...container, position: "relative" }}>
          <Reveal>
            <div style={{
              maxInlineSize: 640, marginInline: "auto", textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--kf-s4)",
            }}>
              <SunriseRule align="center" />
              <h2 style={{
                fontSize: "var(--kf-fs-h2)", lineHeight: "var(--kf-lh-h2)",
                fontWeight: 700, color: "var(--kf-surface)",
              }}>
                {P.precta_title}
              </h2>
              <p style={{ margin: 0, fontSize: "var(--kf-fs-body-lg)", color: "rgba(255,255,255,.70)" }}>
                {P.precta_sub}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--kf-s3)", justifyContent: "center" }}>
                <Button to="/donate" variant="cta" size="lg">{P.precta_cta}</Button>
                <Button to="/contact" variant="secondary" size="lg">{P.precta_talk}</Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
