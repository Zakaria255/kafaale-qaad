import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { programs as programsApi, projects as projectsApi } from "../api/client.js";
import { useLang } from "../context/LanguageContext.jsx";

const C = {
  navy: "#002651", primary: "#004B96", secondary: "#4B7D19",
  accent: "#E0AB21", danger: "#C0392B", muted: "#5A6E8A",
  bg: "#F4F7FC", border: "#D8E4F0", text: "#0D1F3C", teal: "#0E7490",
};

const PROGRAM_ICONS = {
  child_sponsorship: "👶",
  education: "🎓",
  medical: "🩺",
  family_care: "🏠",
  nutrition: "🍎",
  emergency_relief: "🚨",
};

const PROGRAM_LABELS = {
  child_sponsorship: "Child Sponsorship",
  education: "Education Support",
  medical: "Medical Support",
  family_care: "Family Care",
  nutrition: "Nutrition Program",
  emergency_relief: "Emergency Relief",
};

const PROJECT_ICONS = {
  water: "💧",
  school: "🏫",
  health: "🏥",
  agriculture: "🌱",
  shelter: "🏠",
  energy: "⚡",
};

const StatusBadge = ({ status }) => {
  const map = {
    seeking_sponsor:  { bg: "#FEF3C7", color: "#92400E",  label: "Seeking Sponsor" },
    sponsored:        { bg: "#D1FAE5", color: "#065F46",  label: "✅ Sponsored" },
    verified:         { bg: "#DBEAFE", color: "#1E40AF",  label: "Verified" },
    pending_verification: { bg: "#F3F4F6", color: "#5A6E8A", label: "Pending" },
    seeking_funding:  { bg: "#FEF3C7", color: "#92400E",  label: "Seeking Funding" },
    funded:           { bg: "#D1FAE5", color: "#065F46",  label: "✅ Funded" },
    in_progress:      { bg: "#DBEAFE", color: "#1E40AF",  label: "🔨 In Progress" },
    completed:        { bg: "#F0FDF4", color: "#166534",  label: "🏁 Completed" },
  };
  const s = map[status] || { bg: "#F3F4F6", color: "#5A6E8A", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
};

const BeneficiaryCard = ({ b, onSponsor }) => {
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
      {/* Photo / avatar */}
      <div style={{ background: `linear-gradient(135deg, ${b.program?.color || C.primary} 0%, ${C.secondary} 100%)`, padding: "28px 24px 20px", textAlign: "center", position: "relative" }}>
        {b.publicPhotoUrl ? (
          <img src={b.publicPhotoUrl} alt="Beneficiary" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.5)" }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto", border: "3px solid rgba(255,255,255,0.4)" }}>
            {PROGRAM_ICONS[b.programType] || "👤"}
          </div>
        )}
        <div style={{ marginTop: 10, color: "#fff" }}>
          <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>{b.publicId}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
            {b.publicAge ? `${b.publicAge} years old` : ""} {b.publicGender ? `· ${b.publicGender}` : ""}
          </div>
        </div>
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <StatusBadge status={b.status} />
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "16px 20px", flex: 1 }}>
        {/* Program badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ background: (b.program?.color || C.primary) + "15", color: b.program?.color || C.primary, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            {b.program?.icon || PROGRAM_ICONS[b.programType]} {b.program?.name || PROGRAM_LABELS[b.programType]}
          </span>
        </div>

        {/* Location */}
        {b.publicCity && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            📍 {b.publicCity}{b.publicRegion ? `, ${b.publicRegion}` : ""}
          </div>
        )}

        {/* Needs */}
        {b.publicNeedsDesc && (
          <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 8 }}>{b.publicNeedsDesc}</div>
        )}

        {/* Story */}
        {b.publicStory && (
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 12px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
            {b.publicStory}
          </p>
        )}

        {/* Monthly need */}
        <div style={{ background: C.primary + "08", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 2 }}>MONTHLY SUPPORT NEEDED</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.primary }}>${b.monthlyNeed}/mo</div>
        </div>

        {/* Enrolled date */}
        <div style={{ fontSize: 11, color: C.muted }}>
          Enrolled: {new Date(b.enrolledAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}` }}>
        {b.status === "seeking_sponsor" ? (
          <button onClick={() => onSponsor(b)}
            style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
            ❤️ Sponsor This {b.programType === "child_sponsorship" ? "Child" : b.programType === "family_care" ? "Family" : "Program"}
          </button>
        ) : b.status === "sponsored" ? (
          <div style={{ textAlign: "center", fontSize: 13, color: C.secondary, fontWeight: 700, padding: "8px 0" }}>
            ✅ This beneficiary is currently sponsored
          </div>
        ) : (
          <div style={{ textAlign: "center", fontSize: 13, color: C.muted, padding: "8px 0" }}>
            Awaiting verification
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectCard = ({ p, onContribute }) => {
  const pct = p.fundingGoal > 0 ? Math.min(100, Math.round((p.totalRaised / p.fundingGoal) * 100)) : 0;
  const remaining = Math.max(0, p.fundingGoal - p.totalRaised);

  return (
    <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: `1px solid ${C.border}` }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.teal} 100%)`, padding: "20px 24px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{PROJECT_ICONS[p.category] || "🌍"}</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{p.title}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>📍 {p.location}, {p.region}</div>
          </div>
          <StatusBadge status={p.status} />
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Impact */}
        {p.populationSize && (
          <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#065F46", fontWeight: 700 }}>
            👥 Benefiting {p.populationSize.toLocaleString()} people
          </div>
        )}

        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 14px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {p.description}
        </p>

        {/* Funding progress */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 6 }}>
            <span>Raised: <strong style={{ color: C.secondary }}>${p.totalRaised.toLocaleString()}</strong></span>
            <span>Goal: <strong>${p.fundingGoal.toLocaleString()}</strong></span>
          </div>
          <div style={{ background: C.border, borderRadius: 20, height: 8, overflow: "hidden" }}>
            <div style={{ background: pct >= 100 ? C.secondary : C.primary, width: `${pct}%`, height: "100%", borderRadius: 20, transition: "width 0.6s" }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: C.muted }}>
            {pct}% funded {remaining > 0 && `· $${remaining.toLocaleString()} remaining`}
          </div>
        </div>

        {/* Category tag */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, background: "#CFFAFE", borderRadius: 20, display: "inline-block", padding: "3px 10px", marginBottom: 12 }}>
          {PROJECT_ICONS[p.category]} {p.category.charAt(0).toUpperCase() + p.category.slice(1)}
        </div>
      </div>

      <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}` }}>
        {["seeking_funding","funded"].includes(p.status) && (
          <button onClick={() => onContribute(p)}
            style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
            💧 Fund This Project
          </button>
        )}
        {p.status === "in_progress" && (
          <div style={{ textAlign: "center", fontSize: 13, color: C.teal, fontWeight: 700, padding: "8px 0" }}>
            🔨 Project is underway
          </div>
        )}
        {p.status === "completed" && (
          <div style={{ textAlign: "center", fontSize: 13, color: C.secondary, fontWeight: 700, padding: "8px 0" }}>
            🏁 Project Completed — Thank you!
          </div>
        )}
      </div>
    </div>
  );
};

const SponsorBeneficiaryModal = ({ beneficiary, onClose, onDone }) => {
  const [type, setType] = useState("full");
  const [amount, setAmount] = useState(String(beneficiary.monthlyNeed || 25));
  const [method, setMethod] = useState("bank_transfer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const TYPES = [
    { value: "full",      label: "Full Sponsor", desc: "You cover all needs" },
    { value: "education", label: "Education",    desc: "School fees & supplies" },
    { value: "medical",   label: "Medical Care", desc: "Health & treatments" },
    { value: "food",      label: "Food Support", desc: "Daily nutrition" },
    { value: "clothing",  label: "Clothing",     desc: "Uniforms & clothes" },
    { value: "custom",    label: "Custom",       desc: "Set your own amount" },
  ];

  const PRESETS = [10, 20, 50, beneficiary.monthlyNeed].filter((v,i,a) => a.indexOf(v) === i && v > 0).sort((a,b) => a-b);

  const handleSubmit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt < 5) return setError("Minimum $5/month");
    setLoading(true);
    try {
      await programsApi.createSponsorship({ beneficiaryId: beneficiary.id, type, monthlyAmount: amt, paymentMethod: method });
      setDone(true);
      onDone && onDone();
    } catch (e) {
      setError(e.message || "Failed to create sponsorship");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 440, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h3 style={{ margin: "0 0 12px", color: C.secondary }}>Sponsorship Created!</h3>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
          Your monthly sponsorship of <strong>${parseFloat(amount)}/month</strong> has been set up.
          Our admin team will contact you to confirm your first payment. You'll receive monthly progress updates!
        </p>
        <button onClick={onClose} style={{ marginTop: 20, padding: "12px 32px", background: C.secondary, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
          Close ✓
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>❤️ Sponsor a Future</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* Beneficiary summary */}
        <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, borderRadius: 14, padding: 16, color: "#fff", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{beneficiary.publicId}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {PROGRAM_ICONS[beneficiary.programType]} {PROGRAM_LABELS[beneficiary.programType]}
            {beneficiary.publicCity ? ` · ${beneficiary.publicCity}` : ""}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>{beneficiary.publicNeedsDesc}</div>
          <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800 }}>${beneficiary.monthlyNeed}/month needed</div>
        </div>

        {/* Sponsorship type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Sponsorship Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                style={{ padding: "10px 8px", borderRadius: 10, border: `2px solid ${type === t.value ? C.primary : C.border}`, background: type === t.value ? C.primary + "10" : "#fff", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: type === t.value ? C.primary : C.text }}>{t.label}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount presets */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Monthly Amount (USD)</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <button key={p} onClick={() => setAmount(String(p))}
                style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${amount === String(p) ? C.primary : C.border}`, background: amount === String(p) ? C.primary + "10" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: amount === String(p) ? C.primary : C.text }}>
                ${p}/mo
              </button>
            ))}
          </div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="5"
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
            placeholder="Custom amount" />
        </div>

        {/* Payment method */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Payment Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, background: "#fff", boxSizing: "border-box" }}>
            <option value="mobile_money">📱 Mobile Money (EVC / Zaad / Sahal)</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="card">💳 Debit / Credit Card</option>
          </select>
        </div>

        {/* Info */}
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: C.primary }}>
          <strong>What happens next:</strong> Admin confirms your pledge → Monthly aid is delivered → You receive a progress update every month with photos and reports.
        </div>

        {error && <div style={{ background: "#FEF2F2", color: C.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "#F3F4F6", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.muted }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex: 2, padding: "12px", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
            {loading ? "Processing…" : `❤️ Sponsor $${parseFloat(amount || 0)}/month`}
          </button>
        </div>
      </div>
    </div>
  );
};

