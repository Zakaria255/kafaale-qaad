import { useState } from "react";
import { Link } from "react-router-dom";

const B = {
  navy: "#002651", blue: "#004B96", green: "#4B7D19",
  gold: "#E0AB21", bg: "#F4F7FC", border: "#D8E4F0",
  text: "#0D1F3C", muted: "#5A6E8A",
};

const PROJECTS = [
  {
    id: "p1", icon: "💧", type: "Water",
    title: "Baidoa District Water Well",
    location: "Baidoa, Bay Region",
    goal: 8000, raised: 6400,
    beneficiaries: 320, status: "active",
    img: "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=600&q=75",
    desc: "Deep borehole well providing clean drinking water to 4 neighbouring villages. Reduces waterborne disease and travel time for women and children.",
    updates: ["Foundation dug — 18 June 2026", "Pump equipment delivered — 5 June 2026"],
  },
  {
    id: "p2", icon: "🏫", type: "Education",
    title: "Garowe Primary School Renovation",
    location: "Garowe, Nugaal Region",
    goal: 15000, raised: 9300,
    beneficiaries: 480, status: "active",
    img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=75",
    desc: "Rebuilding 3 collapsed classrooms, installing desks and solar lighting for 480 students. IDP-host community school running 2 shifts.",
    updates: ["Roof installed on block A — 12 June 2026", "Materials delivered — 28 May 2026"],
  },
  {
    id: "p3", icon: "🏥", type: "Healthcare",
    title: "Kismayo Mobile Clinic",
    location: "Kismayo, Lower Jubba",
    goal: 12000, raised: 12000,
    beneficiaries: 1200, status: "completed",
    img: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&q=75",
    desc: "Monthly mobile clinic providing maternal health, vaccinations and basic medicine to 5 underserved communities. Fully funded and operational.",
    updates: ["Month 6 completed — 1 June 2026", "Fully funded — April 2026"],
  },
  {
    id: "p4", icon: "🕌", type: "Community",
    title: "Beledweyne Community Centre",
    location: "Beledweyne, Hiran",
    goal: 6500, raised: 1950,
    beneficiaries: 600, status: "fundraising",
    img: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&q=75",
    desc: "Multi-purpose community hall for women's literacy classes, youth skills training, and community meetings. Currently in fundraising phase.",
    updates: ["Land identified and cleared — 10 June 2026"],
  },
  {
    id: "p5", icon: "🌾", type: "Agriculture",
    title: "Afgooye Irrigation Scheme",
    location: "Afgooye, Lower Shabelle",
    goal: 20000, raised: 4000,
    beneficiaries: 85, status: "fundraising",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75",
    desc: "Micro-irrigation canals and seed distribution for 85 farming families recovering from drought. Expected to triple crop yield by harvest season.",
    updates: ["Survey complete — 14 June 2026"],
  },
  {
    id: "p6", icon: "🔆", type: "Energy",
    title: "Mogadishu IDP Camp Solar",
    location: "Mogadishu, Benadir",
    goal: 9500, raised: 9500,
    beneficiaries: 210, status: "completed",
    img: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=75",
    desc: "Solar panel installation providing lighting to 210 IDP camp families, reducing safety incidents at night. Fully funded and commissioned.",
    updates: ["Commissioned — 20 May 2026", "Installation complete — 15 May 2026"],
  },
];

const TYPE_COLORS = {
  Water:      { bg: "#DBEAFE", color: "#1D4ED8" },
  Education:  { bg: "#FEF9C3", color: "#854D0E" },
  Healthcare: { bg: "#D1FAE5", color: "#065F46" },
  Community:  { bg: "#EDE9FE", color: "#5B21B6" },
  Agriculture:{ bg: "#FEF3C7", color: "#92400E" },
  Energy:     { bg: "#FFF7ED", color: "#C2410C" },
};

