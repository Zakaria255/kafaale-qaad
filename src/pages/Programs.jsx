import { useState, useEffect } from "react";
import FixedSelect from "../components/FixedSelect.jsx";
import { useNavigate } from "react-router-dom";
import { programs as programsApi, projects as projectsApi } from "../api/client.js";
import { useLang } from "../context/LanguageContext.jsx";
import ContractModal from "../components/ContractModal.jsx";
import { getCat } from "../utils/categories.js";

const C = {
  navy: "#002651", primary: "#004B96", secondary: "#4B7D19",
  accent: "#E0AB21", danger: "#C0392B", muted: "#5A6E8A",
  bg: "#F4F7FC", border: "#D8E4F0", text: "#0D1F3C", teal: "#0E7490",
};

const PROGRAM_LABELS = {
  child_sponsorship: "Child Sponsorship",
  education: "Education Support",
  medical: "Medical Support",
  family_care: "Family Care",
  nutrition: "Nutrition Program",
  emergency_relief: "Emergency Relief",
};


const StatusBadge = ({ status }) => {
  const map = {
    seeking_sponsor:  { bg: "#FEF3C7", color: "#92400E",  label: "Seeking Sponsor" },
    sponsored:        { bg: "#D1FAE5", color: "#065F46",  label: "Under Sponsor" },
    under_sponsor:    { bg: "#D1FAE5", color: "#065F46",  label: "Under Sponsor" },
    verified:         { bg: "#DBEAFE", color: "#1E40AF",  label: "Verified" },
    pending_verification: { bg: "#F3F4F6", color: "#5A6E8A", label: "Pending" },
    seeking_funding:  { bg: "#FEF3C7", color: "#92400E",  label: "Seeking Funding" },
    funded:           { bg: "#D1FAE5", color: "#065F46",  label: "Funded" },
    in_progress:      { bg: "#DBEAFE", color: "#1E40AF",  label: "In Progress" },
    completed:        { bg: "#F0FDF4", color: "#166534",  label: "Completed" },
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
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 auto", border: "3px solid rgba(255,255,255,0.4)" }}>
            {(b.publicId || "?")[0].toUpperCase()}
          </div>
        )}
        <div style={{ marginTop: 10, color: "#fff" }}>
          {b._localName && <div style={{ fontSize: 15, fontWeight: 900 }}>{b._localName}</div>}
          <div style={{ fontSize: 13, fontWeight: 800, opacity: b._localName ? 0.7 : 0.9 }}>{b.publicId}</div>
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
            {b.program?.name || PROGRAM_LABELS[b.programType]}
          </span>
        </div>

        {/* Location */}
        {b.publicCity && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            {b.publicCity}{b.publicRegion ? `, ${b.publicRegion}` : ""}
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
            Sponsor This {b.programType === "child_sponsorship" ? "Child" : b.programType === "family_care" ? "Family" : "Program"}
          </button>
        ) : (b.status === "under_sponsor" || b.status === "sponsored") ? (
          <div style={{ textAlign: "center", fontSize: 13, color: "#065F46", fontWeight: 700, padding: "8px 0", background: "#ECFDF5", borderRadius: 8 }}>
            This beneficiary is under sponsorship
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
            <div style={{ fontSize: 16, fontWeight: 800 }}>{p.title}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>{p.location}, {p.region}</div>
          </div>
          <StatusBadge status={p.status} />
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Impact */}
        {p.populationSize && (
          <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#065F46", fontWeight: 700 }}>
            Benefiting {p.populationSize.toLocaleString()} people
          </div>
        )}

        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 14px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {p.description}
        </p>

        {/* Funding progress */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: pct >= 100 ? C.secondary : C.primary }}>
              {pct}% <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>funded</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Goal: ${p.fundingGoal.toLocaleString()}</span>
          </div>
          <div style={{ background: C.border, borderRadius: 20, height: 8, overflow: "hidden" }}>
            <div style={{ background: pct >= 100 ? C.secondary : C.primary, width: `${pct}%`, height: "100%", borderRadius: 20, transition: "width 0.6s" }} />
          </div>
        </div>

        {/* Category tag */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, background: "#CFFAFE", borderRadius: 20, display: "inline-block", padding: "3px 10px", marginBottom: 12 }}>
          {p.category.charAt(0).toUpperCase() + p.category.slice(1)}
        </div>
      </div>

      <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}` }}>
        {["seeking_funding","funded"].includes(p.status) && (
          <button onClick={() => onContribute(p)}
            style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
            Fund This Project
          </button>
        )}
        {p.status === "in_progress" && (
          <div style={{ textAlign: "center", fontSize: 13, color: C.teal, fontWeight: 700, padding: "8px 0" }}>
            Project is underway
          </div>
        )}
        {p.status === "completed" && (
          <div style={{ textAlign: "center", fontSize: 13, color: C.secondary, fontWeight: 700, padding: "8px 0" }}>
            Project Completed — Thank you!
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
  const [commitmentMonths, setCommitmentMonths] = useState("12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");

  const TYPES = getCat("sponsorTypes");

  const PRESETS = [10, 20, 50, beneficiary.monthlyNeed].filter((v,i,a) => a.indexOf(v) === i && v > 0).sort((a,b) => a-b);

  const handleSubmit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt < 5) return setError("Minimum $5/month");
    setLoading(true);
    try {
      const months = Math.max(1, parseInt(commitmentMonths) || 1);
      await programsApi.createSponsorship({ beneficiaryId: beneficiary.id, type, monthlyAmount: amt, paymentMethod: method, commitmentMonths: months });
      onDone && onDone();
      setDone(true);
    } catch (e) {
      setError(e.message || "Failed to create sponsorship");
    } finally {
      setLoading(false);
    }
  };

  if (done && showContract) return (
    <ContractModal
      type="child_sponsorship"
      data={{
        sponsorName, sponsorEmail,
        beneficiaryId: beneficiary.publicId || beneficiary.id,
        programType: beneficiary.programType,
        location: beneficiary.publicCity,
        amount: parseFloat(amount),
        months: parseInt(commitmentMonths) || 12,
        paymentMethod: method,
      }}
      onClose={onClose}
      onAccept={() => {}}
    />
  );

  if (done) return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 440, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h3 style={{ margin: "0 0 12px", color: C.secondary }}>Sponsorship Created!</h3>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Your monthly sponsorship of <strong>${parseFloat(amount)}/month</strong> for <strong>{parseInt(commitmentMonths)} months</strong> has been set up.
        </p>
        {parseInt(commitmentMonths) >= 12 && (
          <div style={{ background: "#EFF6FF", border: `1px solid ${C.primary}30`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 6 }}>12-Month Commitment Detected</div>
            <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>Please provide your details to generate a formal sponsorship contract.</p>
            <input value={sponsorName} onChange={e => setSponsorName(e.target.value)} placeholder="Your full name *"
              style={{ width: "100%", marginTop: 10, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, boxSizing: "border-box" }} />
            <input value={sponsorEmail} onChange={e => setSponsorEmail(e.target.value)} placeholder="Your email address *"
              style={{ width: "100%", marginTop: 8, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, boxSizing: "border-box" }} />
            <button onClick={() => setShowContract(true)} disabled={!sponsorName.trim() || !sponsorEmail.trim()}
              style={{ width: "100%", marginTop: 12, padding: "11px", background: !sponsorName.trim() || !sponsorEmail.trim() ? "#E5E7EB" : C.primary, color: !sponsorName.trim() || !sponsorEmail.trim() ? C.muted : "#fff", border: "none", borderRadius: 9, cursor: !sponsorName.trim() || !sponsorEmail.trim() ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800 }}>
              View & Sign Contract →
            </button>
          </div>
        )}
        <button onClick={onClose} style={{ padding: "12px 32px", background: parseInt(commitmentMonths) >= 12 ? "#F3F4F6" : C.secondary, color: parseInt(commitmentMonths) >= 12 ? C.muted : "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
          {parseInt(commitmentMonths) >= 12 ? "Skip for now" : "Close ✓"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Sponsor a Future</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* Beneficiary summary */}
        <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, borderRadius: 14, padding: 16, color: "#fff", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{beneficiary.publicId}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {PROGRAM_LABELS[beneficiary.programType]}
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
          <FixedSelect value={method} onChange={e => setMethod(e.target.value)} style={{ width:"100%", borderRadius:10, fontSize:14 }}>
            <option value="mobile_money">Mobile Money (EVC / Zaad / Sahal)</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Debit / Credit Card</option>
          </FixedSelect>
        </div>

        {/* Commitment length */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Commitment Length (months)</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[6, 12, 24].map(m => (
              <button key={m} onClick={() => setCommitmentMonths(String(m))}
                style={{ flex: 1, padding: "9px 4px", borderRadius: 10, border: `2px solid ${commitmentMonths === String(m) ? C.primary : C.border}`, background: commitmentMonths === String(m) ? C.primary + "10" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: commitmentMonths === String(m) ? C.primary : C.text }}>
                {m} months
              </button>
            ))}
          </div>
          <input type="number" value={commitmentMonths} onChange={e => setCommitmentMonths(e.target.value)} min="1" max="120"
            style={{ width: "100%", padding: "9px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, boxSizing: "border-box" }} />
          {parseInt(commitmentMonths) >= 12 ? (
            <div style={{ marginTop: 8, background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#065F46" }}>
              <strong>12+ months:</strong> This child will be listed as <strong>Under Sponsor</strong> — their profile moves from "Seeking Sponsor" once confirmed.
            </div>
          ) : (
            <div style={{ marginTop: 8, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400E" }}>
              <strong>Under 12 months:</strong> Child stays in "Seeking Sponsor" until a full 12-month contract is reached.
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: C.primary }}>
          <strong>What happens next:</strong> Admin confirms your pledge → Monthly aid is delivered → You receive a progress update every month with photos and reports.
        </div>

        {error && <div style={{ background: "#FEF2F2", color: C.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "#F3F4F6", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.muted }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex: 2, padding: "12px", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
            {loading ? "Processing…" : `Sponsor $${parseFloat(amount || 0)}/month`}
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
  const [showContract, setShowContract] = useState(false);
  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");

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

  const isFullFunding = parseFloat(amount) >= remaining;

  if (done && showContract) return (
    <ContractModal
      type="project_funding"
      data={{
        contributorName, contributorEmail,
        projectTitle: project.title,
        location: project.location,
        populationSize: project.populationSize,
        amount: parseFloat(amount),
        isFullFunding,
      }}
      onClose={onClose}
      onAccept={() => {}}
    />
  );

  if (done) return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 440, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
        <h3 style={{ margin: "0 0 12px", color: C.secondary }}>Thank You!</h3>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Your contribution of <strong>${parseFloat(amount).toLocaleString()}</strong> to <strong>{project.title}</strong> has been received.
        </p>
        <div style={{ background: "#EFF6FF", border: `1px solid ${C.primary}30`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 6 }}>
            {isFullFunding ? "Full Project Funding — Contract Required" : "Generate Contribution Agreement"}
          </div>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>A formal agreement documents your commitment and is required for tax receipts.</p>
          <input value={contributorName} onChange={e => setContributorName(e.target.value)} placeholder="Your full name *"
            style={{ width: "100%", marginTop: 10, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, boxSizing: "border-box" }} />
          <input value={contributorEmail} onChange={e => setContributorEmail(e.target.value)} placeholder="Your email address *"
            style={{ width: "100%", marginTop: 8, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, boxSizing: "border-box" }} />
          <button onClick={() => setShowContract(true)} disabled={!contributorName.trim() || !contributorEmail.trim()}
            style={{ width: "100%", marginTop: 12, padding: "11px", background: !contributorName.trim() || !contributorEmail.trim() ? "#E5E7EB" : C.primary, color: !contributorName.trim() || !contributorEmail.trim() ? C.muted : "#fff", border: "none", borderRadius: 9, cursor: !contributorName.trim() || !contributorEmail.trim() ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800 }}>
            View & Sign Agreement →
          </button>
        </div>
        <button onClick={onClose} style={{ padding: "12px 32px", background: "#F3F4F6", color: C.muted, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Skip for now</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Fund This Project</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`, borderRadius: 14, padding: 16, color: "#fff", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{project.title}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{project.location}{project.populationSize ? ` · ${project.populationSize.toLocaleString()} people` : ""}</div>
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

        {error && <div style={{ background: "#FEF2F2", color: C.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "#F3F4F6", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.muted }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !amount}
            style={{ flex: 2, padding: "12px", background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
            {loading ? "Processing…" : `Contribute $${parseFloat(amount || 0).toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const CHILDREN_KEY = "kf_registered_children";
function loadRegisteredChildren() {
  try { return JSON.parse(localStorage.getItem(CHILDREN_KEY) || "[]"); } catch { return []; }
}

export default function Programs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("programs");
  const [programsList, setProgramsList] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [registeredChildren, setRegisteredChildren] = useState(loadRegisteredChildren);
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
    const sync = () => setRegisteredChildren(loadRegisteredChildren());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    Promise.all([
      programsApi.list().catch(() => []),
      programsApi.stats().catch(() => ({})),
      programsApi.beneficiaries({ limit: "100" }).catch(() => ({ beneficiaries: [] })),
      projectsApi.list({ limit: "20" }).catch(() => ({ projects: [] })),
    ]).then(([progs, st, bens, projs]) => {
      setProgramsList(Array.isArray(progs) ? progs : []);
      setStats(st);
      setBeneficiaries(bens.beneficiaries || []);
      setProjectsList(projs.projects || []);
    }).finally(() => setLoading(false));
  }, []);

  // Merge API beneficiaries with locally registered children
  const allBeneficiaries = [
    ...registeredChildren.map(ch => ({
      id: ch.id, publicId: ch.publicId,
      publicAge: ch.age, publicGender: ch.gender,
      programType: ch.programType || "child_sponsorship",
      publicCity: ch.publicCity, publicRegion: ch.publicRegion,
      publicNeedsDesc: ch.publicNeedsDesc, publicStory: ch.publicStory,
      publicPhotoUrl: ch.publicPhotoUrl, monthlyNeed: parseFloat(ch.monthlyNeed) || 30,
      status: ch.status || "seeking_sponsor",
      enrolledAt: ch.enrolledAt || new Date().toISOString(),
      _localName: `${ch.firstName} ${ch.lastName}`.trim(),
    })),
    ...beneficiaries,
  ];

  const filteredBeneficiaries = filterType ? allBeneficiaries.filter(b => b.programType === filterType) : allBeneficiaries;
  const filteredProjects = filterCat ? projectsList.filter(p => p.category === filterCat) : projectsList;

  const PROGRAM_TYPE_FILTERS = [{ value: "", label: "All Programs" }, ...getCat("programTypes")];

  const PROJECT_CAT_FILTERS = [{ value: "", label: "All Categories" }, ...getCat("projectCats")];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: C.muted, fontSize: 14 }}>Loading programs…</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Hero */}
      <div style={{ backgroundImage: `url('/programs-hero.png')`, backgroundSize: "cover", backgroundPosition: "center", position: "relative", color: "#fff", padding: isMobile ? "60px 20px 48px" : "90px 32px 72px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,20,60,0.62)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 100, padding: "6px 18px", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block" }} />
          Humanitarian Programs
        </div>
        <h1 style={{ fontSize: isMobile ? 28 : 44, fontWeight: 900, margin: "0 0 16px", letterSpacing: -0.5 }}>
          Sponsor a Future
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
        </div>

      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "center", gap: 4, overflowX: "auto" }}>
          {[
            { id: "programs",     label: "Programs" },
            { id: "sponsor",      label: `Sponsor a Child/Family (${filteredBeneficiaries.length})` },
            { id: "projects",     label: `Community Projects (${filteredProjects.length})` },
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
              <div style={{ background: "#FEF2F2", borderRadius: 18, padding: 24, border: "1px solid #FECACA", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.danger, marginBottom: 8 }}>Emergency Response</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 16px" }}>
                  One-time emergency cases: Report → Verify → Sponsor → Deliver → Close
                </p>
                <button onClick={() => navigate("/cases")} style={{ padding: "9px 18px", background: C.danger, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  View Emergency Cases →
                </button>
              </div>
              <div style={{ background: "#F0FDF4", borderRadius: 18, padding: 24, border: "1px solid #BBF7D0", textAlign: "center" }}>
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
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, textAlign: "center" }}>Active Programs</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 20, marginBottom: 48 }}>
              {programsList.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: C.muted }}>
                  <div>Programs coming soon. Check back!</div>
                </div>
              )}
              {programsList.map(p => (
                <div key={p.id} style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: `1px solid ${C.border}`, borderLeft: `4px solid ${p.color || C.primary}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
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
            <div style={{ background: C.navy, borderRadius: 20, padding: isMobile ? 24 : 40, color: "#fff", marginBottom: 40, textAlign: "center" }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>The Sponsor Journey</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                {[
                  { step: "Choose", desc: "Select a child, family, or program to sponsor" },
                  { step: "Commit", desc: "Set a monthly amount from $10 to full sponsorship" },
                  { step: "Receive Updates", desc: "Monthly photos, school attendance & progress reports" },
                  { step: "See Impact", desc: "Watch your child graduate, recover, or thrive" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
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
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>Beneficiaries</h2>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {PROGRAM_TYPE_FILTERS.map(f => (
                  <button key={f.value} onClick={() => setFilterType(f.value)}
                    style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filterType === f.value ? C.primary : C.border}`, background: filterType === f.value ? C.primary : "#fff", color: filterType === f.value ? "#fff" : C.muted, cursor: "pointer" }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Seeking Sponsor section ── */}
            {(() => {
              const seeking = filteredBeneficiaries.filter(b => b.status === "seeking_sponsor");
              return (
                <div style={{ marginBottom: 48 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>Seeking a Sponsor</span>
                    <span style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{seeking.length} available</span>
                  </div>
                  {seeking.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 24px", color: C.muted, background: "#FFFBEB", borderRadius: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>All beneficiaries are currently sponsored!</div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>Check back to support new arrivals.</div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 20 }}>
                      {seeking.map(b => <BeneficiaryCard key={b.id} b={b} onSponsor={setSponsorTarget} />)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Under Sponsor section ── */}
            {(() => {
              const underSponsor = filteredBeneficiaries.filter(b => b.status === "under_sponsor" || b.status === "sponsored");
              if (underSponsor.length === 0) return null;
              return (
                <div style={{ marginBottom: 48 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>Under Sponsorship</span>
                    <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{underSponsor.length} supported</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                    These beneficiaries are currently under active sponsorship. Your support can help more children join this group.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 20 }}>
                    {underSponsor.map(b => <BeneficiaryCard key={b.id} b={b} onSponsor={setSponsorTarget} />)}
                  </div>
                </div>
              );
            })()}

            {filteredBeneficiaries.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px", color: C.muted }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No beneficiaries available yet</div>
                <div style={{ fontSize: 14 }}>Our team is enrolling new beneficiaries. Check back soon!</div>
              </div>
            )}

            {/* Program sponsorship option */}
            <div style={{ marginTop: 48, background: `linear-gradient(135deg, ${C.primary}10, ${C.secondary}10)`, borderRadius: 20, padding: 32, border: `1px solid ${C.primary}30` }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", textAlign: "center" }}>Prefer to Support a Program?</h3>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px", textAlign: "center" }}>
                Not ready to commit to one child? Sponsor an entire program. Your contribution is distributed across all eligible beneficiaries in that program.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 12 }}>
                {programsList.map(p => (
                  <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, textAlign: "center" }}>
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
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>Community Projects</h2>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
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
            programsApi.beneficiaries({ limit: "100" }).then(r => setBeneficiaries(r.beneficiaries || []));
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