const ContributeModal = ({ project, onClose, onDone }) => {
  const remaining = Math.max(0, project.fundingGoal - project.totalRaised);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const PRESETS = [100, 500, 1000, Math.min(remaining, 5000)].filter((v,i,a) => v > 0 && a.indexOf(v) === i).sort((a,b) => a-b);

  const handleSubmit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt < 5) return setError("Minimum $5");
    setLoading(true);
    try {
      await projectsApi.contribute(project.id, { amount: amt, type: amt >= remaining ? "full" : "partial" });
      setDone(true);
      onDone && onDone();
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 440, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h3 style={{ margin: "0 0 12px", color: C.secondary }}>Thank You!</h3>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>Your contribution of <strong>${parseFloat(amount)}</strong> to <strong>{project.title}</strong> has been received. You'll be notified as the project progresses.</p>
        <button onClick={onClose} style={{ marginTop: 20, padding: "12px 32px", background: C.secondary, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Close ✓</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{PROJECT_ICONS[project.category]} Fund This Project</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`, borderRadius: 14, padding: 16, color: "#fff", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{project.title}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>📍 {project.location} · {project.populationSize ? `${project.populationSize.toLocaleString()} people` : ""}</div>
          <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700 }}>${remaining.toLocaleString()} still needed</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Contribution Amount (USD)</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <button key={p} onClick={() => setAmount(String(p))}
                style={{ padding: "8px 14px", borderRadius: 20, border: `2px solid ${amount === String(p) ? C.teal : C.border}`, background: amount === String(p) ? C.teal + "15" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: amount === String(p) ? C.teal : C.text }}>
                ${p.toLocaleString()}
              </button>
            ))}
          </div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="5"
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
            placeholder="Enter custom amount" />
        </div>

        {error && <div style={{ background: "#FEF2F2", color: C.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "#F3F4F6", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.muted }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !amount}
            style={{ flex: 2, padding: "12px", background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
            {loading ? "Processing…" : `💧 Contribute $${parseFloat(amount || 0).toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Programs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("programs");
  const [programsList, setProgramsList] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sponsorTarget, setSponsorTarget] = useState(null);
  const [contributeTarget, setContributeTarget] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    Promise.all([
      programsApi.list().catch(() => []),
      programsApi.stats().catch(() => ({})),
      programsApi.beneficiaries({ status: "seeking_sponsor", limit: "20" }).catch(() => ({ beneficiaries: [] })),
      projectsApi.list({ limit: "20" }).catch(() => ({ projects: [] })),
    ]).then(([progs, st, bens, projs]) => {
      setProgramsList(Array.isArray(progs) ? progs : []);
      setStats(st);
      setBeneficiaries(bens.beneficiaries || []);
      setProjectsList(projs.projects || []);
    }).finally(() => setLoading(false));
  }, []);

  const filteredBeneficiaries = filterType ? beneficiaries.filter(b => b.programType === filterType) : beneficiaries;
  const filteredProjects = filterCat ? projectsList.filter(p => p.category === filterCat) : projectsList;

  const PROGRAM_TYPE_FILTERS = [
    { value: "", label: "All Programs" },
    { value: "child_sponsorship", label: "👶 Child Sponsorship" },
    { value: "education", label: "🎓 Education" },
    { value: "medical", label: "🩺 Medical" },
    { value: "family_care", label: "🏠 Family Care" },
  ];

  const PROJECT_CAT_FILTERS = [
    { value: "", label: "All Categories" },
    { value: "water", label: "💧 Water" },
    { value: "school", label: "🏫 Education" },
    { value: "health", label: "🏥 Health" },
    { value: "agriculture", label: "🌱 Agriculture" },
    { value: "shelter", label: "🏠 Shelter" },
    { value: "energy", label: "⚡ Energy" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
        <div style={{ color: C.muted, fontSize: 14 }}>Loading programs…</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Hero */}
      <div style={{ background: `linear-gradient(145deg, ${C.navy} 0%, ${C.primary} 55%, ${C.secondary} 100%)`, color: "#fff", padding: isMobile ? "60px 20px 48px" : "90px 32px 72px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 100, padding: "6px 18px", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block" }} />
          Humanitarian Programs
        </div>
        <h1 style={{ fontSize: isMobile ? 28 : 44, fontWeight: 900, margin: "0 0 16px", letterSpacing: -0.5 }}>
          🌱 Sponsor a Future
        </h1>
        <p style={{ fontSize: isMobile ? 14 : 17, opacity: 0.85, maxWidth: 600, margin: "0 auto 28px", lineHeight: 1.7 }}>
          Long-term humanitarian support for children, families, and communities. Monthly sponsorships create lasting change.
        </p>

        {/* Stats row */}
        {stats && (
          <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 20 : 40, flexWrap: "wrap", marginTop: 24 }}>
            {[
              { val: stats.totalBeneficiaries || 0, label: "Beneficiaries Enrolled" },
              { val: stats.activeSponsorships || 0, label: "Active Sponsorships" },
              { val: stats.totalProjects || 0, label: "Community Projects" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900 }}>{s.val.toLocaleString()}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation back */}
        <div style={{ marginTop: 24 }}>
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4, overflowX: "auto" }}>
          {[
            { id: "programs",     label: "🌱 Programs" },
            { id: "sponsor",      label: `👶 Sponsor a Child/Family (${filteredBeneficiaries.length})` },
            { id: "projects",     label: `🏗️ Community Projects (${filteredProjects.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding: "16px 20px", fontSize: 13, fontWeight: 700, border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap",
                color: activeTab === t.id ? C.primary : C.muted,
                borderBottom: activeTab === t.id ? `3px solid ${C.primary}` : "3px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>

        {/* ── Programs Overview ── */}
        {activeTab === "programs" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, margin: "0 0 12px" }}>Our Humanitarian Programs</h2>
              <p style={{ color: C.muted, fontSize: 14, maxWidth: 600, margin: "0 auto" }}>
                Unlike emergency cases that close after delivery, our programs provide continuous long-term support — creating real, lasting change.
              </p>
            </div>

            {/* Two Engines explanation */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, marginBottom: 40 }}>
              <div style={{ background: "#FEF2F2", borderRadius: 18, padding: 24, border: "1px solid #FECACA" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🚨</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.danger, marginBottom: 8 }}>Emergency Response</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 16px" }}>
                  One-time emergency cases: Report → Verify → Sponsor → Deliver → Close
                </p>
                <button onClick={() => navigate("/cases")} style={{ padding: "9px 18px", background: C.danger, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  View Emergency Cases →
                </button>
              </div>
              <div style={{ background: "#F0FDF4", borderRadius: 18, padding: 24, border: "1px solid #BBF7D0" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.secondary, marginBottom: 8 }}>Long-Term Programs</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 16px" }}>
                  Continuous care: Enroll → Verify → Match Sponsor → Monthly Updates → Graduation
                </p>
                <button onClick={() => setActiveTab("sponsor")} style={{ padding: "9px 18px", background: C.secondary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  Sponsor a Future →
                </button>
              </div>
            </div>

            {/* Program cards */}
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Active Programs</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 20, marginBottom: 48 }}>
              {programsList.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: C.muted }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
                  <div>Programs coming soon. Check back!</div>
                </div>
              )}
              {programsList.map(p => (
                <div key={p.id} style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: `1px solid ${C.border}`, borderLeft: `4px solid ${p.color || C.primary}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ fontSize: 36 }}>{p.icon || PROGRAM_ICONS[p.type]}</div>
                    <span style={{ background: (p.color || C.primary) + "15", color: p.color || C.primary, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>
                      {(p._count?.beneficiaries || 0)} enrolled
                    </span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{p.name}</div>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 16px" }}>{p.description}</p>
                  <button onClick={() => { setFilterType(p.type); setActiveTab("sponsor"); }}
                    style={{ width: "100%", padding: "10px", background: p.color || C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    See Beneficiaries →
                  </button>
                </div>
              ))}
            </div>

            {/* What sponsors see */}
            <div style={{ background: C.navy, borderRadius: 20, padding: isMobile ? 24 : 40, color: "#fff", marginBottom: 40 }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>📊 The Sponsor Journey</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                {[
                  { icon: "❤️", step: "Choose", desc: "Select a child, family, or program to sponsor" },
                  { icon: "💳", step: "Commit", desc: "Set a monthly amount from $10 to full sponsorship" },
                  { icon: "📸", step: "Receive Updates", desc: "Monthly photos, school attendance & progress reports" },
                  { icon: "🏆", step: "See Impact", desc: "Watch your child graduate, recover, or thrive" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>{s.step}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Sponsor Tab ── */}
        {activeTab === "sponsor" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>👶 Beneficiaries Seeking Sponsors</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PROGRAM_TYPE_FILTERS.map(f => (
                  <button key={f.value} onClick={() => setFilterType(f.value)}
                    style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filterType === f.value ? C.primary : C.border}`, background: filterType === f.value ? C.primary : "#fff", color: filterType === f.value ? "#fff" : C.muted, cursor: "pointer" }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredBeneficiaries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", color: C.muted }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👶</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No beneficiaries available yet</div>
                <div style={{ fontSize: 14 }}>Our team is enrolling new beneficiaries. Check back soon!</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 20 }}>
                {filteredBeneficiaries.map(b => (
                  <BeneficiaryCard key={b.id} b={b} onSponsor={setSponsorTarget} />
                ))}
              </div>
            )}

            {/* Program sponsorship option */}
            <div style={{ marginTop: 48, background: `linear-gradient(135deg, ${C.primary}10, ${C.secondary}10)`, borderRadius: 20, padding: 32, border: `1px solid ${C.primary}30` }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px" }}>🌍 Prefer to Support a Program?</h3>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
                Not ready to commit to one child? Sponsor an entire program. Your contribution is distributed across all eligible beneficiaries in that program.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 12 }}>
                {programsList.map(p => (
                  <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{p.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p._count?.beneficiaries || 0} beneficiaries</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Community Projects Tab ── */}
        {activeTab === "projects" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🏗️ Community Projects</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PROJECT_CAT_FILTERS.map(f => (
                  <button key={f.value} onClick={() => setFilterCat(f.value)}
                    style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filterCat === f.value ? C.teal : C.border}`, background: filterCat === f.value ? C.teal : "#fff", color: filterCat === f.value ? "#fff" : C.muted, cursor: "pointer" }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", color: C.muted }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No projects yet</div>
                <div style={{ fontSize: 14 }}>Community projects are being assessed. Check back soon!</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 20 }}>
                {filteredProjects.map(p => (
                  <ProjectCard key={p.id} p={p} onContribute={setContributeTarget} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sponsor modal */}
      {sponsorTarget && (
        <SponsorBeneficiaryModal
          beneficiary={sponsorTarget}
          onClose={() => setSponsorTarget(null)}
          onDone={() => {
            setSponsorTarget(null);
            programsApi.beneficiaries({ status: "seeking_sponsor", limit: "20" }).then(r => setBeneficiaries(r.beneficiaries || []));
          }}
        />
      )}

      {/* Contribute modal */}
      {contributeTarget && (
        <ContributeModal
          project={contributeTarget}
          onClose={() => setContributeTarget(null)}
          onDone={() => {
            setContributeTarget(null);
            projectsApi.list({ limit: "20" }).then(r => setProjectsList(r.projects || []));
          }}
        />
      )}
    </div>
  );
}