const STATUS_LABELS = {
  active:      { label: "Active",       bg: "#D1FAE5", color: "#065F46" },
  completed:   { label: "Completed",    bg: "#F3F4F6", color: "#374151" },
  fundraising: { label: "Fundraising",  bg: "#FEF9C3", color: "#854D0E" },
};

function ProgressBar({ pct, color = B.blue }) {
  return (
    <div style={{ background: "#E5E7EB", borderRadius: 99, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s" }} />
    </div>
  );
}

export default function Projects() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const types = ["all", ...Array.from(new Set(PROJECTS.map(p => p.type)))];
  const visible = filter === "all" ? PROJECTS : PROJECTS.filter(p => p.type === filter);
  const proj = selected ? PROJECTS.find(p => p.id === selected) : null;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: B.text }}>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${B.navy} 0%, ${B.blue} 60%, ${B.green} 100%)`, padding: "72px 24px 56px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 44px)", fontWeight: 900, margin: "0 0 16px" }}>Community Projects</h1>
        <p style={{ fontSize: 18, opacity: 0.85, maxWidth: 580, margin: "0 auto 32px", lineHeight: 1.7 }}>
          Infrastructure that lifts entire communities — water, schools, clinics, and more. Every project is verified, tracked, and publicly reported.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          {[
            { n: PROJECTS.length,     label: "Total Projects" },
            { n: PROJECTS.filter(p=>p.status==="completed").length, label: "Completed" },
            { n: PROJECTS.reduce((s,p)=>s+p.beneficiaries,0).toLocaleString(), label: "Beneficiaries" },
          ].map(({ n, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 900 }}>{n}</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 36 }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "8px 18px", borderRadius: 99, border: "1.5px solid",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              borderColor: filter === t ? B.blue : B.border,
              background:  filter === t ? B.blue : "#fff",
              color:        filter === t ? "#fff" : B.muted,
              transition: "all .15s",
            }}>{t === "all" ? "All Types" : t}</button>
          ))}
        </div>

        {/* Project grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
          {visible.map(p => {
            const pct = Math.round((p.raised / p.goal) * 100);
            const tc  = TYPE_COLORS[p.type] || { bg: "#F3F4F6", color: "#374151" };
            const sc  = STATUS_LABELS[p.status];
            return (
              <div key={p.id} onClick={() => setSelected(p.id)}
                style={{
                  background: "#fff", borderRadius: 18, border: `1px solid ${B.border}`,
                  boxShadow: "0 2px 12px rgba(0,38,81,0.07)", overflow: "hidden",
                  cursor: "pointer", transition: "box-shadow .2s, transform .2s",
                }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,38,81,0.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseOut={e  => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,38,81,0.07)"; e.currentTarget.style.transform = "none"; }}
              >
                {/* Cover image */}
                <div style={{ position: "relative", height: 180, overflow: "hidden", background: B.bg }}>
                  <img src={p.img} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.5) 100%)" }} />
                  <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
                    <span style={{ ...tc, borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 800 }}>{p.icon} {p.type}</span>
                    <span style={{ background: sc.bg, color: sc.color, borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 700 }}>{sc.label}</span>
                  </div>
                  <div style={{ position: "absolute", bottom: 10, left: 14, right: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#fff", lineHeight: 1.35, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{p.title}</h3>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>📍 {p.location}</div>
                  </div>
                </div>

                <div style={{ padding: "18px 20px 20px" }}>
                  <p style={{ fontSize: 13, color: B.muted, lineHeight: 1.6, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.desc}
                  </p>
                  {/* % as main stat */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: pct >= 100 ? B.green : B.blue, lineHeight: 1 }}>{pct}%</span>
                    <span style={{ fontSize: 11, color: B.muted }}>
                      {pct >= 100 ? `Goal: $${p.goal.toLocaleString()} ✓` : "funded"}
                    </span>
                  </div>
                  <ProgressBar pct={pct} color={pct >= 100 ? B.green : B.blue} />
                  {pct >= 100 && <div style={{ fontSize: 11, color: B.green, fontWeight: 700, marginTop: 5 }}>🎉 Fully Funded</div>}
                  <div style={{ marginTop: 10, fontSize: 12, color: B.muted }}>👥 {p.beneficiaries.toLocaleString()} beneficiaries</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Start a project CTA */}
        <div style={{ marginTop: 64, background: `linear-gradient(135deg, ${B.navy}, ${B.blue})`, borderRadius: 20, padding: "40px 32px", textAlign: "center", color: "#fff" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px" }}>Know a Community in Need?</h2>
          <p style={{ opacity: 0.8, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.7 }}>
            Field agents, local leaders, and community members can submit a project for review. Our team verifies and connects it with donors.
          </p>
          <Link to="/contact" style={{
            display: "inline-block", padding: "13px 32px", borderRadius: 12,
            background: B.gold, color: "#fff", fontWeight: 800, textDecoration: "none", fontSize: 15,
            boxShadow: `0 4px 16px ${B.gold}50`,
          }}>Submit a Project Idea</Link>
        </div>
      </div>

      {/* Detail modal */}
      {proj && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 800, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}>
          <div style={{ background: "#fff", borderRadius: 20, maxWidth: 600, width: "100%", overflow: "hidden", position: "relative" }}>
            <div style={{ height: 8, background: proj.raised >= proj.goal ? B.green : B.blue }} />
            <div style={{ padding: "28px 28px 32px" }}>
              <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 16, right: 16, background: "#F3F4F6", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16, color: B.text }}>✕</button>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[TYPE_COLORS[proj.type]].map(tc => <span key="t" style={{ ...tc, borderRadius: 8, padding: "3px 12px", fontSize: 12, fontWeight: 800 }}>{proj.icon} {proj.type}</span>)}
                <span style={{ background: STATUS_LABELS[proj.status].bg, color: STATUS_LABELS[proj.status].color, borderRadius: 8, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{STATUS_LABELS[proj.status].label}</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>{proj.title}</h2>
              <div style={{ fontSize: 13, color: B.muted, marginBottom: 18 }}>📍 {proj.location}</div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: B.text, marginBottom: 24 }}>{proj.desc}</p>
              {/* Progress — % main, goal $ only at 100% */}
              <div style={{ background: B.bg, borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
                {(() => { const mp = Math.round(proj.raised/proj.goal*100); return (<>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: mp >= 100 ? B.green : B.blue, lineHeight: 1 }}>{mp}%</span>
                    <span style={{ fontSize: 12, color: B.muted }}>{mp >= 100 ? `Goal: $${proj.goal.toLocaleString()} ✓` : "funded"}</span>
                  </div>
                  <ProgressBar pct={mp} color={mp >= 100 ? B.green : B.blue} />
                  <div style={{ marginTop: 8, fontSize: 12, color: B.muted, textAlign: "right" }}>
                    {mp >= 100 ? "🎉 Fully Funded · " : ""} 👥 {proj.beneficiaries.toLocaleString()} beneficiaries
                  </div>
                </>); })()}
              </div>
              {/* Updates */}
              <h4 style={{ fontSize: 13, fontWeight: 800, color: B.navy, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Latest Updates</h4>
              {proj.updates.map(u => (
                <div key={u} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: B.green, fontWeight: 800, flexShrink: 0 }}>✓</span>
                  <span style={{ color: B.text }}>{u}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                <Link to="/donate" onClick={() => setSelected(null)} style={{
                  flex: 1, padding: "13px", background: B.gold, color: "#fff", borderRadius: 12,
                  textDecoration: "none", textAlign: "center", fontWeight: 800, fontSize: 15,
                }}>Fund This Project</Link>
                <button onClick={() => setSelected(null)} style={{
                  padding: "13px 24px", background: B.bg, border: `1px solid ${B.border}`,
                  borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14, color: B.text,
                }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
