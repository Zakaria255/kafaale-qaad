import React from "react";

/**
 * "Guided by the Qur'an and Sunnah" — the mission's spiritual foundation.
 * Emerald-and-gold Islamic styling: geometric star field, hanging lanterns,
 * a gold ornamental frame, and four gold-bordered verse/hadith cards.
 * Self-contained (no design-token dependency for its palette) so the section
 * reads as a deliberate, sacred interlude distinct from the navy product UI.
 */

const GOLD = "#D9B85C";
const GOLD_SOFT = "#E7CE86";

const VERSES = [
  {
    ar: "وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَأَسِيرًا ۝ إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا",
    ref: "Qur'an 76:8–9",
    en: "And they give food in spite of love for it to the needy, the orphan, and the captive, [saying], “We feed you only for the countenance of Allah. We wish not from you reward or gratitude.”",
  },
  {
    ar: "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ",
    ref: "Qur'an 5:2",
    en: "And cooperate in righteousness and piety, but do not cooperate in sin and aggression.",
  },
  {
    ar: "أَحَبُّ النَّاسِ إِلَى اللَّهِ أَنْفَعُهُمْ لِلنَّاسِ",
    ref: "Hadith",
    en: "The most beloved of people to Allah are those who are most beneficial to people.",
  },
  {
    ar: "ارْحَمُوا مَنْ فِي الْأَرْضِ يَرْحَمْكُمْ مَنْ فِي السَّمَاءِ",
    ref: "Hadith",
    en: "Have mercy upon those on the earth, and He who is in the heaven will have mercy upon you.",
  },
];

/* A hanging gold lantern. Decorative only. */
function Lantern({ size = 46, drop = 70, style }) {
  return (
    <svg
      width={size}
      height={drop + size * 1.8}
      viewBox={`0 0 60 ${drop + 110}`}
      aria-hidden="true"
      style={style}
    >
      <defs>
        <linearGradient id="lanternBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4DE9B" />
          <stop offset="0.5" stopColor={GOLD} />
          <stop offset="1" stopColor="#9C7B2E" />
        </linearGradient>
        <radialGradient id="lanternGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3C8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFCE6A" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      {/* chain */}
      <line x1="30" y1="0" x2="30" y2={drop} stroke={GOLD} strokeWidth="1.4" opacity="0.7" />
      <circle cx="30" cy={drop} r="3.5" fill="none" stroke={GOLD} strokeWidth="1.6" />
      {/* top finial */}
      <path d={`M22 ${drop + 6} h16 l-3 8 h-10 z`} fill="url(#lanternBody)" />
      {/* body */}
      <path
        d={`M30 ${drop + 14}
            C 46 ${drop + 20}, 48 ${drop + 66}, 30 ${drop + 84}
            C 12 ${drop + 66}, 14 ${drop + 20}, 30 ${drop + 14} Z`}
        fill="url(#lanternBody)"
        stroke="#8A6B26"
        strokeWidth="0.8"
      />
      {/* inner light */}
      <ellipse cx="30" cy={drop + 50} rx="10" ry="18" fill="url(#lanternGlow)" />
      {/* vertical ribs */}
      <path d={`M30 ${drop + 16} L30 ${drop + 82}`} stroke="#8A6B26" strokeWidth="0.7" opacity="0.6" />
      {/* bottom finial */}
      <path d={`M26 ${drop + 84} h8 l-4 10 z`} fill="url(#lanternBody)" />
    </svg>
  );
}

function VerseCard({ ar, reference, en }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        borderRadius: 16,
        padding: "28px 26px 26px",
        textAlign: "center",
        background:
          "linear-gradient(160deg, rgba(23,86,73,0.92) 0%, rgba(11,52,46,0.94) 55%, rgba(8,38,45,0.96) 100%)",
        border: `1px solid ${hover ? "rgba(231,206,134,0.85)" : "rgba(217,184,92,0.45)"}`,
        boxShadow: hover
          ? "0 22px 50px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(231,206,134,0.35)"
          : "0 16px 40px -22px rgba(0,0,0,0.6), inset 0 1px 0 rgba(231,206,134,0.18)",
        transform: hover ? "translateY(-3px)" : "none",
        transition: "transform .35s ease, border-color .35s ease, box-shadow .35s ease",
      }}
    >
      <p
        dir="rtl"
        lang="ar"
        style={{
          margin: "0 0 16px",
          color: GOLD_SOFT,
          fontFamily: '"Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", serif',
          fontSize: "clamp(19px, 2vw, 24px)",
          lineHeight: 2,
          fontWeight: 600,
          textShadow: "0 1px 10px rgba(0,0,0,0.4)",
        }}
      >
        {ar}
      </p>
      <div
        style={{
          color: GOLD,
          fontSize: 13,
          letterSpacing: 1,
          marginBottom: 12,
          fontStyle: "italic",
          opacity: 0.95,
        }}
      >
        ({reference})
      </div>
      <p
        style={{
          margin: 0,
          color: "rgba(240,236,222,0.86)",
          fontSize: "clamp(13px, 1.4vw, 15px)",
          lineHeight: 1.7,
        }}
      >
        {en}
      </p>
    </div>
  );
}

