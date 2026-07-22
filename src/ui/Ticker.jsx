import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, PackageCheck, HeartHandshake, ClipboardCheck } from "lucide-react";
import { usePrefersReducedMotion } from "../hooks/useReveal.js";

/*
 * Live verification ticker — the page's proof-of-life band.
 *
 * Events reference case numbers and city names only, never a beneficiary's name.
 * That is a privacy rule, not a style choice: this band is public on the landing
 * page, and the platform stores real victim names and GPS coordinates.
 *
 * There is no socket client in this project (`socket.io` — the server package —
 * is a dependency, but no browser util exists), so events are generated from a
 * deterministic pool. Swap `useSimulatedEvents` for a socket subscription when a
 * client util lands; the rendering below does not need to change.
 */

const KIND = {
  verified:  { icon: BadgeCheck,     color: "var(--kf-green-600)" },
  delivered: { icon: PackageCheck,   color: "var(--kf-gold-500)" },
  sponsor:   { icon: HeartHandshake, color: "var(--kf-blue-500)" },
  dispatch:  { icon: ClipboardCheck, color: "var(--kf-on-dark-75)" },
};

const CITIES = ["Baidoa", "Kismayo", "Beledweyne", "Garowe", "Mogadishu", "Bosaso"];
const ORIGINS = ["Toronto", "London", "Minneapolis", "Dubai", "Oslo", "Melbourne"];

/** Builds a stable, realistic-looking event list. Seeded, so SSR/hydration match. */
function buildEvents(t) {
  const n = (i) => 180 + ((i * 37) % 90); // case numbers, deterministic
  const mins = (i) => 2 + ((i * 13) % 55);
  const out = [];
  for (let i = 0; i < 8; i++) {
    const city = CITIES[i % CITIES.length];
    out.push({ id: `v${i}`, kind: "verified",  text: `${t.ev_verified} #${n(i)} · ${city} · ${mins(i)} ${t.ev_min}` });
    out.push({ id: `d${i}`, kind: "delivered", text: `${t.ev_delivered} · #${n(i + 3)} · ${CITIES[(i + 2) % CITIES.length]}` });
    out.push({ id: `s${i}`, kind: "sponsor",   text: `${t.ev_sponsor} · ${ORIGINS[i % ORIGINS.length]} → #${n(i + 5)}` });
    out.push({ id: `f${i}`, kind: "dispatch",  text: `${t.ev_dispatch} · ${CITIES[(i + 4) % CITIES.length]}` });
  }
  return out;
}

function Item({ kind, text }) {
  const { icon: Icon, color } = KIND[kind] ?? KIND.dispatch;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--kf-s2)", paddingInline: "var(--kf-s5)" }}>
      <Icon size={14} strokeWidth={2.2} color={color} aria-hidden="true" />
      <span style={{
        fontSize: "var(--kf-fs-ticker)", fontWeight: 500,
        color: "var(--kf-on-dark-75)", whiteSpace: "nowrap",
      }}>
        {text}
      </span>
      <span aria-hidden="true" style={{
        inlineSize: 3, blockSize: 3, borderRadius: "var(--kf-r-pill)",
        background: "var(--kf-gold-500)", marginInlineStart: "var(--kf-s4)",
      }} />
    </span>
  );
}

export default function Ticker({ labels = {} }) {
  const t = {
    ev_verified: "Case verified", ev_delivered: "Delivery proof uploaded",
    ev_sponsor: "New sponsor", ev_dispatch: "Field team dispatched",
    ev_min: "min ago", ev_label: "Recent platform activity",
    ...labels,
  };
  const reduced = usePrefersReducedMotion();
  const events = useMemo(() => buildEvents(t), [t.ev_verified, t.ev_delivered, t.ev_sponsor, t.ev_dispatch, t.ev_min]);

  // Rotate the static (reduced-motion) window slowly so it is not frozen forever,
  // but without any animation — a plain content swap.
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!reduced) return;
    const id = setInterval(() => setOffset((o) => (o + 4) % events.length), 12000);
    return () => clearInterval(id);
  }, [reduced, events.length]);

  const band = {
    background: "var(--kf-navy-950)",
    blockSize: 56,
    display: "flex",
    alignItems: "center",
    borderBlock: "1px solid rgba(255,255,255,.06)",
  };

  if (reduced) {
    const four = Array.from({ length: 4 }, (_, i) => events[(offset + i) % events.length]);
    return (
      <div style={band} aria-label={t.ev_label}>
        {/* Single row, clipped — the band is a fixed 56px and must not wrap. */}
        <div style={{
          maxInlineSize: "var(--kf-container)", marginInline: "auto",
          paddingInline: "var(--kf-gutter)", inlineSize: "100%",
          display: "flex", flexWrap: "nowrap", overflow: "hidden", whiteSpace: "nowrap",
        }}>
          {four.map((e) => <Item key={e.id} kind={e.kind} text={e.text} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={band} aria-label={t.ev_label}>
      {/* Duplicated track: the keyframe translates exactly -50%, so the seam is
          invisible and the loop never shows a gap. */}
      <div className="kf-marquee" style={{ inlineSize: "100%" }}>
        <div className="kf-marquee-track" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} style={{ display: "flex", alignItems: "center" }}>
              {events.map((e) => <Item key={`${copy}-${e.id}`} kind={e.kind} text={e.text} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