export default function GuidedByQuran({ isMobile = false }) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        paddingBlock: isMobile ? "56px" : "88px",
        paddingInline: "clamp(16px, 5vw, 48px)",
        background:
          "radial-gradient(120% 90% at 50% -10%, #14574a 0%, #0c3b34 40%, #082a34 70%, #05202e 100%)",
      }}
    >
      {/* Geometric star field */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.12 }}
      >
        <defs>
          <pattern id="kf-stars" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
            <path
              d="M32 6 L38 26 L58 32 L38 38 L32 58 L26 38 L6 32 L26 26 Z"
              fill="none"
              stroke={GOLD}
              strokeWidth="1"
            />
            <circle cx="32" cy="32" r="3" fill="none" stroke={GOLD} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#kf-stars)" />
      </svg>

      {/* Soft top glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          insetInlineStart: "50%",
          insetBlockStart: -80,
          transform: "translateX(-50%)",
          width: 620,
          height: 320,
          background: "radial-gradient(ellipse at center, rgba(231,206,134,0.22) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Gold ornamental frame */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: isMobile ? 10 : 18,
          border: "1px solid rgba(217,184,92,0.35)",
          borderRadius: 14,
          pointerEvents: "none",
          boxShadow: "inset 0 0 0 4px rgba(217,184,92,0.06)",
        }}
      />

      {/* Hanging lanterns (desktop only) */}
      {!isMobile && (
        <>
          <Lantern size={44} drop={64} style={{ position: "absolute", insetBlockStart: 0, insetInlineStart: "8%" }} />
          <Lantern size={34} drop={110} style={{ position: "absolute", insetBlockStart: 0, insetInlineStart: "17%", opacity: 0.85 }} />
          <Lantern size={44} drop={64} style={{ position: "absolute", insetBlockStart: 0, insetInlineEnd: "8%" }} />
          <Lantern size={34} drop={110} style={{ position: "absolute", insetBlockStart: 0, insetInlineEnd: "17%", opacity: 0.85 }} />
        </>
      )}

      <div style={{ position: "relative", maxWidth: 1040, margin: "0 auto", zIndex: 1 }}>
        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 40 }}>
          <h2
            style={{
              margin: 0,
              color: GOLD_SOFT,
              fontFamily: '"Amiri", Georgia, "Times New Roman", serif',
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 700,
              letterSpacing: 0.3,
              textShadow: "0 2px 20px rgba(0,0,0,0.45)",
            }}
          >
            Guided by the Qur'an and Sunnah
          </h2>
          {/* divider flourish */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "14px 0 16px" }} aria-hidden="true">
            <span style={{ height: 1, width: 60, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
            <span style={{ width: 8, height: 8, transform: "rotate(45deg)", background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
            <span style={{ height: 1, width: 60, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
          </div>
          <p
            style={{
              margin: "0 auto",
              maxWidth: 620,
              color: "rgba(240,236,222,0.85)",
              fontSize: "clamp(14px, 1.6vw, 17px)",
              lineHeight: 1.7,
            }}
          >
            Our humanitarian mission is inspired by Islamic values of compassion, justice, cooperation, and service to humanity.
          </p>
        </div>

        {/* Verse grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: isMobile ? 18 : 24,
          }}
        >
          {VERSES.map((v) => (
            <VerseCard key={v.ref + v.en.slice(0, 12)} ar={v.ar} reference={v.ref} en={v.en} />
          ))}
        </div>
      </div>
    </section>
  );
}
