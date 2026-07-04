import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useLang } from "./context/LanguageContext.jsx";
import { auth as authApi, cases as casesApi, admin as adminApi, field as fieldApi, notifications as notifsApi, donations, impact, programs as programsApi, projects as projectsApi, settings as settingsApi, notes as notesApi } from "./api/client.js";
import Logo from "./components/Logo.jsx";
import CategoryManager from "./components/CategoryManager.jsx";
import { CAT_GROUPS, getCat } from "./utils/categories.js";
import { openPrintWindow } from "./utils/printDoc.js";
import "./responsive.css";

// ─── Responsive hook ──────────────────────────────────────────────────────────
const useIsMobile = (bp = 600) => {
  const [mob, setMob] = useState(() => window.innerWidth <= bp);
  useEffect(() => {
    const h = () => setMob(window.innerWidth <= bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return mob;
};
const useIsTablet = () => useIsMobile(900);

// ─── Color Palette & Globals ───────────────────────────────────────────────
const COLORS = {
  navy:      "#002651",
  primary:   "#004B96",
  blue:      "#004B96",
  secondary: "#4B7D19",
  green:     "#4B7D19",
  accent:    "#E0AB21",
  gold:      "#E0AB21",
  danger:    "#C0392B",
  purple:    "#6B21A8",
  teal:      "#0E7490",
  bg:        "#F4F7FC",
  card:      "#FFFFFF",
  text:      "#0D1F3C",
  muted:     "#5A6E8A",
  border:    "#D8E4F0",
  darkBg:    "#001A40",
  darkCard:  "#00244F",
};

const STATUS_MAP = {
  "Pending Verification": { color: "#F59E0B", bg: "#FEF3C7", icon: "⏳" },
  "Under Review":         { color: "#3B82F6", bg: "#DBEAFE", icon: "🔍" },
  "Investigating":        { color: "#8B5CF6", bg: "#EDE9FE", icon: "🕵️" },
  "Awaiting Approval":    { color: "#EC4899", bg: "#FCE7F3", icon: "📋" },
  "Verified":             { color: "#10B981", bg: "#D1FAE5", icon: "✅" },
  "Waiting Sponsor":      { color: "#F59E0B", bg: "#FEF3C7", icon: "🤝" },
  "Sponsored":            { color: "#EF4444", bg: "#FEE2E2", icon: "❤️" },
  "Aid Delivered":        { color: "#06B6D4", bg: "#CFFAFE", icon: "📦" },
  "Delivering":           { color: "#0891B2", bg: "#CFFAFE", icon: "🚚" },
  "Proof Submitted":      { color: "#10B981", bg: "#D1FAE5", icon: "📤" },
  "Completed":            { color: "#5A6E8A", bg: "#F3F4F6", icon: "🏁" },
  "Archived":             { color: "#374151", bg: "#E5E7EB", icon: "📁" },
};

const URGENCY = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444", Critical: "#7C3AED" };

// ─── WORKFLOW STEPS ────────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { num: 1, label: "Report Creation",    status: "Pending Verification", color: "#3B82F6", icon: "📝" },
  { num: 2, label: "Verification Office",status: "Under Review",         color: "#8B5CF6", icon: "🏛️" },
  { num: 3, label: "Field Investigation",status: "Investigating",        color: "#F59E0B", icon: "🔍" },
  { num: 4, label: "Verified",           status: "Verified",             color: "#10B981", icon: "✅" },
  { num: 5, label: "Donor Queue",        status: "Waiting Sponsor",      color: "#EC4899", icon: "👥" },
  { num: 6, label: "Sponsorship",        status: "Sponsored",            color: "#EF4444", icon: "❤️" },
  { num: 7, label: "Aid Delivery",       status: "Aid Delivered",        color: "#06B6D4", icon: "📦" },
  { num: 8, label: "Completed",          status: "Completed",            color: "#5A6E8A", icon: "🏁" },
];

// ─── HELPER COMPONENTS ─────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || { color: "#5A6E8A", bg: "#F3F4F6", icon: "○" };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}40`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.icon} {status}
    </span>
  );
};

const UrgencyBadge = ({ level }) => (
  <span style={{ background: URGENCY[level] + "20", color: URGENCY[level], border: `1px solid ${URGENCY[level]}40`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
    {level}
  </span>
);

const StatCard = ({ label, value, icon, color, sub }) => (
  <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 12px #0001", borderLeft: `4px solid ${color}`, display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, overflow: "hidden" }}>
    <div style={{ fontSize: 26, flexShrink: 0 }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "clamp(18px,4vw,26px)", fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: "clamp(10px,2.5vw,13px)", color: COLORS.muted, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const Modal = ({ title, children, onClose, wide }) => {
  const isMob = useIsMobile();
  return (
    <div className="kf-modal-outer" style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: isMob ? "flex-end" : "center", justifyContent: "center", padding: isMob ? 0 : 16 }} onClick={onClose}>
      <div className="kf-modal-inner" style={{ maxWidth: wide ? 900 : 640, borderRadius: isMob ? "18px 18px 0 0" : 18 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: isMob ? 18 : 22, fontWeight: 800, color: COLORS.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20, color: COLORS.muted, flexShrink: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...props.style }} />
  </div>
);

// ── Custom calendar date picker ───────────────────────────────────────────────
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DatePicker = ({ label, value, onChange, min, max, style }) => {
  const C = COLORS;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Parse value (YYYY-MM-DD) → { y, m, d }
  const parse = (v) => { if (!v) return null; const [y,m,d] = v.split("-").map(Number); return { y, m, d }; };
  const fmt   = (y,m,d) => `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const today = new Date(); const todayStr = fmt(today.getFullYear(), today.getMonth()+1, today.getDate());

  const sel = parse(value);
  const [view, setView] = useState(() => sel ? { y: sel.y, m: sel.m } : { y: today.getFullYear(), m: today.getMonth()+1 });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Calendar grid: days of month
  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
  const firstWeekday = (y, m) => new Date(y, m-1, 1).getDay(); // 0=Sun

  const prevMonth = () => setView(v => v.m === 1 ? { y: v.y-1, m: 12 } : { y: v.y, m: v.m-1 });
  const nextMonth = () => setView(v => v.m === 12 ? { y: v.y+1, m: 1  } : { y: v.y, m: v.m+1 });

  const selectDay = (d) => {
    const str = fmt(view.y, view.m, d);
    if (min && str < min) return;
    if (max && str > max) return;
    onChange({ target: { value: str } });
    setOpen(false);
  };

  const display = value ? (() => {
    const p = parse(value);
    return `${p.d} ${MONTH_NAMES_SHORT[p.m-1]} ${p.y}`;
  })() : "Select date…";

  const total = daysInMonth(view.y, view.m);
  const start = firstWeekday(view.y, view.m);
  const cells = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  return (
    <div style={{ marginBottom: 16, position: "relative", ...style }} ref={ref}>
      {label && <label style={{ display:"block", fontSize:13, fontWeight:600, color:C.text, marginBottom:6 }}>{label}</label>}
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${open ? C.primary : C.border}`, borderRadius:10, fontSize:14, background:"#fff", cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center", color: value ? C.text : C.muted, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}>
        <span>{display}</span>
        <span style={{ fontSize:16 }}>📅</span>
      </button>
      {open && (
        <div style={{ position:"absolute", zIndex:9999, top:"calc(100% + 4px)", left:0, background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", padding:16, minWidth:280 }}>
          {/* Month navigation */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button type="button" onClick={prevMonth} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:C.primary, padding:"4px 8px", borderRadius:8 }}>‹</button>
            <span style={{ fontWeight:800, fontSize:14 }}>{MONTH_NAMES_SHORT[view.m-1]} {view.y}</span>
            <button type="button" onClick={nextMonth} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:C.primary, padding:"4px 8px", borderRadius:8 }}>›</button>
          </div>
          {/* Weekday headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:C.muted, padding:"2px 0" }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const dayStr = fmt(view.y, view.m, d);
              const isSelected = value === dayStr;
              const isToday    = dayStr === todayStr;
              const disabled   = (min && dayStr < min) || (max && dayStr > max);
              return (
                <button key={d} type="button" onClick={() => !disabled && selectDay(d)}
                  style={{ textAlign:"center", padding:"6px 0", borderRadius:8, border:"none", cursor: disabled ? "not-allowed" : "pointer", fontSize:13, fontWeight: isSelected || isToday ? 800 : 500, background: isSelected ? C.primary : isToday ? `${C.primary}18` : "transparent", color: isSelected ? "#fff" : disabled ? "#CBD5E1" : C.text, opacity: disabled ? 0.4 : 1 }}>
                  {d}
                </button>
              );
            })}
          </div>
          {/* Today shortcut */}
          <div style={{ borderTop:`1px solid ${C.border}`, marginTop:10, paddingTop:10, textAlign:"center" }}>
            <button type="button" onClick={() => { onChange({ target: { value: todayStr } }); setOpen(false); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:C.primary, fontSize:12, fontWeight:700 }}>
              Today ({todayStr})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Select = ({ label, value, onChange, children, disabled, style: _s, ...rest }) => {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0, width: 0, flipUp: false });
  const btnRef = useRef(null);

  // Flatten <option> / <optgroup> children into a flat list
  const flatOptions = [];
  const parseChildren = (nodes) => {
    import_Children_forEach(nodes, (child) => {
      if (!child) return;
      if (child.type === "optgroup") parseChildren(child.props.children);
      else if (child.type === "option") flatOptions.push({ value: child.props.value, label: child.props.children });
    });
  };
  parseChildren(children);

  const selected = flatOptions.find(o => String(o.value) === String(value));

  const openDrop = useCallback(() => {
    if (disabled) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < 200 && rect.top > 200;
    setPos({ top: flipUp ? rect.top - 4 : rect.bottom + 4, left: rect.left, width: rect.width, flipUp });
    setOpen(true);
  }, [disabled]);

  // Close on resize (reposition) and Escape key
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("resize", close); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div style={{ marginBottom: 16, ...rest.wrapStyle }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{label}</label>}
      <button ref={btnRef} type="button" onClick={openDrop} disabled={disabled}
        style={{
          width: "100%", padding: "10px 14px", border: `1.5px solid ${open ? COLORS.primary : COLORS.border}`,
          borderRadius: 10, fontSize: 14, background: disabled ? "#F9FAFB" : "#fff",
          boxSizing: "border-box", fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
          color: disabled ? COLORS.muted : COLORS.text, outline: "none",
          boxShadow: open ? `0 0 0 3px ${COLORS.primary}22` : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected?.label ?? "— Select —"}</span>
        <span style={{ color: COLORS.muted, fontSize: 11, marginLeft: 8, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </button>
      {open && createPortal(
        <>
          {/* invisible backdrop to catch outside clicks */}
          <div style={{ position: "fixed", inset: 0, zIndex: 8998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed",
            top: pos.flipUp ? "auto" : pos.top,
            bottom: pos.flipUp ? window.innerHeight - pos.top : "auto",
            left: pos.left, width: pos.width,
            zIndex: 8999, background: "#fff", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            border: `1px solid ${COLORS.border}`,
            maxHeight: 240, overflowY: "auto",
          }}>
            {flatOptions.map((opt, i) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div key={opt.value ?? i}
                  onClick={(e) => { e.stopPropagation(); onChange?.({ target: { value: opt.value } }); setOpen(false); }}
                  style={{
                    padding: "10px 14px", cursor: "pointer", fontSize: 14,
                    background: isSelected ? COLORS.primary + "12" : "transparent",
                    color: isSelected ? COLORS.primary : COLORS.text,
                    fontWeight: isSelected ? 700 : 400,
                    borderBottom: i < flatOptions.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    userSelect: "none",
                  }}>
                  {opt.label}
                </div>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
// React.Children.forEach trampoline (avoids the "import_Children_forEach not defined" error)
const import_Children_forEach = (children, fn) => {
  const arr = Array.isArray(children) ? children : (children ? [children] : []);
  const walk = (nodes) => { nodes.forEach(c => { if (!c) return; if (Array.isArray(c)) walk(c); else fn(c); }); };
  walk(arr);
};

const Textarea = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{label}</label>}
    <textarea {...props} rows={3} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", ...props.style }} />
  </div>
);

const Btn = ({ children, variant = "primary", size = "md", ...props }) => {
  const variants = {
    primary: { background: COLORS.primary,   color: "#fff" },
    success: { background: COLORS.secondary, color: "#fff" },
    danger:  { background: COLORS.danger,    color: "#fff" },
    accent:  { background: COLORS.accent,    color: "#fff" },
    ghost:   { background: "transparent",    color: COLORS.primary, border: `1.5px solid ${COLORS.primary}` },
    muted:   { background: "#F3F4F6",        color: COLORS.muted },
    purple:  { background: COLORS.purple,    color: "#fff" },
    teal:    { background: COLORS.teal,      color: "#fff" },
  };
  const sizes = { sm: { padding: "6px 14px", fontSize: 12 }, md: { padding: "10px 20px", fontSize: 14 }, lg: { padding: "14px 28px", fontSize: 16 } };
  return (
    <button {...props} style={{ ...variants[variant], ...sizes[size], border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", transition: "opacity 0.2s", ...props.style }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      {children}
    </button>
  );
};

// ─── FILE UPLOAD ZONE ──────────────────────────────────────────────────────
const FileUploadZone = ({ label, accept, multiple = true, files, onAdd, onRemove, note, required, color = COLORS.primary }) => {
  const inputRef = useRef(null);

  // Revoke all blob URLs when the component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getIcon = (f) => {
    if (f.preview) return null;
    if (f.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)) return "🎥";
    if (f.name.match(/\.pdf$/i)) return "📄";
    if (f.name.match(/\.(doc|docx)$/i)) return "📝";
    if (f.name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)) return "🖼️";
    return "📎";
  };

  const formatSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : (b / 1024).toFixed(0) + " KB";

  const handleChange = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      name: f.name, type: f.type, size: f.size, file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    onAdd(selected);
    e.target.value = "";
  };

  const handleRemove = (i) => {
    const f = files[i];
    if (f?.preview) URL.revokeObjectURL(f.preview);
    onRemove(i);
  };

  return (
    <div style={{ marginBottom: 18 }}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{label}</label>
          {required && <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>Required</span>}
          {files.length > 0 && <span style={{ background: color + "15", color, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{files.length} file{files.length > 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Drop zone */}
      <div onClick={() => inputRef.current?.click()}
        style={{ border: `2px dashed ${files.length > 0 ? color + "60" : COLORS.border}`, borderRadius: 12, padding: "18px", textAlign: "center", cursor: "pointer", background: files.length > 0 ? color + "06" : "#FAFAFA", transition: "all .15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = color + "08"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = files.length > 0 ? color + "60" : COLORS.border; e.currentTarget.style.background = files.length > 0 ? color + "06" : "#FAFAFA"; }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>📁</div>
        <div style={{ fontSize: 13, color, fontWeight: 700 }}>Click to upload {multiple ? "files" : "file"}</div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{note || "Photos · Videos · Documents"}</div>
      </div>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleChange} style={{ display: "none" }} />

      {/* Previews */}
      {files.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}`, background: "#F8FAFC" }}>
              {f.preview ? (
                <img src={f.preview} alt={f.name} style={{ width: 80, height: 80, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: 80, height: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 4 }}>
                  <span style={{ fontSize: 26 }}>{getIcon(f)}</span>
                  <span style={{ fontSize: 8, color: COLORS.muted, textAlign: "center", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ fontSize: 8, color: COLORS.muted }}>{formatSize(f.size)}</span>
                </div>
              )}
              {/* Remove button */}
              <button onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                style={{ position: "absolute", top: 3, right: 3, background: "rgba(239,68,68,.85)", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                ×
              </button>
              {/* Image overlay with name */}
              {f.preview && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.5)", padding: "2px 4px", fontSize: 8, color: "#fff", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{f.name}</div>
              )}
            </div>
          ))}
          {/* Add more */}
          <div onClick={() => inputRef.current?.click()}
            style={{ width: 80, height: 80, border: `2px dashed ${COLORS.border}`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.muted, fontSize: 11, fontWeight: 700, gap: 4 }}>
            <span style={{ fontSize: 22 }}>+</span>Add
          </div>
        </div>
      )}
    </div>
  );
};

// ─── CASE TIMELINE ───────────────────────────────────────────────────────────
const CaseTimeline = ({ c }) => {
  const events = [
    { time: c.created_at,         action: "📝 Report Created",      by: "Reporter",   done: true },
    c.investigation_date
      ? { time: c.investigation_date, action: "🕵️ Investigation Started",by: "Field Team", done: true }
      : { time: "—",               action: "🕵️ Investigation Pending", by: "Field Team", done: false },
    c.findings
      ? { time: c.investigation_date, action: "✅ Case Verified",       by: "Field Team", done: true }
      : { time: "—",               action: "✅ Verification Pending",   by: "Field Team", done: false },
    c.sponsor_id
      ? { time: new Date().toISOString().split("T")[0], action: "❤️ Case Sponsored", by: "Donor", done: true }
      : { time: "—",               action: "❤️ Awaiting Sponsorship",  by: "Donor",      done: false },
    c.status === "Aid Delivered" || c.status === "Completed"
      ? { time: "—",               action: "📦 Aid Delivered",          by: "Field Team", done: true }
      : { time: "—",               action: "📦 Aid Delivery Pending",   by: "Field Team", done: false },
    c.status === "Completed"
      ? { time: "—",               action: "🏁 Case Completed",         by: "System",     done: true }
      : { time: "—",               action: "🏁 Completion Pending",     by: "System",     done: false },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>📋 Case Timeline</div>
      <div style={{ position: "relative", paddingLeft: 28 }}>
        {events.map((e, i) => (
          <div key={i} style={{ marginBottom: i < events.length - 1 ? 16 : 0, position: "relative" }}>
            <div style={{ position: "absolute", left: -28, top: 2, width: 18, height: 18, borderRadius: "50%", background: e.done ? COLORS.secondary : "#E5E7EB", border: "2.5px solid #fff", boxShadow: `0 0 0 2px ${e.done ? COLORS.secondary : "#D1D5DB"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {e.done && <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>✓</span>}
            </div>
            {i < events.length - 1 && <div style={{ position: "absolute", left: -19, top: 18, width: 2, height: 14, background: e.done ? COLORS.secondary + "40" : "#E5E7EB" }} />}
            <div style={{ opacity: e.done ? 1 : 0.45 }}>
              <div style={{ fontSize: 13, fontWeight: e.done ? 700 : 500, color: e.done ? COLORS.text : COLORS.muted }}>{e.action}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{e.time !== "—" ? e.time : "Pending"} · {e.by}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── CASE DETAIL MODAL ─────────────────────────────────────────────────────
const CaseDetailModal = ({ c, currentUser, onClose, onUpdateCase, onSponsor }) => {
  const [findings,      setFindings]      = useState(c.findings);
  const [activeTab,     setActiveTab]     = useState("details");
  // Evidence files (field investigation)
  const [evidencePhotos, setEvidencePhotos] = useState([]);
  const [evidenceVideos, setEvidenceVideos] = useState([]);
  const [evidenceDocs,   setEvidenceDocs]   = useState([]);
  // Delivery proof files
  const [proofPhotos,  setProofPhotos]  = useState([]);
  const [proofVideos,  setProofVideos]  = useState([]);
  const [proofReceipts,setProofReceipts]= useState([]);

  const stepIdx = WORKFLOW_STEPS.findIndex(s => s.status === c.status);

  const canAdvance = () => {
    const isAdmin = ["admin","super_admin","verification_office"].includes(currentUser.role);
    const isField = ["field_agent","field_team"].includes(currentUser.role);
    if (c.status === "Pending Verification" && isAdmin) return "Under Review";
    if (c.status === "Under Review"         && isAdmin) return "Investigating";
    if (c.status === "Investigating"        && isField) return "Verified";
    if (c.status === "Verified"             && isAdmin) return "Waiting Sponsor";
    if (c.status === "Sponsored"            && isField) return "Aid Delivered";
    if (c.status === "Aid Delivered"        && (isAdmin || currentUser.role === "super_admin")) return "Completed";
    return null;
  };
  const nextStatus = canAdvance();

  // For field investigation — require at least 1 photo before submitting
  const isInvestigating = c.status === "Investigating" && ["field_agent","field_team"].includes(currentUser.role);
  const isDelivering    = c.status === "Sponsored"     && ["field_agent","field_team"].includes(currentUser.role);
  const canSubmitInvestigation = evidencePhotos.length > 0 && findings.trim().length > 0;
  const canSubmitDelivery      = proofPhotos.length > 0;

  const handleAdvance = () => {
    const allEvidenceFiles = [
      ...evidencePhotos.map(f => f.name),
      ...evidenceVideos.map(f => f.name),
      ...evidenceDocs.map(f => f.name),
    ];
    const allProofFiles = [
      ...proofPhotos.map(f => f.name),
      ...proofVideos.map(f => f.name),
      ...proofReceipts.map(f => f.name),
    ];
    onUpdateCase(c.id, {
      status: nextStatus,
      findings: findings || c.findings,
      ...(allEvidenceFiles.length > 0 && { media_files: [...c.media_files, ...allEvidenceFiles] }),
      ...(allProofFiles.length > 0    && { proof_files: [...c.proof_files, ...allProofFiles] }),
    });
    onClose();
  };

  const totalMedia = c.media_files.length + evidencePhotos.length + evidenceVideos.length + evidenceDocs.length;
  const totalProof = c.proof_files.length + proofPhotos.length + proofVideos.length + proofReceipts.length;

  const tabs = [
    { id: "details",  label: "📋 Details"  },
    { id: "timeline", label: "🕐 Timeline" },
    { id: "media",    label: `📎 Media (${totalMedia})` },
    ...(totalProof > 0 ? [{ id: "proof", label: `✅ Proof (${totalProof})` }] : []),
  ];

  return (
    <Modal title={`Case ${c.ref || c.id} — ${c.victim_name}`} onClose={onClose} wide>
      {/* Workflow bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch" }}>
        {WORKFLOW_STEPS.map((s, i) => (
          <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto", minWidth: 52 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: i <= stepIdx ? s.color : "#E5E7EB", color: i <= stepIdx ? "#fff" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: 16, fontWeight: 700 }}>
                {i < stepIdx ? "✓" : s.num}
              </div>
              <div style={{ fontSize: 9, marginTop: 4, color: i <= stepIdx ? s.color : "#9CA3AF", fontWeight: 600, lineHeight: 1.2 }}>{s.label}</div>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && <div style={{ width: 16, height: 2, background: i < stepIdx ? s.color : "#E5E7EB", flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {/* Status row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Badge status={c.status} />
        <UrgencyBadge level={c.urgency_level} />
        {c.donation_amount > 0 && <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>💰 ${c.donation_amount}</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, border: "none", background: "none", cursor: "pointer", color: activeTab === t.id ? COLORS.primary : COLORS.muted, borderBottom: activeTab === t.id ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DETAILS TAB ── */}
      {activeTab === "details" && (
        <div>
          {/* ══ REPORT 1 — Original Reporter Submission ══ */}
          <div style={{ border: "2px solid #BFDBFE", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ background: "linear-gradient(135deg,#1E40AF,#3B82F6)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>1</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Reporter Submission</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginLeft: "auto" }}>{c.created_at}</span>
            </div>
            <div style={{ padding: 16, background: "#F0F7FF" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
                {[
                  ["Victim Name",  c.victim_name || c._raw?.privateVictimName],
                  ["Age",          c.age || c._raw?.privateVictimAge],
                  ["Gender",       c.gender || c._raw?.privateVictimGender],
                  ["Location",     c.location || c._raw?.privateDistrict],
                  ["Category",     c._raw?.category?.replace(/_/g," ")],
                  ["Urgency",      c.urgency_level],
                  ["Family Size",  c._raw?.privateFamilySize],
                  ["Reporter",     c._raw?.reporter?.name || c.reporter_id],
                ].filter(([,v]) => v).map(([k, v]) => (
                  <div key={k} style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", border: "1px solid #DBEAFE" }}>
                    <div style={{ fontSize: 10, color: "#1E40AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1 }}>{String(v)}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", border: "1px solid #DBEAFE" }}>
                <div style={{ fontSize: 10, color: "#1E40AF", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Description</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: COLORS.text }}>{c.description}</p>
              </div>
            </div>
          </div>

          {/* ══ REPORT 2 — Field Team Investigation ══ */}
          {!isInvestigating && (() => {
            const fi = c._raw?.fieldInvestigation;
            const agent = c._raw?.assignedAgent;
            const assigned = c._raw?.teamAssignedAt;
            if (!fi && !agent && !assigned) return null;
            return (
              <div style={{ border: `2px solid ${fi ? "#A7F3D0" : COLORS.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ background: fi ? "linear-gradient(135deg,#065F46,#10B981)" : "linear-gradient(135deg,#374151,#6B7280)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>2</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Field Team Report</span>
                  {fi && <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: "2px 8px", color: "#fff", marginLeft: 4 }}>✅ Submitted</span>}
                  {!fi && <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: "2px 8px", color: "#fff", marginLeft: 4 }}>🔍 In Progress</span>}
                </div>
                <div style={{ padding: 16, background: fi ? "#F0FDF4" : "#F9FAFB" }}>
                  {(agent || assigned) && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: fi ? 12 : 0 }}>
                      {agent && <div style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", border: "1px solid #D1FAE5" }}>
                        <div style={{ fontSize: 10, color: "#065F46", fontWeight: 700, textTransform: "uppercase" }}>Team / Agent</div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1 }}>🗺️ {agent.name}</div>
                      </div>}
                      {assigned && <div style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", border: "1px solid #D1FAE5" }}>
                        <div style={{ fontSize: 10, color: "#065F46", fontWeight: 700, textTransform: "uppercase" }}>Assigned</div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1 }}>{new Date(assigned).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>
                      </div>}
                    </div>
                  )}
                  {fi && (() => {
                    const riskColor = { low: "#065F46", medium: "#92400E", high: "#991B1B" }[fi.fraudRiskLevel] || COLORS.muted;
                    const riskBg    = { low: "#ECFDF5", medium: "#FFFBEB", high: "#FEF2F2" }[fi.fraudRiskLevel] || "#F8FAFC";
                    return (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 10 }}>
                          {[
                            ["Victim Verified",    fi.victimVerified    ? "✅ Yes" : "❌ No"],
                            ["Situation Accurate", fi.situationAccurate ? "✅ Yes" : "❌ No"],
                            ["Delivery Feasible",  fi.deliveryFeasible  ? "✅ Yes" : "❌ No"],
                            ["Urgency",            fi.urgencyConfirmed?.toUpperCase()],
                            ["Estimated Need",     fi.estimatedAmountNeeded ? `$${fi.estimatedAmountNeeded.toLocaleString()}` : "—"],
                            ["Verification",       fi.verificationStatus?.replace(/_/g," ")],
                          ].filter(([,v]) => v).map(([k, v]) => (
                            <div key={k} style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", border: "1px solid #D1FAE5" }}>
                              <div style={{ fontSize: 10, color: "#065F46", fontWeight: 700, textTransform: "uppercase" }}>{k}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {fi.situationNotes && (
                          <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: "1px solid #D1FAE5" }}>
                            <div style={{ fontSize: 10, color: "#065F46", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Field Notes</div>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{fi.situationNotes}</p>
                          </div>
                        )}
                        {fi.officialNotes && (
                          <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: "1px solid #D1FAE5" }}>
                            <div style={{ fontSize: 10, color: "#065F46", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Official Report</div>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{fi.officialNotes}</p>
                          </div>
                        )}
                        {fi.fraudRiskLevel && (
                          <div style={{ background: riskBg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${riskColor}30` }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: riskColor }}>🛡️ Fraud Risk: {fi.fraudRiskLevel?.toUpperCase()} ({fi.fraudRiskScore ?? 0}/100)</span>
                            {fi.fraudRiskNotes && <span style={{ fontSize: 12, color: riskColor, marginLeft: 8 }}>{fi.fraudRiskNotes}</span>}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {!fi && <div style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", padding: "12px 0" }}>⏳ Field agent has not submitted their report yet</div>}
                </div>
              </div>
            );
          })()}

          {/* ══ REPORT 3 — Requested Info (if admin requested more info) ══ */}
          {(() => {
            const notes = c._raw?.privateNotes || "";
            const match = notes.match(/\[INFO REQUESTED\]\s*([\s\S]+)/);
            if (!match) return null;
            return (
              <div style={{ border: "2px solid #FCD34D", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ background: "linear-gradient(135deg,#92400E,#D97706)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>3</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Admin — Requested Information</span>
                </div>
                <div style={{ padding: 16, background: "#FFFBEB" }}>
                  <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", border: "1px solid #FCD34D" }}>
                    <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Information Requested From Reporter</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: COLORS.text }}>{match[1].trim()}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── FIELD INVESTIGATION SECTION ── */}
          {isInvestigating && (
            <div style={{ background: "#FFFBEB", border: "2px solid #FCD34D", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>🔍 Field Investigation Report</div>
              <div style={{ fontSize: 12, color: "#B45309", marginBottom: 16 }}>Document your findings. At least 1 photo + written findings required before submitting.</div>
              <Textarea label="Investigation Findings *" value={findings} onChange={e => setFindings(e.target.value)} placeholder="Describe what you found on site — confirm or deny the case details, note any important observations..." style={{ minHeight: 90 }} />
              <FileUploadZone
                label="📸 Photos (Required — min. 1)"
                accept="image/*"
                files={evidencePhotos}
                onAdd={f => setEvidencePhotos(p => [...p, ...f])}
                onRemove={i => setEvidencePhotos(p => p.filter((_, idx) => idx !== i))}
                note="Take photos at the location as evidence"
                required
                color="#F59E0B"
              />
              <FileUploadZone
                label="🎥 Videos (Optional)"
                accept="video/*"
                files={evidenceVideos}
                onAdd={f => setEvidenceVideos(p => [...p, ...f])}
                onRemove={i => setEvidenceVideos(p => p.filter((_, idx) => idx !== i))}
                note="Short video clips of the situation"
                color="#8B5CF6"
              />
              <FileUploadZone
                label="📄 Documents (Optional)"
                accept=".pdf,.doc,.docx,image/*"
                files={evidenceDocs}
                onAdd={f => setEvidenceDocs(p => [...p, ...f])}
                onRemove={i => setEvidenceDocs(p => p.filter((_, idx) => idx !== i))}
                note="Medical records, IDs, official documents"
                color="#3B82F6"
              />
              {!canSubmitInvestigation && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: 12, fontSize: 12, color: "#991B1B" }}>
                  ⚠️ You must add <strong>written findings</strong> and at least <strong>1 photo</strong> before submitting.
                </div>
              )}
            </div>
          )}

          {/* ── AID DELIVERY SECTION ── */}
          {isDelivering && (
            <div style={{ background: "#F0FDF4", border: "2px solid #86EFAC", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#065F46", marginBottom: 4 }}>📦 Aid Delivery Proof</div>
              <div style={{ fontSize: 12, color: "#047857", marginBottom: 16 }}>Upload proof that aid was delivered. At least 1 photo is required. Receipts and videos are optional but encouraged.</div>
              <FileUploadZone
                label="📸 Delivery Photos (Required — min. 1)"
                accept="image/*"
                files={proofPhotos}
                onAdd={f => setProofPhotos(p => [...p, ...f])}
                onRemove={i => setProofPhotos(p => p.filter((_, idx) => idx !== i))}
                note="Photo of aid being handed to beneficiary"
                required
                color="#10B981"
              />
              <FileUploadZone
                label="🎥 Delivery Video (Optional)"
                accept="video/*"
                files={proofVideos}
                onAdd={f => setProofVideos(p => [...p, ...f])}
                onRemove={i => setProofVideos(p => p.filter((_, idx) => idx !== i))}
                note="Short video of the delivery moment"
                color="#06B6D4"
              />
              <FileUploadZone
                label="🧾 Receipt / Document (Optional)"
                accept=".pdf,.doc,.docx,image/*"
                files={proofReceipts}
                onAdd={f => setProofReceipts(p => [...p, ...f])}
                onRemove={i => setProofReceipts(p => p.filter((_, idx) => idx !== i))}
                note="Payment receipt, signed acknowledgement, or any document"
                color="#F59E0B"
              />
              {!canSubmitDelivery && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: 12, fontSize: 12, color: "#991B1B" }}>
                  ⚠️ At least <strong>1 delivery photo</strong> is required before marking as Aid Delivered.
                </div>
              )}
            </div>
          )}

          {/* ── FIELD INVESTIGATION REPORT (structured) ── */}
          {!isInvestigating && c._raw?.fieldInvestigation && (() => {
            const fi = c._raw.fieldInvestigation;
            const riskColor = { low: "#065F46", medium: "#92400E", high: "#991B1B" }[fi.fraudRiskLevel] || COLORS.muted;
            const riskBg    = { low: "#ECFDF5", medium: "#FFFBEB", high: "#FEF2F2" }[fi.fraudRiskLevel] || "#F8FAFC";
            return (
              <div style={{ background: "#EFF6FF", border: "2px solid #BFDBFE", borderRadius: 14, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1E40AF", marginBottom: 14 }}>📋 Field Investigation Report</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
                  {[
                    ["Victim Verified",    fi.victimVerified    ? "✅ Yes" : "❌ No"],
                    ["Situation Accurate", fi.situationAccurate ? "✅ Yes" : "❌ No"],
                    ["Delivery Feasible",  fi.deliveryFeasible  ? "✅ Yes" : "❌ No"],
                    ["Urgency Confirmed",  fi.urgencyConfirmed?.toUpperCase()],
                    ["Estimated Need",     fi.estimatedAmountNeeded ? `$${fi.estimatedAmountNeeded.toLocaleString()}` : "—"],
                    ["Verification",       fi.verificationStatus?.replace(/_/g," ")],
                  ].map(([k, v]) => v && (
                    <div key={k} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "1px solid #DBEAFE" }}>
                      <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {fi.situationNotes && (
                  <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", marginBottom: 10, border: "1px solid #DBEAFE" }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Situation Notes</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{fi.situationNotes}</p>
                  </div>
                )}
                {fi.officialNotes && (
                  <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", marginBottom: 10, border: "1px solid #DBEAFE" }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Agent's Official Notes</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{fi.officialNotes}</p>
                  </div>
                )}
                {fi.fraudRiskLevel && (
                  <div style={{ background: riskBg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${riskColor}30`, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: riskColor }}>🛡️ Fraud Risk: {fi.fraudRiskLevel?.toUpperCase()} ({fi.fraudRiskScore ?? 0}/100)</div>
                    {fi.fraudRiskNotes && <div style={{ fontSize: 12, color: riskColor, flex: 1 }}>{fi.fraudRiskNotes}</div>}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Existing findings fallback (text-only) */}
          {c.findings && !isInvestigating && !c._raw?.fieldInvestigation && (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: COLORS.secondary, fontWeight: 700, marginBottom: 6 }}>✅ FIELD FINDINGS</div>
              <p style={{ margin: 0, fontSize: 14, color: COLORS.text }}>{c.findings}</p>
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {activeTab === "timeline" && <CaseTimeline c={c} />}

      {/* ── MEDIA TAB ── */}
      {activeTab === "media" && (
        <div>
          {c.media_files.length === 0 && evidencePhotos.length === 0 && evidenceVideos.length === 0 && evidenceDocs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              No media files attached to this case yet.
            </div>
          ) : (
            <div>
              {/* Existing files */}
              {c.media_files.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 10 }}>EXISTING FILES</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {c.media_files.map((f, i) => (
                      <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid #BFDBFE', background: '#EFF6FF', width: 100, flexShrink: 0 }}>
                        {f.type === 'video' || f.url?.match(/\.(mp4|mov|webm|avi)$/i)
                          ? <video src={f.url} controls style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                          : f.type === 'document' || f.url?.match(/\.(pdf|doc|docx)$/i)
                            ? <a href={f.url} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, textDecoration: 'none', color: COLORS.primary }}>
                                <span style={{ fontSize: 32 }}>📄</span>
                                <span style={{ fontSize: 10, textAlign: 'center', padding: '0 4px', wordBreak: 'break-all' }}>View Doc</span>
                              </a>
                            : <a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt="media" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} /></a>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Newly added files preview */}
              {(evidencePhotos.length > 0 || evidenceVideos.length > 0 || evidenceDocs.length > 0) && (
                <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 10 }}>🆕 NEW UPLOADS (not saved yet)</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[...evidencePhotos, ...evidenceVideos, ...evidenceDocs].map((f, i) => (
                      <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #FCD34D" }}>
                        {f.preview ? <img src={f.preview} alt={f.name} style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} /> :
                          <div style={{ width: 64, height: 64, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                            {f.name.match(/\.(mp4|mov)$/i) ? "🎥" : f.name.endsWith(".pdf") ? "📄" : "📎"}
                          </div>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PROOF TAB ── */}
      {activeTab === "proof" && (
        <div>
          {c.proof_files.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary, marginBottom: 10 }}>✅ DELIVERY PROOF</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {c.proof_files.map((f, i) => (
                  <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid #A7F3D0', background: '#ECFDF5', width: 100, flexShrink: 0 }}>
                    {f.type === 'video' || f.url?.match(/\.(mp4|mov|webm|avi)$/i)
                      ? <video src={f.url} controls style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                      : f.type === 'document' || f.url?.match(/\.(pdf|doc|docx)$/i)
                        ? <a href={f.url} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, textDecoration: 'none', color: COLORS.secondary }}>
                            <span style={{ fontSize: 32 }}>📄</span>
                            <span style={{ fontSize: 10, textAlign: 'center', padding: '0 4px', wordBreak: 'break-all' }}>View Doc</span>
                          </a>
                        : <a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt="proof" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} /></a>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
          {(proofPhotos.length > 0 || proofVideos.length > 0 || proofReceipts.length > 0) && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#065F46", marginBottom: 10 }}>🆕 NEW PROOF (not saved yet)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...proofPhotos, ...proofVideos, ...proofReceipts].map((f, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #86EFAC" }}>
                    {f.preview ? <img src={f.preview} alt={f.name} style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} /> :
                      <div style={{ width: 64, height: 64, background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                        {f.name.match(/\.(mp4|mov)$/i) ? "🎥" : f.name.endsWith(".pdf") ? "🧾" : "📎"}
                      </div>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
        {nextStatus && !isInvestigating && !isDelivering && (
          <Btn variant="success" onClick={handleAdvance}>➜ Advance: {nextStatus}</Btn>
        )}
        {isInvestigating && (
          <Btn variant="success" onClick={handleAdvance} style={{ opacity: canSubmitInvestigation ? 1 : 0.4, cursor: canSubmitInvestigation ? "pointer" : "not-allowed" }}
            {...(!canSubmitInvestigation ? { onClick: () => alert("Add written findings + at least 1 photo before submitting.") } : {})}>
            ✅ Submit Investigation → Verified
          </Btn>
        )}
        {isDelivering && (
          <Btn variant="teal" onClick={handleAdvance} style={{ opacity: canSubmitDelivery ? 1 : 0.4, cursor: canSubmitDelivery ? "pointer" : "not-allowed" }}
            {...(!canSubmitDelivery ? { onClick: () => alert("Add at least 1 delivery photo before submitting.") } : {})}>
            📦 Confirm Aid Delivered
          </Btn>
        )}
        {c.status === "Waiting Sponsor" && ["donor"].includes(currentUser.role) && (
          <Btn variant="accent" onClick={() => { onSponsor(c); onClose(); }}>❤️ Sponsor This Case</Btn>
        )}
        {c.status === "Pending Verification" && ["admin","super_admin","verification_office"].includes(currentUser.role) && (
          <Btn variant="danger" onClick={() => { onUpdateCase(c.id, { status: "Archived" }); onClose(); }}>✕ Reject Case</Btn>
        )}
        {["admin","super_admin","verification_office"].includes(currentUser.role) && c.status === "Under Review" && (
          <Btn variant="primary" onClick={() => { onUpdateCase(c.id, { status: "Investigating", team_id: "T01" }); onClose(); }}>Assign Field Team</Btn>
        )}
        {["admin","super_admin","verification_office"].includes(currentUser.role) && c.status === "Aid Delivered" && (
          <Btn variant="success" onClick={handleAdvance}>🏁 Mark as Completed</Btn>
        )}
        <Btn variant="muted" onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
};

// ─── REPORT CASE MODAL ─────────────────────────────────────────────────────
// Editable in admin → Settings → Categories. Defaults & storage in utils/categories.js.
const REPORT_CATEGORIES = getCat("report");

const NEEDS_OPTIONS = [
  { value: "education",  label: "🎓 Education / School Fees" },
  { value: "food",       label: "🍚 Food Support" },
  { value: "medical",    label: "🩺 Medical Care" },
  { value: "shelter",    label: "🏠 Shelter / Housing" },
  { value: "clothing",   label: "👗 Clothing / Uniform" },
  { value: "disability", label: "♿ Disability Support" },
];

const ReportCaseModal = ({ onClose, onSubmit, currentUser }) => {
  const [reportMode, setReportMode] = useState(""); // "" | "individual" | "community"
  const [form, setForm] = useState({
    privateVictimName:   "",
    privateVictimAge:    "",
    privateVictimGender: "female",
    privateVictimPhone:  "",
    privateAddress:      "",
    privateDistrict:     "",
    privateFamilySize:   "",
    privateDescription:  "",
    privateNotes:        "",
    privateGuardianName: "",
    category:            "child_support",
    emergencyLevel:      "medium",
    targetGoal:          "",
    needsChecklist:      [],
    communityVillageName: "",
    communityChildCount:  "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleNeed = (val) => setForm(f => ({
    ...f,
    needsChecklist: f.needsChecklist.includes(val) ? f.needsChecklist.filter(x => x !== val) : [...f.needsChecklist, val],
  }));

  const selectedCategory = REPORT_CATEGORIES.find(c => c.value === form.category);
  const isCommunity = reportMode === "community";
  const isChildType = selectedCategory?.type === "child_support";

  const handleSubmit = async () => {
    setError("");
    if (!isCommunity && !form.privateVictimName.trim()) return setError("Name is required");
    if (!form.privateDescription.trim() || form.privateDescription.trim().length < 10) return setError("Please describe the situation (min. 10 characters)");
    if (!isCommunity && !form.privateAddress.trim() && !form.privateDistrict.trim()) return setError("Location is required");
    if (isCommunity && !form.communityVillageName.trim()) return setError("Village/community name is required");
    if (isCommunity && !form.communityChildCount) return setError("Number of children is required");

    setLoading(true);
    try {
      const payload = {
        category:         form.category,
        emergencyLevel:   form.emergencyLevel,
        privateDescription: form.privateDescription.trim(),
        caseType:         isCommunity ? "community_report" : (isChildType ? "child_support" : "emergency"),
        needsChecklist:   form.needsChecklist,
        ...(form.privateVictimName    && { privateVictimName:   form.privateVictimName.trim() }),
        ...(form.privateVictimAge     && { privateVictimAge:    parseInt(form.privateVictimAge) }),
        ...(form.privateVictimGender  && { privateVictimGender: form.privateVictimGender }),
        ...(form.privateVictimPhone   && { privateVictimPhone:  form.privateVictimPhone.trim() }),
        ...(form.privateAddress       && { privateAddress:      form.privateAddress.trim() }),
        ...(form.privateDistrict      && { privateDistrict:     form.privateDistrict.trim() }),
        ...(form.privateFamilySize    && { privateFamilySize:   parseInt(form.privateFamilySize) }),
        ...(form.privateNotes         && { privateNotes:        form.privateNotes.trim() }),
        ...(form.privateGuardianName  && { privateGuardianName: form.privateGuardianName.trim() }),
        ...(form.targetGoal           && { targetGoal:          parseFloat(form.targetGoal) }),
        ...(isCommunity && form.communityVillageName && { communityVillageName: form.communityVillageName.trim() }),
        ...(isCommunity && form.communityChildCount  && { communityChildCount:  parseInt(form.communityChildCount) }),
      };
      const result = await casesApi.submit(payload);
      onSubmit(result);
      onClose();
    } catch (e) {
      setError(e.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 0: Choose report mode ───────────────────────────────────────────
  if (!reportMode) return (
    <Modal title="📝 New Report" onClose={onClose} wide>
      <p style={{ color: COLORS.muted, fontSize: 14, marginBottom: 24 }}>What type of report are you submitting?</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <button onClick={() => setReportMode("individual")}
          style={{ background: "#fff", border: `2px solid ${COLORS.primary}`, borderRadius: 16, padding: "24px 20px", cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👤</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.primary, marginBottom: 6 }}>Individual Report</div>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            One child, one person, or one family needing support.
            Examples: orphan needing school fees, child needing medical care, family needing monthly food.
          </div>
          <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: COLORS.primary }}>→ Start Individual Report</div>
        </button>
        <button onClick={() => setReportMode("community")}
          style={{ background: "#fff", border: `2px solid ${COLORS.secondary}`, borderRadius: 16, padding: "24px 20px", cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏘️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary, marginBottom: 6 }}>Community Report</div>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            Many children or families in one village or area.
            Examples: 100 children need school fees in Village X, entire IDP camp needs food.
          </div>
          <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>→ Start Community Report</div>
        </button>
      </div>
    </Modal>
  );

  return (
    <Modal title={isCommunity ? "🏘️ Community Report" : "👤 Individual Report"} onClose={onClose} wide>
      {/* Privacy note */}
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065F46" }}>
        🔐 All personal information is <strong>private</strong>. Only admins and field agents see it. Sponsors never see names, phones, or exact addresses.
      </div>

      {/* Category selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, display: "block", marginBottom: 10 }}>What kind of support is needed? *</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
          {REPORT_CATEGORIES.filter(c => isCommunity ? c.type === "child_support" : true).map(cat => (
            <button key={cat.value} onClick={() => set("category", cat.value)}
              style={{ padding: "10px 12px", borderRadius: 10, border: `2px solid ${form.category === cat.value ? COLORS.primary : COLORS.border}`, background: form.category === cat.value ? COLORS.primary + "10" : "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: form.category === cat.value ? COLORS.primary : COLORS.text }}>{cat.label}</div>
              <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 3, lineHeight: 1.4 }}>{cat.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Needs checklist */}
      {(isChildType || isCommunity) && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, display: "block", marginBottom: 10 }}>Current Needs (select all that apply)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {NEEDS_OPTIONS.map(n => (
              <label key={n.value} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: `2px solid ${form.needsChecklist.includes(n.value) ? COLORS.secondary : COLORS.border}`, background: form.needsChecklist.includes(n.value) ? COLORS.secondary + "12" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: form.needsChecklist.includes(n.value) ? COLORS.secondary : COLORS.muted }}>
                <input type="checkbox" checked={form.needsChecklist.includes(n.value)} onChange={() => toggleNeed(n.value)} style={{ display: "none" }} />
                {form.needsChecklist.includes(n.value) ? "✅" : "○"} {n.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 20 }}>
        {/* Left: subject info */}
        <div>
          {isCommunity ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary, textTransform: "uppercase", marginBottom: 12 }}>🏘️ Community Information</div>
              <Input label="Village / Community Name *" value={form.communityVillageName}
                onChange={e => set("communityVillageName", e.target.value)} placeholder="e.g. Daryeel Village" />
              <Input label="Number of Children *" type="number" value={form.communityChildCount}
                onChange={e => set("communityChildCount", e.target.value)} placeholder="e.g. 100" />
              <Input label="District / Region *" value={form.privateDistrict}
                onChange={e => set("privateDistrict", e.target.value)} placeholder="e.g. Lower Shabelle" />
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", marginBottom: 12 }}>🔐 Private Information</div>
              <Input label="Full Name *" value={form.privateVictimName}
                onChange={e => set("privateVictimName", e.target.value)} placeholder={isChildType ? "Child's full name" : "Person's full name"} />
              {isChildType && (
                <Input label="Guardian / Parent Name" value={form.privateGuardianName}
                  onChange={e => set("privateGuardianName", e.target.value)} placeholder="Guardian's name" />
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Age" type="number" value={form.privateVictimAge}
                  onChange={e => set("privateVictimAge", e.target.value)} placeholder="Years" />
                <Select label="Gender" value={form.privateVictimGender} onChange={e => set("privateVictimGender", e.target.value)}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <Input label="Phone / Contact" value={form.privateVictimPhone}
                onChange={e => set("privateVictimPhone", e.target.value)} placeholder="+252 61 xxx xxxx" />
              <Input label="Family Size" type="number" value={form.privateFamilySize}
                onChange={e => set("privateFamilySize", e.target.value)} placeholder="No. of people" />
              <Input label="District / Neighbourhood" value={form.privateDistrict}
                onChange={e => set("privateDistrict", e.target.value)} placeholder="e.g. Hodan District" />
              <Input label="Full Address" value={form.privateAddress}
                onChange={e => set("privateAddress", e.target.value)} placeholder="Street, building, landmarks" />
            </>
          )}
        </div>

        {/* Right: situation */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", marginBottom: 12 }}>📋 Situation Details</div>

          <Select label="Urgency *" value={form.emergencyLevel} onChange={e => set("emergencyLevel", e.target.value)}>
            <option value="critical">🚨 Critical — Immediate action needed</option>
            <option value="high">🔴 High — Within days</option>
            <option value="medium">🟡 Medium — Within a week</option>
            <option value="low">🟢 Low — Stable, ongoing need</option>
          </Select>

          <Textarea label={isCommunity ? "Community Situation * (Why do they need support?)" : "Why does this person need support? *"}
            value={form.privateDescription}
            onChange={e => set("privateDescription", e.target.value)}
            placeholder={isCommunity
              ? "Describe the community situation — e.g. Families cannot afford school fees. Children are dropping out. 100 children in Village X need sponsorship."
              : "Describe the situation in detail — what happened, why they need help, what their daily life is like, what is urgently needed."}
            style={{ minHeight: 130 }} />

          <Input label="Estimated Monthly Need (USD)" type="number" value={form.targetGoal}
            onChange={e => set("targetGoal", e.target.value)} placeholder={isCommunity ? "e.g. 3000" : "e.g. 35"} />

          <Textarea label="Additional Notes (optional)" value={form.privateNotes}
            onChange={e => set("privateNotes", e.target.value)}
            placeholder="Any extra context for the verification team — school name, hospital, documents available…" />
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginTop: 8 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400E", marginTop: 16 }}>
        📋 After submission: status → <strong>Pending Review</strong>. The {isCommunity ? "community" : "child/person"} will not be visible to sponsors until a field team investigates and admin approves.
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Btn variant="muted" onClick={() => setReportMode("")} disabled={loading}>← Back</Btn>
        <Btn variant="muted" onClick={onClose} disabled={loading}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
          {loading ? "Submitting…" : isCommunity ? "🏘️ Submit Community Report" : "📤 Submit Report"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── SPONSOR MODAL ─────────────────────────────────────────────────────────
const SponsorModal = ({ c, onClose, onConfirm, currentUser }) => {
  const targetGoal  = c.target_goal  || c._raw?.targetGoal  || 0;
  const totalRaised = c.donation_amount || c._raw?.totalRaised || 0;
  const remaining   = Math.max(0, targetGoal - totalRaised);
  const pct         = targetGoal > 0 ? Math.min(100, Math.round((totalRaised / targetGoal) * 100)) : 0;

  const METHODS = [
    { value: "mobile_money",  label: "📱 Mobile Money (EVC / Zaad / Sahal)" },
    { value: "bank_transfer", label: "🏦 Bank Transfer" },
    { value: "card",          label: "💳 Debit / Credit Card" },
    { value: "wallet",        label: "💰 Digital Wallet" },
  ];

  // Tier presets based on actual remaining amount
  const tiers = [
    { label: "Full Sponsor 🏆",   amount: remaining || targetGoal,           desc: "Cover the entire remaining need" },
    { label: "Half Support 🤝",   amount: Math.round((remaining || targetGoal) / 2), desc: "Cover half of what's still needed" },
    { label: "Quick Help ❤️",     amount: Math.min(100, Math.round((remaining || targetGoal) / 4) || 50), desc: "Any help makes a difference" },
  ].filter(t => t.amount > 0);

  const [selectedTier, setSelectedTier] = useState(0);
  const [amount,       setAmount]       = useState(String(tiers[0]?.amount || ""));
  const [method,       setMethod]       = useState("mobile_money");
  const [message,      setMessage]      = useState("");
  const [anonymous,    setAnonymous]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [done,         setDone]         = useState(false);

  const pickTier = (i) => {
    setSelectedTier(i);
    setAmount(String(tiers[i].amount));
  };

  const handleConfirm = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Please enter a valid amount");
    setLoading(true);
    try {
      await donations.donate({
        caseId:       c.id,
        amount:       amt,
        method,
        isAnonymous:  anonymous,
        donorMessage: message.trim() || undefined,
      });
      setDone(true);
      // update parent state optimistically
      onConfirm(c.id, { type: tiers[selectedTier]?.label || "Donation", method, amount: amt });
    } catch (e) {
      setError(e.message || "Donation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (done) {
    return (
      <Modal title="❤️ Thank You!" onClose={onClose}>
        <div style={{ textAlign: "center", padding: "20px 0 32px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: COLORS.secondary }}>Donation Received!</h3>
          <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 24px" }}>
            Your donation of <strong style={{ color: COLORS.secondary }}>${parseFloat(amount).toLocaleString()}</strong> has been submitted.
            Our team will confirm and process the payment. You will receive a notification once confirmed.
          </p>
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "16px 20px", marginBottom: 24, fontSize: 13, color: "#065F46", textAlign: "left" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>What happens next:</div>
            <div>1️⃣ Admin confirms your payment</div>
            <div style={{ marginTop: 4 }}>2️⃣ Field agent delivers aid to the family</div>
            <div style={{ marginTop: 4 }}>3️⃣ Proof of delivery uploaded — you see it</div>
          </div>
          <Btn variant="success" onClick={onClose} style={{ minWidth: 160 }}>Close ✓</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`❤️ Sponsor This Case`} onClose={onClose} wide>
      {/* Case summary card */}
      <div style={{ background: "linear-gradient(135deg, #004B96 0%, #4B7D19 100%)", borderRadius: 16, padding: 20, marginBottom: 24, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{c.victim_name}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>📍 {c.location}</div>
            <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, margin: 0, maxWidth: 420 }}>
              {(c.description || "").slice(0, 140)}{c.description?.length > 140 ? "…" : ""}
            </p>
          </div>
          <UrgencyBadge level={c.urgency_level} />
        </div>

        {/* Funding progress */}
        {targetGoal > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
              <span>💰 Raised: <strong>${totalRaised.toLocaleString()}</strong></span>
              <span>🎯 Goal: <strong>${targetGoal.toLocaleString()}</strong></span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, height: 10, overflow: "hidden" }}>
              <div style={{ background: pct >= 100 ? "#10B981" : "#FCD34D", borderRadius: 20, height: "100%", width: `${pct}%`, transition: "width 0.5s" }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
              {pct}% funded · <strong style={{ color: "#FCD34D" }}>${remaining.toLocaleString()} still needed</strong>
            </div>
          </div>
        )}
      </div>

      {/* Tier buttons */}
      {tiers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>Choose a sponsorship tier</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {tiers.map((t, i) => (
              <button key={i} onClick={() => pickTier(i)}
                style={{ padding: "12px 10px", borderRadius: 12, border: `2px solid ${selectedTier === i ? COLORS.secondary : COLORS.border}`, background: selectedTier === i ? "#F0FDF4" : "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary }}>${t.amount.toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>{t.label}</div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom amount */}
      <Input label="Donation Amount (USD) *" type="number" value={amount}
        onChange={e => { setAmount(e.target.value); setSelectedTier(-1); }}
        placeholder={remaining > 0 ? `Remaining needed: $${remaining}` : "Enter amount"} />

      {/* Payment method */}
      <Select label="Payment Method *" value={method} onChange={e => setMethod(e.target.value)}>
        {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </Select>

      {/* Optional message */}
      <Textarea label="Message to the family (optional — shown anonymously)" value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="e.g. You are in our prayers, stay strong…" />

      {/* Anonymous toggle */}
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer", userSelect: "none" }}>
        <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)}
          style={{ width: 18, height: 18, cursor: "pointer" }} />
        <span style={{ fontSize: 13 }}>Keep my donation anonymous (name hidden from public)</span>
      </label>

      {/* Process note */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: COLORS.primary }}>
        <strong>How it works:</strong><br />
        1. Submit your pledge here → 2. Admin contacts you to confirm payment → 3. Field team delivers aid → 4. Proof of delivery shared with you
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }} disabled={loading}>Cancel</Btn>
        <Btn variant="accent" onClick={handleConfirm} disabled={loading || !amount} style={{ flex: 2 }}>
          {loading ? "Processing…" : `❤️ Confirm $${parseFloat(amount || 0).toLocaleString()} Donation`}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── ADD USER MODAL ─────────────────────────────────────────────────────────
const AddUserModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ fullname: "", email: "", phone: "", role: "observer" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = () => {
    if (!form.fullname || !form.email) return alert("Name and email required");
    onAdd({ ...form, id: "U" + String(Math.floor(Math.random() * 9000) + 100), verification_status: "active" });
    onClose();
  };
  return (
    <Modal title="➕ Add New User" onClose={onClose}>
      <Input label="Full Name *" value={form.fullname} onChange={e => set("fullname", e.target.value)} />
      <Input label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
      <Input label="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} />
      <Select label="Role" value={form.role} onChange={e => set("role", e.target.value)}>
        <option value="observer">Observer / Reporter</option>
        <option value="verification_office">Verification Office</option>
        <option value="field_team">Field Team</option>
        <option value="donor">Donor / Sponsor</option>
        <option value="super_admin">Super Admin</option>
      </Select>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="primary" onClick={handleSubmit} style={{ flex: 1 }}>Add User</Btn>
        <Btn variant="muted" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
};

// ─── EXPORT MODAL ────────────────────────────────────────────────────────────
const ExportModal = ({ cases, onClose }) => {
  const currentYear = new Date().getFullYear();
  const [rangeType,  setRangeType]  = useState("year");        // "year" | "quarter" | "months" | "custom"
  const [selYear,    setSelYear]    = useState(String(currentYear));
  const [selQuarter, setSelQuarter] = useState("Q1");
  const [selMonths,  setSelMonths]  = useState("3");
  const [customFrom, setCustomFrom] = useState(`${currentYear}-01-01`);
  const [customTo,   setCustomTo]   = useState(`${currentYear}-12-31`);
  const [fmt,        setFmt]        = useState("csv");

  const getRange = () => {
    const y = parseInt(selYear);
    if (rangeType === "year")    return { from: new Date(`${y}-01-01`), to: new Date(`${y}-12-31`) };
    if (rangeType === "quarter") {
      const qMap = { Q1: [0,2], Q2: [3,5], Q3: [6,8], Q4: [9,11] };
      const [sm, em] = qMap[selQuarter];
      const from = new Date(y, sm, 1);
      const to   = new Date(y, em + 1, 0);
      return { from, to };
    }
    if (rangeType === "months") {
      const to   = new Date();
      const from = new Date(); from.setMonth(from.getMonth() - parseInt(selMonths));
      return { from, to };
    }
    return { from: new Date(customFrom), to: new Date(customTo + "T23:59:59") };
  };

  const getFiltered = () => {
    const { from, to } = getRange();
    return cases.filter(c => {
      const d = new Date(c._raw?.createdAt || c.created_at || 0);
      return d >= from && d <= to;
    });
  };

  const doExport = () => {
    const filtered = getFiltered();
    if (fmt === "csv") {
      const headers = ["Case Ref","Victim Name","Age","Gender","Location","Category","Urgency","Status","Created","Donation ($)","Assigned Agent","Verified"];
      const rows = filtered.map(c => [
        c.ref, c.victim_name, c.age, c.gender, c.location,
        c._raw?.category || "", c.urgency_level, c.status,
        c._raw?.createdAt?.slice(0,10) || c.created_at,
        c.donation_amount || 0,
        c._raw?.assignedAgent?.name || "",
        c._raw?.fieldInvestigation?.verificationStatus || "",
      ]);
      const csv = [headers,...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `kafaale_export_${filtered.length}cases_${Date.now()}.csv` });
      a.click();
    } else {
      const blob = new Blob([JSON.stringify(filtered.map(c => c._raw || c), null, 2)], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `kafaale_export_${filtered.length}cases_${Date.now()}.json` });
      a.click();
    }
    onClose();
  };

  const filtered = getFiltered();
  const RANGE_OPTIONS = [
    { value: "year",    label: "📅 Full Year" },
    { value: "quarter", label: "📆 Quarter" },
    { value: "months",  label: "🗓️ Last N Months" },
    { value: "custom",  label: "✏️ Custom Range" },
  ];
  const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - 1 + i));

  return (
    <Modal title="📥 Export Data" onClose={onClose} wide>
      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: COLORS.primary }}>
        🔐 Export is restricted to Super Admin only. All exported files contain private case data.
      </div>

      {/* Range type selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", marginBottom: 8 }}>Select Date Range Type</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {RANGE_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setRangeType(o.value)}
              style={{ padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: `2px solid ${rangeType === o.value ? COLORS.primary : COLORS.border}`, background: rangeType === o.value ? COLORS.primary : "#fff", color: rangeType === o.value ? "#fff" : COLORS.muted, cursor: "pointer" }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Range controls */}
      <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        {(rangeType === "year" || rangeType === "quarter") && (
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>Year</div>
            <Select value={selYear} onChange={e => setSelYear(e.target.value)} wrapStyle={{ marginBottom: 0 }}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        )}
        {rangeType === "quarter" && (
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>Quarter</div>
            <Select value={selQuarter} onChange={e => setSelQuarter(e.target.value)} wrapStyle={{ marginBottom: 0 }}>
              {["Q1 (Jan–Mar)","Q2 (Apr–Jun)","Q3 (Jul–Sep)","Q4 (Oct–Dec)"].map((q, i) => <option key={i} value={`Q${i+1}`}>{q}</option>)}
            </Select>
          </div>
        )}
        {rangeType === "months" && (
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>Period</div>
            <Select value={selMonths} onChange={e => setSelMonths(e.target.value)} wrapStyle={{ marginBottom: 0 }}>
              <option value="1">Last 1 month</option>
              <option value="2">Last 2 months</option>
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
            </Select>
          </div>
        )}
        {rangeType === "custom" && (
          <>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>From</div>
              <DatePicker value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ marginBottom: 0 }} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>To</div>
              <DatePicker value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ marginBottom: 0 }} />
            </div>
          </>
        )}
      </div>

      {/* Format + preview */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted }}>FORMAT:</div>
        {[["csv","📊 CSV (Excel)"],["json","📋 JSON"]].map(([v, l]) => (
          <button key={v} onClick={() => setFmt(v)}
            style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: `2px solid ${fmt === v ? COLORS.secondary : COLORS.border}`, background: fmt === v ? COLORS.secondary : "#fff", color: fmt === v ? "#fff" : COLORS.muted, cursor: "pointer" }}>
            {l}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: filtered.length > 0 ? COLORS.secondary : COLORS.danger }}>
          {filtered.length} cases match
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={doExport} disabled={filtered.length === 0} style={{ flex: 2 }}>
          {filtered.length === 0 ? "No data in range" : `📥 Export ${filtered.length} cases`}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── NOTIFICATIONS PANEL ────────────────────────────────────────────────────
const NotificationsDropdown = ({ notifs, onClose, onMarkAll, onOpenCase }) => {
  const unread = notifs.filter(n => !(n.read || n.isRead)).length;
  const TYPE_ICON = {
    case_submitted:         "📝",
    case_assigned:          "🗂️",
    investigation_completed:"📋",
    case_published:         "✅",
    case_rejected:          "❌",
    new_donation:           "❤️",
  };
  return (
    <div className="kf-notif-dropdown" style={{ position: "absolute", top: 56, right: 0, background: "#fff", borderRadius: 16, width: 340, maxHeight: 480, overflowY: "auto", boxShadow: "0 16px 48px #0003", zIndex: 500, border: `1px solid ${COLORS.border}` }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>🔔 Notifications</div>
        {unread > 0 && <span style={{ background: "#EF4444", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{unread}</span>}
      </div>
      {notifs.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: COLORS.muted }}>
          <div style={{ fontSize: 32 }}>🔕</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>No notifications yet</div>
        </div>
      )}
      {notifs.map((n, i) => (
        <div key={n.id} onClick={() => n.caseId && onOpenCase && onOpenCase(n.caseId)}
          style={{ padding: "12px 20px", borderBottom: i < notifs.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", gap: 12, background: (n.read || n.isRead) ? "#fff" : "#EFF6FF", cursor: n.caseId ? "pointer" : "default" }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICON[n.type] || "🔔"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: (n.read || n.isRead) ? 500 : 700, color: COLORS.text }}>{n.title || n.msg}</div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.message || n.time}</div>
            {n.createdAt && <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 1 }}>{new Date(n.createdAt).toLocaleString()}</div>}
          </div>
          {!(n.read || n.isRead) && <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.primary, flexShrink: 0, marginTop: 5 }} />}
        </div>
      ))}
      {notifs.length > 0 && (
        <div style={{ padding: "12px 20px", textAlign: "center", borderTop: `1px solid ${COLORS.border}` }}>
          <button onClick={onMarkAll} style={{ background: "none", border: "none", color: COLORS.primary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Mark all as read ✓</button>
        </div>
      )}
    </div>
  );
};

// ─── ASSIGN AGENT MODAL ────────────────────────────────────────────────────
const AssignAgentModal = ({ caseItem, agents, onClose, onDone, showToast }) => {
  const [selectedAgent, setSelectedAgent] = useState("");
  const [deadline,      setDeadline]      = useState("");
  const [priority,      setPriority]      = useState(caseItem.urgency_level || "High");
  const [loading,       setLoading]       = useState(false);

  const handle = async () => {
    if (!selectedAgent) return;
    setLoading(true);
    try {
      await adminApi.assign(caseItem.id, selectedAgent, deadline || undefined, priority || undefined);
      showToast(`🗺️ Agent assigned to ${caseItem.ref || caseItem.id} ✓`);
      onDone(caseItem.id, "Under Review");
      onClose();
    } catch (e) { showToast(e.message || "Failed to assign", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`🗺️ Assign Field Agent — ${caseItem.ref || caseItem.id}`} onClose={onClose}>
      <div style={{ marginBottom: 16, background: "#FFF7ED", borderRadius: 12, padding: "14px 18px", border: "1px solid #FED7AA" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{caseItem.victim_name}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>📍 {caseItem.location} · {caseItem.urgency_level} Priority · {caseItem.category || caseItem.status}</div>
        <div style={{ fontSize: 12, color: COLORS.text, marginTop: 8, lineHeight: 1.5 }}>{caseItem.description?.slice(0, 150)}…</div>
      </div>

      <Select label="Select Field Agent *" value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
        <option value="">— Choose an agent —</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
        ))}
      </Select>

      {agents.length === 0 && (
        <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          ⚠️ No field agents found. Register a field_agent account first.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <DatePicker label="Deadline" value={deadline} onChange={e => setDeadline(e.target.value)}
            min={new Date().toISOString().slice(0,10)} style={{ marginBottom: 0 }} />
        </div>
        <Select label="Priority" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="Critical">🚨 Critical</option>
          <option value="High">🔴 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </Select>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={handle} disabled={!selectedAgent || loading} style={{ flex: 2 }}>
          {loading ? "Assigning…" : "🗺️ Assign Agent & Notify"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── ASSIGN DELIVERY MODAL ─────────────────────────────────────────────────
const AssignDeliveryModal = ({ caseItem, agents, onClose, onDone, showToast }) => {
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!selectedAgent) return;
    setLoading(true);
    try {
      await adminApi.assignDelivery(caseItem.id, selectedAgent);
      showToast(`🚚 Delivery agent assigned to ${caseItem.ref || caseItem.id} — they've been notified!`);
      onDone();
      onClose();
    } catch (e) { showToast(e.message || "Failed to assign", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`🚚 Assign Delivery Agent — ${caseItem.ref || caseItem.id || caseItem._caseId}`} onClose={onClose}>
      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: "1px solid #BBF7D0" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#166534" }}>💰 Donation Confirmed — Ready for Delivery</div>
        <div style={{ fontSize: 13, color: COLORS.text, marginTop: 6 }}>{caseItem.victim_name || caseItem._caseTitle}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>📍 {caseItem.location || caseItem._caseCity}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.secondary, marginTop: 6 }}>
          Amount to deliver: ${(caseItem.donation_amount || caseItem._amount || 0).toLocaleString()}
        </div>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16, lineHeight: 1.6 }}>
        Pick a field agent to carry out the aid delivery. They will be notified immediately and must submit a delivery proof document when done.
      </p>
      <Select label="Select Delivery Agent *" value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
        <option value="">— Choose an agent —</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
        ))}
      </Select>
      {agents.length === 0 && (
        <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          ⚠️ No field agents available. Please register a field_agent account first.
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="teal" onClick={handle} disabled={!selectedAgent || loading} style={{ flex: 2 }}>
          {loading ? "Assigning…" : "🚚 Start Delivery & Notify Agent"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── REQUEST MORE INFO MODAL ────────────────────────────────────────────────
const RequestMoreInfoModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await adminApi.requestMoreInfo(caseItem.id, message.trim());
      showToast("📋 Info request sent to reporter");
      onDone && onDone();
      onClose();
    } catch (e) { showToast(e.message || "Failed", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`📋 Request More Information — ${caseItem.ref || caseItem.id}`} onClose={onClose}>
      <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: COLORS.primary }}>
        The reporter will receive a notification asking them to provide additional information before verification can proceed.
      </div>
      <Textarea label="What information is needed? *" value={message} onChange={e => setMessage(e.target.value)}
        placeholder="e.g. Please upload a school letter, provide the guardian's contact number, or clarify the child's current living situation…"
        style={{ minHeight: 100 }} />
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={handle} disabled={!message.trim() || loading} style={{ flex: 2 }}>
          {loading ? "Sending…" : "📋 Send Request to Reporter"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── ENROLL AS BENEFICIARY MODAL ────────────────────────────────────────────
const EnrollBeneficiaryFromCaseModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({
    programId: "",
    programType: "child_sponsorship",
    monthlyNeed: "",
    publicStory: "",
    publicNeedsDesc: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    programsApi.list().then(p => {
      if (Array.isArray(p)) { setPrograms(p); if (p[0]) set("programId", p[0].id); }
    }).catch(() => {});
  }, []);

  const needsDesc = (caseItem._raw?.needsChecklist || []).join(", ") || "";
  const handle = async () => {
    if (!form.programId || !form.monthlyNeed) return showToast("Program and monthly need are required", "error");
    setLoading(true);
    try {
      const result = await adminApi.enrollBeneficiary(caseItem.id, {
        ...form,
        monthlyNeed: parseFloat(form.monthlyNeed),
      });
      showToast(`✅ Enrolled as ${result.publicId} — now seeking sponsor!`);
      onDone && onDone();
      onClose();
    } catch (e) { showToast(e.message || "Failed to enroll", "error"); }
    finally { setLoading(false); }
  };

  const PTYPES = getCat("programTypes");

  return (
    <Modal title={`🌱 Enroll as Program Beneficiary — ${caseItem.ref || caseItem.id}`} onClose={onClose} wide>
      {/* Case summary */}
      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 18px", marginBottom: 20, border: "1px solid #BBF7D0" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#166534" }}>
          {caseItem.victim_name} · 📍 {caseItem.location}
        </div>
        {needsDesc && (
          <div style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>Reported needs: {needsDesc}</div>
        )}
        {caseItem._raw?.programRecommendation && (
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "#065F46", background: "#D1FAE5", display: "inline-block", borderRadius: 20, padding: "2px 10px" }}>
            🔍 Field team recommendation: {caseItem._raw.programRecommendation.replace(/_/g, " ")}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        <div>
          <Select label="Program *" value={form.programId} onChange={e => set("programId", e.target.value)}>
            <option value="">— Select program —</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </Select>
          <Select label="Program Type *" value={form.programType} onChange={e => set("programType", e.target.value)}>
            {PTYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="Monthly Need (USD) *" type="number" value={form.monthlyNeed}
            onChange={e => set("monthlyNeed", e.target.value)} placeholder="e.g. 35" />
          <Input label="Public Needs Description" value={form.publicNeedsDesc}
            onChange={e => set("publicNeedsDesc", e.target.value)}
            placeholder={needsDesc || "e.g. School fees + food + uniform"} />
        </div>
        <div>
          <Textarea label="Public Story (what sponsors will see)" value={form.publicStory}
            onChange={e => set("publicStory", e.target.value)}
            placeholder="Write a safe story without private details — no name, phone, or exact address. Sponsors will see this."
            style={{ minHeight: 160 }} />
        </div>
      </div>

      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginTop: 12, fontSize: 12, color: COLORS.primary }}>
        ℹ️ The case will be marked as <strong>Completed</strong> and the beneficiary will be enrolled with status <strong>Seeking Sponsor</strong>. Private data (name, address, phone) remains hidden from the public profile.
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="success" onClick={handle} disabled={!form.programId || !form.monthlyNeed || loading} style={{ flex: 2 }}>
          {loading ? "Enrolling…" : "🌱 Enroll as Beneficiary"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── REJECT CASE MODAL ──────────────────────────────────────────────────────
const RejectCaseModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await adminApi.updateStatus(caseItem.id, "rejected", "Rejected by admin", reason);
      showToast(`❌ Case ${caseItem.ref || caseItem.id} rejected`);
      onDone(caseItem.id, "Archived");
      onClose();
    } catch (e) { showToast(e.message || "Failed", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`❌ Reject Case — ${caseItem.ref || caseItem.id}`} onClose={onClose}>
      <div style={{ marginBottom: 16, background: "#FEF2F2", borderRadius: 12, padding: "14px 18px", border: "1px solid #FECACA" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{caseItem.victim_name}</div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>{caseItem.location} · {caseItem.status}</div>
      </div>
      <Textarea label="Rejection Reason * (will be sent to reporter)" value={reason}
        onChange={e => setReason(e.target.value)} placeholder="Explain why this case is being rejected…" style={{ minHeight: 100 }} />
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="danger" onClick={handle} disabled={!reason.trim() || loading} style={{ flex: 2 }}>
          {loading ? "Rejecting…" : "❌ Confirm Rejection"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── PUBLISH CASE MODAL ─────────────────────────────────────────────────────
const PublishCaseModal = ({ caseItem, onClose, onDone, showToast }) => {
  const raw = caseItem._raw || {};
  const ai  = raw.aiPublicData  || {};
  const savedImgs = (() => { try { return JSON.parse(localStorage.getItem("kf_case_cover_imgs") || "{}"); } catch { return {}; } })();
  const [form, setForm] = useState({
    publicTitle: ai.generatedTitle || caseItem.victim_name || "",
    publicStory: ai.generatedStory || caseItem.description || "",
    publicCity:  ai.generatedCity  || caseItem.location    || "",
    targetGoal:  raw.targetGoal > 0 ? String(raw.targetGoal) : (raw.fieldInvestigation?.estimatedAmountNeeded > 0 ? String(raw.fieldInvestigation.estimatedAmountNeeded) : ""),
  });
  const [coverDataUrl,  setCoverDataUrl]  = useState(savedImgs[caseItem.id] || null);
  const [coverFileName, setCoverFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const imgInputRef = useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5 MB", "error"); return; }
    setCoverFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverDataUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handle = async () => {
    if (!form.publicTitle || !form.publicStory || !form.targetGoal) return;
    setLoading(true);
    try {
      await adminApi.publish(caseItem.id, { ...form, targetGoal: parseFloat(form.targetGoal), coverImageUrl: coverDataUrl || "" });
      if (coverDataUrl) {
        try {
          const imgs = JSON.parse(localStorage.getItem("kf_case_cover_imgs") || "{}");
          imgs[caseItem.id] = coverDataUrl;
          localStorage.setItem("kf_case_cover_imgs", JSON.stringify(imgs));
        } catch {}
      }
      showToast(`✅ Case ${caseItem.ref || caseItem.id} published to donor portal!`);
      onDone(caseItem.id, "Waiting Sponsor");
      onClose();
    } catch (e) { showToast(e.message || "Failed to publish", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`📢 Publish to Donor Portal — ${caseItem.ref || caseItem.id}`} onClose={onClose} wide>
      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "12px 16px", marginBottom: 20, border: "1px solid #BBF7D0", fontSize: 13, color: "#065F46" }}>
        ✅ Victim's private data (name, phone, GPS) will <strong>never</strong> be shown publicly.
      </div>

      {ai.generatedTitle && (
        <div style={{ background: "#EDE9FE", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#6B21A8" }}>
          🤖 AI-generated content loaded. Review and edit before publishing.
        </div>
      )}

      <Input label="Public Case Title *" value={form.publicTitle} onChange={e => set("publicTitle", e.target.value)}
        placeholder="e.g. Emergency medical support for displaced family" />
      <Textarea label="Public Story *" value={form.publicStory} onChange={e => set("publicStory", e.target.value)}
        placeholder="Describe the situation without revealing private identity details…" style={{ minHeight: 120 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Input label="Public City / Region" value={form.publicCity} onChange={e => set("publicCity", e.target.value)}
          placeholder="e.g. Mogadishu, Hodan" />
        <Input label="Funding Goal (USD) *" type="number" value={form.targetGoal} onChange={e => set("targetGoal", e.target.value)}
          placeholder="e.g. 1500" />
      </div>

      {/* ── Direct image upload ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Cover Photo</div>
        <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
        {coverDataUrl ? (
          <div style={{ position: "relative" }}>
            <img src={coverDataUrl} alt="cover preview"
              style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, border: "2px solid #E5E7EB", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0, transition: "opacity 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}>
              <button onClick={() => imgInputRef.current?.click()}
                style={{ background: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🔄 Change</button>
              <button onClick={() => { setCoverDataUrl(null); setCoverFileName(""); }}
                style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ Remove</button>
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>📎 {coverFileName}</div>
          </div>
        ) : (
          <div onClick={() => imgInputRef.current?.click()}
            style={{ border: `2px dashed ${COLORS.border}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#FAFAFA", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Click to upload cover photo</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>JPG, PNG, WEBP · Max 5 MB · From your device</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="success" onClick={handle} disabled={!form.publicTitle || !form.publicStory || !form.targetGoal || loading} style={{ flex: 2 }}>
          {loading ? "Publishing…" : "📢 Publish to Donors"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── INVESTIGATION MODAL (Field Agent) ─────────────────────────────────────
const InvestigationModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [form, setForm] = useState({
    victimVerified: false,
    situationAccurate: false,
    situationNotes: "",
    estimatedAmountNeeded: "",
    urgencyConfirmed: (caseItem.urgency_level || "medium").toLowerCase(),
    deliveryFeasible: true,
    deliveryMethod: "direct_cash",
    deliveryNotes: "",
    fraudRiskScore: 0,
    fraudRiskLevel: "low",
    fraudRiskNotes: "",
    verificationStatus: "verified",
    officialNotes: "",
    programRecommendation: caseItem._raw?.programRecommendation || (["child_support","education","orphan","family_support"].includes(caseItem._raw?.category) ? "child_sponsorship" : "emergency"),
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (!form.estimatedAmountNeeded || !form.officialNotes) return;
    setLoading(true);
    try {
      await fieldApi.investigate({
        ...form,
        caseId: caseItem.id,
        estimatedAmountNeeded: parseFloat(form.estimatedAmountNeeded),
        fraudRiskScore: parseInt(form.fraudRiskScore),
      });
      showToast(`📋 Investigation report submitted for ${caseItem.ref || caseItem.id} ✓`);
      onDone(caseItem.id, "Awaiting Approval");
      onClose();
    } catch (e) { showToast(e.message || "Failed to submit", "error"); }
    finally { setLoading(false); }
  };

  const Chk = ({ label, k }) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer", userSelect: "none" }}>
      <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)}
        style={{ width: 18, height: 18, cursor: "pointer" }} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
    </label>
  );

  return (
    <Modal title={`📋 Submit Investigation Report — ${caseItem.ref || caseItem.id}`} onClose={onClose} wide>
      {/* Case summary */}
      <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "14px 18px", marginBottom: 20, border: "1px solid #BFDBFE" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{caseItem.victim_name} · {caseItem.location}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{caseItem.description?.slice(0, 200)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 24 }}>
        {/* Left column */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Verification Checks</div>
          <Chk label="✅ Victim identity verified on-site" k="victimVerified" />
          <Chk label="✅ Situation description is accurate" k="situationAccurate" />
          <Chk label="✅ Aid delivery is feasible" k="deliveryFeasible" />

          <Select label="Overall Verification Status *" value={form.verificationStatus} onChange={e => set("verificationStatus", e.target.value)}>
            <option value="verified">✅ Verified — Case is legitimate</option>
            <option value="needs_review">⚠️ Needs Further Review</option>
            <option value="rejected">❌ Rejected — Case is invalid</option>
          </Select>

          <Select label="Confirmed Urgency Level" value={form.urgencyConfirmed} onChange={e => set("urgencyConfirmed", e.target.value)}>
            <option value="critical">🚨 Critical — Immediate action</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </Select>

          <Input label="Estimated Amount Needed (USD) *" type="number" value={form.estimatedAmountNeeded}
            onChange={e => set("estimatedAmountNeeded", e.target.value)} placeholder="e.g. 1200" />
        </div>

        {/* Right column */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Delivery & Risk</div>

          <Select label="Delivery Method" value={form.deliveryMethod} onChange={e => set("deliveryMethod", e.target.value)}>
            <option value="direct_cash">💵 Direct Cash</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="mobile_money">📱 Mobile Money (EVC/Zaad)</option>
            <option value="goods_in_kind">📦 Goods in Kind</option>
            <option value="medical_services">🏥 Medical Services</option>
          </Select>

          <Select label="Program Recommendation" value={form.programRecommendation} onChange={e => set("programRecommendation", e.target.value)}>
            <option value="emergency">🚨 Emergency Response (one-time aid)</option>
            <option value="child_sponsorship">👶 Child Sponsorship (monthly)</option>
            <option value="education">🎓 Education Program (monthly)</option>
            <option value="medical">🩺 Medical Continuity (monthly)</option>
            <option value="family_care">🏠 Family Care Program (monthly)</option>
          </Select>

          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Fraud Risk Assessment</div>
          <Select label="Risk Level" value={form.fraudRiskLevel} onChange={e => set("fraudRiskLevel", e.target.value)}>
            <option value="low">🟢 Low Risk</option>
            <option value="medium">🟡 Medium Risk</option>
            <option value="high">🔴 High Risk — Requires review</option>
          </Select>
          <Input label="Risk Score (0–100)" type="number" min="0" max="100" value={form.fraudRiskScore}
            onChange={e => set("fraudRiskScore", e.target.value)} placeholder="0" />
          <Textarea label="Risk Notes" value={form.fraudRiskNotes}
            onChange={e => set("fraudRiskNotes", e.target.value)} placeholder="Any red flags or concerns…" />
        </div>
      </div>

      {/* Full-width fields */}
      <Textarea label="Field Situation Notes" value={form.situationNotes}
        onChange={e => set("situationNotes", e.target.value)} placeholder="Describe what you observed on the ground…" style={{ minHeight: 80 }} />
      <Textarea label="Official Investigation Report *" value={form.officialNotes}
        onChange={e => set("officialNotes", e.target.value)} placeholder="Write your full official report here. Include all key findings…" style={{ minHeight: 120 }} />

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="success" onClick={handle} disabled={!form.estimatedAmountNeeded || !form.officialNotes || loading} style={{ flex: 2 }}>
          {loading ? "Submitting…" : "📤 Submit Investigation Report"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── VIEW FIELD REPORT MODAL ────────────────────────────────────────────────
const FieldReportModal = ({ caseItem, onClose }) => {
  const fi = caseItem._raw?.fieldInvestigation || caseItem.fieldInvestigation;
  if (!fi) return (
    <Modal title={`📋 Field Report — ${caseItem.ref || caseItem.id}`} onClose={onClose}>
      <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>
        <div style={{ fontSize: 40 }}>📋</div>
        <p>No field investigation report yet.</p>
      </div>
    </Modal>
  );
  const riskColor = { low: COLORS.secondary, medium: "#F59E0B", high: COLORS.danger };
  return (
    <Modal title={`📋 Field Investigation Report — ${caseItem.ref || caseItem.id}`} onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Victim Verified",    val: fi.victimVerified     ? "✅ Yes" : "❌ No",  bg: fi.victimVerified     ? "#D1FAE5" : "#FEE2E2" },
          { label: "Situation Accurate", val: fi.situationAccurate  ? "✅ Yes" : "❌ No",  bg: fi.situationAccurate  ? "#D1FAE5" : "#FEE2E2" },
          { label: "Delivery Feasible",  val: fi.deliveryFeasible   ? "✅ Yes" : "❌ No",  bg: fi.deliveryFeasible   ? "#D1FAE5" : "#FEE2E2" },
          { label: "Status",             val: fi.verificationStatus, bg: fi.verificationStatus === "verified" ? "#D1FAE5" : "#FEE2E2" },
          { label: "Urgency",            val: fi.urgencyConfirmed,   bg: "#DBEAFE" },
          { label: "Est. Amount",        val: fi.estimatedAmountNeeded ? `$${fi.estimatedAmountNeeded}` : "—", bg: "#EDE9FE" },
          { label: "Fraud Risk",         val: `${fi.fraudRiskLevel || "low"} (${fi.fraudRiskScore || 0}/100)`, bg: (riskColor[fi.fraudRiskLevel] || "#eee") + "30" },
          { label: "Delivery Method",    val: fi.deliveryMethod || "—", bg: "#FEF3C7" },
        ].map((item, i) => (
          <div key={i} style={{ background: item.bg, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase" }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{item.val}</div>
          </div>
        ))}
      </div>
      {fi.situationNotes && (
        <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>FIELD NOTES</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{fi.situationNotes}</p>
        </div>
      )}
      {fi.officialNotes && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: "1px solid #BFDBFE" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>📄 OFFICIAL REPORT</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{fi.officialNotes}</p>
        </div>
      )}
      {fi.fraudRiskNotes && (
        <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "14px 16px", border: "1px solid #FECACA" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.danger, marginBottom: 6 }}>⚠️ RISK NOTES</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{fi.fraudRiskNotes}</p>
        </div>
      )}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
};

// ─── DELIVERY PROOF MODAL (Field Agent) ───────────────────────────────────
const DeliveryProofModal = ({ caseItem, onClose, onDone, showToast }) => {
  const rawAmount = caseItem.donation_amount || caseItem._raw?.totalRaised || caseItem.target_goal || 0;
  const [form, setForm] = useState({
    deliveryMethod:  "cash",
    amountDelivered: rawAmount > 0 ? String(rawAmount) : "",
    recipientName:   caseItem._raw?.fieldInvestigation?.recipientName || caseItem.victim_name || "",
    deliveryNotes:   "",
    deliveryDate:    new Date().toISOString().slice(0, 10),
  });
  const [photos,  setPhotos]  = useState([]);
  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(false);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addFiles = (setter, fileList) => {
    const arr = Array.from(fileList || []).map(f => Object.assign(f, { preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null }));
    setter(p => [...p, ...arr]);
  };

  const canSubmit = form.deliveryNotes.trim().length >= 10 && parseFloat(form.amountDelivered) > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const photoFiles = photos.map(f => f instanceof File ? f : null).filter(Boolean);
      const videoFiles = videos.map(f => f instanceof File ? f : null).filter(Boolean);
      await fieldApi.delivery({
        caseId:          caseItem.id,
        deliveryMethod:  form.deliveryMethod,
        amountDelivered: parseFloat(form.amountDelivered),
        recipientName:   form.recipientName || undefined,
        deliveryNotes:   form.deliveryNotes,
        deliveryDate:    new Date(form.deliveryDate).toISOString(),
      }, photoFiles, videoFiles);
      showToast("✅ Delivery proof submitted! Admin will verify and close the case.", "success");
      onDone();
      onClose();
    } catch (e) {
      showToast("Failed: " + (e.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const METHOD_OPTIONS = [
    { val: "cash",              label: "💵 Cash handover" },
    { val: "food_package",      label: "🍱 Food package" },
    { val: "medical_supplies",  label: "💊 Medical supplies" },
    { val: "clothing",          label: "👗 Clothing / blankets" },
    { val: "goods",             label: "📦 General goods" },
    { val: "mixed",             label: "🎁 Mixed (cash + items)" },
  ];

  return (
    <Modal title={`📦 Submit Delivery Proof — ${caseItem.ref || caseItem.id}`} onClose={onClose}>
      {/* Case summary */}
      <div style={{ background: "#F0F9FF", borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: "1px solid #BAE6FD" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>
          {caseItem.victim_name} · 📍 {caseItem.location}
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
          Donation confirmed: <strong>${(caseItem.donation_amount || 0).toLocaleString()}</strong> of goal <strong>${(caseItem.target_goal || 0).toLocaleString()}</strong>
        </div>
      </div>

      {/* Delivery date */}
      <DatePicker label="📅 DELIVERY DATE" value={form.deliveryDate} onChange={e => set("deliveryDate", e.target.value)}
        max={new Date().toISOString().slice(0,10)} />

      {/* Delivery method */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>📦 WHAT WAS DELIVERED</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {METHOD_OPTIONS.map(opt => (
            <button key={opt.val} onClick={() => set("deliveryMethod", opt.val)}
              style={{ padding: "10px 12px", borderRadius: 10, border: `2px solid ${form.deliveryMethod === opt.val ? COLORS.secondary : COLORS.border}`, background: form.deliveryMethod === opt.val ? COLORS.secondary + "10" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: form.deliveryMethod === opt.val ? 700 : 500, textAlign: "left", color: form.deliveryMethod === opt.val ? COLORS.secondary : COLORS.text }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount delivered */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>💵 AMOUNT / VALUE DELIVERED ($)</label>
        <input type="number" min="0" step="0.01" value={form.amountDelivered} onChange={e => set("amountDelivered", e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
      </div>

      {/* Recipient name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>👤 RECIPIENT NAME (who signed / received)</label>
        <input type="text" placeholder="e.g. Amina Hassan or family member name" value={form.recipientName} onChange={e => set("recipientName", e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
      </div>

      {/* Delivery notes */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>📝 DELIVERY NOTES <span style={{ color: COLORS.danger }}>*</span></label>
        <textarea rows={4} placeholder="Describe the delivery: what happened, how the family reacted, any challenges, family's current condition after receiving aid…"
          value={form.deliveryNotes} onChange={e => set("deliveryNotes", e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${form.deliveryNotes.length < 10 && form.deliveryNotes.length > 0 ? COLORS.danger : COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        {form.deliveryNotes.length < 10 && form.deliveryNotes.length > 0 && (
          <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>⚠️ Please write at least 10 characters</div>
        )}
      </div>

      {/* Photo upload (optional) */}
      <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => addFiles(setPhotos, e.target.files)} />
      <input ref={videoRef} type="file" accept="video/*" multiple style={{ display: "none" }} onChange={e => addFiles(setVideos, e.target.files)} />
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          📷 Photos & 🎥 Videos <span style={{ fontWeight: 400, color: COLORS.secondary }}>(optional but recommended)</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <button onClick={() => photoRef.current?.click()}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px dashed ${COLORS.border}`, background: "#FAFAFA", cursor: "pointer", fontSize: 13, fontWeight: 700, color: COLORS.primary }}>
            📷 Add Photos
          </button>
          <button onClick={() => videoRef.current?.click()}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px dashed ${COLORS.border}`, background: "#FAFAFA", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#8B5CF6" }}>
            🎥 Add Videos
          </button>
        </div>
        {(photos.length > 0 || videos.length > 0) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px", background: "#F0FDF4", borderRadius: 10, border: "1px solid #A7F3D0" }}>
            {photos.map((f, i) => (
              <div key={i} style={{ position: "relative" }}>
                {f.preview
                  ? <img src={f.preview} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "2px solid #10B981" }} />
                  : <div style={{ width: 64, height: 64, borderRadius: 8, background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📷</div>
                }
                <button onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                  style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#EF4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ))}
            {videos.map((f, i) => (
              <div key={i} style={{ position: "relative" }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "2px solid #8B5CF6" }}>🎥</div>
                <div style={{ fontSize: 9, color: COLORS.muted, textAlign: "center", maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                <button onClick={() => setVideos(p => p.filter((_, idx) => idx !== i))}
                  style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#EF4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info banner */}
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#166534" }}>
        ℹ️ After submission, the case moves to <strong>"Proof Submitted"</strong>. Admin reviews → marks complete → donor and reporter notified automatically.
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="teal" onClick={handleSubmit} disabled={!canSubmit || loading}>
          {loading ? "Submitting…" : "📤 Submit Delivery Proof"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── COMPLETE CASE MODAL (Admin — after delivery proof) ───────────────────
const CompleteCaseModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [adminNotes,   setAdminNotes]  = useState("");
  const [completing,   setCompleting]  = useState(false);
  const [fullCase,     setFullCase]    = useState(null);
  const [fetching,     setFetching]    = useState(true);

  // Always fetch the full case on open — list endpoint may not include deliveryProof
  useEffect(() => {
    adminApi.getCase(caseItem.id)
      .then(data => setFullCase(data))
      .catch(() => setFullCase(caseItem._raw || null))
      .finally(() => setFetching(false));
  }, [caseItem.id]);

  const proof = fullCase?.deliveryProof;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await adminApi.completeCase(caseItem.id, adminNotes);
      showToast("🏁 Case completed! Donor and reporter have been notified.", "success");
      onDone();
      onClose();
    } catch (e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setCompleting(false);
    }
  };

  const ProofRow = ({ label, val, wide }) => (
    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", ...(wide ? { gridColumn: "1 / -1" } : {}) }}>
      <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, lineHeight: 1.5 }}>{val || "—"}</div>
    </div>
  );

  return (
    <Modal title={`🏁 Review & Complete — ${caseItem.ref || caseItem.id}`} onClose={onClose} wide>

      {/* Case header */}
      <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{caseItem.victim_name}</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>📍 {caseItem.location} · {caseItem.urgency_level} Priority</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.secondary }}>${(caseItem.donation_amount || 0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>donated</div>
        </div>
      </div>

      {/* Delivery proof block */}
      {fetching ? (
        <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "28px 16px", marginBottom: 20, textAlign: "center", color: COLORS.muted }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          Loading delivery proof…
        </div>
      ) : proof ? (
        <div style={{ background: "#F0FDF4", borderRadius: 14, padding: 18, marginBottom: 20, border: "1px solid #BBF7D0" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#166534", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            📦 Delivery Proof
            <span style={{ fontSize: 11, background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>Submitted by Field Agent</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 10 }}>
            <ProofRow label="Delivery Date"    val={proof.deliveryDate ? new Date(proof.deliveryDate).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" }) : null} />
            <ProofRow label="Method"           val={(proof.deliveryMethod || "").replace(/_/g," ")} />
            <ProofRow label="Amount Delivered" val={`$${(proof.amountDelivered || 0).toLocaleString()}`} />
            <ProofRow label="Recipient"        val={proof.recipientName || "Confirmed on-site"} />
          </div>

          {proof.deliveryNotes && (() => {
            // Split notes from extra proof if "--- Additional Proof ---" separator exists
            const parts = proof.deliveryNotes.split("\n\n--- Additional Proof ---\n");
            return (
              <>
                <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", marginBottom: parts[1] ? 8 : 0 }}>
                  <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, marginBottom: 6 }}>FIELD AGENT DELIVERY NOTES</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: COLORS.text, whiteSpace: "pre-wrap" }}>{parts[0]}</p>
                </div>
                {parts[1] && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "12px 14px", border: "1px solid #BFDBFE" }}>
                    <div style={{ fontSize: 10, color: COLORS.primary, fontWeight: 700, marginBottom: 6 }}>📎 ADDITIONAL PROOF / OBSERVATIONS</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: COLORS.text, whiteSpace: "pre-wrap" }}>{parts[1]}</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "18px 20px", marginBottom: 20, border: "1px solid #FDE68A" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>⚠️ No Delivery Proof Yet</div>
          <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
            The field agent has not submitted a delivery proof document yet.<br />
            You can still mark the case complete if you have confirmed delivery through other means — use the notes below to document it.
          </div>
        </div>
      )}

      {/* Admin closing notes */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>
          📝 YOUR CONFIRMATION NOTES {!proof && <span style={{ color: COLORS.danger }}>*</span>}
        </label>
        <textarea rows={4}
          placeholder={proof
            ? "Optional: confirm delivery, add feedback, note any follow-up needed…"
            : "Required when no proof submitted: describe how you confirmed delivery (phone call, field visit, witness, etc.)"}
          value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${!proof && !adminNotes.trim() ? "#FCA5A5" : COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        {!proof && !adminNotes.trim() && (
          <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>⚠️ Please describe how you confirmed delivery before completing</div>
        )}
      </div>

      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: COLORS.primary }}>
        ℹ️ Marking complete notifies the <strong>reporter</strong> and all <strong>donors</strong> automatically. This action cannot be undone.
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="success" onClick={handleComplete}
          disabled={completing || fetching || (!proof && !adminNotes.trim())}>
          {completing ? "Completing…" : "🏁 Mark Case Complete"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── FULL CASE REPORT MODAL (super_admin only) ────────────────────────────
const CaseFullReportModal = ({ caseId, onClose }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    adminApi.getCase(caseId)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  const fmt = (iso) => iso ? new Date(iso).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" }) : "—";
  const money = (n) => n != null ? `$${Number(n).toLocaleString()}` : "—";

  const Section = ({ title, color = COLORS.primary, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: color, color: "#fff", borderRadius: "10px 10px 0 0", padding: "10px 18px", fontSize: 13, fontWeight: 800, letterSpacing: 0.5 }}>
        {title}
      </div>
      <div style={{ border: `1px solid ${color}30`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 16 }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ label, val, mono, danger, success }) => (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, minWidth: 170, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: danger ? COLORS.danger : success ? COLORS.secondary : COLORS.text, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
        {val ?? "—"}
      </div>
    </div>
  );

  const handlePrint = () => {
    const el = document.getElementById("kf-full-report");
    if (!el) return;

    const printStyles = `
      body { font-family: 'Segoe UI', sans-serif; color: #1a202c; padding: 32px; max-width: 900px; margin: 0 auto; }
      h1 { font-size: 22px; color: #004B96; margin-bottom: 4px; }
      .sub { font-size: 13px; color: #5A6E8A; margin-bottom: 28px; }
      .section-title { background: #004B96; color: #fff; padding: 8px 16px; font-size: 12px; font-weight: 800; border-radius: 6px 6px 0 0; letter-spacing: 0.5px; margin-top: 20px; }
      .section-body { border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 6px 6px; padding: 12px 16px; }
      .row { display: flex; gap: 12px; padding: 5px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
      .label { color: #5A6E8A; font-weight: 700; min-width: 170px; }
      .val { color: #1a202c; font-weight: 500; }
      .green { color: #065F46; } .red { color: #C0392B; } .blue { color: #004B96; }
      .notes { background: #f8fafc; border-radius: 6px; padding: 10px 14px; font-size: 13px; line-height: 1.7; white-space: pre-wrap; margin-top: 6px; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #f8fafc; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #5A6E8A; border-bottom: 1px solid #e2e8f0; }
      td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
      .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      body::after { content: "Kafaale Qaad Hope Society"; position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 60px; font-weight: 900; color: rgba(0,75,150,0.07); white-space: nowrap; pointer-events: none; z-index: 9999; letter-spacing: 4px; }
      @media print { body { padding: 0; } body::after { position: fixed; } }
    `;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kafaale Case Report — ${caseId}</title><style>${printStyles}</style></head><body>${el.innerHTML}</body></html>`;
    openPrintWindow(html, `Case Report ${caseId}`);
  };

  if (loading) return (
    <Modal title="📄 Full Case Report" onClose={onClose} wide>
      <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        Loading full case data…
      </div>
    </Modal>
  );

  if (error || !data) return (
    <Modal title="📄 Full Case Report" onClose={onClose} wide>
      <div style={{ padding: "40px 0", textAlign: "center", color: COLORS.danger }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>❌</div>
        Failed to load case: {error}
      </div>
    </Modal>
  );

  const fi    = data.fieldInvestigation;
  const ai    = data.aiPublicData;
  const dp    = data.deliveryProof;
  const dons  = data.donations || [];
  const audit = data.auditLogs  || [];
  const confirmedDons = dons.filter(d => d.status === "confirmed");
  const totalRaised   = confirmedDons.reduce((a, d) => a + (d.amount || 0), 0);

  // Split delivery notes from extra proof
  const proofParts = dp?.deliveryNotes?.split("\n\n--- Additional Proof ---\n") || [];

  // Build timeline from audit + key dates
  const timeline = [
    data.createdAt            && { time: data.createdAt,              event: "📝 Case submitted by reporter" },
    data.teamAssignedAt       && { time: data.teamAssignedAt,         event: "🗺️ Field team assigned" },
    data.investigationCompletedAt && { time: data.investigationCompletedAt, event: "🔍 Field investigation completed" },
    data.adminPublishedAt     && { time: data.adminPublishedAt,       event: "✅ Case approved & published for sponsorship" },
    dons[0]?.createdAt        && { time: dons[0].createdAt,           event: `❤️ First donation received (${money(dons[0].amount)})` },
    dp?.deliveryDate          && { time: dp.deliveryDate,             event: "📦 Aid delivered by field agent" },
    data.completedAt          && { time: data.completedAt,            event: "🏁 Case completed & closed by admin" },
  ].filter(Boolean).sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <Modal title={`📄 Full Case Report — ${data.id}`} onClose={onClose} wide>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>🏁 {data.status?.replace(/_/g," ").toUpperCase()}</span>
          <span style={{ background: COLORS.primary + "15", color: COLORS.primary, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>🔐 SUPER ADMIN ONLY</span>
        </div>
        <Btn variant="primary" onClick={handlePrint}>🖨️ Print / Export PDF</Btn>
      </div>

      <div id="kf-full-report" style={{ position: "relative" }}>
        {/* Watermark overlay */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none", zIndex: 0, overflow: "hidden",
        }}>
          <div style={{
            fontSize: 52, fontWeight: 900, color: "rgba(0,75,150,0.06)",
            transform: "rotate(-35deg)", whiteSpace: "nowrap", letterSpacing: 4, userSelect: "none",
          }}>
            Kafaale Qaad Hope Society
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
        {/* Print header (visible on print) */}
        <div style={{ marginBottom: 24, borderBottom: `3px solid ${COLORS.primary}`, paddingBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.primary }}>🤝 KAFAALE QAAD — Humanitarian Case Report</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Case ID: <strong>{data.id}</strong> · Generated: {fmt(new Date().toISOString())} · CONFIDENTIAL — Super Admin Only</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.secondary }}>{money(totalRaised)}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>total raised</div>
            </div>
          </div>
        </div>

        {/* ── 1. Case Overview ── */}
        <Section title="1. CASE OVERVIEW" color={COLORS.primary}>
          <Row label="Case ID"           val={data.id} mono />
          <Row label="Status"            val={data.status?.replace(/_/g," ").toUpperCase()} />
          <Row label="Category"          val={data.category || "—"} />
          <Row label="Emergency Level"   val={data.emergencyLevel?.toUpperCase()} danger={data.emergencyLevel === "critical"} />
          <Row label="Date Submitted"    val={fmt(data.createdAt)} />
          <Row label="Date Completed"    val={fmt(data.completedAt)} success={!!data.completedAt} />
          <Row label="Public Title"      val={data.publicTitle || "Not published"} />
          <Row label="Public City"       val={data.publicCity  || "—"} />
          <Row label="Target Goal"       val={money(data.targetGoal)} />
          <Row label="Total Raised"      val={money(data.totalRaised)} success />
        </Section>

        {/* ── 2. Victim (Private) ── */}
        <Section title="2. VICTIM — PRIVATE INFORMATION" color="#7C3AED">
          <Row label="Full Name"         val={data.privateVictimName || "—"} />
          <Row label="Age"               val={data.privateVictimAge  || "—"} />
          <Row label="Gender"            val={data.privateVictimGender || "—"} />
          <Row label="Private Address"   val={data.privateAddress    || "—"} />
          <Row label="Phone / Contact"   val={data.privatePhone      || "—"} />
          <Row label="Description"       val="" />
          {data.privateDescription && (
            <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "12px 14px", marginTop: 6, fontSize: 13, lineHeight: 1.7, color: COLORS.text, whiteSpace: "pre-wrap" }}>
              {data.privateDescription}
            </div>
          )}
        </Section>

        {/* ── 3. Reporter ── */}
        <Section title="3. REPORTED BY" color="#0E7490">
          <Row label="Name"              val={data.reporter?.name  || "—"} />
          <Row label="Email"             val={data.reporter?.email || "—"} />
          <Row label="Phone"             val={data.reporter?.phone || "—"} />
          <Row label="Reporter ID"       val={data.reporter?.id    || "—"} mono />
        </Section>

        {/* ── 4. Field Investigation ── */}
        <Section title="4. FIELD INVESTIGATION REPORT" color="#D97706">
          {fi ? (
            <>
              <Row label="Assigned Agent"    val={data.assignedAgent?.name  || "—"} />
              <Row label="Agent Email"       val={data.assignedAgent?.email || "—"} />
              <Row label="Agent Phone"       val={data.assignedAgent?.phone || "—"} />
              <Row label="Completed At"      val={fmt(data.investigationCompletedAt)} />
              <Row label="Victim Verified"   val={fi.victimVerified    ? "✅ YES" : "❌ NO"} success={fi.victimVerified}    danger={!fi.victimVerified} />
              <Row label="Situation Accurate"val={fi.situationAccurate ? "✅ YES" : "❌ NO"} success={fi.situationAccurate} danger={!fi.situationAccurate} />
              <Row label="Delivery Feasible" val={fi.deliveryFeasible  ? "✅ YES" : "❌ NO"} success={fi.deliveryFeasible}  danger={!fi.deliveryFeasible} />
              <Row label="Verification"      val={fi.verificationStatus?.toUpperCase()} success={fi.verificationStatus === "verified"} danger={fi.verificationStatus === "rejected"} />
              <Row label="Urgency Confirmed" val={fi.urgencyConfirmed?.toUpperCase()} />
              <Row label="Est. Amount Needed"val={money(fi.estimatedAmountNeeded)} />
              <Row label="Delivery Method"   val={fi.deliveryMethod || "—"} />
              <Row label="Fraud Risk Level"  val={`${fi.fraudRiskLevel?.toUpperCase()} (${fi.fraudRiskScore}/100)`} danger={fi.fraudRiskLevel === "high"} />
              {fi.situationNotes && <>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>FIELD NOTES</div>
                <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{fi.situationNotes}</div>
              </>}
              {fi.officialNotes && <>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>OFFICIAL REPORT</div>
                <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #BFDBFE" }}>{fi.officialNotes}</div>
              </>}
              {fi.fraudRiskNotes && <>
                <div style={{ fontSize: 11, color: COLORS.danger, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>⚠️ FRAUD RISK NOTES</div>
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #FECACA" }}>{fi.fraudRiskNotes}</div>
              </>}
            </>
          ) : (
            <div style={{ color: COLORS.muted, fontSize: 13, padding: "8px 0" }}>No field investigation on record.</div>
          )}
        </Section>

        {/* ── 5. AI Sanitization ── */}
        {ai && (
          <Section title="5. AI SANITIZATION DATA" color="#6B21A8">
            <Row label="Generated Title"   val={ai.generatedTitle || "—"} />
            <Row label="Confidence Score"  val={ai.confidenceScore != null ? `${ai.confidenceScore}%` : "—"} />
            {ai.publicStory && <>
              <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>AI-GENERATED PUBLIC STORY</div>
              <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ai.publicStory}</div>
            </>}
          </Section>
        )}

        {/* ── 6. Sponsorship & Donations ── */}
        <Section title="6. SPONSORSHIP & DONATIONS" color={COLORS.secondary}>
          <Row label="Published for Sponsors" val={fmt(data.adminPublishedAt)} />
          <Row label="Target Goal"         val={money(data.targetGoal)} />
          <Row label="Total Raised"        val={money(totalRaised)} success />
          <Row label="Number of Donors"    val={confirmedDons.length} />
          {dons.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginBottom: 8 }}>ALL DONATIONS</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Donor","Amount","Method","Date","Status"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}`, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dons.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "8px 10px" }}>{d.isAnonymous ? "Anonymous" : (d.donor?.name || "—")}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: COLORS.secondary }}>{money(d.amount)}</td>
                      <td style={{ padding: "8px 10px", color: COLORS.muted }}>{(d.method || "—").replace(/_/g," ")}</td>
                      <td style={{ padding: "8px 10px", color: COLORS.muted }}>{fmtDate(d.createdAt)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ background: d.status === "confirmed" ? "#D1FAE5" : "#FEF3C7", color: d.status === "confirmed" ? "#065F46" : "#92400E", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── 7. Delivery Proof ── */}
        <Section title="7. DELIVERY PROOF" color="#0891B2">
          {dp ? (
            <>
              <Row label="Delivered By (Agent ID)" val={dp.deliveredBy} mono />
              <Row label="Delivery Date"       val={fmtDate(dp.deliveryDate)} success />
              <Row label="Delivery Method"     val={(dp.deliveryMethod || "—").replace(/_/g," ")} />
              <Row label="Amount Delivered"    val={money(dp.amountDelivered)} success />
              <Row label="Recipient Name"      val={dp.recipientName || "Confirmed on-site"} />
              <Row label="Admin Confirmed"     val={dp.adminConfirmed ? `✅ Yes — ${fmtDate(dp.adminConfirmedAt)}` : "Pending"} success={dp.adminConfirmed} />
              {proofParts[0] && <>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>AGENT DELIVERY NOTES</div>
                <div style={{ background: "#ECFDF5", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #BBF7D0" }}>{proofParts[0]}</div>
              </>}
              {proofParts[1] && <>
                <div style={{ fontSize: 11, color: COLORS.primary, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>📎 ADDITIONAL PROOF / OBSERVATIONS</div>
                <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #BFDBFE" }}>{proofParts[1]}</div>
              </>}
              {dp.adminNotes && <>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>ADMIN CLOSING NOTES</div>
                <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{dp.adminNotes}</div>
              </>}
            </>
          ) : (
            <div style={{ color: COLORS.muted, fontSize: 13, padding: "8px 0" }}>No delivery proof on record.</div>
          )}
        </Section>

        {/* ── 8. Case Timeline ── */}
        <Section title="8. CASE TIMELINE" color="#374151">
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: COLORS.border }} />
            {timeline.map((t, i) => (
              <div key={i} style={{ position: "relative", marginBottom: 14 }}>
                <div style={{ position: "absolute", left: -24, top: 3, width: 12, height: 12, borderRadius: "50%", background: i === timeline.length - 1 ? COLORS.secondary : COLORS.primary, border: "2px solid #fff", boxShadow: "0 0 0 2px " + (i === timeline.length - 1 ? COLORS.secondary : COLORS.primary) }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{t.event}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{fmt(t.time)}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 9. Admin Audit Log ── */}
        <Section title="9. ADMIN AUDIT LOG" color="#4B5563">
          {audit.length === 0 ? (
            <div style={{ color: COLORS.muted, fontSize: 13 }}>No audit entries.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Timestamp","Admin","Action","Notes"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}`, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...audit].reverse().map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "8px 10px", color: COLORS.muted, whiteSpace: "nowrap" }}>{fmt(log.timestamp)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700 }}>{log.admin?.name || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ background: COLORS.primary + "15", color: COLORS.primary, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{log.action}</span>
                    </td>
                    <td style={{ padding: "8px 10px", color: COLORS.muted }}>{log.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, paddingTop: 16, borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.muted }}>
          <strong style={{ color: COLORS.primary }}>KAFAALE QAAD</strong> · Kafaale Qaad Hope Society · Confidential Case Report · {fmt(new Date().toISOString())} · For Super Admin review only
        </div>
        </div>{/* end zIndex:1 wrapper */}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
        <Btn variant="ghost"   onClick={onClose}>Close</Btn>
        <Btn variant="primary" onClick={handlePrint}>🖨️ Print / Save as PDF</Btn>
      </div>
    </Modal>
  );
};

// ─── ANALYTICS DASHBOARD ───────────────────────────────────────────────────
const AnalyticsDashboard = ({ cases, donations }) => {
  const totalCases     = cases.length;
  const completedCases = cases.filter(c => c.status === "Completed").length;
  const urgentCases    = cases.filter(c => c.urgency_level === "Critical").length;
  const totalFunded    = donations.reduce((a, d) => a + d.amount, 0);
  const avgDonation    = donations.length > 0 ? (totalFunded / donations.length).toFixed(0) : 0;
  const completionRate = totalCases > 0 ? ((completedCases / totalCases) * 100).toFixed(1) : 0;
  const casesByStatus  = WORKFLOW_STEPS.reduce((acc, s) => { acc[s.label] = cases.filter(c => c.status === s.status).length; return acc; }, {});

  return (
    <div>
      {/* Gradient KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { val: totalCases,             label: "Total Cases",      sub: "↑ 12% this month", grad: "135deg, #004B96 0%, #4B7D19 100%" },
          { val: completedCases,         label: "Completed",        sub: `${completionRate}% completion rate`, grad: "135deg, #10B981 0%, #059669 100%" },
          { val: `$${totalFunded.toLocaleString()}`, label: "Total Donated", sub: `Avg $${avgDonation} / donation`, grad: "135deg, #EC4899 0%, #DB2777 100%" },
          { val: urgentCases,            label: "Critical Cases",   sub: "Require immediate action", grad: "135deg, #EF4444 0%, #DC2626 100%" },
        ].map((k, i) => (
          <div key={i} style={{ background: `linear-gradient(${k.grad})`, borderRadius: 16, padding: 24, color: "#fff", boxShadow: "0 4px 16px #0002" }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{k.val}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 10, opacity: 0.65, marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Case pipeline bar chart */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>📊 Case Distribution by Status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(casesByStatus).map(([status, count]) => (
              <div key={status}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  <span>{WORKFLOW_STEPS.find(s => s.label === status)?.icon} {status}</span>
                  <span style={{ color: COLORS.primary, fontWeight: 800 }}>{count}</span>
                </div>
                <div style={{ height: 20, background: "#F3F4F6", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: WORKFLOW_STEPS.find(s => s.label === status)?.color || COLORS.primary, width: totalCases > 0 ? `${(count / totalCases) * 100}%` : "0%", borderRadius: 6, transition: "width 0.5s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donation trend bar chart */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>💰 Donation Trends</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160, paddingBottom: 8 }}>
            {[{ month: "March", amount: 1800 }, { month: "April", amount: 2400 }, { month: "May", amount: 2500 }].map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: `${(d.amount / 3000) * 120}px`, background: `linear-gradient(180deg, ${COLORS.accent} 0%, ${COLORS.secondary} 100%)`, borderRadius: "8px 8px 0 0", marginBottom: 8, minHeight: 20 }} />
                <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.text }}>${d.amount.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{d.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Urgency distribution */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>🚦 Cases by Urgency Level</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16 }}>
          {["Critical", "High", "Medium", "Low"].map(level => {
            const count = cases.filter(c => c.urgency_level === level).length;
            return (
              <div key={level} style={{ textAlign: "center", padding: 20, background: URGENCY[level] + "12", borderRadius: 14, border: `2px solid ${URGENCY[level]}30` }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: URGENCY[level] }}>{count}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginTop: 6 }}>{level}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{totalCases > 0 ? ((count / totalCases) * 100).toFixed(1) : 0}% of cases</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team performance */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>🏆 Team Performance Metrics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {[
            { team: "Field Team Alpha",   investigations: 12, completed: 10, avgTime: "3.2 days", rating: 4.8 },
            { team: "Field Team Beta",    investigations: 9,  completed: 7,  avgTime: "4.1 days", rating: 4.5 },
            { team: "Verification Team",  investigations: 8,  completed: 8,  avgTime: "2.8 days", rating: 4.9 },
          ].map((team, i) => (
            <div key={i} style={{ background: "#F8FAFC", borderRadius: 12, padding: 20, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: COLORS.primary }}>{team.team}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 2 }}>
                <div>📊 Investigations: <strong style={{ color: COLORS.text }}>{team.investigations}</strong></div>
                <div>✅ Completed: <strong style={{ color: COLORS.secondary }}>{team.completed}</strong></div>
                <div>⏱️ Avg Time: <strong style={{ color: COLORS.text }}>{team.avgTime}</strong></div>
                <div>⭐ Rating: <strong style={{ color: COLORS.accent }}>{team.rating}/5</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── CASE TABLE ─────────────────────────────────────────────────────────────
const CaseTable = ({ cases, onView, compact, onReport, onPublish }) => (
  <div className="kf-table-wrap">
    {cases.length === 0 ? (
      <div style={{ padding: 32, textAlign: "center", color: COLORS.muted, fontSize: 14 }}>No cases found</div>
    ) : (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["ID", "Name", "Location", "Urgency", "Status", "Action"].map(h => (
              <th key={h} style={{ padding: compact ? "10px 12px" : "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cases.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: i < cases.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px", fontSize: 12, fontWeight: 700, color: COLORS.primary }}>{c.ref}</td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.victim_name}</div>
                {!compact && <div style={{ fontSize: 11, color: COLORS.muted }}>{c.age} yrs · {c.gender}</div>}
              </td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px", fontSize: 12, color: COLORS.muted }}>📍 {c.location}</td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px" }}><UrgencyBadge level={c.urgency_level} /></td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px" }}><Badge status={c.status} /></td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Btn variant="ghost" size="sm" onClick={() => onView(c)}>View →</Btn>
                  {onPublish && ["Awaiting Approval","Pending Verification"].includes(c.status) && (
                    <Btn variant="success" size="sm" onClick={() => onPublish(c)}>📢 Publish</Btn>
                  )}
                  {onReport && c.status === "Completed" && (
                    <Btn variant="primary" size="sm" onClick={() => onReport(c.id)}>📄 Report</Btn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

// ─── ROLE DASHBOARDS ─────────────────────────────────────────────────────────
// Reporter case status pipeline tracker
const CaseStatusTracker = ({ status }) => {
  const PIPELINE = [
    { key: "Pending Verification", label: "Submitted",     icon: "📝" },
    { key: "Under Review",         label: "Under Review",  icon: "🔍" },
    { key: "Investigating",        label: "Field Visit",   icon: "🕵️" },
    { key: "Awaiting Approval",    label: "Admin Review",  icon: "🏛️" },
    { key: "Waiting Sponsor",      label: "Finding Donor", icon: "🤝" },
    { key: "Sponsored",            label: "Sponsored",     icon: "❤️" },
    { key: "Aid Delivered",        label: "Aid Sent",      icon: "📦" },
    { key: "Completed",            label: "Completed",     icon: "✅" },
  ];
  const idx = PIPELINE.findIndex(s => s.key === status);
  const isRejected = status === "Archived";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, flexWrap: "wrap" }}>
      {isRejected
        ? <span style={{ fontSize: 12, background: "#FEE2E2", color: COLORS.danger, borderRadius: 20, padding: "4px 12px", fontWeight: 700 }}>❌ Case Rejected — see details</span>
        : PIPELINE.map((step, i) => {
          const done    = i < idx;
          const current = i === idx;
          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div title={step.label} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: current ? COLORS.primary : done ? COLORS.secondary + "25" : "#F3F4F6",
                color:      current ? "#fff"          : done ? COLORS.secondary       : COLORS.muted,
                border:     current ? "none"          : done ? `1px solid ${COLORS.secondary}40` : `1px solid ${COLORS.border}`,
              }}>
                {step.icon} <span style={{ display: window.innerWidth > 480 ? "inline" : "none" }}>{step.label}</span>
              </div>
              {i < PIPELINE.length - 1 && <span style={{ color: current || done ? COLORS.secondary : COLORS.border, fontSize: 12 }}>›</span>}
            </div>
          );
        })
      }
    </div>
  );
};

// ─── PUBLIC USER DASHBOARD — reporter + donor combined ────────────────────────
const PublicUserDashboard = ({ cases, currentUser, onReport, onViewCase, onSponsor, realRole }) => {
  const C = COLORS;
  // default tab: reporters start on "reports", donors start on "sponsor"
  const [tab, setTab] = useState(realRole === "donor" ? "sponsor" : "reports");
  const [myDonations, setMyDonations] = useState([]);
  const [loadingDons, setLoadingDons] = useState(true);

  useEffect(() => {
    donations.my()
      .then(data => { if (Array.isArray(data)) setMyDonations(data); })
      .catch(() => {})
      .finally(() => setLoadingDons(false));
  }, []);

  // Split cases: user's own submitted cases vs public cases to sponsor
  const myCases     = cases.filter(c => c._isMine || c._raw?.reporterId === currentUser?.id || c._raw?.reporter?.id === currentUser?.id);
  const publicCases = cases.filter(c => ["Waiting Sponsor", "Sponsored"].includes(c.status));

  const myPending   = myCases.filter(c => c.status === "Pending Verification").length;
  const myActive    = myCases.filter(c => !["Pending Verification","Completed"].includes(c.status)).length;
  const myCompleted = myCases.filter(c => c.status === "Completed").length;

  const totalGiven      = myDonations.reduce((a, d) => a + (d.amount || 0), 0);
  const confirmedGiven  = myDonations.filter(d => d.status === "confirmed").reduce((a, d) => a + (d.amount || 0), 0);

  const DON_STATUS_COLOR = { confirmed:"#065F46", pending:"#92400E", rejected:"#991B1B" };
  const DON_STATUS_BG    = { confirmed:"#D1FAE5", pending:"#FEF3C7", rejected:"#FEE2E2" };

  const [mySponsorships, setMySponsorships] = useState([]);
  const [sponsorInvoice,  setSponsorInvoice]  = useState(null);
  const [sponsorReport,   setSponsorReport]   = useState(null);
  const [loadingSpons,    setLoadingSpons]    = useState(true);
  const [invoiceEditMode, setInvoiceEditMode] = useState(false);
  const DEFAULT_INVOICE_SETTINGS = {
    orgName:       "Kafaale Qaad",
    orgSub:        "Humanitarian Relief Organization",
    orgCountry:    "Somalia · kafaaleqaad.org",
    bankName:      "Kafaale Qaad",
    bankIBAN:      "SO00 0000 0000 0000 0000",
    bankBIC:       "CAFGSO1X",
    mobileNumber:  "+252 61 502 4050",
    mobileName:    "Kafaale Qaad",
    footerMsg:     "Thank you for your generous support. Please include the invoice number as your payment reference.",
    description:   "Monthly Sponsorship Support",
  };
  const [invoiceSettings, setInvoiceSettings] = useState(() => {
    try { return { ...DEFAULT_INVOICE_SETTINGS, ...JSON.parse(localStorage.getItem("kf_invoice_settings") || "{}") }; }
    catch { return DEFAULT_INVOICE_SETTINGS; }
  });
  const saveInvoiceSettings = (s) => {
    setInvoiceSettings(s);
    localStorage.setItem("kf_invoice_settings", JSON.stringify(s));
  };

  useEffect(() => {
    programsApi.mySponsorships()
      .then(data => { if (Array.isArray(data)) setMySponsorships(data); })
      .catch(() => {})
      .finally(() => setLoadingSpons(false));
  }, []);

  const handlePayNow = async (spId) => {
    try {
      await programsApi.submitPayment(spId, {});
      showToast("✅ Payment submitted — admin will confirm receipt.");
      programsApi.mySponsorships().then(d => Array.isArray(d) && setMySponsorships(d));
    } catch { showToast("Failed to submit payment", "error"); }
  };

  const handleViewInvoice = async (spId) => {
    try { setSponsorInvoice(await programsApi.getInvoice(spId)); } catch { showToast("Could not load invoice", "error"); }
  };

  const handleViewReport = async (spId) => {
    const now = new Date();
    try { setSponsorReport(await programsApi.getMonthlyReport(spId, now.getFullYear(), now.getMonth()+1)); }
    catch { showToast("No report available yet for this month", "error"); }
  };

  const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const SPONS_STATUS = { active:{ label:"Active", color:"#065F46", bg:"#D1FAE5" }, paused:{ label:"Paused", color:"#92400E", bg:"#FEF3C7" }, cancelled:{ label:"Ended", color:"#991B1B", bg:"#FEE2E2" } };

  const TABS = [
    { id: "reports",  icon: "📋", label: "My Reports",        count: myCases.length },
    { id: "sponsor",  icon: "❤️", label: "Sponsor Cases",      count: publicCases.length },
    { id: "programs", icon: "🌱", label: "My Program Support", count: mySponsorships.length },
    { id: "history",  icon: "💰", label: "Donation History",   count: myDonations.length },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800 }}>
            {realRole === "donor" ? "❤️" : "📝"} {currentUser.fullname}'s Dashboard
          </h2>
          <p style={{ margin:"4px 0 0", color:C.muted, fontSize:13 }}>
            You can both submit reports and sponsor cases — switch tabs below.
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="outline" size="sm" onClick={() => setTab("sponsor")}>❤️ Sponsor a Case</Btn>
          <Btn variant="primary" size="sm" onClick={onReport}>+ Submit Report</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:`2px solid ${C.border}`, marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"10px 22px", fontSize:13, fontWeight:700, border:"none", background:"none", cursor:"pointer",
            color: tab === t.id ? C.primary : C.muted,
            borderBottom: tab === t.id ? `2px solid ${C.primary}` : "2px solid transparent",
            marginBottom:-2, display:"flex", alignItems:"center", gap:6,
          }}>
            {t.icon} {t.label}
            {t.count > 0 && (
              <span style={{ background: tab === t.id ? C.primary : C.border, color: tab === t.id ? "#fff" : C.muted, borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:800 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── MY REPORTS tab ── */}
      {tab === "reports" && (
        <div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
            <StatCard label="Total Reports"  value={myCases.length}  icon="📋" color={C.primary}   />
            <StatCard label="Pending Review" value={myPending}       icon="⏳" color="#F59E0B"     />
            <StatCard label="In Progress"    value={myActive}        icon="🔄" color="#8B5CF6"     />
            <StatCard label="Completed"      value={myCompleted}     icon="✅" color={C.secondary} />
          </div>

          {myCases.length === 0 ? (
            <div style={{ background:"#fff", borderRadius:16, padding:40, textAlign:"center", boxShadow:"0 2px 8px #0001" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📝</div>
              <div style={{ fontSize:17, fontWeight:700 }}>No reports submitted yet</div>
              <div style={{ fontSize:13, color:C.muted, margin:"8px auto 20px", maxWidth:380 }}>
                Report a case in your community and our field team will verify it within 48 hours.
              </div>
              <Btn variant="primary" onClick={onReport}>Submit Your First Report →</Btn>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {myCases.map(c => (
                <div key={c.id} style={{ background:"#fff", borderRadius:14, padding:18, boxShadow:"0 2px 8px #0001", border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:8, marginBottom:6, flexWrap:"wrap", alignItems:"center" }}>
                        <span style={{ fontSize:11, fontWeight:700, color:C.primary, background:C.primary+"12", borderRadius:20, padding:"2px 10px" }}>{c.ref}</span>
                        <UrgencyBadge level={c.urgency_level} />
                        <Badge status={c.status} />
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{c.description?.slice(0,70) || "Case report"}</div>
                      <div style={{ fontSize:12, color:C.muted }}>📍 {c.location || "Location pending"}</div>
                    </div>
                    <Btn variant="outline" size="sm" onClick={() => onViewCase(c)}>View →</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SPONSOR CASES tab ── */}
      {tab === "sponsor" && (
        <div>
          {publicCases.length === 0 ? (
            <div style={{ background:"#fff", borderRadius:16, padding:40, textAlign:"center", boxShadow:"0 2px 8px #0001" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>❤️</div>
              <div style={{ fontSize:17, fontWeight:700 }}>No cases open for sponsorship right now</div>
              <div style={{ fontSize:13, color:C.muted, margin:"8px auto 20px", maxWidth:380 }}>
                Check back soon — verified cases are published regularly.
              </div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:16 }}>
              {publicCases.map(c => {
                const goal   = c._raw?.targetGoal  || 0;
                const raised = c._raw?.totalRaised || 0;
                const pct    = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                const remain = Math.max(0, goal - raised);
                return (
                  <div key={c.id} style={{ background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 2px 10px #0001", border:`1px solid ${C.border}` }}>
                    <div style={{ height:8, background:`linear-gradient(90deg,${C.primary},${C.accent})` }} />
                    <div style={{ padding:18 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                        <Badge status={c.status} />
                        <UrgencyBadge level={c.urgency_level} />
                      </div>
                      <div style={{ fontSize:14, fontWeight:800, color:C.navy, marginBottom:4, lineHeight:1.3 }}>
                        {c._raw?.publicTitle || c.victim_name || "Verified Case"}
                      </div>
                      <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>📍 {c._raw?.publicCity || c.location || "Somalia"}</div>
                      {goal > 0 && (
                        <div style={{ marginBottom:14 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:15, fontWeight:900, color:pct>=100?C.secondary:C.primary }}>{pct}% <span style={{ fontSize:11, fontWeight:600, color:C.muted }}>funded</span></span>
                            <span style={{ fontSize:12, fontWeight:700 }}>${goal.toLocaleString()} {pct>=100?"✓":"needed"}</span>
                          </div>
                          <div style={{ background:C.bg, borderRadius:10, height:6 }}>
                            <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${C.primary},${C.accent})`, borderRadius:10 }} />
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.muted, marginTop:3 }}>
                            <span>${raised.toLocaleString()} raised</span>
                            {pct < 100 && <span>${remain.toLocaleString()} remaining</span>}
                          </div>
                        </div>
                      )}
                      <div style={{ display:"flex", gap:8 }}>
                        <Btn variant="outline" size="sm" style={{ flex:1 }} onClick={() => onViewCase(c)}>Details</Btn>
                        <Btn variant="primary" size="sm" style={{ flex:1 }} onClick={() => onSponsor(c)}>❤️ Sponsor</Btn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DONATION HISTORY tab ── */}
      {tab === "history" && (
        <div>
          {/* Summary stats */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
            <StatCard label="Total Donations"  value={myDonations.length}           icon="💰" color={C.primary}   />
            <StatCard label="Total Given"       value={`$${totalGiven.toLocaleString()}`}    icon="💵" color="#EC4899"   />
            <StatCard label="Confirmed"         value={`$${confirmedGiven.toLocaleString()}`} icon="✅" color={C.secondary} />
            <StatCard label="Pending Review"    value={myDonations.filter(d=>d.status==="pending").length} icon="⏳" color="#F59E0B" />
          </div>

          {loadingDons ? (
            <div style={{ textAlign:"center", padding:40, color:C.muted }}>Loading your donations…</div>
          ) : myDonations.length === 0 ? (
            <div style={{ background:"#fff", borderRadius:16, padding:40, textAlign:"center", boxShadow:"0 2px 8px #0001" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💰</div>
              <div style={{ fontSize:17, fontWeight:700 }}>No donations yet</div>
              <div style={{ fontSize:13, color:C.muted, margin:"8px auto 20px", maxWidth:360 }}>
                Your sponsorship history will appear here after you support a case.
              </div>
              <Btn variant="primary" onClick={() => setTab("sponsor")}>Browse Cases to Sponsor →</Btn>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {myDonations.map(d => {
                const st  = (d.status || "pending").toLowerCase();
                const bg  = DON_STATUS_BG[st]  || "#F3F4F6";
                const clr = DON_STATUS_COLOR[st] || C.muted;
                return (
                  <div key={d.id} style={{ background:"#fff", borderRadius:12, padding:"16px 20px", boxShadow:"0 1px 6px #0001", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                    {/* Amount */}
                    <div style={{ minWidth:80, textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:900, color:C.primary }}>${(d.amount||0).toLocaleString()}</div>
                      <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{d.method?.replace(/_/g," ") || "payment"}</div>
                    </div>
                    {/* Case info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>
                        {d.case?.publicTitle || "Verified Case"}
                      </div>
                      <div style={{ fontSize:12, color:C.muted }}>
                        {d.case?.publicCity || "Somalia"} · {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                      {d.donorMessage && (
                        <div style={{ fontSize:11, color:C.muted, marginTop:4, fontStyle:"italic" }}>"{d.donorMessage}"</div>
                      )}
                    </div>
                    {/* Status badge */}
                    <span style={{ background:bg, color:clr, borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:800, whiteSpace:"nowrap" }}>
                      {st === "confirmed" ? "✅ Confirmed" : st === "pending" ? "⏳ Pending" : "❌ Rejected"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MY PROGRAM SUPPORT tab ── */}
      {tab === "programs" && (
        <div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
            <StatCard label="Active Sponsorships" value={mySponsorships.filter(s=>s.status==="active").length}                     icon="🌱" color={C.primary}   />
            <StatCard label="Monthly Commitment"  value={`$${mySponsorships.filter(s=>s.status==="active").reduce((a,s)=>a+(s.monthlyAmount||0),0).toLocaleString()}`} icon="💵" color="#8B5CF6" />
            <StatCard label="Total Paid"          value={`$${mySponsorships.reduce((a,s)=>a+(s.totalPaid||0),0).toLocaleString()}`} icon="✅" color={C.secondary} />
            <StatCard label="People Supported"    value={mySponsorships.length}                                                     icon="👶" color="#EC4899" />
          </div>

          {loadingSpons ? (
            <div style={{ textAlign:"center", padding:40, color:C.muted }}>Loading your sponsorships…</div>
          ) : mySponsorships.length === 0 ? (
            <div style={{ background:"#fff", borderRadius:16, padding:40, textAlign:"center", boxShadow:"0 2px 8px #0001" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🌱</div>
              <div style={{ fontSize:17, fontWeight:700 }}>No program sponsorships yet</div>
              <div style={{ fontSize:13, color:C.muted, margin:"8px auto 20px", maxWidth:380 }}>
                Sponsor a child, widow, orphan or other beneficiary in an ongoing monthly program. You choose the amount and can pay part or all of their monthly need.
              </div>
              <Btn variant="primary" onClick={() => setTab("sponsor")}>Browse Cases to Sponsor</Btn>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {mySponsorships.map(s => {
                const st       = SPONS_STATUS[s.status] || { label: s.status, color:C.muted, bg:"#F3F4F6" };
                const ben      = s.beneficiary;
                const nextDue  = s.nextPaymentDate ? new Date(s.nextPaymentDate) : null;
                const daysLeft = nextDue ? Math.ceil((nextDue - new Date()) / (1000*60*60*24)) : null;
                const prog     = ben?.program;
                return (
                  <div key={s.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden", boxShadow:"0 1px 6px #0001" }}>
                    {/* Header bar */}
                    <div style={{ background:`linear-gradient(90deg,${C.primary}18,${C.accent}10)`, borderBottom:`1px solid ${C.border}`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:22 }}>{prog?.icon || "🌱"}</span>
                        <div>
                          <div style={{ fontWeight:800, fontSize:14 }}>{prog?.name || "Program"}</div>
                          <div style={{ fontSize:11, color:C.muted }}>Beneficiary {ben?.publicId} · {ben?.programType?.replace(/_/g," ")}</div>
                        </div>
                      </div>
                      <span style={{ background:st.bg, color:st.color, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:800 }}>{st.label}</span>
                    </div>
                    {/* Body */}
                    <div style={{ padding:"16px 20px" }}>
                      <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:14 }}>
                        <div>
                          <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>YOUR MONTHLY AMOUNT</div>
                          <div style={{ fontSize:20, fontWeight:900, color:C.primary }}>${(s.monthlyAmount||0).toLocaleString()}</div>
                          <div style={{ fontSize:11, color:C.muted }}>of ${(ben?.monthlyNeed||0).toLocaleString()} total need</div>
                        </div>
                        <div>
                          <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>TOTAL PAID</div>
                          <div style={{ fontSize:18, fontWeight:800, color:C.secondary }}>${(s.totalPaid||0).toLocaleString()}</div>
                          <div style={{ fontSize:11, color:C.muted }}>{s.monthsCompleted || 0} months</div>
                        </div>
                        {nextDue && (
                          <div>
                            <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>NEXT PAYMENT DUE</div>
                            <div style={{ fontSize:14, fontWeight:800, color: daysLeft <= 7 ? "#EF4444" : daysLeft <= 14 ? "#F59E0B" : C.text }}>
                              {nextDue.toLocaleDateString("en-GB",{ day:"numeric", month:"short", year:"numeric" })}
                            </div>
                            <div style={{ fontSize:11, color: daysLeft <= 7 ? "#EF4444" : C.muted }}>
                              {daysLeft <= 0 ? "⚠️ OVERDUE" : `in ${daysLeft} days`}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Progress bar */}
                      {ben?.monthlyNeed > 0 && (
                        <div style={{ marginBottom:14 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.muted, marginBottom:4 }}>
                            <span>Your share of monthly need</span>
                            <span>{Math.round((s.monthlyAmount/ben.monthlyNeed)*100)}%</span>
                          </div>
                          <div style={{ height:6, background:"#E5E7EB", borderRadius:10, overflow:"hidden" }}>
                            <div style={{ width:`${Math.min(100,Math.round((s.monthlyAmount/ben.monthlyNeed)*100))}%`, height:"100%", background:`linear-gradient(90deg,${C.primary},${C.accent})`, borderRadius:10 }} />
                          </div>
                        </div>
                      )}
                      {/* Contract info */}
                      {s.endDate && (
                        <div style={{ background:"#EFF6FF", borderRadius:10, padding:"10px 14px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                          <div style={{ fontSize:12, color:"#1E40AF" }}>
                            <strong>📋 Contract:</strong> {s.monthsCompleted || 0} / {Math.round((new Date(s.endDate) - new Date(s.startDate || s.createdAt)) / (30*24*60*60*1000))} months completed
                            {" · "}Expires <strong>{new Date(s.endDate).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</strong>
                            {" · "}{Math.ceil((new Date(s.endDate) - new Date()) / (1000*60*60*24))} days left
                          </div>
                        </div>
                      )}
                      {/* Action buttons */}
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {s.status === "active" && (
                          <Btn variant="primary" size="sm" onClick={() => handlePayNow(s.id)}>
                            💳 Pay This Month (${(s.monthlyAmount||0).toLocaleString()})
                          </Btn>
                        )}
                        <Btn variant="outline" size="sm" onClick={() => handleViewInvoice(s.id)}>🧾 Invoice Letter</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => handleViewReport(s.id)}>📊 Monthly Report</Btn>
                        {s.status === "active" && (
                          <Btn variant="success" size="sm" onClick={async () => {
                            if (!window.confirm("Renew your sponsorship contract for another 12 months?")) return;
                            try {
                              await programsApi.renewContract(s.id, { months: 12 });
                              showToast("✅ Contract renewed for 12 more months — thank you!");
                              programsApi.mySponsorships().then(d => Array.isArray(d) && setMySponsorships(d));
                            } catch (e) { showToast(e.message || "Failed to renew", "error"); }
                          }}>🔄 Renew Contract</Btn>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── INVOICE MODAL ── */}
          {sponsorInvoice && (() => {
            const { invoiceNo, sponsorship: s, dueDate, issuedDate } = sponsorInvoice;
            const ben = s?.beneficiary;
            const donor = s?.sponsor;
            const IS = invoiceSettings;
            const printInv = () => {
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoiceNo}</title>
              <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 24px;color:#1a1a1a}
              .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #004B96;padding-bottom:16px;margin-bottom:24px}
              .logo{font-size:22px;font-weight:900;color:#004B96}h1{font-size:18px;margin:0 0 24px;color:#004B96}
              table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:10px 12px;text-align:left;border:1px solid #e5e7eb}
              th{background:#F0F4FF;font-weight:700;font-size:13px}.total{font-size:18px;font-weight:900;color:#004B96}
              .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6B7280;text-align:center}
              .pay{background:#F0F4FF;border-radius:8px;padding:16px;margin:20px 0}
              </style></head><body>
              <div class="hdr"><div><div class="logo">&#9789; ${IS.orgName}</div><div style="font-size:13px;color:#6B7280;margin-top:4px">${IS.orgSub}</div><div style="font-size:12px;color:#6B7280">${IS.orgCountry}</div></div>
              <div style="text-align:right"><div style="font-size:22px;font-weight:900">INVOICE</div><div style="color:#6B7280;font-size:13px">${invoiceNo}</div><div style="font-size:13px;margin-top:4px">Issued: ${new Date(issuedDate).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div></div></div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
              <div><div style="font-size:12px;font-weight:700;color:#6B7280;margin-bottom:6px">BILL TO</div>
              <div style="font-weight:700">${donor?.name||"Sponsor"}</div><div style="font-size:13px;color:#374151">${donor?.email||""}</div></div>
              <div><div style="font-size:12px;font-weight:700;color:#6B7280;margin-bottom:6px">PAYMENT DUE</div>
              <div style="font-weight:700;font-size:18px;color:#DC2626">${dueDate ? new Date(dueDate).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) : "Upon receipt"}</div></div></div>
              <h1>Monthly Sponsorship Invoice</h1>
              <table><thead><tr><th>Description</th><th>Program</th><th>Beneficiary</th><th>Amount</th></tr></thead>
              <tbody><tr><td>${IS.description}</td><td>${ben?.program?.name||"Program"}</td><td>${ben?.publicId||"—"} &middot; ${ben?.publicRegion||"Somalia"}</td><td class="total">$${(s?.monthlyAmount||0).toLocaleString()} ${s?.currency||"USD"}</td></tr></tbody>
              <tfoot><tr><td colspan="3" style="text-align:right;font-weight:700">TOTAL DUE</td><td class="total">$${(s?.monthlyAmount||0).toLocaleString()}</td></tr></tfoot></table>
              <div class="pay"><div style="font-weight:700;margin-bottom:10px">&#128179; Payment Methods</div>
              <div style="font-size:13px;line-height:2"><b>Bank Transfer:</b> ${IS.bankName} &middot; IBAN: ${IS.bankIBAN} &middot; BIC: ${IS.bankBIC}<br/>
              <b>Mobile Money (EVC+):</b> ${IS.mobileNumber} &middot; ${IS.mobileName}<br/>
              <b>Reference:</b> ${invoiceNo}</div></div>
              <div class="footer">${IS.footerMsg}</div>
              </body></html>`;
              openPrintWindow(html, `Invoice ${invoiceNo}`);
            };
            const ifield = (key, label, wide) => (
              <div style={{ marginBottom:10, gridColumn: wide ? "1 / -1" : undefined }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:3 }}>{label}</div>
                <input value={IS[key]} onChange={e => saveInvoiceSettings({ ...IS, [key]: e.target.value })}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:`1.5px solid ${C.primary}`, fontSize:13, boxSizing:"border-box" }} />
              </div>
            );
            const isAdmin = user?.role === "super_admin" || user?.role === "admin";
            return (
              <Modal title={`🧾 Invoice — ${invoiceNo}`} onClose={() => { setSponsorInvoice(null); setInvoiceEditMode(false); }} wide>
                {invoiceEditMode ? (
                  <div style={{ background:"#F0F7FF", border:`1.5px solid ${C.primary}30`, borderRadius:12, padding:20, marginBottom:16 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:C.primary, marginBottom:16 }}>✏️ Edit Invoice Template</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                      {ifield("orgName",      "Organization Name")}
                      {ifield("orgSub",       "Subtitle")}
                      {ifield("orgCountry",   "City · Website", true)}
                      {ifield("description",  "Line-Item Description", true)}
                      {ifield("bankName",     "Bank Account Name")}
                      {ifield("bankBIC",      "BIC / SWIFT")}
                      {ifield("bankIBAN",     "IBAN", true)}
                      {ifield("mobileNumber", "Mobile Money Number")}
                      {ifield("mobileName",   "Mobile Money Name")}
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:3 }}>Footer Message</div>
                      <textarea value={IS.footerMsg} onChange={e => saveInvoiceSettings({ ...IS, footerMsg: e.target.value })}
                        rows={2} style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:`1.5px solid ${C.primary}`, fontSize:13, resize:"vertical", boxSizing:"border-box" }} />
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn variant="muted" size="sm" onClick={() => saveInvoiceSettings({ ...DEFAULT_INVOICE_SETTINGS })}>↺ Reset to Default</Btn>
                      <Btn variant="primary" size="sm" onClick={() => setInvoiceEditMode(false)}>✅ Done Editing</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ background:"#F8FAFC", border:`1px solid ${C.border}`, borderRadius:12, padding:24, marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:16 }}>
                      <div>
                        <div style={{ fontWeight:900, fontSize:16, color:C.primary }}>☽ {IS.orgName}</div>
                        <div style={{ fontSize:12, color:C.muted }}>{IS.orgSub}</div>
                        <div style={{ fontSize:12, color:C.muted }}>{IS.orgCountry}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11, color:C.muted, fontWeight:700 }}>INVOICE NO.</div>
                        <div style={{ fontWeight:800 }}>{invoiceNo}</div>
                        <div style={{ fontSize:12, color:C.muted }}>{new Date(issuedDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                      <div style={{ background:"#fff", borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:4 }}>BILL TO</div>
                        <div style={{ fontWeight:700 }}>{donor?.name}</div>
                        <div style={{ fontSize:12, color:C.muted }}>{donor?.email}</div>
                      </div>
                      <div style={{ background:"#fff", borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:4 }}>PAYMENT DUE</div>
                        <div style={{ fontWeight:800, color:"#EF4444" }}>{dueDate ? new Date(dueDate).toLocaleDateString("en-GB",{ day:"numeric", month:"long", year:"numeric" }) : "Upon receipt"}</div>
                      </div>
                    </div>
                    <div style={{ background:"#fff", borderRadius:10, padding:16, border:`1px solid ${C.border}`, marginBottom:16, overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", minWidth:320 }}>
                        <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                          <th style={{ textAlign:"left", padding:"6px 8px", fontSize:12, color:C.muted }}>Description</th>
                          <th style={{ textAlign:"left", padding:"6px 8px", fontSize:12, color:C.muted }}>Program</th>
                          <th style={{ textAlign:"right", padding:"6px 8px", fontSize:12, color:C.muted }}>Amount</th>
                        </tr></thead>
                        <tbody><tr>
                          <td style={{ padding:"10px 8px", fontSize:13 }}>{IS.description}</td>
                          <td style={{ padding:"10px 8px", fontSize:13, color:C.muted }}>{ben?.program?.icon} {ben?.program?.name}</td>
                          <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:900, fontSize:18, color:C.primary }}>${(s?.monthlyAmount||0).toLocaleString()} {s?.currency}</td>
                        </tr></tbody>
                      </table>
                    </div>
                    <div style={{ background:`${C.primary}08`, borderRadius:10, padding:14, marginBottom:12 }}>
                      <div style={{ fontWeight:700, marginBottom:8, fontSize:13 }}>💳 How to Pay</div>
                      <div style={{ fontSize:12, lineHeight:2, color:C.text }}>
                        <b>Bank Transfer:</b> {IS.bankName} · IBAN: {IS.bankIBAN} · BIC: {IS.bankBIC}<br/>
                        <b>Mobile Money (EVC+):</b> {IS.mobileNumber} · {IS.mobileName}<br/>
                        <b>Reference:</b> {invoiceNo}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, textAlign:"center" }}>{IS.footerMsg}</div>
                  </div>
                )}
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <Btn variant="muted" onClick={() => { setSponsorInvoice(null); setInvoiceEditMode(false); }} style={{ flex:1, minWidth:80 }}>Close</Btn>
                  {isAdmin && (
                    <Btn variant="outline" onClick={() => setInvoiceEditMode(m => !m)} style={{ flex:1, minWidth:100 }}>
                      {invoiceEditMode ? "👁️ Preview" : "✏️ Edit Template"}
                    </Btn>
                  )}
                  <Btn variant="primary" onClick={printInv} style={{ flex:2, minWidth:160 }}>🖨️ Print / Save as PDF</Btn>
                </div>
              </Modal>
            );
          })()}

          {/* ── MONTHLY REPORT MODAL ── */}
          {sponsorReport && (() => {
            const { sponsorship: s, year, month, update } = sponsorReport;
            const ben = s?.beneficiary;
            const deliveries = (() => { try { return JSON.parse(update?.deliveriesMade || "[]"); } catch { return []; } })();
            return (
              <Modal title={`📊 Monthly Report — ${MONTH_FULL[month-1]} ${year}`} onClose={() => setSponsorReport(null)} wide>
                <div style={{ marginBottom:16, background:`linear-gradient(135deg,${C.primary}10,${C.accent}08)`, borderRadius:12, padding:20, border:`1px solid ${C.primary}20` }}>
                  <div style={{ fontSize:15, fontWeight:800, marginBottom:4 }}>{ben?.program?.icon} {ben?.program?.name}</div>
                  <div style={{ fontSize:13, color:C.muted }}>Beneficiary {ben?.publicId} · {ben?.programType?.replace(/_/g," ")} · {ben?.publicRegion || "Somalia"}</div>
                </div>
                {!update ? (
                  <div style={{ textAlign:"center", padding:32, color:C.muted }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                    <div style={{ fontWeight:700 }}>No report published yet for {MONTH_FULL[month-1]} {year}</div>
                    <div style={{ fontSize:13, marginTop:4 }}>The program manager will publish a monthly update soon. You'll be notified when it's ready.</div>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    {/* Key metrics */}
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                      {update.schoolAttendance != null && <StatCard icon="🏫" label="School Attendance" value={`${update.schoolAttendance}%`} color={C.secondary} />}
                      {update.healthStatus && <StatCard icon="❤️" label="Health Status" value={update.healthStatus} color="#EC4899" />}
                      {deliveries.length > 0 && <StatCard icon="📦" label="Deliveries Made" value={deliveries.length} color={C.primary} />}
                    </div>
                    {/* Progress notes */}
                    <div style={{ background:"#fff", borderRadius:12, padding:16, border:`1px solid ${C.border}` }}>
                      <div style={{ fontWeight:700, marginBottom:8 }}>📝 Progress This Month</div>
                      <p style={{ fontSize:14, color:C.text, lineHeight:1.7, margin:0 }}>{update.progressNotes}</p>
                    </div>
                    {/* Needs assessment */}
                    {update.needsAssessment && (
                      <div style={{ background:"#FEF3C7", borderRadius:12, padding:16, border:"1px solid #FCD34D" }}>
                        <div style={{ fontWeight:700, marginBottom:8, color:"#92400E" }}>📋 Needs Assessment</div>
                        <p style={{ fontSize:13, color:"#78350F", margin:0 }}>{update.needsAssessment}</p>
                      </div>
                    )}
                    {/* Deliveries */}
                    {deliveries.length > 0 && (
                      <div style={{ background:"#fff", borderRadius:12, padding:16, border:`1px solid ${C.border}` }}>
                        <div style={{ fontWeight:700, marginBottom:10 }}>📦 What Was Delivered</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                          {deliveries.map((d, i) => <span key={i} style={{ background:`${C.primary}12`, color:C.primary, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>{d}</span>)}
                        </div>
                      </div>
                    )}
                    {/* Your contribution */}
                    <div style={{ background:`${C.secondary}10`, borderRadius:12, padding:16, border:`1px solid ${C.secondary}30`, textAlign:"center" }}>
                      <div style={{ fontSize:12, color:C.muted, fontWeight:600 }}>YOUR CONTRIBUTION THIS MONTH</div>
                      <div style={{ fontSize:26, fontWeight:900, color:C.secondary }}>${(s?.monthlyAmount||0).toLocaleString()}</div>
                      <div style={{ fontSize:13, color:C.muted }}>Thank you for making this possible 💚</div>
                    </div>
                  </div>
                )}
                <div style={{ marginTop:16 }}>
                  <Btn variant="muted" onClick={() => setSponsorReport(null)} style={{ width:"100%" }}>Close</Btn>
                </div>
              </Modal>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const ObserverDashboard = ({ cases, currentUser, onReport, onViewCase }) => {
  // Show all cases (for reporters, API already filtered to only their cases)
  const myCases = cases;
  const pending   = myCases.filter(c => c.status === "Pending Verification").length;
  const active    = myCases.filter(c => !["Pending Verification","Archived","Completed"].includes(c.status)).length;
  const completed = myCases.filter(c => c.status === "Completed").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📝 Reporter Dashboard</h2>
          <p style={{ margin: "4px 0 0", color: COLORS.muted }}>Ku soo dhawoow, {currentUser.fullname} — Track your submitted cases</p>
        </div>
        <Btn variant="primary" onClick={onReport}>+ Report New Case</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Total Reports"  value={myCases.length}  icon="📋" color={COLORS.primary} />
        <StatCard label="Pending Review" value={pending}         icon="⏳" color="#F59E0B" />
        <StatCard label="In Progress"    value={active}          icon="🔄" color="#8B5CF6" />
        <StatCard label="Completed"      value={completed}       icon="✅" color={COLORS.secondary} />
      </div>

      {/* How it works */}
      {myCases.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>No cases yet</div>
          <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 8, maxWidth: 400, margin: "8px auto 24px" }}>
            Submit your first case report and we'll notify you at every step — from field investigation to aid delivery.
          </div>
          <Btn variant="primary" onClick={onReport}>Submit Your First Report →</Btn>
        </div>
      )}

      {/* Case cards with pipeline tracker */}
      {myCases.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {myCases.map(c => (
            <div key={c.id} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px #0001", border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primary + "12", borderRadius: 20, padding: "2px 10px" }}>{c.ref}</span>
                    <UrgencyBadge level={c.urgency_level} />
                    <Badge status={c.status} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {c.victim_name !== "My Case" ? c.victim_name : (c.description?.slice(0, 60) + "…")}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>Reported: {c.created_at}</div>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)}>View Details →</Btn>
              </div>
              <CaseStatusTracker status={c.status} />
              {c.status === "Archived" && c._raw?.rejectionReason && (
                <div style={{ marginTop: 10, background: "#FEF2F2", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: COLORS.danger }}>
                  <strong>Rejection Reason:</strong> {c._raw.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VerificationDashboard = ({ cases, agents, donations = [], onViewCase, onAssign, onReject, onPublish, onViewReport, onConfirmDonation, onComplete, onStartDelivery, onRequestInfo, onEnroll }) => {
  const [tab, setTab] = useState("workflow");
  const [donFilter, setDonFilter] = useState("all");

  // Workflow lanes
  const newReports     = cases.filter(c => c.status === "Pending Verification");
  const inField        = cases.filter(c => ["Under Review", "Investigating"].includes(c.status));
  const reviewReady    = cases.filter(c => c.status === "Awaiting Approval");
  const proofReady     = cases.filter(c => c.status === "Proof Submitted");
  const allActive      = cases.filter(c => c.status !== "Archived");
  const pendingDons    = donations.filter(d => d.status === "pending");
  const filteredDons   = donFilter === "all" ? donations : donations.filter(d => d.status === donFilter);
  const alertCount     = newReports.length + proofReady.length + pendingDons.length;

  // Child registration state
  const CHILDREN_KEY = "kf_registered_children";
  const loadChildren = () => { try { return JSON.parse(localStorage.getItem(CHILDREN_KEY)||"[]"); } catch { return []; } };
  const [children, setChildren] = useState(loadChildren);
  const BLANK_CHILD = { id:"", publicId:"", firstName:"", lastName:"", age:"", gender:"male", programType:"child_sponsorship", publicCity:"", publicRegion:"", publicCountry:"Somalia", publicNeedsDesc:"", publicStory:"", publicPhotoUrl:"", monthlyNeed:"30", status:"seeking_sponsor" };
  const [childForm, setChildForm] = useState({ ...BLANK_CHILD });
  const [editChild, setEditChild] = useState(null);
  const [childMsg, setChildMsg] = useState("");

  const openNewChild = () => { setChildForm({ ...BLANK_CHILD, id:"child-"+Date.now(), publicId:"KQ-CHD-"+Math.floor(Math.random()*9000+1000) }); setEditChild("new"); };
  const openEditChild = (ch) => { setChildForm({ ...ch }); setEditChild(ch.id); };
  const saveChild = () => {
    if (!childForm.firstName || !childForm.publicCity) return setChildMsg("Name and city are required.");
    const child = { ...childForm, enrolledAt: childForm.enrolledAt || new Date().toISOString() };
    const updated = editChild === "new" ? [child, ...children] : children.map(c => c.id===editChild ? child : c);
    setChildren(updated);
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    setEditChild(null);
    setChildMsg("✅ Child record saved.");
    setTimeout(() => setChildMsg(""), 3000);
  };
  const delChild = (id) => {
    if (!window.confirm("Delete this child record?")) return;
    const updated = children.filter(c=>c.id!==id);
    setChildren(updated);
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const TABS = [
    { id: "workflow",  label: `🔄 Workflow${alertCount > 0 ? ` (${alertCount})` : ""}` },
    { id: "all",       label: `📋 All Cases (${cases.length})` },
    { id: "donations", label: `💰 Donations${pendingDons.length > 0 ? ` (${pendingDons.length})` : ""}` },
    { id: "children",  label: `👶 Register Children (${children.length})` },
  ];

  const WorkflowCard = ({ c }) => (
    <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px #0001", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primary + "12", borderRadius: 20, padding: "2px 10px" }}>{c.ref}</span>
            <UrgencyBadge level={c.urgency_level} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{c.victim_name}</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>📍 {c.location} · {c.created_at}</div>
          <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5, margin: "8px 0 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.description}</p>
        </div>
      </div>
      {/* Action buttons per status */}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)}>🔍 Full Details</Btn>
        {c.status === "Pending Verification" && <>
          <Btn variant="primary" size="sm" onClick={() => onAssign(c)}>🗺️ Assign Team</Btn>
          <Btn variant="success" size="sm" onClick={() => onPublish(c)}>✅ Approve & Publish</Btn>
          <Btn variant="teal"   size="sm" onClick={() => onRequestInfo && onRequestInfo(c)}>📋 Request Info</Btn>
          <Btn variant="danger"  size="sm" onClick={() => onReject(c)}>❌ Reject</Btn>
        </>}
        {c.status === "Awaiting Approval" && <>
          <Btn variant="purple" size="sm" onClick={() => onViewReport(c)}>📋 Field Report</Btn>
          {(c._raw?.caseType === "child_support" || ["child_support","education","orphan","family_support","medical"].includes(c._raw?.category)) ? (
            <Btn variant="success" size="sm" onClick={() => onEnroll && onEnroll(c)}>🌱 Enroll in Program</Btn>
          ) : (
            <Btn variant="success" size="sm" onClick={() => onPublish(c)}>✅ Approve & Publish</Btn>
          )}
          <Btn variant="danger"  size="sm" onClick={() => onReject(c)}>❌ Reject</Btn>
        </>}
        {["Under Review","Investigating"].includes(c.status) && (
          <span style={{ fontSize: 12, color: COLORS.muted, alignSelf: "center" }}>⏳ Awaiting field investigation…</span>
        )}
        {c.status === "Aid Delivered" && onComplete && <>
          <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)}>🔍 View Proof</Btn>
          <Btn variant="success" size="sm" onClick={() => onComplete(c)}>🏁 Mark Complete</Btn>
        </>}
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>🏛️ Verification Dashboard</h2>
      <p style={{ margin: "0 0 20px", color: COLORS.muted }}>Review incoming reports and manage the case pipeline</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="New Reports"    value={newReports.length}   icon="🚨" color="#EF4444" />
        <StatCard label="In Field"       value={inField.length}      icon="🕵️" color="#8B5CF6" />
        <StatCard label="Needs Decision" value={reviewReady.length}  icon="📋" color="#F59E0B" />
        <StatCard label="Total Active"   value={allActive.length}    icon="📊" color={COLORS.primary} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700, border: "none", background: "none", cursor: "pointer",
              color: tab === t.id ? COLORS.primary : COLORS.muted,
              borderBottom: tab === t.id ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "workflow" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 24 }}>
          {/* Lane 1 — New Reports */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#FEE2E2", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: COLORS.danger }}>
                🚨 New Reports ({newReports.length})
              </div>
            </div>
            {newReports.length === 0
              ? <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No new reports 🎉</div>
              : newReports.map(c => <WorkflowCard key={c.id} c={c} />)
            }
          </div>

          {/* Lane 2 — Field Investigation */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#EDE9FE", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: "#6B21A8" }}>
                🕵️ Field Investigation ({inField.length})
              </div>
            </div>
            {inField.length === 0
              ? <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No cases in investigation</div>
              : inField.map(c => <WorkflowCard key={c.id} c={c} />)
            }
          </div>

          {/* Lane 3 — Needs Decision */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: "#92400E" }}>
                📋 Needs Decision ({reviewReady.length})
              </div>
            </div>
            {reviewReady.length === 0
              ? <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No cases awaiting decision</div>
              : reviewReady.map(c => <WorkflowCard key={c.id} c={c} />)
            }
          </div>

          {/* Lane 4 — Delivery Proof Review */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#CFFAFE", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: "#0E7490", position: "relative" }}>
                📦 Proof Uploaded ({proofReady.length})
                {proofReady.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: COLORS.danger, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{proofReady.length}</span>}
              </div>
            </div>
            {proofReady.length === 0
              ? <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No delivery proofs to review 🎉</div>
              : proofReady.map(c => <WorkflowCard key={c.id} c={c} />)
            }
          </div>
        </div>
      )}

      {tab === "all" && (
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>All Cases</h3>
          <CaseTable cases={cases} onView={onViewCase} />
        </div>
      )}

      {tab === "donations" && (
        <div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard label="Total Received"  value={`$${donations.reduce((a,d)=>a+(d.amount||0),0).toLocaleString()}`} icon="💵" color={COLORS.secondary} />
            <StatCard label="Confirmed"       value={`$${donations.filter(d=>d.status==="confirmed").reduce((a,d)=>a+(d.amount||0),0).toLocaleString()}`} icon="✅" color="#10B981" />
            <StatCard label="Needs Confirm"   value={pendingDons.length} icon="⏳" color="#F59E0B" />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["all","pending","confirmed"].map(f => (
              <button key={f} onClick={() => setDonFilter(f)}
                style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: `1.5px solid ${donFilter === f ? COLORS.primary : COLORS.border}`, background: donFilter === f ? COLORS.primary : "#fff", color: donFilter === f ? "#fff" : COLORS.muted, cursor: "pointer" }}>
                {f === "all" ? `All (${donations.length})` : f.charAt(0).toUpperCase() + f.slice(1) + ` (${donations.filter(d=>d.status===f).length})`}
              </button>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Donor","Amount","Case","Method","Date","Status","Action"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDons.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "28px 14px", textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No donations found</td></tr>
                )}
                {filteredDons.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: i < filteredDons.length-1 ? `1px solid ${COLORS.border}` : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.isAnonymous ? "Anonymous" : (d.donor?.name || "—")}</div>
                      {!d.isAnonymous && <div style={{ fontSize: 11, color: COLORS.muted }}>{d.donor?.email || ""}</div>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 15, fontWeight: 800, color: COLORS.secondary }}>${(d.amount||0).toLocaleString()}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{d.case?.publicTitle || `Case #${(d.caseId||"").slice(-6)}`}</div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.muted }}>{(d.method||"—").replace(/_/g," ")}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.muted }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: d.status==="confirmed" ? "#D1FAE5" : "#FEF3C7", color: d.status==="confirmed" ? "#065F46" : "#92400E", borderRadius: 20, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                        {d.status==="confirmed" ? "✅ Confirmed" : "⏳ Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {d.status === "pending" && onConfirmDonation && (
                          <button onClick={() => onConfirmDonation(d.id)}
                            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#10B981", color: "#fff", border: "none", cursor: "pointer" }}>
                            ✓ Confirm
                          </button>
                        )}
                        {d.status === "confirmed" && ["sponsored","waiting_for_sponsor","Sponsored","Waiting Sponsor"].includes(d.case?.status) && onStartDelivery && (
                          <button onClick={() => onStartDelivery({
                            id: d.caseId, victim_name: d.case?.publicTitle || `Case #${(d.caseId||"").slice(-6)}`,
                            location: d.case?.publicCity || "", donation_amount: d.amount,
                            _amount: d.amount, _caseTitle: d.case?.publicTitle, _caseCity: d.case?.publicCity, _caseId: d.caseId,
                          })}
                            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#0891B2", color: "#fff", border: "none", cursor: "pointer" }}>
                            🚚 Start Delivery
                          </button>
                        )}
                        {d.status === "confirmed" && d.case?.status === "delivering" && (
                          <span style={{ fontSize: 11, color: "#0891B2", fontWeight: 700 }}>🚚 En Route</span>
                        )}
                        {d.status === "confirmed" && d.case?.status === "proof_uploaded" && onComplete && (
                          <button onClick={() => { const c = cases.find(x => x.id === d.caseId); if(c) onComplete(c); }}
                            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: COLORS.secondary, color: "#fff", border: "none", cursor: "pointer" }}>
                            🏁 Complete
                          </button>
                        )}
                        {d.status === "confirmed" && d.case?.status === "completed" && (
                          <span style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 700 }}>🏁 Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REGISTER CHILDREN ── */}
      {tab === "children" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
            <div>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>👶 Child & Family Registration</h3>
              <p style={{ margin:"4px 0 0", color:COLORS.muted, fontSize:13 }}>Register verified children and families for the sponsorship program.</p>
            </div>
            <button onClick={openNewChild} style={{ padding:"10px 20px", background:COLORS.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:800, fontSize:14 }}>
              + Register New Child
            </button>
          </div>

          {childMsg && <div style={{ background:childMsg.startsWith("✅") ? "#ECFDF5" : "#FEF2F2", color:childMsg.startsWith("✅") ? "#065F46" : COLORS.danger, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, fontWeight:600 }}>{childMsg}</div>}

          {/* Registration form */}
          {editChild && (
            <div style={{ background:"#fff", borderRadius:16, padding:24, border:`1.5px solid ${COLORS.primary}30`, marginBottom:24, boxShadow:"0 4px 20px rgba(0,0,0,0.07)" }}>
              <h4 style={{ margin:"0 0 20px", fontSize:16, fontWeight:800 }}>{editChild==="new" ? "New Child Registration" : "Edit Child Record"}</h4>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
                {[ ["firstName","First Name*",true,"text"], ["lastName","Last Name",false,"text"], ["age","Age",false,"number"], ["publicCity","City*",true,"text"], ["publicRegion","Region",false,"text"], ["publicCountry","Country",false,"text"], ["publicPhotoUrl","Photo URL",false,"url"], ["monthlyNeed","Monthly Need ($)",false,"number"] ].map(([key,label,req,type]) => (
                  <div key={key}>
                    <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5 }}>{label}</label>
                    <input value={childForm[key]||""} onChange={e => setChildForm(f=>({...f,[key]:e.target.value}))} type={type}
                      style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${COLORS.border}`, borderRadius:10, fontSize:14, boxSizing:"border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5 }}>Gender</label>
                  <Select value={childForm.gender||"male"} onChange={e => setChildForm(f=>({...f,gender:e.target.value}))} wrapStyle={{ marginBottom:0 }}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5 }}>Program Type</label>
                  <Select value={childForm.programType||"child_sponsorship"} onChange={e => setChildForm(f=>({...f,programType:e.target.value}))} wrapStyle={{ marginBottom:0 }}>
                    {getCat("programTypes").map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5 }}>Status</label>
                  <Select value={childForm.status||"seeking_sponsor"} onChange={e => setChildForm(f=>({...f,status:e.target.value}))} wrapStyle={{ marginBottom:0 }}>
                    <option value="seeking_sponsor">Seeking Sponsor</option>
                    <option value="sponsored">Sponsored</option>
                    <option value="pending_verification">Pending Verification</option>
                  </Select>
                </div>
              </div>
              <div style={{ marginTop:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5 }}>Needs Description</label>
                <input value={childForm.publicNeedsDesc||""} onChange={e => setChildForm(f=>({...f,publicNeedsDesc:e.target.value}))}
                  style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${COLORS.border}`, borderRadius:10, fontSize:14, boxSizing:"border-box" }} placeholder="What this child needs most" />
              </div>
              <div style={{ marginTop:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5 }}>Story (public)</label>
                <textarea value={childForm.publicStory||""} onChange={e => setChildForm(f=>({...f,publicStory:e.target.value}))} rows={3}
                  style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${COLORS.border}`, borderRadius:10, fontSize:14, boxSizing:"border-box", fontFamily:"inherit", resize:"vertical" }} placeholder="Background story shown to donors" />
              </div>
              {/* Photo preview */}
              {childForm.publicPhotoUrl && (
                <div style={{ marginTop:14 }}>
                  <img src={childForm.publicPhotoUrl} alt="Preview" style={{ width:80, height:80, borderRadius:"50%", objectFit:"cover", border:`2px solid ${COLORS.border}` }} onError={e=>e.target.style.display="none"} />
                </div>
              )}
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button onClick={saveChild} style={{ flex:2, padding:"12px", background:COLORS.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:800, fontSize:14 }}>
                  {editChild==="new" ? "✅ Save & Register" : "💾 Update Record"}
                </button>
                <button onClick={() => setEditChild(null)} style={{ flex:1, padding:"12px", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14 }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Children list */}
          {children.length === 0 && editChild === null ? (
            <div style={{ textAlign:"center", padding:"60px 20px", background:"#fff", borderRadius:16, color:COLORS.muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>👶</div>
              <div style={{ fontSize:16, fontWeight:700 }}>No children registered yet</div>
              <div style={{ fontSize:13, marginTop:6 }}>Click "Register New Child" to start.</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
              {children.map(ch => (
                <div key={ch.id} style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", border:`1px solid ${COLORS.border}` }}>
                  <div style={{ background:`linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, padding:"20px 18px", display:"flex", gap:14, alignItems:"center" }}>
                    {ch.publicPhotoUrl ? (
                      <img src={ch.publicPhotoUrl} alt="" style={{ width:56, height:56, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,0.5)" }} onError={e=>e.target.style.display="none"} />
                    ) : (
                      <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>👤</div>
                    )}
                    <div style={{ color:"#fff", flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:15 }}>{ch.firstName} {ch.lastName}</div>
                      <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{ch.publicId} · {ch.age ? `${ch.age}y` : ""} {ch.gender}</div>
                      <div style={{ fontSize:11, opacity:0.7, marginTop:2 }}>📍 {ch.publicCity}{ch.publicRegion ? `, ${ch.publicRegion}` : ""}</div>
                    </div>
                    <span style={{ background: ch.status==="sponsored" ? "rgba(16,185,129,0.25)" : ch.status==="seeking_sponsor" ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.15)", color:"#fff", borderRadius:20, padding:"3px 8px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>
                      {ch.status==="sponsored" ? "✅ Sponsored" : ch.status==="seeking_sponsor" ? "⏳ Seeking" : "Pending"}
                    </span>
                  </div>
                  <div style={{ padding:"14px 18px" }}>
                    <div style={{ fontSize:12, color:COLORS.muted, marginBottom:6 }}>{ch.programType?.replace(/_/g," ")}</div>
                    {ch.publicNeedsDesc && <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:6 }}>{ch.publicNeedsDesc}</div>}
                    {ch.publicStory && <div style={{ fontSize:12, color:COLORS.muted, lineHeight:1.5, marginBottom:8, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{ch.publicStory}</div>}
                    <div style={{ fontSize:18, fontWeight:900, color:COLORS.primary }}>${ch.monthlyNeed}/mo</div>
                  </div>
                  <div style={{ padding:"10px 18px", borderTop:`1px solid ${COLORS.border}`, display:"flex", gap:8 }}>
                    <button onClick={() => openEditChild(ch)} style={{ flex:1, padding:"8px", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>✏️ Edit</button>
                    <button onClick={() => delChild(ch.id)} style={{ padding:"8px 12px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, color:COLORS.danger }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FieldTeamDashboard = ({ cases, currentUser, onViewCase, onInvestigate, onDeliver }) => {
  const active      = cases.filter(c => ["Under Review","Investigating"].includes(c.status));
  const submitted   = cases.filter(c => c.status === "Awaiting Approval");
  const toDeliver   = cases.filter(c => ["Sponsored","Delivering"].includes(c.status));
  const proofSent   = cases.filter(c => c.status === "Proof Submitted");
  const completed   = cases.filter(c => c.status === "Completed");
  const delivering  = [...toDeliver, ...proofSent];

  const MissionCard = ({ c }) => {
    const statusColors = {
      "Under Review": { bg: "#EDE9FE", color: "#6B21A8", label: "🆕 Just Assigned" },
      "Investigating": { bg: "#DBEAFE", color: "#1E40AF", label: "🔍 Investigating" },
      "Awaiting Approval": { bg: "#D1FAE5", color: "#065F46", label: "✅ Report Submitted" },
      "Delivering":    { bg: "#CFFAFE", color: "#0891B2", label: "🚚 Active Delivery" },
      "Sponsored":     { bg: "#FCE7F3", color: "#9D174D", label: "❤️ Funded — Deliver Aid" },
      "Proof Submitted":{ bg: "#D1FAE5", color: "#065F46", label: "📤 Proof Sent to Admin" },
    };
    const s = statusColors[c.status] || { bg: "#F3F4F6", color: COLORS.muted, label: c.status };
    return (
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 12px #0001" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primary + "12", borderRadius: 20, padding: "2px 10px" }}>{c.ref}</span>
              <UrgencyBadge level={c.urgency_level} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{c.victim_name}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, borderRadius: 20, padding: "4px 12px" }}>{s.label}</span>
        </div>

        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>📍 {c.location}</div>
        <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5, margin: "0 0 16px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.description}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)}>🔍 View Details</Btn>
          {["Under Review","Investigating"].includes(c.status) && (
            <Btn variant="success" size="sm" onClick={() => onInvestigate(c)} style={{ flex: 1 }}>
              📋 Submit Investigation Report
            </Btn>
          )}
          {c.status === "Awaiting Approval" && (
            <span style={{ fontSize: 12, color: "#065F46", background: "#D1FAE5", borderRadius: 8, padding: "4px 10px", alignSelf: "center" }}>
              ✅ Report submitted — awaiting admin approval
            </span>
          )}
          {["Sponsored","Delivering"].includes(c.status) && (
            <Btn variant="teal" size="sm" onClick={() => onDeliver ? onDeliver(c) : onViewCase(c)} style={{ flex: 1 }}>
              📤 Submit Delivery Proof
            </Btn>
          )}
          {c.status === "Proof Submitted" && (
            <span style={{ fontSize: 12, color: "#065F46", background: "#D1FAE5", borderRadius: 8, padding: "4px 10px", alignSelf: "center" }}>
              ✅ Proof submitted — waiting for admin to close case
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>🗺️ Field Team Dashboard</h2>
      <p style={{ margin: "0 0 20px", color: COLORS.muted }}>Welcome, {currentUser.fullname} — Your active missions and investigations</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Active Missions"   value={active.length}     icon="🎯" color={COLORS.primary} />
        <StatCard label="Report Submitted"  value={submitted.length}  icon="📋" color={COLORS.secondary} />
        <StatCard label="Delivering Aid"    value={delivering.length} icon="📦" color="#EC4899" />
        <StatCard label="Completed"         value={completed.length}  icon="✅" color="#5A6E8A" />
      </div>

      {active.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: COLORS.primary }}>🎯 Active Missions — Need Your Action</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 16, marginBottom: 28 }}>
            {active.map(c => <MissionCard key={c.id} c={c} />)}
          </div>
        </>
      )}

      {toDeliver.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#9D174D" }}>🚚 Aid Delivery — Submit Your Proof</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 16, marginBottom: 28 }}>
            {toDeliver.map(c => <MissionCard key={c.id} c={c} />)}
          </div>
        </>
      )}

      {proofSent.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#065F46" }}>📤 Proof Submitted — Waiting for Admin to Close</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 16, marginBottom: 28 }}>
            {proofSent.map(c => <MissionCard key={c.id} c={c} />)}
          </div>
        </>
      )}

      {submitted.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: COLORS.secondary }}>📋 Reports Submitted — Awaiting Admin Review</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 16, marginBottom: 28 }}>
            {submitted.map(c => <MissionCard key={c.id} c={c} />)}
          </div>
        </>
      )}

      {active.length === 0 && delivering.length === 0 && submitted.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 60, textAlign: "center", boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>No Active Missions</div>
          <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 8 }}>You will receive a notification when a case is assigned to you.</div>
        </div>
      )}

      {/* Programs section for field team */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: COLORS.secondary }}>🌱 Program Beneficiaries — Monthly Updates</h3>
        </div>
        <FieldTeamProgramsSection currentUser={currentUser} showToast={() => {}} />
      </div>
    </div>
  );
};

// ── Field team programs section for monthly updates ───────────────────────────
const FieldTeamProgramsSection = ({ currentUser, showToast }) => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updateTarget, setUpdateTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showLocalToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    programsApi.beneficiariesAdmin({ status: "sponsored" }).then(data => {
      if (Array.isArray(data)) setBeneficiaries(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: COLORS.muted, fontSize: 13 }}>Loading beneficiaries…</div>;

  if (beneficiaries.length === 0) return (
    <div style={{ background: "#F0FDF4", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.secondary, border: "1px solid #BBF7D0" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
      No sponsored beneficiaries assigned yet.
    </div>
  );

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 16, background: COLORS.secondary, color: "#fff", borderRadius: 14, padding: "12px 20px", boxShadow: "0 8px 32px #0003", fontSize: 14, fontWeight: 700, zIndex: 3000 }}>
          ✅ {toast}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 14 }}>
        {beneficiaries.map(b => {
          const pt = PROGRAM_TYPE_LABELS[b.programType] || { icon: "👤", color: COLORS.primary };
          return (
            <div key={b.id} style={{ background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px #0001" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: pt.color, background: pt.color + "12", borderRadius: 20, padding: "2px 10px" }}>{pt.icon} {b.publicId}</span>
                <BeneficiaryStatusBadge status={b.status} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{b.privateFullName || "Beneficiary"}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{b.publicCity || "—"} · ${b.monthlyNeed}/mo</div>
              <div style={{ marginTop: 10 }}>
                <Btn variant="purple" size="sm" onClick={() => setUpdateTarget(b)} style={{ width: "100%" }}>
                  📊 Submit Monthly Update
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
      {updateTarget && (
        <MonthlyUpdateModal beneficiary={updateTarget} onClose={() => setUpdateTarget(null)} showToast={showLocalToast} />
      )}
    </div>
  );
};

const DonorDashboard = ({ cases, currentUser, onViewCase, onSponsor }) => {
  const [myDonations, setMyDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [donorTab, setDonorTab] = useState("emergency");
  const navigate = useNavigate();

  useEffect(() => {
    donations.my().then(data => {
      if (Array.isArray(data)) setMyDonations(data);
    }).catch(() => {}).finally(() => setLoadingDonations(false));
  }, []);

  const available = cases.filter(c => ["Waiting Sponsor","Sponsored"].includes(c.status));
  const waitingCases = cases.filter(c => c.status === "Waiting Sponsor");
  const myTotal = myDonations.reduce((a, d) => a + (d.amount || 0), 0);
  const confirmedTotal = myDonations.filter(d => d.status === "confirmed").reduce((a, d) => a + (d.amount || 0), 0);

  const STATUS_COLORS = {
    pending:   { bg: "#FEF3C7", color: "#92400E",  label: "⏳ Awaiting Payment Verification" },
    confirmed: { bg: "#D1FAE5", color: "#065F46",  label: "✅ Payment Confirmed" },
    failed:    { bg: "#FEE2E2", color: COLORS.danger, label: "❌ Payment Failed" },
  };

  const [certDonation, setCertDonation] = useState(null);

  const METHOD_LABELS = {
    mobile_money:  "📱 Mobile Money",
    bank_transfer: "🏦 Bank Transfer",
    card:          "💳 Card",
    wallet:        "💰 Wallet",
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>❤️ Donor Dashboard</h2>
      <p style={{ margin: "0 0 16px", color: COLORS.muted }}>Welcome, {currentUser.fullname} — your support changes lives</p>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard label="Cases to Sponsor" value={waitingCases.length}                    icon="🤝" color={COLORS.primary} />
        <StatCard label="My Donations"      value={myDonations.length}                    icon="❤️" color="#EC4899" />
        <StatCard label="Total Pledged"     value={`$${myTotal.toLocaleString()}`}        icon="💸" color={COLORS.accent} />
        <StatCard label="Confirmed"         value={`$${confirmedTotal.toLocaleString()}`} icon="✅" color={COLORS.secondary} />
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 24 }}>
        {[
          { id: "emergency", label: "🚨 Emergency Cases" },
          { id: "programs",  label: "🌱 Long-Term Sponsorships" },
        ].map(t => (
          <button key={t.id} onClick={() => setDonorTab(t.id)}
            style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, border: "none", background: "none", cursor: "pointer", color: donorTab === t.id ? COLORS.primary : COLORS.muted, borderBottom: donorTab === t.id ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {donorTab === "programs" && (
        <div>
          <div style={{ background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.secondary}10)`, borderRadius: 16, padding: 24, marginBottom: 24, border: `1px solid ${COLORS.primary}20` }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>🌱 Sponsor a Future</div>
            <p style={{ fontSize: 14, color: COLORS.muted, margin: "0 0 16px", lineHeight: 1.7 }}>
              Unlike emergency donations, long-term sponsorships give you monthly progress updates — school attendance, health reports, photos — and create a real relationship with the beneficiary.
            </p>
            <Btn variant="primary" onClick={() => navigate("/programs")}>Browse Beneficiaries & Programs →</Btn>
          </div>
          <MySponshorshipsTab />
        </div>
      )}

      {donorTab === "emergency" && (
      <div>
      {/* Cases grid */}
      <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#EC4899" }}>💝 Cases Waiting for a Sponsor</h3>
      {waitingCases.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 48, textAlign: "center", color: COLORS.muted, boxShadow: "0 2px 8px #0001", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>All cases are currently sponsored!</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Check back soon — new verified cases are added regularly.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 18, marginBottom: 36 }}>
          {waitingCases.map(c => {
            const goal    = c.target_goal  || c._raw?.targetGoal  || 0;
            const raised  = c.donation_amount || c._raw?.totalRaised || 0;
            const remain  = Math.max(0, goal - raised);
            const pct     = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
            return (
              <div key={c.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px #0002", border: "1px solid #FCE7F3", display: "flex", flexDirection: "column" }}>
                {/* Top color bar by urgency */}
                <div style={{ height: 5, background: c.urgency_level === "Critical" ? "#7C3AED" : c.urgency_level === "High" ? "#EF4444" : c.urgency_level === "Medium" ? "#F59E0B" : "#10B981" }} />
                <div style={{ padding: 20, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, flex: 1, marginRight: 8 }}>{c.victim_name}</div>
                    <UrgencyBadge level={c.urgency_level} />
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>📍 {c.location}</div>
                  <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, margin: "0 0 16px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                    {c.description}
                  </p>

                  {/* Funding progress */}
                  {goal > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: COLORS.muted }}>Raised: <strong style={{ color: COLORS.secondary }}>${raised.toLocaleString()}</strong></span>
                        <span style={{ color: COLORS.muted }}>Goal: <strong>${goal.toLocaleString()}</strong></span>
                      </div>
                      <div style={{ background: "#F3F4F6", borderRadius: 20, height: 8, overflow: "hidden" }}>
                        <div style={{ background: pct >= 100 ? COLORS.secondary : COLORS.accent, borderRadius: 20, height: "100%", width: `${pct}%`, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ marginTop: 5, fontSize: 12, color: remain > 0 ? COLORS.danger : COLORS.secondary, fontWeight: 700 }}>
                        {remain > 0 ? `💔 $${remain.toLocaleString()} still needed` : "🎉 Fully funded!"}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
                  <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)} style={{ flex: 1 }}>View Details</Btn>
                  <Btn variant="accent" size="sm" onClick={() => onSponsor(c)} style={{ flex: 2 }}>
                    ❤️ {remain > 0 ? `Sponsor $${remain.toLocaleString()}` : "Contribute"}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Donation history */}
      <h3 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700 }}>💰 My Sponsorship History</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {loadingDonations ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, textAlign: "center", color: COLORS.muted }}>Loading…</div>
        ) : myDonations.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: COLORS.muted, boxShadow: "0 2px 8px #0001" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💝</div>
            <div style={{ fontWeight: 700 }}>No sponsorships yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Sponsor a case above to get started!</div>
          </div>
        ) : myDonations.map((d) => {
          const s = STATUS_COLORS[d.status] || STATUS_COLORS.pending;
          const proof = d.case?.deliveryProof;
          const caseStatus = d.case?.status;
          const isDelivered = ["proof_uploaded","completed"].includes(caseStatus);
          const isCompleted = caseStatus === "completed";

          const caseStatusLabel = {
            waiting_for_sponsor:  { label: "⏳ Awaiting sponsor match", color: "#92400E", bg: "#FEF3C7" },
            "Waiting Sponsor":    { label: "⏳ Awaiting sponsor match", color: "#92400E", bg: "#FEF3C7" },
            sponsored:            { label: "✅ Donation received — starting delivery", color: "#065F46", bg: "#D1FAE5" },
            "Sponsored":          { label: "✅ Donation received — starting delivery", color: "#065F46", bg: "#D1FAE5" },
            delivering:           { label: "🚚 Aid en route to beneficiary", color: "#0891B2", bg: "#CFFAFE" },
            "Delivering":         { label: "🚚 Aid en route to beneficiary", color: "#0891B2", bg: "#CFFAFE" },
            proof_uploaded:       { label: "📦 Aid delivered — admin reviewing", color: "#6D28D9", bg: "#EDE9FE" },
            "Aid Delivered":      { label: "📦 Aid delivered — admin reviewing", color: "#6D28D9", bg: "#EDE9FE" },
            completed:            { label: "🏁 Completed — aid confirmed delivered", color: "#065F46", bg: "#D1FAE5" },
            "Completed":          { label: "🏁 Completed — aid confirmed delivered", color: "#065F46", bg: "#D1FAE5" },
          }[caseStatus] || { label: caseStatus || "—", color: COLORS.muted, bg: "#F3F4F6" };

          return (
            <div key={d.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px #0001", border: isCompleted ? "1.5px solid #10B981" : `1px solid ${COLORS.border}` }}>
              {/* Top bar — case progress */}
              <div style={{ background: caseStatusLabel.bg, padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: caseStatusLabel.color }}>{caseStatusLabel.label}</span>
                <span style={{ fontSize: 11, color: COLORS.muted }}>{d.createdAt?.slice(0,10)}</span>
              </div>

              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.primary }}>{d.case?.publicTitle || `Case #${d.caseId?.slice(-8)}`}</div>
                    {d.case?.publicCity && <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>📍 {d.case.publicCity}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.secondary }}>${d.amount?.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{METHOD_LABELS[d.method] || d.method}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                </div>

                {/* Delivery proof — shown once field agent submits */}
                {isDelivered && proof && (
                  <div style={{ marginTop: 14, background: "#F0FDF4", borderRadius: 12, padding: "14px 16px", border: "1px solid #BBF7D0" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#166534", marginBottom: 10 }}>
                      📦 Delivery Proof — {isCompleted ? "✅ Admin Confirmed" : "⏳ Pending Admin Review"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                      {[
                        { label: "Delivery Date",    val: proof.deliveryDate ? new Date(proof.deliveryDate).toLocaleDateString() : "—" },
                        { label: "Method",           val: (proof.deliveryMethod || "—").replace(/_/g," ") },
                        { label: "Amount Delivered", val: `$${(proof.amountDelivered||0).toLocaleString()}` },
                        { label: "Recipient",        val: proof.recipientName || "Confirmed on-site" },
                      ].map((item, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
                          <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700 }}>{item.label.toUpperCase()}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                    {proof.deliveryNotes && (
                      <div style={{ marginTop: 10, background: "#fff", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, marginBottom: 4 }}>FIELD AGENT NOTES</div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: COLORS.text }}>{proof.deliveryNotes}</p>
                      </div>
                    )}
                    {isCompleted && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ background: "#065F46", color: "#fff", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
                          🏁 Case fully completed on {d.case?.completedAt ? new Date(d.case.completedAt).toLocaleDateString() : "—"} — Thank you for your generosity!
                        </div>
                        <Btn variant="ghost" size="sm" onClick={() => setCertDonation(d)}
                          style={{ width: "100%", border: `1.5px solid ${COLORS.secondary}`, color: COLORS.secondary }}>
                          🏆 View Impact Certificate
                        </Btn>
                      </div>
                    )}
                  </div>
                )}

                {/* Waiting message if not yet delivered */}
                {!isDelivered && d.status === "confirmed" && (
                  <div style={{ marginTop: 10, background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: COLORS.primary }}>
                    ℹ️ Your donation is confirmed. The field team is preparing to deliver aid. You'll see proof of delivery here once it's done.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      )}

      {/* Impact Certificate Modal */}
      {certDonation && (
        <Modal title="🏆 Impact Certificate" onClose={() => setCertDonation(null)} wide>
          <style>{`@media print { .no-print { display: none !important; } body * { visibility: hidden; } #impact-cert, #impact-cert * { visibility: visible; } #impact-cert { position: fixed; top: 0; left: 0; width: 100%; } }`}</style>
          <div id="impact-cert" style={{ background: `linear-gradient(145deg, ${COLORS.navy}, ${COLORS.primary})`, borderRadius: 20, padding: "36px 40px", color: "#fff", textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🕊️</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, opacity: 0.7, marginBottom: 4 }}>KAFAALE QAAD · HUMANITARIAN AID PLATFORM</div>
            <div style={{ fontSize: 28, fontWeight: 900, margin: "12px 0 6px" }}>Certificate of Impact</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 24 }}>This certifies that the following contribution reached its beneficiary</div>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "20px 28px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>DONOR</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{currentUser?.fullname || currentUser?.name || "Anonymous Donor"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "AMOUNT", val: `$${(certDonation.amount||0).toLocaleString()}` },
                { label: "CASE", val: certDonation.case?.publicTitle || `Case #${certDonation.caseId?.slice(-6)}` },
                { label: "REGION", val: certDonation.case?.publicCity || "Somalia" },
              ].map((item,i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 10px" }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.7, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{item.val}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#10B981", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              ✅ Aid Delivered & Confirmed — {certDonation.case?.completedAt ? new Date(certDonation.case.completedAt).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" }) : "Completed"}
            </div>
            <div style={{ fontSize: 11, opacity: 0.55 }}>Issued by Kafaale Qaad Hope Society · kafaaleqaad.org</div>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setCertDonation(null)} style={{ flex: 1 }}>Close</Btn>
            <Btn variant="primary" onClick={() => {
              const el = document.getElementById("impact-cert");
              if (!el) return;
              const styles = `*{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;margin:0;padding:32px;background:#fff}`;
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Impact Certificate</title><style>${styles}</style></head><body>${el.outerHTML}</body></html>`;
              openPrintWindow(html, "Impact Certificate");
            }} style={{ flex: 2 }}>🖨️ Print / Save as PDF</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── DONOR MY SPONSORSHIPS ────────────────────────────────────────────────────
const MySponshorshipsTab = () => {
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    programsApi.mySponsorships().then(data => {
      if (Array.isArray(data)) setSponsorships(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>Loading sponsorships…</div>;

  if (sponsorships.length === 0) return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 48, textAlign: "center", color: COLORS.muted, boxShadow: "0 2px 8px #0001" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No long-term sponsorships yet</div>
      <div style={{ fontSize: 13, marginBottom: 20 }}>Sponsor a child, family, or program for ongoing monthly support with progress updates.</div>
      <Btn variant="primary" onClick={() => navigate("/programs")}>🌱 Explore Programs →</Btn>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {sponsorships.map(s => {
        const b = s.beneficiary;
        if (!b) return null;
        const pt = PROGRAM_TYPE_LABELS[b.programType] || { icon: "👤", color: COLORS.primary, label: b.programType };
        const updates = b.monthlyUpdates || [];
        return (
          <div key={s.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px #0002", border: `1.5px solid ${pt.color}30` }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${pt.color} 0%, ${COLORS.navy} 100%)`, padding: "16px 20px", color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>{pt.icon} {b.program?.name || pt.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{b.publicId}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                    {b.publicAge ? `${b.publicAge} years old · ` : ""}{b.publicGender ? `${b.publicGender} · ` : ""}📍 {b.publicCity || "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>${s.monthlyAmount}/mo</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>{s.type} sponsorship</div>
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{s.monthsCompleted} months · ${s.totalPaid} total</div>
                </div>
              </div>
            </div>

            {/* Progress timeline */}
            {updates.length > 0 && (
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>📊 Progress Journey</div>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                  {updates.map((u, i) => (
                    <div key={u.id} style={{ minWidth: 160, background: "#F8FAFC", borderRadius: 12, padding: "12px 14px", border: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
                        {MONTH_NAMES[u.month-1]} {u.year}
                      </div>
                      {u.schoolAttendance != null && (
                        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 3 }}>📚 Attendance: <strong>{u.schoolAttendance}%</strong></div>
                      )}
                      {u.healthStatus && (
                        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 3 }}>
                          🏥 Health: <strong>{u.healthStatus === "good" ? "🟢 Good" : u.healthStatus === "fair" ? "🟡 Fair" : "🔴 Poor"}</strong>
                        </div>
                      )}
                      {u.deliveriesMade?.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          {u.deliveriesMade.map((d, j) => (
                            <div key={j} style={{ fontSize: 10, color: COLORS.secondary, fontWeight: 600 }}>✅ {d}</div>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 }}>
                        {u.progressNotes?.slice(0, 80)}{u.progressNotes?.length > 80 ? "…" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {updates.length === 0 && (
              <div style={{ padding: "16px 20px", fontSize: 13, color: COLORS.muted, textAlign: "center" }}>
                📊 Monthly updates will appear here after the first month.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── USER AVATAR — coloured circle with initials ─────────────────────────────
const AVATAR_COLORS = ["#004B96","#4B7D19","#7C3AED","#D97706","#DC2626","#0891B2","#059669","#9D174D"];
const UserAvatar = ({ name, size = 36 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const color = AVATAR_COLORS[(name || "").charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 800, flexShrink: 0, letterSpacing: -0.5 }}>
      {initials}
    </div>
  );
};

// ─── USERS TAB — avatars, inline role change, delete ─────────────────────────
const ALL_ROLES = [
  { value: "reporter",            label: "📝 Reporter"              },
  { value: "donor",               label: "💳 Donor"                  },
  { value: "field_agent",         label: "🔍 Field Agent"            },
  { value: "verification_office", label: "🏛️ Verification Office"   },
  { value: "program_manager",     label: "🌱 Program Manager"        },
  { value: "project_manager",     label: "🏗️ Project Manager"       },
  { value: "admin",               label: "🟠 Admin"                  },
  { value: "super_admin",         label: "🔴 Super Admin"            },
];
const ROLE_COLORS = {
  super_admin:         { bg: "#FEE2E2", text: "#991B1B" },
  admin:               { bg: "#FEF3C7", text: "#92400E" },
  field_agent:         { bg: "#EDE9FE", text: "#5B21B6" },
  donor:               { bg: "#D1FAE5", text: "#065F46" },
  reporter:            { bg: "#DBEAFE", text: "#1E40AF" },
  verification_office: { bg: "#E0F2FE", text: "#0369A1" },
  program_manager:     { bg: "#DCFCE7", text: "#14532D" },
  project_manager:     { bg: "#FEF9C3", text: "#713F12" },
};

const LANG_OPTS = ["en", "so", "ar", "tr", "es", "fr"];

// Super Admin: full edit of any user (profile + role + status + password).
const EditUserModal = ({ user, onClose, onSaved }) => {
  const [f, setF] = useState({
    name:              user.name || user.fullname || "",
    email:             user.email || "",
    phone:             user.phone || "",
    city:              user.city || "",
    country:           user.country || "",
    organization:      user.organization || "",
    preferredLanguage: user.preferredLanguage || "en",
    role:              user.role || "reporter",
    isActive:          user.isActive !== false,
    isApproved:        user.isApproved !== false,
    newPassword:       "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const payload = {
        name: f.name, email: f.email, phone: f.phone, city: f.city, country: f.country,
        organization: f.organization, preferredLanguage: f.preferredLanguage,
        role: f.role, isActive: f.isActive, isApproved: f.isApproved,
      };
      if (f.newPassword) payload.newPassword = f.newPassword;
      const res = await adminApi.updateUser(user.id, payload);
      onSaved(res.user || { ...user, ...payload });
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to update user");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Edit User — ${user.name || user.email}`} onClose={onClose} wide>
      {err && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13 }}>{err}</div>}
      <div className="kf-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Full Name" value={f.name} onChange={e => set("name", e.target.value)} />
        <Input label="Email" type="email" value={f.email} onChange={e => set("email", e.target.value)} />
        <Input label="Phone" value={f.phone} onChange={e => set("phone", e.target.value)} />
        <Input label="Organization" value={f.organization} onChange={e => set("organization", e.target.value)} />
        <Input label="City" value={f.city} onChange={e => set("city", e.target.value)} />
        <Input label="Country" value={f.country} onChange={e => set("country", e.target.value)} />
        <Select label="Role" value={f.role} onChange={e => set("role", e.target.value)}>
          {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
        <Select label="Preferred Language" value={f.preferredLanguage} onChange={e => set("preferredLanguage", e.target.value)}>
          {LANG_OPTS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </Select>
        <Select label="Account Status" value={f.isActive ? "active" : "inactive"} onChange={e => set("isActive", e.target.value === "active")}>
          <option value="active">● Active</option>
          <option value="inactive">● Inactive</option>
        </Select>
        <Select label="Approval" value={f.isApproved ? "approved" : "pending"} onChange={e => set("isApproved", e.target.value === "approved")}>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </Select>
        <Input label="Reset Password (optional)" type="password" placeholder="Leave blank to keep" value={f.newPassword} onChange={e => set("newPassword", e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="muted" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "💾 Save Changes"}</Btn>
      </div>
    </Modal>
  );
};

// Any logged-in user: edit their OWN profile + change their OWN password.
const ProfileModal = ({ onClose }) => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({
    name:              user?.name || "",
    email:             user?.email || "",
    phone:             user?.phone || "",
    city:              user?.city || "",
    country:           user?.country || "",
    organization:      user?.organization || "",
    preferredLanguage: user?.preferredLanguage || "en",
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const saveProfile = async () => {
    setSaving(true); setErr(""); setMsg("");
    try {
      const res = await authApi.updateProfile(f);
      if (res.user) updateUser(res.user);
      setMsg("Profile updated ✓");
    } catch (e) { setErr(e.message || "Failed to update profile"); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    setErr(""); setMsg("");
    if (pw.newPassword.length < 8) return setErr("New password must be at least 8 characters");
    if (pw.newPassword !== pw.confirm) return setErr("New passwords do not match");
    setSaving(true);
    try {
      await authApi.changePassword(pw.currentPassword, pw.newPassword);
      // Changing the password invalidates the current token → force a fresh login.
      logout();
      navigate("/login");
    } catch (e) { setErr(e.message || "Failed to change password"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="My Profile" onClose={onClose} wide>
      {err && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13 }}>{err}</div>}
      {msg && <div style={{ background: "#D1FAE5", color: "#065F46", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13 }}>{msg}</div>}
      <div className="kf-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Full Name" value={f.name} onChange={e => set("name", e.target.value)} />
        <Input label="Email" type="email" value={f.email} onChange={e => set("email", e.target.value)} />
        <Input label="Phone" value={f.phone} onChange={e => set("phone", e.target.value)} />
        <Input label="Organization" value={f.organization} onChange={e => set("organization", e.target.value)} />
        <Input label="City" value={f.city} onChange={e => set("city", e.target.value)} />
        <Input label="Country" value={f.country} onChange={e => set("country", e.target.value)} />
        <Select label="Preferred Language" value={f.preferredLanguage} onChange={e => set("preferredLanguage", e.target.value)}>
          {LANG_OPTS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </Select>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="primary" onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : "💾 Save Profile"}</Btn>
      </div>
      <hr style={{ border: "none", borderTop: `1px solid ${COLORS.border}`, margin: "22px 0" }} />
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: COLORS.text }}>🔒 Change Password</h3>
      <div className="kf-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Input label="Current Password" type="password" value={pw.currentPassword} onChange={e => setPw(p => ({ ...p, currentPassword: e.target.value }))} />
        <Input label="New Password" type="password" value={pw.newPassword} onChange={e => setPw(p => ({ ...p, newPassword: e.target.value }))} />
        <Input label="Confirm New" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="primary" onClick={savePassword} disabled={saving}>Update Password</Btn>
      </div>
    </Modal>
  );
};

const UsersTab = ({ users, isSuperAdmin, onDeleteUser, onChangeRole }) => {
  const { t } = useLang();
  const [editingId, setEditingId] = useState(null);
  const [savingId,  setSavingId]  = useState(null);
  const [rows,      setRows]      = useState(users);
  const [editUser,  setEditUser]  = useState(null);
  useEffect(() => { setRows(users); }, [users]);

  const handleRoleChange = async (u, newRole) => {
    if (newRole === u.role) { setEditingId(null); return; }
    setSavingId(u.id);
    try {
      await onChangeRole(u, newRole);
    } finally {
      setSavingId(null);
      setEditingId(null);
    }
  };

  return (
    <div className="kf-table-wrap">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["", t("name"), "Email", "Phone", t("role"), t("status"), isSuperAdmin ? t("actions") : null].filter(Boolean).map(h => (
              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((u, i) => {
            const name = u.name || u.fullname || "?";
            const rc = ROLE_COLORS[u.role] || { bg: "#F3F4F6", text: "#374151" };
            const isEditing = editingId === u.id;
            const isSaving  = savingId  === u.id;
            return (
              <tr key={u.id} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "10px 16px" }}><UserAvatar name={name} size={38} /></td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{u.country || ""}{u.city ? `, ${u.city}` : ""}</div>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: COLORS.muted }}>{u.email}</td>
                <td style={{ padding: "10px 16px", fontSize: 13 }}>{u.phone || "—"}</td>
                <td style={{ padding: "10px 16px" }}>
                  {isSuperAdmin && isEditing ? (
                    <Select value={u.role} disabled={isSaving}
                      onChange={e => { handleRoleChange(u, e.target.value); setEditingId(null); }}
                      wrapStyle={{ marginBottom:0 }}>
                      {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </Select>
                  ) : (
                    <span onClick={() => isSuperAdmin && setEditingId(u.id)}
                      title={isSuperAdmin ? "Click to change role" : ""}
                      style={{ background: rc.bg, color: rc.text, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: isSuperAdmin ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {(u.role || "").replace(/_/g, " ")}
                      {isSuperAdmin && <span style={{ fontSize: 9, opacity: 0.6 }}>✏️</span>}
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ background: u.isActive !== false ? "#D1FAE5" : "#FEE2E2", color: u.isActive !== false ? "#065F46" : "#991B1B", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    ● {u.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                {isSuperAdmin && (
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditUser(u)}
                        style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", cursor: "pointer" }}>
                        ✏️ Edit
                      </button>
                      {u.role !== "super_admin" && (
                        <button onClick={() => onDeleteUser && onDeleteUser(u)}
                          style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5", cursor: "pointer" }}>
                          {t("deleteUser")}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)}
          onSaved={(u) => setRows(rs => rs.map(x => x.id === u.id ? { ...x, ...u } : x))} />
      )}
    </div>
  );
};

// ─── NOTEBOOK (admin & super-admin: notes + assignable tasks) ────────────────
const NOTE_STATUS = {
  todo:  { label: "To Do",       bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  doing: { label: "In Progress", bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  done:  { label: "Done",        bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
};
const NOTE_PRIORITY = {
  low:    { label: "Low",    color: "#6B7280" },
  normal: { label: "Normal", color: "#2563EB" },
  high:   { label: "High",   color: "#DC2626" },
};

const NotebookPanel = ({ users = [], showToast }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", assigneeId: "", priority: "normal", status: "todo" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const toast = showToast || (() => {});

  useEffect(() => {
    setLoading(true);
    notesApi.list().then(r => setNotes(Array.isArray(r.notes) ? r.notes : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addNote = async () => {
    if (!form.title.trim()) return toast("Please enter a title", "error");
    setSaving(true);
    try {
      const r = await notesApi.create({
        title: form.title.trim(), body: form.body.trim(),
        priority: form.priority, status: form.status,
        assigneeId: form.assigneeId || null,
      });
      setNotes(ns => [r.note, ...ns]);
      setForm({ title: "", body: "", assigneeId: "", priority: "normal", status: "todo" });
      toast("Note added ✓", "success");
    } catch (e) { toast(e.message || "Failed to add note", "error"); }
    finally { setSaving(false); }
  };

  const cycleStatus = async (note) => {
    const order = ["todo", "doing", "done"];
    const next = order[(order.indexOf(note.status) + 1) % order.length];
    try {
      const r = await notesApi.update(note.id, { status: next });
      setNotes(ns => ns.map(n => n.id === note.id ? r.note : n));
    } catch (e) { toast(e.message || "Failed", "error"); }
  };

  const reassign = async (note, assigneeId) => {
    try {
      const r = await notesApi.update(note.id, { assigneeId: assigneeId || null });
      setNotes(ns => ns.map(n => n.id === note.id ? r.note : n));
      toast("Reassigned ✓", "success");
    } catch (e) { toast(e.message || "Failed", "error"); }
  };

  const del = async (note) => {
    if (!window.confirm(`Delete note "${note.title}"?`)) return;
    try {
      await notesApi.remove(note.id);
      setNotes(ns => ns.filter(n => n.id !== note.id));
      toast("Deleted", "success");
    } catch (e) { toast(e.message || "Failed", "error"); }
  };

  const shown = filter === "all" ? notes : notes.filter(n => n.status === filter);
  const counts = { all: notes.length, todo: notes.filter(n => n.status === "todo").length, doing: notes.filter(n => n.status === "doing").length, done: notes.filter(n => n.status === "done").length };

  return (
    <div>
      {/* Branded header — carries the Kafaale Qaad logo + icon */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", borderRadius: 16, marginBottom: 20,
        background: "linear-gradient(135deg,#002651 0%,#004B96 55%,#B8861A 140%)", color: "#fff" }}>
        <img src="/assets/brand/kafaala-qaad-hope-icon-192.png" alt="Kafaale Qaad" width={48} height={48}
          style={{ borderRadius: 12, background: "#fff", padding: 4, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Logo size="sm" linked={false} dark />
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>📓 Notebook</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Write notes and assign tasks to your team</div>
        </div>
      </div>

      {/* Create form */}
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <Input label="Title" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Follow up on Baidoa delivery" />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>Details</label>
          <textarea value={form.body} onChange={e => set("body", e.target.value)} rows={3} placeholder="Write what needs to be done…"
            style={{ width: "100%", padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
        </div>
        <div className="kf-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Select label="Assign to" value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)}>
            <option value="">— Unassigned —</option>
            {users.map(u => <option key={u.id} value={u.id}>{(u.name || u.email)} ({(u.role || "").replace(/_/g, " ")})</option>)}
          </Select>
          <Select label="Priority" value={form.priority} onChange={e => set("priority", e.target.value)}>
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
          </Select>
          <Select label="Status" value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="todo">To Do</option><option value="doing">In Progress</option><option value="done">Done</option>
          </Select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <Btn variant="primary" onClick={addNote} disabled={saving}>{saving ? "Adding…" : "➕ Add Note"}</Btn>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["all", "All"], ["todo", "To Do"], ["doing", "In Progress"], ["done", "Done"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${filter === k ? COLORS.primary : COLORS.border}`, background: filter === k ? COLORS.primary : "#fff", color: filter === k ? "#fff" : COLORS.muted }}>
            {lbl} ({counts[k]})
          </button>
        ))}
      </div>

      {/* Notes list */}
      {loading ? <div style={{ padding: 30, textAlign: "center", color: COLORS.muted }}>Loading…</div> :
        shown.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: COLORS.muted }}>No notes yet. Add your first above.</div> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {shown.map(n => {
            const st = NOTE_STATUS[n.status] || NOTE_STATUS.todo;
            const pr = NOTE_PRIORITY[n.priority] || NOTE_PRIORITY.normal;
            return (
              <div key={n.id} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${st.dot}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text }}>{n.title}</div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: pr.color, flexShrink: 0 }}>{pr.label.toUpperCase()}</span>
                </div>
                {n.body && <div style={{ fontSize: 13, color: COLORS.muted, whiteSpace: "pre-wrap" }}>{n.body}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.muted }}>
                  <span>👤 {n.assignee?.name || "Unassigned"}</span><span>·</span>
                  <span>{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <button onClick={() => cycleStatus(n)} title="Click to advance status" style={{ background: st.bg, color: st.text, border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>● {st.label}</button>
                  <select value={n.assigneeId || ""} onChange={e => reassign(n, e.target.value)}
                    style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, border: `1px solid ${COLORS.border}`, color: COLORS.text, background: "#fff", maxWidth: 130 }}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                  </select>
                  <button onClick={() => del(n)} title="Delete" style={{ marginLeft: "auto", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
};

// ─── SITE SETTINGS PANEL (super admin) ───────────────────────────────────────
const PAGE_DEFAULTS = {
  about:        { label: "About Us",       path: "/about",        icon: "🏛️", group: "About" },
  howItWorks:   { label: "How We Work",    path: "/how-it-works", icon: "⚙️", group: "About" },
  cases:        { label: "Cases",          path: "/cases",        icon: "📋", group: "Operations" },
  programs:     { label: "Programs",       path: "/programs",     icon: "🌱", group: "Operations" },
  projects:     { label: "Projects",       path: "/projects",     icon: "🏗️", group: "Operations" },
  donate:       { label: "Donate",         path: "/donate",       icon: "❤️", group: "Give" },
  partners:     { label: "Partners",       path: "/partners",     icon: "🌐", group: "Give" },
  stories:      { label: "Stories",        path: "/stories",      icon: "📰", group: "More" },
  volunteer:    { label: "Volunteer",      path: "/volunteer",    icon: "🤝", group: "More" },
  faq:          { label: "FAQ",            path: "/faq",          icon: "❓", group: "More" },
  updates:      { label: "Updates",        path: "/updates",      icon: "🚨", group: "More" },
  contact:      { label: "Contact",        path: "/contact",      icon: "📬", group: "Contact" },
};

const SITE_INFO_DEFAULTS = {
  orgName:    "Kafaala Qaad HOPE",
  tagline:    "Connecting Verified Need with Compassionate Support",
  email:      "kafaaleqaad@gmail.com",
  phone:      "+252 61 502 4050",
  address:    "Juma Tower, Room 403, Howl-wadaag, Mogadishu",
  website:    "kafaale.so",
  facebook:   "https://facebook.com/kafaaleqaad",
  twitter:    "https://twitter.com/kafaaleqaad",
  linkedin:   "https://linkedin.com/company/kafaaleqaad",
  heroTitle:  "Transforming Compassion Into Verified Impact",
  heroSub:    "Every donation reaches a verified beneficiary — tracked from field to delivery.",
  showStats:   true,
};

const loadPageVis   = () => { try { return { ...Object.fromEntries(Object.keys(PAGE_DEFAULTS).map(k=>[k,true])), ...JSON.parse(localStorage.getItem("kf_page_settings")||"{}") }; } catch { return Object.fromEntries(Object.keys(PAGE_DEFAULTS).map(k=>[k,true])); } };
const loadSiteInfo  = () => { try { return { ...SITE_INFO_DEFAULTS, ...JSON.parse(localStorage.getItem("kf_site_settings")||"{}") }; } catch { return { ...SITE_INFO_DEFAULTS }; } };

// ── Team & Updates helpers ────────────────────────────────────────────────────
const TEAM_KEY_ADMIN    = "kf_team_data";
const TEAM_VIS_KEY_ADMIN = "kf_team_visible";
const UPDATES_ADMIN_KEY = "kf_updates";

const DEFAULT_TEAM_ADMIN = [
  { id:"t1", name:"Abdimalik Hassan", role:"Project Lead & CEO",       bio:"Humanitarian sector leader with 10+ years in crisis response across the Horn of Africa.", photo:"https://randomuser.me/api/portraits/men/32.jpg",  linkedin:"", show:true },
  { id:"t2", name:"Asha Mohammed",    role:"Product Manager",          bio:"Driving platform strategy and community partnerships across 4 countries.", photo:"https://randomuser.me/api/portraits/women/44.jpg", linkedin:"", show:true },
  { id:"t3", name:"Fatima Ali",       role:"Design Lead",              bio:"Award-winning UX designer focused on making aid technology accessible in low-connectivity environments.", photo:"https://randomuser.me/api/portraits/women/26.jpg", linkedin:"", show:true },
  { id:"t4", name:"Omar Ibrahim",     role:"Lead Backend Engineer",    bio:"Full-stack engineer specialising in secure, high-availability humanitarian platforms.", photo:"https://randomuser.me/api/portraits/men/68.jpg",  linkedin:"", show:true },
  { id:"t5", name:"Hodan Warsame",    role:"Field Operations Manager", bio:"Former UNHCR field officer with direct experience in IDP camp management and emergency response.", photo:"https://randomuser.me/api/portraits/women/62.jpg", linkedin:"", show:true },
  { id:"t6", name:"Mahad Yusuf",      role:"Security & DevOps",        bio:"Cybersecurity specialist ensuring donor data and beneficiary privacy across all systems.", photo:"https://randomuser.me/api/portraits/men/45.jpg",  linkedin:"", show:true },
];
const DEFAULT_UPDATES_ADMIN = [
  { id:"upd-1", type:"Flood",    published:true,  title:"Severe Flooding Displaces 3,000+ Families in Beledweyne", date:"2026-06-15", location:"Beledweyne, Hiran Region",  severity:"critical", body:"Unprecedented flooding along the Shabelle River has displaced over 3,000 families in Beledweyne. Access roads are cut off. Emergency food, shelter, and clean water are urgently needed.", img:"https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=700&q=75", needs:["Emergency Shelter Kits","Clean Water","Food Packages"] },
  { id:"upd-2", type:"Drought",  published:true,  title:"Drought Alert: Bay Region Facing Critical Food Shortage",  date:"2026-06-10", location:"Baidoa, Bay Region",         severity:"high",     body:"Three consecutive failed rainy seasons have pushed Bay Region into a severe food crisis. Over 15,000 people face acute malnutrition.",  img:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=75", needs:["Food Packages","Livestock Feed","Water Trucking"] },
  { id:"upd-3", type:"Emergency",published:true,  title:"IDP Camp Medical Emergency — Mogadishu North",            date:"2026-06-05", location:"Mogadishu, Benadir",         severity:"high",     body:"A disease outbreak in Mogadishu North IDP camp is affecting hundreds of families. Medical supplies are critically low.", img:"https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=700&q=75", needs:["Medicine","ORS Kits","Mobile Clinic"] },
  { id:"upd-4", type:"General",  published:true,  title:"Kafaale Qaad Expands to Lower Jubba Region",              date:"2026-05-28", location:"Kismayo, Lower Jubba",       severity:"info",     body:"We are proud to announce our expansion into the Lower Jubba region. Local field agents have been trained and onboarded.", img:"https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=700&q=75", needs:[] },
];
const loadTeamAdmin = () => {
  try {
    const s = JSON.parse(localStorage.getItem(TEAM_KEY_ADMIN)||"null");
    if (!s) return DEFAULT_TEAM_ADMIN;
    return s.map(m => {
      const def = DEFAULT_TEAM_ADMIN.find(d => d.id === m.id);
      return (!m.photo && def?.photo) ? { ...m, photo: def.photo } : m;
    });
  } catch { return DEFAULT_TEAM_ADMIN; }
};
const loadUpdatesAdmin = () => { try { return JSON.parse(localStorage.getItem(UPDATES_ADMIN_KEY)||"null")||DEFAULT_UPDATES_ADMIN; } catch { return DEFAULT_UPDATES_ADMIN; } };
const BLANK_MEMBER = { id:"", name:"", role:"", bio:"", photo:"", linkedin:"", show:true };
const BLANK_UPDATE = { id:"", type:"General", published:false, title:"", date:"", location:"", severity:"medium", body:"", img:"", needs:[] };
const UPDATE_TYPES = getCat("updates");

const SiteSettingsPanel = ({ showToast, currentUser, defaultTab }) => {
  const C = COLORS;
  const [settingsTab, setSettingsTab] = useState(defaultTab || "pages");
  const [pageVis,  setPageVis]  = useState(loadPageVis);
  const [siteInfo, setSiteInfo] = useState(loadSiteInfo);
  const [saved,    setSaved]    = useState(false);

  // Team management
  const [team,        setTeam]        = useState(loadTeamAdmin);
  const [teamVisible, setTeamVisible] = useState(() => { try { const s=localStorage.getItem(TEAM_VIS_KEY_ADMIN); return s===null?true:s==="true"; } catch { return true; } });
  const [editMember,  setEditMember]  = useState(null); // null | member object
  const [memberForm,  setMemberForm]  = useState(BLANK_MEMBER);

  // Updates management
  const [updatesData,  setUpdatesData]  = useState(loadUpdatesAdmin);
  const [editUpdate,   setEditUpdate]   = useState(null);
  const [updateForm,   setUpdateForm]   = useState(BLANK_UPDATE);

  const isSuperAdmin = currentUser?.role === "super_admin";

  const savePages = () => {
    localStorage.setItem("kf_page_settings", JSON.stringify(pageVis));
    window.dispatchEvent(new Event("storage"));
    showToast("Page visibility saved");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveSiteInfo = () => {
    localStorage.setItem("kf_site_settings", JSON.stringify(siteInfo));
    window.dispatchEvent(new Event("storage"));
    showToast("Site settings saved");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePage = (key) => {
    if (!isSuperAdmin) return;
    setPageVis(v => ({ ...v, [key]: !v[key] }));
  };

  // Team helpers
  const saveTeam = (newTeam, newVis) => {
    const t = newTeam !== undefined ? newTeam : team;
    const v = newVis  !== undefined ? newVis  : teamVisible;
    localStorage.setItem(TEAM_KEY_ADMIN,     JSON.stringify(t));
    localStorage.setItem(TEAM_VIS_KEY_ADMIN, String(v));
    window.dispatchEvent(new Event("storage"));
    showToast("Team saved");
  };
  const openNewMember  = () => { setMemberForm({ ...BLANK_MEMBER, id: "t" + Date.now() }); setEditMember("new"); };
  const openEditMember = (m) => { setMemberForm({ ...m });                                   setEditMember(m.id); };
  const saveMember = () => {
    const f = memberForm;
    if (!f.name.trim()) return showToast("Name is required");
    const existing = team.find(m => m.id === f.id);
    const newTeam  = existing ? team.map(m => m.id===f.id ? f : m) : [...team, f];
    setTeam(newTeam);
    saveTeam(newTeam, undefined);
    setEditMember(null);
  };
  const deleteMember = (id) => {
    const newTeam = team.filter(m => m.id !== id);
    setTeam(newTeam);
    saveTeam(newTeam, undefined);
    showToast("Member removed");
  };
  const toggleMemberShow = (id) => {
    const newTeam = team.map(m => m.id===id ? { ...m, show: !m.show } : m);
    setTeam(newTeam);
    saveTeam(newTeam, undefined);
  };
  const toggleTeamSection = () => {
    const newVis = !teamVisible;
    setTeamVisible(newVis);
    saveTeam(undefined, newVis);
  };

  // Updates helpers
  const saveUpdates = (list) => {
    localStorage.setItem(UPDATES_ADMIN_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));
    showToast("Updates saved");
  };
  const openNewUpdate  = () => { setUpdateForm({ ...BLANK_UPDATE, id: "upd-" + Date.now() }); setEditUpdate("new"); };
  const openEditUpdate = (u) => { setUpdateForm({ ...u }); setEditUpdate(u.id); };
  const saveUpdate = () => {
    if (!updateForm.title.trim()) return showToast("Title is required");
    const existing = updatesData.find(u => u.id === updateForm.id);
    const newList  = existing ? updatesData.map(u => u.id===updateForm.id ? updateForm : u) : [updateForm, ...updatesData];
    setUpdatesData(newList);
    saveUpdates(newList);
    setEditUpdate(null);
  };
  const deleteUpdate = (id) => {
    const newList = updatesData.filter(u => u.id !== id);
    setUpdatesData(newList);
    saveUpdates(newList);
  };
  const togglePublish = (id) => {
    const newList = updatesData.map(u => u.id===id ? { ...u, published: !u.published } : u);
    setUpdatesData(newList);
    saveUpdates(newList);
  };

  const groups = [...new Set(Object.values(PAGE_DEFAULTS).map(p => p.group))];

  const STABS = [
    { id: "pages",       label: "📄 Page Visibility" },
    { id: "siteinfo",   label: "🏢 Site Information" },
    { id: "homepage",   label: "🏠 Homepage Content" },
    { id: "cases_display", label: "📋 Cases Display" },
    { id: "social",     label: "📱 Social & Contact" },
    { id: "team",       label: "👥 Meet the Team" },
    { id: "updates_mgr",label: "🚨 Updates" },
    { id: "categories", label: "🏷️ Categories" },
  ];

  // ── Cases display settings ───────────────────────────────────────
  const CASES_VIS_KEY = "kf_cases_display";
  const CASES_VIS_DEFAULTS = {
    showTrustBadges: true, showVerificationBadge: true,
    showFieldVerified: true, showFundingBar: true,
    showCategoryFilter: true, showUrgencyFilter: true,
    showTableView: true,
  };
  const [casesVis, setCasesVis] = useState(() => {
    try { return { ...CASES_VIS_DEFAULTS, ...JSON.parse(localStorage.getItem(CASES_VIS_KEY)||"{}") }; }
    catch { return CASES_VIS_DEFAULTS; }
  });
  const saveCasesVis = (next) => {
    setCasesVis(next);
    localStorage.setItem(CASES_VIS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("storage"));
    showToast?.("Cases display updated", "success");
  };
  const toggleCasesVis = (key) => {
    if (!isSuperAdmin) return;
    saveCasesVis({ ...casesVis, [key]: !casesVis[key] });
  };

  const fieldStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
    background: isSuperAdmin ? "#fff" : C.bg, boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⚙️ Site Settings</h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 13 }}>
          {isSuperAdmin ? "Full control over the platform — pages, content, and site information." : "View-only. Only Super Admins can make changes."}
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${C.border}`, marginBottom: 28, overflowX: "auto" }}>
        {STABS.map(st => (
          <button key={st.id} onClick={() => setSettingsTab(st.id)} style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 700, border: "none", background: "none",
            cursor: "pointer", whiteSpace: "nowrap",
            color:        settingsTab === st.id ? C.primary : C.muted,
            borderBottom: settingsTab === st.id ? `2px solid ${C.primary}` : "2px solid transparent",
            marginBottom: -2,
          }}>{st.label}</button>
        ))}
      </div>

      {/* ── CATEGORIES ── */}
      {settingsTab === "categories" && (
        <div>
          <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 10 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <div style={{ fontSize: 13, color: "#92400E" }}>
              Add or remove categories used across the site. Removing a category only takes it off the lists — existing cases, stories, and projects already tagged with it keep their tag.
            </div>
          </div>
          <div style={{ display: "grid", gap: 18, maxWidth: 760 }}>
            {Object.keys(CAT_GROUPS).map(g => (
              <CategoryManager key={g} group={g} />
            ))}
          </div>
        </div>
      )}

      {/* ── PAGE VISIBILITY ── */}
      {settingsTab === "pages" && (
        <div>
          <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 10 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <div style={{ fontSize: 13, color: "#92400E" }}>
              <strong>Toggling a page OFF</strong> hides it from the public navigation and shows a "Coming Soon" message when visited directly. Core pages (Home, Login) are always visible.
            </div>
          </div>
          {groups.map(group => (
            <div key={group} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>{group}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {Object.entries(PAGE_DEFAULTS).filter(([, v]) => v.group === group).map(([key, meta]) => {
                  const on = pageVis[key] !== false;
                  return (
                    <div key={key} onClick={() => togglePage(key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 16px", borderRadius: 12,
                        border: `1.5px solid ${on ? C.primary + "40" : C.border}`,
                        background: on ? C.primary + "06" : C.bg,
                        cursor: isSuperAdmin ? "pointer" : "default",
                        transition: "all .15s",
                      }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{meta.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{meta.label}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{meta.path}</div>
                      </div>
                      {/* Toggle pill */}
                      <div style={{
                        width: 44, height: 24, borderRadius: 99, position: "relative", flexShrink: 0,
                        background: on ? C.primary : "#D1D5DB",
                        transition: "background .2s",
                        opacity: isSuperAdmin ? 1 : 0.5,
                      }}>
                        <div style={{
                          position: "absolute", top: 3, left: on ? 23 : 3,
                          width: 18, height: 18, borderRadius: "50%", background: "#fff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left .2s",
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: on ? C.primary : C.muted, minWidth: 28 }}>{on ? "ON" : "OFF"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {isSuperAdmin && (
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={savePages} style={{
                padding: "11px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                background: C.primary, color: "#fff", fontWeight: 800, fontSize: 14,
              }}>{saved ? "✓ Saved" : "Save Page Settings"}</button>
              <button onClick={() => { setPageVis(Object.fromEntries(Object.keys(PAGE_DEFAULTS).map(k=>[k,true]))); }}
                style={{ padding: "11px 20px", borderRadius: 10, border: `1.5px solid ${C.border}`, cursor: "pointer", background: "#fff", fontWeight: 700, fontSize: 14, color: C.muted }}>
                Reset All to ON
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SITE INFORMATION ── */}
      {settingsTab === "siteinfo" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20, marginBottom: 28 }}>
            {[
              { key: "orgName",  label: "Organisation Name",    type: "text"  },
              { key: "tagline",  label: "Tagline / Slogan",     type: "text"  },
              { key: "email",    label: "Contact Email",        type: "email" },
              { key: "phone",    label: "Contact Phone",        type: "text"  },
              { key: "address",  label: "Office Address",       type: "text"  },
              { key: "website",  label: "Website Domain",       type: "text"  },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                <input type={type} value={siteInfo[key] || ""} readOnly={!isSuperAdmin}
                  onChange={e => setSiteInfo(v => ({ ...v, [key]: e.target.value }))}
                  style={fieldStyle} />
              </div>
            ))}
          </div>
          {isSuperAdmin && (
            <button onClick={saveSiteInfo} style={{ padding: "11px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: C.primary, color: "#fff", fontWeight: 800, fontSize: 14 }}>
              {saved ? "✓ Saved" : "Save Site Information"}
            </button>
          )}
        </div>
      )}

      {/* ── HOMEPAGE CONTENT ── */}
      {settingsTab === "homepage" && (
        <div>
          {/* Stats bar toggle */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>Stats Bar</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Show / hide the 2,400+ Cases · $1.2M · 98.8% · 6 Regions bar below the hero</div>
              </div>
              <button onClick={() => {
                if (!isSuperAdmin) return;
                setSiteInfo(v => ({ ...v, showStats: !v.showStats }));
              }} style={{
                width: 52, height: 28, borderRadius: 99, border: "none", cursor: isSuperAdmin ? "pointer" : "default",
                background: siteInfo.showStats !== false ? C.secondary : "#D1D5DB",
                position: "relative", transition: "background .2s", flexShrink: 0,
              }}>
                <span style={{
                  position: "absolute", top: 3, left: siteInfo.showStats !== false ? 26 : 3,
                  width: 22, height: 22, borderRadius: "50%", background: "#fff",
                  transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 20, maxWidth: 640, marginBottom: 28 }}>
            {[
              { key: "heroTitle", label: "Hero Headline",    rows: 2 },
              { key: "heroSub",   label: "Hero Subheading",  rows: 3 },
            ].map(({ key, label, rows }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                <textarea rows={rows} value={siteInfo[key] || ""} readOnly={!isSuperAdmin}
                  onChange={e => setSiteInfo(v => ({ ...v, [key]: e.target.value }))}
                  style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }} />
              </div>
            ))}
          </div>
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#065F46" }}>
            💡 Impact story cards on the homepage are managed under the <strong>Impact Stories</strong> tab.
          </div>
          {isSuperAdmin && (
            <button onClick={saveSiteInfo} style={{ padding: "11px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: C.primary, color: "#fff", fontWeight: 800, fontSize: 14 }}>
              {saved ? "✓ Saved" : "Save Homepage Content"}
            </button>
          )}
        </div>
      )}

      {/* ── SOCIAL & CONTACT ── */}
      {settingsTab === "social" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20, marginBottom: 28 }}>
            {[
              { key: "facebook",  label: "Facebook URL",  icon: "📘" },
              { key: "twitter",   label: "Twitter/X URL", icon: "🐦" },
              { key: "linkedin",  label: "LinkedIn URL",  icon: "💼" },
            ].map(({ key, label, icon }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{icon} {label}</label>
                <input type="url" value={siteInfo[key] || ""} readOnly={!isSuperAdmin}
                  onChange={e => setSiteInfo(v => ({ ...v, [key]: e.target.value }))}
                  style={fieldStyle} />
              </div>
            ))}
          </div>
          {isSuperAdmin && (
            <button onClick={saveSiteInfo} style={{ padding: "11px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: C.primary, color: "#fff", fontWeight: 800, fontSize: 14 }}>
              {saved ? "✓ Saved" : "Save Social Links"}
            </button>
          )}
        </div>
      )}

      {/* ── TEAM MANAGEMENT ── */}
      {settingsTab === "team" && (
        <div>
          {/* Global show/hide */}
          <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 20px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:C.navy }}>Show "Meet the Team" section on About page</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>When OFF, the entire team section is hidden from the About page.</div>
            </div>
            <button onClick={toggleTeamSection} style={{
              width:52, height:28, borderRadius:99, border:"none", cursor:"pointer",
              background: teamVisible ? C.secondary : "#D1D5DB", position:"relative", transition:"background .2s", flexShrink:0,
            }}>
              <span style={{ position:"absolute", top:3, left: teamVisible ? 26 : 3, width:22, height:22, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
            </button>
          </div>

          {/* Add member button */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{team.length} team members</div>
            <button onClick={openNewMember} style={{ padding:"9px 20px", background:C.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Add Member</button>
          </div>

          {/* Member list */}
          <div style={{ display:"grid", gap:10, marginBottom:24 }}>
            {team.map((m, i) => (
              <div key={m.id||i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", overflow:"hidden", flexShrink:0, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900, color:C.primary }}>
                  {m.photo ? <img src={m.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (m.name||"?")[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{m.name || <em style={{ color:C.muted }}>No name</em>}</div>
                  <div style={{ fontSize:12, color:C.primary, fontWeight:600 }}>{m.role}</div>
                  {m.bio && <div style={{ fontSize:11, color:C.muted, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:320 }}>{m.bio}</div>}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                  {/* Show/hide toggle */}
                  <button onClick={() => toggleMemberShow(m.id)} style={{
                    width:40, height:22, borderRadius:99, border:"none", cursor:"pointer", position:"relative",
                    background: m.show !== false ? C.secondary : "#D1D5DB", transition:"background .2s",
                  }}>
                    <span style={{ position:"absolute", top:2, left: m.show!==false ? 20:2, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                  </button>
                  <button onClick={() => openEditMember(m)} style={{ padding:"6px 14px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, color:C.text }}>Edit</button>
                  <button onClick={() => deleteMember(m.id)} style={{ padding:"6px 12px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, color:"#C0392B" }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit/Add member form modal */}
          {editMember && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
              <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:520, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
                <h3 style={{ margin:"0 0 20px", fontSize:18, fontWeight:800 }}>{editMember==="new" ? "Add New Member" : "Edit Member"}</h3>
                <div style={{ display:"grid", gap:14 }}>
                  {[
                    { key:"name",     label:"Full Name *",    type:"text"  },
                    { key:"role",     label:"Role / Title",   type:"text"  },
                    { key:"photo",    label:"Photo URL",      type:"url"   },
                    { key:"linkedin", label:"LinkedIn URL",   type:"url"   },
                  ].map(({key,label,type}) => key === "photo" ? null : (
                    <div key={key}>
                      <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>{label}</label>
                      <input type={type} value={memberForm[key]||""} onChange={e => setMemberForm(f => ({...f,[key]:e.target.value}))}
                        style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
                    </div>
                  ))}
                  {/* Photo — upload file OR paste URL */}
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Photo</label>
                    <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                      {/* Preview */}
                      <div style={{ width:72, height:72, borderRadius:"50%", overflow:"hidden", border:`2px solid ${C.border}`, flexShrink:0, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {memberForm.photo
                          ? <img src={memberForm.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : <span style={{ fontSize:28, opacity:0.3 }}>👤</span>}
                      </div>
                      <div style={{ flex:1, minWidth:160 }}>
                        {/* File upload */}
                        <label style={{ display:"block", padding:"8px 14px", background:C.primary+"15", color:C.primary, borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, textAlign:"center", marginBottom:8, border:`1px solid ${C.primary}40` }}>
                          📷 Upload Photo
                          <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setMemberForm(f => ({...f, photo: ev.target.result}));
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        {/* URL fallback */}
                        <input type="url" value={memberForm.photo||""} onChange={e => setMemberForm(f => ({...f,photo:e.target.value}))}
                          placeholder="…or paste image URL"
                          style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", color:C.muted }} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Bio</label>
                    <textarea rows={3} value={memberForm.bio||""} onChange={e => setMemberForm(f => ({...f,bio:e.target.value}))}
                      style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <label style={{ fontSize:13, fontWeight:700, color:C.text }}>Visible on About page</label>
                    <button onClick={() => setMemberForm(f => ({...f,show:!f.show}))} style={{ width:44, height:24, borderRadius:99, border:"none", cursor:"pointer", position:"relative", background: memberForm.show!==false ? C.secondary:"#D1D5DB", transition:"background .2s" }}>
                      <span style={{ position:"absolute", top:3, left: memberForm.show!==false ? 22:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s" }} />
                    </button>
                  </div>
                </div>
                <div style={{ display:"flex", gap:12, marginTop:22 }}>
                  <button onClick={saveMember} style={{ flex:1, padding:"11px", background:C.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:800, fontSize:14 }}>
                    {editMember==="new" ? "Add Member" : "Save Changes"}
                  </button>
                  <button onClick={() => setEditMember(null)} style={{ padding:"11px 20px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14 }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UPDATES MANAGEMENT ── */}
      {settingsTab === "updates_mgr" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700 }}>{updatesData.length} updates total — {updatesData.filter(u=>u.published).length} published</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Manage disaster alerts, flood reports, and field updates shown on the /updates page.</div>
            </div>
            <button onClick={openNewUpdate} style={{ padding:"9px 20px", background:C.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13 }}>+ New Update</button>
          </div>

          <div style={{ display:"grid", gap:10, marginBottom:24 }}>
            {updatesData.map((u) => {
              const typeColors = { Disaster:"#C0392B", Flood:"#1D4ED8", Drought:"#D97706", Emergency:"#7C3AED", Conflict:"#374151", Disease:"#065F46", General:"#0369A1" };
              const tc = typeColors[u.type] || typeColors.General;
              return (
                <div key={u.id} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:14 }}>
                  {u.img && <img src={u.img} alt="" style={{ width:60, height:50, objectFit:"cover", borderRadius:8, flexShrink:0 }} />}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ background:tc+"18", color:tc, borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:800 }}>{u.type}</span>
                      <span style={{ fontSize:11, color:C.muted }}>{u.date}</span>
                      <span style={{ fontSize:11, color:C.muted }}>📍 {u.location}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.title || <em style={{color:C.muted}}>Untitled</em>}</div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0, alignItems:"center" }}>
                    <button onClick={() => togglePublish(u.id)} style={{
                      padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:11, fontWeight:800,
                      background: u.published ? "#D1FAE5" : C.bg, color: u.published ? "#065F46" : C.muted,
                    }}>{u.published ? "✓ Live" : "Draft"}</button>
                    <button onClick={() => openEditUpdate(u)} style={{ padding:"6px 14px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>Edit</button>
                    <button onClick={() => deleteUpdate(u.id)} style={{ padding:"6px 12px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, color:"#C0392B" }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit/Add update form modal */}
          {editUpdate && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:900, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px", overflowY:"auto" }}>
              <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:580, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
                <h3 style={{ margin:"0 0 20px", fontSize:18, fontWeight:800 }}>{editUpdate==="new" ? "New Update" : "Edit Update"}</h3>
                <div style={{ display:"grid", gap:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Title *</label>
                    <input value={updateForm.title} onChange={e=>setUpdateForm(f=>({...f,title:e.target.value}))}
                      style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div>
                      <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Type</label>
                      <Select value={updateForm.type} onChange={e=>setUpdateForm(f=>({...f,type:e.target.value}))} wrapStyle={{ marginBottom:0 }}>
                        {UPDATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Severity</label>
                      <Select value={updateForm.severity} onChange={e=>setUpdateForm(f=>({...f,severity:e.target.value}))} wrapStyle={{ marginBottom:0 }}>
                        {["critical","high","medium","low","info"].map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div>
                      <DatePicker label="Date" value={updateForm.date} onChange={e=>setUpdateForm(f=>({...f,date:e.target.value}))} style={{ marginBottom:0 }} />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Location</label>
                      <input value={updateForm.location} onChange={e=>setUpdateForm(f=>({...f,location:e.target.value}))}
                        style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Body / Description</label>
                    <textarea rows={4} value={updateForm.body} onChange={e=>setUpdateForm(f=>({...f,body:e.target.value}))}
                      style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Cover Image URL</label>
                    <input type="url" value={updateForm.img} onChange={e=>setUpdateForm(f=>({...f,img:e.target.value}))}
                      style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
                    {updateForm.img && <img src={updateForm.img} alt="" style={{ marginTop:8, height:80, borderRadius:8, objectFit:"cover", maxWidth:"100%" }} />}
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Needs (comma-separated)</label>
                    <input value={(updateForm.needs||[]).join(",")} onChange={e=>setUpdateForm(f=>({...f,needs:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))}
                      placeholder="Emergency Shelter, Clean Water, Food"
                      style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <label style={{ fontSize:13, fontWeight:700, color:C.text }}>Publish immediately</label>
                    <button onClick={() => setUpdateForm(f=>({...f,published:!f.published}))} style={{ width:44, height:24, borderRadius:99, border:"none", cursor:"pointer", position:"relative", background: updateForm.published ? C.secondary:"#D1D5DB", transition:"background .2s" }}>
                      <span style={{ position:"absolute", top:3, left: updateForm.published ? 22:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s" }} />
                    </button>
                  </div>
                </div>
                <div style={{ display:"flex", gap:12, marginTop:22 }}>
                  <button onClick={saveUpdate} style={{ flex:1, padding:"11px", background:C.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:800, fontSize:14 }}>
                    {editUpdate==="new" ? "Create Update" : "Save Changes"}
                  </button>
                  <button onClick={() => setEditUpdate(null)} style={{ padding:"11px 20px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14 }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CASES DISPLAY ── */}
      {settingsTab === "cases_display" && (
        <div>
          <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:12, padding:"14px 18px", marginBottom:24, display:"flex", gap:10 }}>
            <span style={{ fontSize:18 }}>📋</span>
            <div style={{ fontSize:13, color:"#1E40AF" }}>
              Control what information is displayed on the public <strong>Cases page</strong>. Changes apply immediately for all visitors.
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {[
              { key:"showTrustBadges",       icon:"🔐", label:"Trust Badges Strip",     desc:"Field Verified · Privacy · Escrow badges at top" },
              { key:"showVerificationBadge", icon:"✅", label:"'Field Verified' Badge",  desc:"Green verified badge on each case card" },
              { key:"showFundingBar",        icon:"💰", label:"Funding Progress Bar",    desc:"% funded bar and goal amount on cards" },
              { key:"showCategoryFilter",    icon:"🗂️", label:"Category Filter",         desc:"Food, Medical, Shelter… filter dropdown" },
              { key:"showUrgencyFilter",     icon:"⚡", label:"Urgency Filter",          desc:"Critical, High, Medium, Low filter" },
              { key:"showTableView",         icon:"☰",  label:"Table View Option",       desc:"Allow visitors to switch to table layout" },
            ].map(({ key, icon, label, desc }) => {
              const on = casesVis[key] !== false;
              return (
                <div key={key} onClick={() => toggleCasesVis(key)} style={{
                  display:"flex", alignItems:"center", gap:14, padding:"14px 16px",
                  borderRadius:12, border:`1.5px solid ${on ? C.primary+"40" : C.border}`,
                  background: on ? C.primary+"06" : C.bg,
                  cursor: isSuperAdmin ? "pointer" : "default", transition:"all .15s",
                }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{label}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{desc}</div>
                  </div>
                  <div style={{ width:44, height:24, borderRadius:99, position:"relative", flexShrink:0, background: on ? C.primary : "#D1D5DB", transition:"background .2s", opacity: isSuperAdmin ? 1 : 0.5 }}>
                    <div style={{ position:"absolute", top:3, left: on ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,0.25)", transition:"left .2s" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:20, padding:"12px 16px", background:"#F0FDF4", borderRadius:10, fontSize:12, color:"#166534" }}>
            ✅ Changes take effect immediately — no save needed.
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COMMUNITY STORIES PANEL (admin reviews + publishes submissions) ──────────
const CommunityStoriesPanel = ({ showToast }) => {
  const C = COLORS;
  const SUBS_KEY = "kf_story_submissions";
  const PUB_KEY  = "kf_published_stories";

  const load = (key) => { try { return JSON.parse(localStorage.getItem(key)||"[]"); } catch { return []; } };
  const [subs,      setSubs]      = useState(() => load(SUBS_KEY));
  const [published, setPublished] = useState(() => load(PUB_KEY));
  const [preview,   setPreview]   = useState(null);
  const [tab,       setTab]       = useState("pending"); // pending | published

  const pending = subs.filter(s => s.status === "pending");
  const rejected = subs.filter(s => s.status === "rejected");

  const publish = (sub) => {
    const story = {
      ...sub,
      id: "pub_" + Date.now(),
      status: "published",
      publishedAt: new Date().toISOString(),
    };
    const newPub = [story, ...published];
    localStorage.setItem(PUB_KEY, JSON.stringify(newPub));
    const newSubs = subs.map(s => s.id === sub.id ? { ...s, status:"published" } : s);
    localStorage.setItem(SUBS_KEY, JSON.stringify(newSubs));
    setSubs(newSubs);
    setPublished(newPub);
    window.dispatchEvent(new Event("storage"));
    setPreview(null);
    showToast("Story published — now visible on homepage and Stories page");
  };

  const reject = (sub) => {
    const newSubs = subs.map(s => s.id === sub.id ? { ...s, status:"rejected" } : s);
    localStorage.setItem(SUBS_KEY, JSON.stringify(newSubs));
    setSubs(newSubs);
    setPreview(null);
    showToast("Story rejected");
  };

  const unpublish = (pub) => {
    const newPub = published.filter(p => p.id !== pub.id);
    localStorage.setItem(PUB_KEY, JSON.stringify(newPub));
    setPublished(newPub);
    window.dispatchEvent(new Event("storage"));
    showToast("Story unpublished");
  };

  const toggleFeaturePub = (pub) => {
    const newPub = published.map(p => p.id === pub.id ? { ...p, featured: !p.featured } : p);
    localStorage.setItem(PUB_KEY, JSON.stringify(newPub));
    setPublished(newPub);
    window.dispatchEvent(new Event("storage"));
    const isNow = newPub.find(p => p.id === pub.id)?.featured;
    showToast(isNow ? "⭐ Story is now featured on the Stories page" : "Story removed from featured");
  };

  const rowStyle = { background:"#fff", borderRadius:12, padding:"14px 18px", border:`1px solid ${C.border}`, marginBottom:10 };
  const TABS = [
    { id:"pending",   label:`⏳ Pending Review (${pending.length})`  },
    { id:"published", label:`✅ Published (${published.length})`     },
    { id:"rejected",  label:`❌ Rejected (${rejected.length})`       },
  ];

  const shown = tab === "pending" ? pending : tab === "published" ? published : rejected;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800 }}>📝 Community Story Submissions</h2>
        <p style={{ margin:"4px 0 0", color:C.muted, fontSize:13 }}>Review stories submitted by community members and publish to the platform.</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, borderBottom:`2px solid ${C.border}`, marginBottom:24, overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"10px 18px", fontSize:13, fontWeight:700, border:"none", background:"none",
            cursor:"pointer", whiteSpace:"nowrap",
            color:        tab === t.id ? C.primary : C.muted,
            borderBottom: tab === t.id ? `2px solid ${C.primary}` : "2px solid transparent",
            marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {shown.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", color:C.muted }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          <div style={{ fontSize:16, fontWeight:700 }}>No {tab} submissions yet</div>
        </div>
      )}

      {shown.map(sub => (
        <div key={sub.id} style={{ ...rowStyle, border: sub.featured ? "1.5px solid #FCD34D" : `1px solid ${C.border}`, background: sub.featured ? "#FFFEF5" : "#fff" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                {sub.featured && <span style={{ background:"#FEF9C3", color:"#92400E", borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:800 }}>⭐ Featured</span>}
                <span style={{ background:C.primary+"15", color:C.primary, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:800 }}>{sub.category}</span>
                {sub.location && <span style={{ fontSize:11, color:C.muted }}>📍 {sub.location}</span>}
                <span style={{ fontSize:11, color:C.muted }}>👤 {sub.authorName}</span>
                <span style={{ fontSize:11, color:C.muted }}>🗓 {new Date(sub.submittedAt).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:4 }}>{sub.title}</div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                {sub.afterDesc || sub.beforeDesc}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexShrink:0 }}>
              <button onClick={() => setPreview(sub)} style={{ padding:"7px 14px", borderRadius:8, border:`1.5px solid ${C.border}`, background:"#fff", cursor:"pointer", fontSize:12, fontWeight:700, color:C.text }}>
                👁 Preview
              </button>
              {tab === "pending" && (
                <>
                  <button onClick={() => publish(sub)} style={{ padding:"7px 16px", borderRadius:8, border:"none", background:C.secondary, cursor:"pointer", fontSize:12, fontWeight:800, color:"#fff" }}>
                    ✅ Publish
                  </button>
                  <button onClick={() => reject(sub)} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#FEE2E2", cursor:"pointer", fontSize:12, fontWeight:700, color:"#C0392B" }}>
                    ✕ Reject
                  </button>
                </>
              )}
              {tab === "published" && (
                <>
                  <button onClick={() => toggleFeaturePub(sub)} style={{ padding:"7px 14px", borderRadius:8, border: sub.featured ? "1.5px solid #FCD34D" : `1px solid ${C.border}`, background: sub.featured ? "#FEF9C3" : "#fff", cursor:"pointer", fontSize:12, fontWeight:700, color: sub.featured ? "#92400E" : C.muted }}>
                    {sub.featured ? "⭐ Featured" : "☆ Feature"}
                  </button>
                  <button onClick={() => unpublish(sub)} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#FEE2E2", cursor:"pointer", fontSize:12, fontWeight:700, color:"#C0392B" }}>
                    Unpublish
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Preview modal */}
      {preview && (
        <div onClick={e => { if (e.target === e.currentTarget) setPreview(null); }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:20, maxWidth:560, width:"100%", padding:"28px 28px 24px", position:"relative", maxHeight:"90vh", overflowY:"auto" }}>
            <button onClick={() => setPreview(null)} style={{ position:"absolute", top:14, right:14, background:"#F3F4F6", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:16 }}>✕</button>
            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              <span style={{ background:C.primary+"15", color:C.primary, borderRadius:6, padding:"3px 12px", fontSize:11, fontWeight:800 }}>{preview.category}</span>
              {preview.location && <span style={{ fontSize:11, color:C.muted }}>📍 {preview.location}</span>}
              <span style={{ fontSize:11, color:C.muted }}>👤 {preview.authorName}</span>
            </div>
            <h3 style={{ fontSize:20, fontWeight:900, margin:"0 0 16px", color:C.navy }}>{preview.title}</h3>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>What Happened</div>
              <div style={{ fontSize:14, color:C.text, lineHeight:1.7 }}>{preview.beforeDesc}</div>
            </div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.secondary, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Outcome</div>
              <div style={{ fontSize:14, color:C.text, lineHeight:1.7 }}>{preview.afterDesc}</div>
            </div>
            {preview.status === "pending" && (
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => publish(preview)} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background:C.secondary, cursor:"pointer", fontWeight:800, fontSize:14, color:"#fff" }}>
                  ✅ Publish This Story
                </button>
                <button onClick={() => reject(preview)} style={{ padding:"12px 20px", borderRadius:10, border:"none", background:"#FEE2E2", cursor:"pointer", fontWeight:700, fontSize:14, color:"#C0392B" }}>
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── IMPACT STORIES PANEL ────────────────────────────────────────────────────
const STORIES_KEY = "kf_impact_stories";
const loadStories = () => { try { return JSON.parse(localStorage.getItem(STORIES_KEY) || "[]"); } catch { return []; } };

const ImpactStoriesPanel = ({ showToast }) => {
  const isMobile = useIsMobile();
  const [stories, setStories] = useState(loadStories);
  const [form, setForm] = useState({ title:"", category:"", location:"", beforeDesc:"", afterDesc:"", daysToDeliver:"", amountDistributed:"", beforeImg:null, afterImg:null, beforePreview:"", afterPreview:"" });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const save = (list) => { setStories(list); localStorage.setItem(STORIES_KEY, JSON.stringify(list)); window.dispatchEvent(new Event("storage")); };

  const toggleFeature = (id) => {
    const updated = stories.map(s => s.id === id ? { ...s, featured: !s.featured } : s);
    save(updated);
    const isNowFeatured = updated.find(s => s.id === id)?.featured;
    showToast(isNowFeatured ? "⭐ Story is now featured on the Stories page" : "Story removed from featured", isNowFeatured ? "success" : "info");
  };

  const handleImg = (side, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, [`${side}Img`]: e.target.result, [`${side}Preview`]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.category.trim() || !form.beforeDesc.trim() || !form.afterDesc.trim()) {
      showToast("Title, category, before description and after description are required", "error"); return;
    }
    const entry = {
      id: editing || Date.now().toString(),
      title: form.title.trim(), category: form.category.trim(), location: form.location.trim(),
      beforeDesc: form.beforeDesc.trim(), afterDesc: form.afterDesc.trim(),
      daysToDeliver: form.daysToDeliver, amountDistributed: form.amountDistributed,
      beforeImg: form.beforeImg || form.beforePreview || null,
      afterImg:  form.afterImg  || form.afterPreview  || null,
      createdAt: editing ? (stories.find(s=>s.id===editing)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };
    const updated = editing ? stories.map(s => s.id === editing ? entry : s) : [entry, ...stories];
    save(updated);
    showToast(editing ? "Story updated" : "Story added", "success");
    setForm({ title:"", category:"", location:"", beforeDesc:"", afterDesc:"", daysToDeliver:"", amountDistributed:"", beforeImg:null, afterImg:null, beforePreview:"", afterPreview:"" });
    setEditing(null); setShowForm(false);
  };

  const handleEdit = (s) => {
    setForm({ title:s.title, category:s.category, location:s.location||"", beforeDesc:s.beforeDesc, afterDesc:s.afterDesc, daysToDeliver:s.daysToDeliver||"", amountDistributed:s.amountDistributed||"", beforeImg:null, afterImg:null, beforePreview:s.beforeImg||"", afterPreview:s.afterImg||"" });
    setEditing(s.id); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this impact story?")) return;
    save(stories.filter(s => s.id !== id));
    showToast("Story deleted", "success");
  };

  const F = ({ label, children, required }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:COLORS.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{label}{required && <span style={{color:"#EF4444"}}> *</span>}</label>
      {children}
    </div>
  );
  const inp = { width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${COLORS.border}`, fontSize:14, boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:10 }}>
        <div>
          <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>📸 Impact Stories (Before & After)</h3>
          <p style={{ margin:"4px 0 0", fontSize:13, color:COLORS.muted }}>Stories you save here will appear on the public homepage.</p>
        </div>
        <Btn variant="primary" onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ title:"", category:"", location:"", beforeDesc:"", afterDesc:"", daysToDeliver:"", amountDistributed:"", beforeImg:null, afterImg:null, beforePreview:"", afterPreview:"" }); }}>
          {showForm ? "Cancel" : "+ Add Story"}
        </Btn>
      </div>

      {showForm && (
        <div style={{ background:"#F8FAFF", border:`1px solid ${COLORS.border}`, borderRadius:16, padding:24, marginBottom:28 }}>
          <h4 style={{ margin:"0 0 20px", fontSize:15, fontWeight:800 }}>{editing ? "Edit Story" : "New Impact Story"}</h4>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:16 }}>
            <F label="Story Title" required><input style={inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Displaced family finds shelter" /></F>
            <F label="Category" required>
              <Select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} wrapStyle={{ marginBottom:0 }}>
                <option value="">Select category…</option>
                <option value="Emergency & Shelter">Emergency & Shelter</option>
                <option value="Medical">Medical</option>
                <option value="Food & Care">Food & Care</option>
                <option value="Education">Education</option>
                <option value="Orphan Support">Orphan Support</option>
                <option value="Family Reunification">Family Reunification</option>
                <option value="Livelihood">Livelihood</option>
              </Select>
            </F>
            <F label="Location / District"><input style={inp} value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Mogadishu, Baidoa…" /></F>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <F label="Days to Deliver"><input style={inp} type="number" min="1" value={form.daysToDeliver} onChange={e=>setForm(f=>({...f,daysToDeliver:e.target.value}))} placeholder="14" /></F>
              <F label="Amount Distributed"><input style={inp} value={form.amountDistributed} onChange={e=>setForm(f=>({...f,amountDistributed:e.target.value}))} placeholder="$820" /></F>
            </div>
            <F label="Before — Description" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.beforeDesc} onChange={e=>setForm(f=>({...f,beforeDesc:e.target.value}))} placeholder="Describe the situation BEFORE aid…" /></F>
            <F label="After — Description" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.afterDesc} onChange={e=>setForm(f=>({...f,afterDesc:e.target.value}))} placeholder="Describe the outcome AFTER aid…" /></F>
          </div>

          {/* Photo upload row */}
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:16, marginTop:8 }}>
            {[["before","Before Photo (Optional)"],["after","After Photo (Optional)"]].map(([side, lbl]) => (
              <F key={side} label={lbl}>
                <div style={{ border:`2px dashed ${COLORS.border}`, borderRadius:10, overflow:"hidden", position:"relative" }}>
                  {form[`${side}Preview`] ? (
                    <div style={{ position:"relative" }}>
                      <img src={form[`${side}Preview`]} alt={side} style={{ width:"100%", height:160, objectFit:"cover", display:"block" }} />
                      <button onClick={() => setForm(f=>({...f,[`${side}Img`]:null,[`${side}Preview`]:""}))}
                        style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", borderRadius:"50%", width:26, height:26, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                    </div>
                  ) : (
                    <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, cursor:"pointer", gap:8 }}>
                      <span style={{ fontSize:32 }}>{side==="before"?"📷":"🌟"}</span>
                      <span style={{ fontSize:12, color:COLORS.muted, textAlign:"center" }}>Click to upload {side} photo<br/><em>JPG, PNG (max 5MB)</em></span>
                      <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleImg(side, e.target.files[0])} />
                    </label>
                  )}
                </div>
              </F>
            ))}
          </div>

          <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Btn>
            <Btn variant="success" onClick={handleSubmit}>{editing ? "💾 Save Changes" : "✅ Publish Story"}</Btn>
          </div>
        </div>
      )}

      {stories.length === 0 && !showForm && (
        <div style={{ textAlign:"center", padding:"60px 20px", color:COLORS.muted }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📸</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>No impact stories yet</div>
          <div style={{ fontSize:13 }}>Add your first before & after story to display on the homepage.</div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"repeat(auto-fill, minmax(420px,1fr))", gap:20 }}>
        {stories.map(s => (
          <div key={s.id} style={{ background:"#fff", border:`1px solid ${COLORS.border}`, borderRadius:16, overflow:"hidden", boxShadow:"0 2px 10px #0002" }}>
            {/* Header */}
            <div style={{ background: s.featured ? "linear-gradient(135deg,#FEF9C3,#FEF3C7)" : `linear-gradient(135deg,${COLORS.primary}14,${COLORS.secondary}12)`, padding:"14px 18px", borderBottom:`1px solid ${s.featured ? "#FCD34D" : COLORS.border}` }}>
              {s.featured && <div style={{ fontSize:10, fontWeight:800, color:"#92400E", letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>⭐ Featured Story</div>}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:COLORS.muted, textTransform:"uppercase", letterSpacing:1 }}>{s.category}{s.location ? ` · ${s.location}` : ""}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:COLORS.text, marginTop:3 }}>{s.title}</div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                  <button onClick={() => toggleFeature(s.id)} style={{ padding:"5px 12px", fontSize:12, background: s.featured ? "#FEF9C3" : COLORS.bg, color: s.featured ? "#92400E" : COLORS.muted, border: s.featured ? "1.5px solid #FCD34D" : `1px solid ${COLORS.border}`, borderRadius:7, cursor:"pointer", fontWeight:700 }}>
                    {s.featured ? "⭐ Featured" : "☆ Feature"}
                  </button>
                  <button onClick={() => handleEdit(s)} style={{ padding:"5px 12px", fontSize:12, background:COLORS.primary+"15", color:COLORS.primary, border:"none", borderRadius:7, cursor:"pointer", fontWeight:700 }}>Edit</button>
                  <button onClick={() => handleDelete(s.id)} style={{ padding:"5px 12px", fontSize:12, background:"#FEE2E2", color:"#DC2626", border:"none", borderRadius:7, cursor:"pointer", fontWeight:700 }}>Delete</button>
                </div>
              </div>
            </div>

            {/* Before/After photos */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", position:"relative" }}>
              {[["before","Before",s.beforeImg,"#374151","😔"],["after","After",s.afterImg,"#065F46","😊"]].map(([side, lbl, img, color, emoji]) => (
                <div key={side} style={{ position:"relative" }}>
                  {img ? (
                    <img src={img} alt={side} style={{ width:"100%", height:160, objectFit:"cover", display:"block" }} />
                  ) : (
                    <div style={{ height:160, background: side==="before"?"linear-gradient(135deg,#6B7280,#9CA3AF)":"linear-gradient(135deg,#059669,#34D399)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:40, opacity:0.7 }}>{emoji}</span>
                    </div>
                  )}
                  <div style={{ position:"absolute", top:8, left:8, background: side==="before"?"rgba(0,0,0,0.6)":"rgba(5,150,105,0.9)", color:"#fff", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:800 }}>{lbl}</div>
                </div>
              ))}
              <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:30, height:30, borderRadius:"50%", background:"#E0AB21", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, zIndex:2, boxShadow:"0 2px 8px #E0AB2180" }}>→</div>
            </div>

            {/* Descriptions */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:`1px solid ${COLORS.border}` }}>
              <div style={{ padding:"12px 14px", borderRight:`1px solid ${COLORS.border}`, fontSize:12, color:COLORS.muted, lineHeight:1.5 }}>{s.beforeDesc}</div>
              <div style={{ padding:"12px 14px", fontSize:12, color:COLORS.secondary, fontWeight:600, lineHeight:1.5 }}>{s.afterDesc}</div>
            </div>

            {/* Footer stats */}
            <div style={{ display:"flex", padding:"10px 18px", gap:16, alignItems:"center" }}>
              {s.daysToDeliver && <div style={{ fontSize:12, color:COLORS.muted }}><span style={{ fontWeight:800, color:COLORS.primary, fontSize:14 }}>{s.daysToDeliver}</span> days</div>}
              {s.amountDistributed && <div style={{ fontSize:12, color:COLORS.muted }}><span style={{ fontWeight:800, color:COLORS.secondary, fontSize:14 }}>{s.amountDistributed}</span> distributed</div>}
              <div style={{ marginLeft:"auto", fontSize:11, color:"#10B981", fontWeight:700 }}>● Verified</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── BULK IMPORT PANEL ────────────────────────────────────────────────────────
const XLSX_TEMPLATE_COLS = [
  "Child Full Name", "Age", "Gender (Male/Female/Other)",
  "Location / District", "Urgency (Low/Medium/High/Critical)",
  "Category (food/medical/shelter/orphan/education/other)",
  "Description (min 10 chars)", "Guardian Name", "Guardian Phone",
  "Monthly Amount Needed ($)", "Notes",
];

const generateExcelTemplate = () => {
  const header = XLSX_TEMPLATE_COLS;
  const example = [
    "Fatima Ali Hassan", "8", "Female", "Mogadishu", "High",
    "orphan", "Child lost both parents and needs food, shelter and education support.",
    "Ahmed Hassan (Uncle)", "+252612345678", "120", "Currently staying with relatives",
  ];
  const rows = [header, example];
  const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "kafaala-qaad-child-import-template.csv"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g,"").trim());
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === ',' && !inQ) { vals.push(cur); cur = ""; continue; }
      cur += line[i];
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
};

const BulkImportPanel = ({ showToast, currentUser }) => {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importMode, setImportMode] = useState("individual"); // "individual" | "program"
  const [programName, setProgramName] = useState("");
  const [programType, setProgramType] = useState("child_sponsorship");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const parsed = parseCSV(text);
      if (!parsed.length) { showToast("No data rows found. Check the file format.", "error"); return; }
      setRows(parsed); setSubmitted(false); setErrors([]);
    };
    reader.readAsText(file, "UTF-8");
  };

  const validate = () => {
    const errs = [];
    rows.forEach((r, i) => {
      const name = r["Child Full Name"] || r[XLSX_TEMPLATE_COLS[0]] || "";
      const desc = r["Description (min 10 chars)"] || r[XLSX_TEMPLATE_COLS[6]] || "";
      if (!name.trim()) errs.push(`Row ${i+1}: Child name is required`);
      if (desc.trim().length < 10) errs.push(`Row ${i+1}: Description too short (${desc.length} chars)`);
    });
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (errs.length) { setErrors(errs); showToast(`${errs.length} validation error(s)`, "error"); return; }
    if (importMode === "program" && !programName.trim()) { showToast("Program name is required", "error"); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("kf_token");
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const payload = {
        mode: importMode,
        programName: importMode === "program" ? programName.trim() : undefined,
        programType: importMode === "program" ? programType : undefined,
        children: rows.map(r => ({
          name:     r["Child Full Name"]                                 || "",
          age:      parseInt(r["Age"]) || null,
          gender:   r["Gender (Male/Female/Other)"]                      || "",
          location: r["Location / District"]                             || "",
          urgency:  r["Urgency (Low/Medium/High/Critical)"]              || "Medium",
          category: r["Category (food/medical/shelter/orphan/education/other)"] || "other",
          description: r["Description (min 10 chars)"]                  || "",
          guardianName:  r["Guardian Name"]                              || "",
          guardianPhone: r["Guardian Phone"]                             || "",
          monthlyNeed:   parseFloat(r["Monthly Amount Needed ($)"]) || 0,
          notes:    r["Notes"]                                           || "",
        })),
      };
      const res = await fetch("/api/admin/bulk-import", { method:"POST", headers, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Import failed"); }
      const result = await res.json();
      showToast(`Successfully imported ${result.count || rows.length} ${importMode === "program" ? "beneficiaries into program" : "cases"}`, "success");
      setSubmitted(true);
    } catch (err) {
      // Backend endpoint may not exist yet — store locally as draft
      const drafts = JSON.parse(localStorage.getItem("kf_bulk_drafts") || "[]");
      const draft = { id: Date.now().toString(), importedAt: new Date().toISOString(), mode: importMode, programName: importMode==="program"?programName:"", programType, rows, status: "draft" };
      localStorage.setItem("kf_bulk_drafts", JSON.stringify([draft, ...drafts]));
      showToast(`Saved as draft (${rows.length} records). Will sync when API is ready.`, "info");
      setSubmitted(true);
    } finally { setSubmitting(false); }
  };

  const COL_MAP = { n:"Child Full Name", age:"Age", gen:"Gender (Male/Female/Other)", loc:"Location / District", urg:"Urgency (Low/Medium/High/Critical)", cat:"Category (food/medical/shelter/orphan/education/other)", desc:"Description (min 10 chars)" };

  const URGENCY_C = { Low:"#10B981", Medium:"#F59E0B", High:"#EF4444", Critical:"#7C3AED" };
  const urg = (r) => r["Urgency (Low/Medium/High/Critical)"] || "Medium";

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>📥 Bulk Child Import</h3>
        <p style={{ margin:"4px 0 0", fontSize:13, color:COLORS.muted }}>Import up to hundreds of children at once from a CSV/Excel file. You can create individual cases or enroll them all in one program.</p>
      </div>

      {/* Step 1: Download template */}
      <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:14, padding:20, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontWeight:800, fontSize:14, color:COLORS.primary, marginBottom:4 }}>Step 1 — Download the Excel Template</div>
            <div style={{ fontSize:13, color:COLORS.muted }}>Fill in one child per row. Required columns: Name, Urgency, Description. All others optional.</div>
          </div>
          <Btn variant="primary" onClick={generateExcelTemplate}>⬇ Download Template (.csv)</Btn>
        </div>
        <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:6 }}>
          {XLSX_TEMPLATE_COLS.map((c,i) => (
            <span key={i} style={{ background:i<2?"#DBEAFE":"#F3F4F6", color:i<2?COLORS.primary:COLORS.muted, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:i<2?700:400, border:`1px solid ${i<2?"#BFDBFE":"#E5E7EB"}` }}>{c}</span>
          ))}
        </div>
      </div>

      {/* Step 2: Upload */}
      <div style={{ background:"#fff", border:`1px solid ${COLORS.border}`, borderRadius:14, padding:20, marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:14, color:COLORS.text, marginBottom:14 }}>Step 2 — Upload Filled File</div>
        <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:`2px dashed ${fileName ? COLORS.secondary : COLORS.border}`, borderRadius:12, padding:32, cursor:"pointer", gap:8, background: fileName ? "#F0FDF4" : "#FAFAFA" }}>
          <span style={{ fontSize:36 }}>{fileName ? "✅" : "📂"}</span>
          <span style={{ fontSize:14, fontWeight:700, color: fileName ? COLORS.secondary : COLORS.muted }}>
            {fileName ? fileName : "Click to upload CSV / Excel file"}
          </span>
          {fileName && <span style={{ fontSize:12, color:COLORS.muted }}>{rows.length} rows parsed</span>}
          <input type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
        </label>
        {fileName && (
          <button onClick={() => { setRows([]); setFileName(""); setErrors([]); setSubmitted(false); }} style={{ marginTop:10, background:"none", border:"none", color:"#EF4444", fontSize:12, cursor:"pointer", fontWeight:600 }}>✕ Clear file</button>
        )}
      </div>

      {/* Step 3: Choose mode */}
      {rows.length > 0 && (
        <div style={{ background:"#fff", border:`1px solid ${COLORS.border}`, borderRadius:14, padding:20, marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:COLORS.text, marginBottom:14 }}>Step 3 — Choose Import Mode</div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12, marginBottom:20 }}>
            {[
              { val:"individual", icon:"👤", title:"Individual Cases", desc:`Create ${rows.length} separate cases, each child managed independently. Admin can track each case through the full pipeline.` },
              { val:"program",    icon:"👥", title:"Group Program",     desc:`Enroll all ${rows.length} children into one program. Ideal for orphan programs, school feeding, or shelter projects.` },
            ].map(m => (
              <div key={m.val} onClick={() => setImportMode(m.val)} style={{ border:`2px solid ${importMode===m.val?COLORS.primary:COLORS.border}`, background: importMode===m.val?COLORS.primary+"08":"#fff", borderRadius:12, padding:16, cursor:"pointer" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{m.icon}</div>
                <div style={{ fontWeight:800, fontSize:14, color: importMode===m.val?COLORS.primary:COLORS.text, marginBottom:4 }}>{m.title}</div>
                <div style={{ fontSize:12, color:COLORS.muted, lineHeight:1.5 }}>{m.desc}</div>
              </div>
            ))}
          </div>

          {importMode === "program" && (
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12 }}>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:COLORS.muted, marginBottom:6, textTransform:"uppercase" }}>Program Name *</label>
                <input value={programName} onChange={e=>setProgramName(e.target.value)} placeholder="e.g. Mogadishu Orphan Support 2025" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${COLORS.border}`, fontSize:14, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:COLORS.muted, marginBottom:6, textTransform:"uppercase" }}>Program Type *</label>
                <Select value={programType} onChange={e=>setProgramType(e.target.value)} wrapStyle={{ marginBottom:0 }}>
                  {getCat("programTypes").map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ fontWeight:700, color:"#DC2626", marginBottom:8 }}>⚠️ {errors.length} validation error(s):</div>
          {errors.slice(0,8).map((e,i) => <div key={i} style={{ fontSize:12, color:"#B91C1C", marginBottom:4 }}>• {e}</div>)}
          {errors.length > 8 && <div style={{ fontSize:12, color:COLORS.muted }}>…and {errors.length-8} more</div>}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div style={{ background:"#fff", border:`1px solid ${COLORS.border}`, borderRadius:14, padding:20, marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontWeight:800, fontSize:14 }}>Preview — {rows.length} records</div>
            {!submitted && <Btn variant="success" onClick={handleSubmit} disabled={submitting}>{submitting ? "Importing…" : `✅ Import ${rows.length} Children`}</Btn>}
            {submitted && <span style={{ color:COLORS.secondary, fontWeight:700, fontSize:14 }}>✅ Import complete!</span>}
          </div>
          <div className="kf-table-wrap">
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:COLORS.primary+"10" }}>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:COLORS.muted, fontSize:11 }}>#</th>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:COLORS.muted, fontSize:11 }}>Name</th>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:COLORS.muted, fontSize:11 }}>Age</th>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:COLORS.muted, fontSize:11 }}>Location</th>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:COLORS.muted, fontSize:11 }}>Urgency</th>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:COLORS.muted, fontSize:11 }}>Category</th>
                  <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:COLORS.muted, fontSize:11 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} style={{ borderTop:`1px solid ${COLORS.border}`, background: i%2===0 ? "#fff" : "#FAFAFA" }}>
                    <td style={{ padding:"8px 12px", color:COLORS.muted }}>{i+1}</td>
                    <td style={{ padding:"8px 12px", fontWeight:700, color:COLORS.text }}>{r["Child Full Name"] || "—"}</td>
                    <td style={{ padding:"8px 12px" }}>{r["Age"] || "—"}</td>
                    <td style={{ padding:"8px 12px" }}>{r["Location / District"] || "—"}</td>
                    <td style={{ padding:"8px 12px" }}>
                      <span style={{ background: (URGENCY_C[urg(r)] || "#E5E7EB")+"22", color: URGENCY_C[urg(r)] || COLORS.muted, borderRadius:20, padding:"2px 8px", fontWeight:700 }}>{urg(r)}</span>
                    </td>
                    <td style={{ padding:"8px 12px", textTransform:"capitalize" }}>{r["Category (food/medical/shelter/orphan/education/other)"] || "—"}</td>
                    <td style={{ padding:"8px 12px", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r["Description (min 10 chars)"] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 50 && <div style={{ fontSize:12, color:COLORS.muted, padding:"8px 12px" }}>Showing first 50 of {rows.length} rows</div>}
        </div>
      )}
    </div>
  );
};

// ─── PARTNER APPLICATIONS ADMIN PANEL ────────────────────────────────────────
const PartnerApplicationsPanel = ({ showToast }) => {
  const [apps, setApps] = useState(() => { try { return JSON.parse(localStorage.getItem("kf_partner_applications") || "[]"); } catch { return []; } });
  const [selected, setSelected] = useState(null);
  const updateStatus = (id, status) => {
    const updated = apps.map(a => a.id === id ? { ...a, status } : a);
    setApps(updated);
    localStorage.setItem("kf_partner_applications", JSON.stringify(updated));
    setSelected(null);
    showToast?.(`Application ${status}`, status === "approved" ? "success" : "error");
  };
  const ST = { pending:{ bg:"#FEF3C7", color:"#92400E", label:"⏳ Pending" }, approved:{ bg:"#D1FAE5", color:"#065F46", label:"✅ Approved" }, rejected:{ bg:"#FEE2E2", color:"#991B1B", label:"❌ Rejected" } };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>🤝 Partner Applications</h3>
        <span style={{ fontSize:13, color:COLORS.muted }}>{apps.length} applications · {apps.filter(a=>a.status==="pending").length} pending review</span>
      </div>
      {apps.length === 0 && <div style={{ textAlign:"center", padding:"48px 24px", color:COLORS.muted, background:"#fff", borderRadius:16 }}>No partner applications yet</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {apps.map(a => (
          <div key={a.id} style={{ background:"#fff", borderRadius:14, padding:"16px 20px", boxShadow:"0 2px 8px #0001", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, border:`1px solid ${COLORS.border}` }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:COLORS.text }}>{a.orgName || "Unknown Organization"}</div>
              <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>{a.orgType} · {a.country} · {a.email}</div>
              <div style={{ fontSize:11, color:COLORS.muted }}>Submitted {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : "—"}</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ ...((ST[a.status]||ST.pending)), borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 }}>{(ST[a.status]||ST.pending).label}</span>
              <button onClick={() => setSelected(a)} style={{ padding:"7px 14px", borderRadius:8, background:COLORS.primary, color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>Review</button>
              {a.status === "pending" && <>
                <button onClick={() => updateStatus(a.id,"approved")} style={{ padding:"7px 14px", borderRadius:8, background:"#10B981", color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>✅ Approve</button>
                <button onClick={() => updateStatus(a.id,"rejected")} style={{ padding:"7px 14px", borderRadius:8, background:COLORS.danger, color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>❌ Reject</button>
              </>}
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:560, width:"100%", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>{selected.orgName}</h3>
              <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:COLORS.muted }}>✕</button>
            </div>
            {[["Organization",`${selected.orgName} · ${selected.orgType}`],["Country",selected.country],["Website",selected.website||"—"],["Reg. Number",selected.regNumber||"—"],["Founded",selected.founded||"—"],["Contact",`${selected.contactName} · ${selected.contactTitle}`],["Email",selected.email],["Phone",selected.phone||"—"],["Focus Areas",(selected.focusAreas||[]).join(", ")],["Description",selected.description||"—"]].map(([k,v])=>(
              <div key={k} style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:8, padding:"10px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:COLORS.muted }}>{k}</div>
                <div style={{ fontSize:13, color:COLORS.text }}>{v}</div>
              </div>
            ))}
            {selected.status === "pending" && (
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button onClick={() => updateStatus(selected.id,"approved")} style={{ flex:1, padding:"12px", borderRadius:10, background:"#10B981", color:"#fff", border:"none", cursor:"pointer", fontWeight:800 }}>✅ Approve Partner</button>
                <button onClick={() => updateStatus(selected.id,"rejected")} style={{ flex:1, padding:"12px", borderRadius:10, background:COLORS.danger, color:"#fff", border:"none", cursor:"pointer", fontWeight:800 }}>❌ Reject</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── VOLUNTEER APPLICATIONS ADMIN PANEL ──────────────────────────────────────
const VolunteerApplicationsPanel = ({ showToast }) => {
  const [apps, setApps] = useState(() => { try { return JSON.parse(localStorage.getItem("kf_volunteer_applications") || "[]"); } catch { return []; } });
  const [selected, setSelected] = useState(null);
  const updateStatus = (id, status) => {
    const updated = apps.map(a => a.id === id ? { ...a, status } : a);
    setApps(updated);
    localStorage.setItem("kf_volunteer_applications", JSON.stringify(updated));
    setSelected(null);
    showToast?.(`Volunteer application ${status}`, status === "approved" ? "success" : "error");
  };
  const CAT_ICONS = { reporter:"📝", field:"🗺️", medical:"🏥", education:"🎓", legal:"⚖️", translator:"🌐", tech:"💻", coordinator:"🤝" };
  const ST = { pending:{ bg:"#FEF3C7", color:"#92400E", label:"⏳ Pending" }, approved:{ bg:"#D1FAE5", color:"#065F46", label:"✅ Approved" }, rejected:{ bg:"#FEE2E2", color:"#991B1B", label:"❌ Rejected" } };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>🙋 Volunteer Applications</h3>
        <span style={{ fontSize:13, color:COLORS.muted }}>{apps.length} applications · {apps.filter(a=>a.status==="pending").length} pending</span>
      </div>
      {apps.length === 0 && <div style={{ textAlign:"center", padding:"48px 24px", color:COLORS.muted, background:"#fff", borderRadius:16 }}>No volunteer applications yet</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {apps.map(a => (
          <div key={a.id} style={{ background:"#fff", borderRadius:14, padding:"16px 20px", boxShadow:"0 2px 8px #0001", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, border:`1px solid ${COLORS.border}` }}>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:COLORS.primary+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{CAT_ICONS[a.category]||"🙋"}</div>
              <div>
                <div style={{ fontSize:15, fontWeight:800 }}>{a.name}</div>
                <div style={{ fontSize:12, color:COLORS.muted }}>{a.category?.replace(/_/g," ")} · {a.city}, {a.country}</div>
                <div style={{ fontSize:11, color:COLORS.muted }}>{a.email} · {a.availability}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ ...((ST[a.status]||ST.pending)), borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 }}>{(ST[a.status]||ST.pending).label}</span>
              <button onClick={() => setSelected(a)} style={{ padding:"7px 14px", borderRadius:8, background:COLORS.primary, color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>View</button>
              {a.status === "pending" && <>
                <button onClick={() => updateStatus(a.id,"approved")} style={{ padding:"7px 14px", borderRadius:8, background:"#10B981", color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>✅ Approve</button>
                <button onClick={() => updateStatus(a.id,"rejected")} style={{ padding:"7px 14px", borderRadius:8, background:COLORS.danger, color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>❌ Reject</button>
              </>}
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ margin:0 }}>{CAT_ICONS[selected.category]||"🙋"} {selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:COLORS.muted }}>✕</button>
            </div>
            {[["Role",selected.category],["City",selected.city],["Country",selected.country],["Email",selected.email],["Phone",selected.phone||"—"],["Availability",selected.availability||"—"],["Experience",selected.experience||"—"],["Motivation",selected.motivation||"—"]].map(([k,v])=>(
              <div key={k} style={{ display:"grid", gridTemplateColumns:"130px 1fr", gap:8, padding:"10px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:COLORS.muted }}>{k}</div>
                <div style={{ fontSize:13, color:COLORS.text }}>{v}</div>
              </div>
            ))}
            {selected.status === "pending" && (
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button onClick={() => updateStatus(selected.id,"approved")} style={{ flex:1, padding:"12px", borderRadius:10, background:"#10B981", color:"#fff", border:"none", cursor:"pointer", fontWeight:800 }}>✅ Approve</button>
                <button onClick={() => updateStatus(selected.id,"rejected")} style={{ flex:1, padding:"12px", borderRadius:10, background:COLORS.danger, color:"#fff", border:"none", cursor:"pointer", fontWeight:800 }}>❌ Reject</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── HISTORY ADMIN PANEL ─────────────────────────────────────────────────────
const HISTORY_KEY = "kf_history_entries";
const BLANK_HIST = { title:"", date:"", location:"", category:"", description:"", fullDetail:"", photos:["","","",""] };
const HistoryPanel = ({ showToast }) => {
  const [entries, setEntries] = useState(() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; } });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_HIST);
  const [viewIdx, setViewIdx] = useState(null); // slideshow index
  const [slideIdx, setSlideIdx] = useState(0);

  const save = () => {
    const photos = form.photos.filter(p => p.trim());
    if (!form.title.trim() || !form.date) { showToast?.("Title and date are required","error"); return; }
    const entry = { ...form, photos, id: editing?.id || "hist-"+Date.now(), createdAt: editing?.createdAt || new Date().toISOString() };
    const updated = editing ? entries.map(e => e.id===editing.id ? entry : e) : [entry, ...entries];
    setEntries(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setEditing(null); setForm(BLANK_HIST);
    showToast?.("History entry saved","success");
  };
  const del = (id) => { if (!window.confirm("Delete this history entry?")) return; const u = entries.filter(e=>e.id!==id); setEntries(u); localStorage.setItem(HISTORY_KEY,JSON.stringify(u)); };
  const startEdit = (e) => { setEditing(e); const photos = [...(e.photos||[])]; while(photos.length<4) photos.push(""); setForm({ ...e, photos }); };
  const setPhoto = (i, v) => setForm(f => { const p=[...f.photos]; p[i]=v; return {...f,photos:p}; });

  const viewing = viewIdx !== null ? entries[viewIdx] : null;
  const viewPhotos = (viewing?.photos||[]).filter(p=>p.trim());

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>📚 History Records</h3>
        <button onClick={() => { setEditing({}); setForm(BLANK_HIST); }}
          style={{ padding:"10px 18px", background:COLORS.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:800 }}>+ New Record</button>
      </div>

      {/* Form */}
      {editing !== null && (
        <div style={{ background:"#fff", borderRadius:18, padding:"24px 20px", marginBottom:24, boxShadow:"0 4px 20px #0002", border:`1px solid ${COLORS.border}` }}>
          <h4 style={{ margin:"0 0 18px", fontSize:16, fontWeight:800 }}>{editing.id ? "Edit Record" : "New History Record"}</h4>
          <div style={{ display:"grid", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Title *</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${COLORS.border}`, fontSize:14, boxSizing:"border-box" }} />
              </div>
              <div>
                <DatePicker label="Date *" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{ marginBottom:0 }} />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Location</label>
                <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Mogadishu, Somalia" style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${COLORS.border}`, fontSize:14, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Category</label>
                <Select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} wrapStyle={{ marginBottom:0 }}>
                  <option value="">Select…</option>
                  {["Case Delivery","Aid Program","Medical Mission","Education Drive","Emergency Response","Community Event","Partnership","Milestone"].map(o=><option key={o}>{o}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Short Summary</label>
              <textarea rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${COLORS.border}`, fontSize:14, boxSizing:"border-box", resize:"vertical" }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Full Detail</label>
              <textarea rows={4} value={form.fullDetail} onChange={e=>setForm(f=>({...f,fullDetail:e.target.value}))} placeholder="Full story, impact, beneficiaries, outcomes…" style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${COLORS.border}`, fontSize:14, boxSizing:"border-box", resize:"vertical" }} />
            </div>
            {/* Flexible photo gallery — 1 to 4 photos */}
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:COLORS.muted, display:"block", marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>Photos (1–4 URLs)</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ position:"relative" }}>
                    <input value={form.photos[i]||""} onChange={e=>setPhoto(i,e.target.value)} placeholder={`Photo ${i+1} URL${i<1?" (required)":""}`} style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${COLORS.border}`, fontSize:13, boxSizing:"border-box" }} />
                    {form.photos[i] && <div style={{ marginTop:4, borderRadius:8, overflow:"hidden", height:80 }}><img src={form.photos[i]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"} /></div>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={save} style={{ flex:1, padding:"12px", background:COLORS.primary, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:800 }}>💾 Save Record</button>
              <button onClick={() => { setEditing(null); setForm(BLANK_HIST); }} style={{ padding:"12px 20px", background:"#F3F4F6", color:COLORS.text, border:"none", borderRadius:10, cursor:"pointer", fontWeight:700 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Entry list */}
      {entries.length === 0 && editing === null && <div style={{ textAlign:"center", padding:"48px 24px", color:COLORS.muted, background:"#fff", borderRadius:16 }}>No history records yet. Create one above.</div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:18 }}>
        {entries.map((e, idx) => (
          <div key={e.id} style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 16px #0002", border:`1px solid ${COLORS.border}` }}>
            {/* Photo(s) */}
            {(e.photos||[]).filter(p=>p).length > 0 && (
              <div style={{ position:"relative", height:160, background:"#F4F7FC", cursor:"pointer" }} onClick={() => { setViewIdx(idx); setSlideIdx(0); }}>
                <img src={(e.photos||[])[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                {(e.photos||[]).filter(p=>p).length > 1 && (
                  <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.65)", color:"#fff", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:700 }}>+{(e.photos||[]).filter(p=>p).length-1} more</div>
                )}
              </div>
            )}
            <div style={{ padding:"14px 16px 18px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:COLORS.primary, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{e.category||"Record"} · {e.date}</div>
              <div style={{ fontSize:15, fontWeight:800, marginBottom:4 }}>{e.title}</div>
              {e.location && <div style={{ fontSize:12, color:COLORS.muted, marginBottom:6 }}>📍 {e.location}</div>}
              <div style={{ fontSize:13, color:COLORS.muted, lineHeight:1.6 }}>{(e.description||"").slice(0,90)}{(e.description||"").length>90?"…":""}</div>
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button onClick={() => startEdit(e)} style={{ padding:"6px 14px", borderRadius:8, background:COLORS.primary+"15", color:COLORS.primary, border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>✏️ Edit</button>
                <button onClick={() => del(e.id)} style={{ padding:"6px 14px", borderRadius:8, background:"#FEE2E2", color:COLORS.danger, border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>🗑 Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Photo slideshow modal */}
      {viewIdx !== null && viewPhotos.length > 0 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setViewIdx(null)}>
          <div style={{ position:"relative", maxWidth:800, width:"95%", maxHeight:"90vh" }} onClick={e=>e.stopPropagation()}>
            <img src={viewPhotos[slideIdx]} alt="" style={{ width:"100%", maxHeight:"80vh", objectFit:"contain", borderRadius:12 }} />
            <div style={{ textAlign:"center", color:"#fff", marginTop:10, fontSize:14 }}>{viewing?.title} · Photo {slideIdx+1} of {viewPhotos.length}</div>
            {viewPhotos.length > 1 && (
              <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:12 }}>
                {viewPhotos.map((p,i) => <button key={i} onClick={() => setSlideIdx(i)} style={{ width:10, height:10, borderRadius:"50%", border:"none", cursor:"pointer", background: i===slideIdx?"#fff":"rgba(255,255,255,0.4)" }} />)}
              </div>
            )}
            {slideIdx > 0 && <button onClick={()=>setSlideIdx(s=>s-1)} style={{ position:"absolute", left:-40, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", fontSize:24, cursor:"pointer", borderRadius:"50%", width:36, height:36 }}>‹</button>}
            {slideIdx < viewPhotos.length-1 && <button onClick={()=>setSlideIdx(s=>s+1)} style={{ position:"absolute", right:-40, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", fontSize:24, cursor:"pointer", borderRadius:"50%", width:36, height:36 }}>›</button>}
            <button onClick={() => setViewIdx(null)} style={{ position:"absolute", top:-12, right:-12, background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", fontSize:20, cursor:"pointer", borderRadius:"50%", width:32, height:32 }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ADMIN DASHBOARD — app-launcher grid ─────────────────────────────────────
const AdminDashboard = ({ cases, users, donations, sponsors, agents, onViewCase, onAddUser, onDeleteUser, onChangeRole, onExport, onConfirmDonation, onComplete, onStartDelivery, onFullReport, onAssign, onPublish, onReject, onRequestInfo, onEnroll, isSuperAdmin, currentUser, showToast }) => {
  const [activeModule, setActiveModule] = useState("workflow");
  const [donFilter, setDonFilter] = useState("all");
  const { t } = useLang();
  const isMob = useIsMobile();
  const isDemoMode = currentUser?.id?.startsWith('demo-');
  const totalDonated = donations.reduce((a, d) => a + (d.amount || 0), 0);
  const confirmedTotal = donations.filter(d => d.status === "confirmed").reduce((a, d) => a + (d.amount || 0), 0);
  const pendingTotal   = donations.filter(d => d.status === "pending").reduce((a, d) => a + (d.amount || 0), 0);
  const byStatus = WORKFLOW_STEPS.reduce((acc, s) => { acc[s.status] = cases.filter(c => c.status === s.status).length; return acc; }, {});
  const pendingCases   = cases.filter(c => ["Pending Verification","Under Review","Investigating"].includes(c.status));
  const proofPending   = cases.filter(c => c.status === "Proof Submitted");
  const recentDonations = donations.slice(0, 5);
  const filteredDonations = donFilter === "all" ? donations : donations.filter(d => d.status === donFilter);
  const partnerApps = (() => { try { return JSON.parse(localStorage.getItem("kf_partner_applications")||"[]"); } catch { return []; } })();
  const volApps     = (() => { try { return JSON.parse(localStorage.getItem("kf_volunteer_applications")||"[]"); } catch { return []; } })();

  const newReports      = cases.filter(c => c.status === "Pending Verification");
  const investigateDone = cases.filter(c => c.status === "Awaiting Approval");
  const proofSubmitted  = cases.filter(c => c.status === "Proof Submitted");
  const pendingPayments = donations.filter(d => d.status === "pending");
  const deliveryCases   = cases.filter(c => c.status === "Sponsored");
  const completedCases  = cases.filter(c => c.status === "Completed");
  const workflowAlerts  = newReports.length + investigateDone.length + proofSubmitted.length + pendingPayments.length;

  const SUPER_MODULES = [
    { id:"workflow",   icon:"🔄", label:"Workflow",        sub:`${workflowAlerts} need action`, color:"#DC2626", g:"linear-gradient(135deg,#DC2626,#EF4444)", badge: workflowAlerts },
    { id:"overview",   icon:"📊", label:"Overview",        sub:`${cases.length} cases`,         color:"#004B96", g:"linear-gradient(135deg,#004B96,#0072CE)", badge: pendingCases.length },
    { id:"users",      icon:"👥", label:"Users",           sub:`${users.length} registered`,     color:"#7C3AED", g:"linear-gradient(135deg,#7C3AED,#9B59B6)", badge: 0 },
    { id:"cases",      icon:"📋", label:"All Cases",       sub:`${cases.length} records`,        color:"#0891B2", g:"linear-gradient(135deg,#0891B2,#0EA5E9)", badge: proofPending.length },
    { id:"donations",  icon:"💰", label:"Donations",       sub:`$${totalDonated.toLocaleString()}`, color:"#4B7D19", g:"linear-gradient(135deg,#4B7D19,#65A30D)", badge: donations.filter(d=>d.status==="pending").length },
    { id:"analytics",  icon:"📈", label:"Analytics",       sub:"Charts & reports",               color:"#EA580C", g:"linear-gradient(135deg,#EA580C,#F97316)", badge: 0 },
    { id:"programs",   icon:"🌱", label:"Programs",        sub:"Children enrolled",              color:"#059669", g:"linear-gradient(135deg,#059669,#10B981)", badge: 0 },
    { id:"partners",   icon:"🤝", label:"Partners",        sub:`${partnerApps.filter(a=>a.status==="pending").length} pending`, color:"#2563EB", g:"linear-gradient(135deg,#2563EB,#3B82F6)", badge: partnerApps.filter(a=>a.status==="pending").length },
    { id:"volunteers", icon:"🙋", label:"Volunteers",      sub:`${volApps.filter(a=>a.status==="pending").length} pending`,    color:"#9333EA", g:"linear-gradient(135deg,#9333EA,#C026D3)", badge: volApps.filter(a=>a.status==="pending").length },
    { id:"impact_stories", icon:"📸", label:"Stories",    sub:"Impact content",                 color:"#DC2626", g:"linear-gradient(135deg,#DC2626,#EF4444)", badge: 0 },
    { id:"updates",    icon:"🚨", label:"Updates",         sub:"Alerts & news",                  color:"#D97706", g:"linear-gradient(135deg,#D97706,#F59E0B)", badge: 0 },
    { id:"completed",  icon:"🏁", label:"Completed Ops",   sub:`${completedCases.length} operations`, color:"#065F46", g:"linear-gradient(135deg,#065F46,#10B981)", badge: 0 },
    { id:"history",    icon:"📚", label:"History",         sub:"Records & archive",              color:"#0F766E", g:"linear-gradient(135deg,#0F766E,#14B8A6)", badge: 0 },
    { id:"notebook",   icon:"📓", label:"Notebook",        sub:"Notes & tasks",                  color:"#B8861A", g:"linear-gradient(135deg,#B8861A,#E0AB21)", badge: 0 },
    { id:"settings",   icon:"⚙️", label:"Settings",        sub:"Site configuration",             color:"#374151", g:"linear-gradient(135deg,#374151,#6B7280)", badge: 0 },
  ];
  const ADMIN_MODULES = SUPER_MODULES.filter(m => !["users","settings"].includes(m.id));
  const modules = isSuperAdmin ? SUPER_MODULES : ADMIN_MODULES;
  const activeModuleInfo = modules.find(m => m.id === activeModule);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const backBtn = (
    <button onClick={() => setActiveModule(null)} style={{
      display:"inline-flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:10,
      background:"#F4F7FC", border:`1px solid ${COLORS.border}`, cursor:"pointer",
      fontSize:13, fontWeight:700, color:COLORS.text, marginBottom:20,
    }}>← Back to Dashboard</button>
  );

  return (
    <div>
      {/* ── DEMO MODE BANNER ── */}
      {isDemoMode && (
        <div style={{ background:"linear-gradient(90deg,#92400E,#B45309)", color:"#fff", borderRadius:12, padding:"12px 18px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight:800, fontSize:14 }}>Demo Mode Active — Showing sample data</div>
              <div style={{ fontSize:12, opacity:0.85 }}>You are not connected to the live database. Log out and sign in while the server is running to see real data.</div>
            </div>
          </div>
          <Btn variant="outline" size="sm" style={{ background:"rgba(255,255,255,0.15)", borderColor:"rgba(255,255,255,0.4)", color:"#fff", whiteSpace:"nowrap" }}
            onClick={() => { localStorage.removeItem('kf_token'); localStorage.removeItem('kf_user'); window.location.href = '/login'; }}>
            🔑 Sign in for Live Data
          </Btn>
        </div>
      )}

      {/* ── HOME GRID ── */}
      {!activeModule && (
        <div>
          {/* Welcome header */}
          <div style={{ background:`linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.primary} 100%)`, borderRadius:20, padding:"28px 28px 24px", marginBottom:24, color:"#fff", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", right:-20, top:-20, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
            <div style={{ position:"absolute", right:60, bottom:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }} />
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ fontSize:13, opacity:0.7, fontWeight:600, marginBottom:4 }}>{greeting},</div>
              <h2 style={{ margin:"0 0 4px", fontSize:24, fontWeight:900 }}>{currentUser?.fullname || "Administrator"}</h2>
              <div style={{ fontSize:12, opacity:0.65 }}>
                {isSuperAdmin ? "🛡️ Super Administrator · Full System Access"
                  : currentUser?.role === "verification_office" ? "🔍 Verification Office · Case Review Access"
                  : currentUser?.role === "program_manager"     ? "🌱 Program Manager · Programs Access"
                  : currentUser?.role === "project_manager"     ? "🏗️ Project Manager · Projects Access"
                  : "🟠 Administrator · Full Access"}
              </div>
            </div>
          </div>

          {/* Quick stats strip */}
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${isMob?2:4},1fr)`, gap:12, marginBottom:28 }}>
            {[
              { label:"Active Cases",  value:cases.length,  icon:"📋", color:COLORS.primary },
              { label:"Total Donated", value:`$${totalDonated.toLocaleString()}`, icon:"💰", color:COLORS.secondary },
              { label:"Pending Review",value:pendingCases.length, icon:"⏳", color:"#D97706" },
              { label:"Users",         value:users.length,  icon:"👥", color:"#7C3AED" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", borderRadius:14, padding:"16px 16px", boxShadow:"0 2px 8px #0001", textAlign:"center", border:`1px solid ${COLORS.border}` }}>
                <div style={{ fontSize:24 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1, marginTop:6 }}>{s.value}</div>
                <div style={{ fontSize:11, color:COLORS.muted, marginTop:4, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* App icon grid */}
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${isMob?2:4},1fr)`, gap:isMob?14:20 }}>
            {modules.map(mod => (
              <button key={mod.id} onClick={() => setActiveModule(mod.id)} style={{
                position:"relative", background:mod.g, borderRadius:20, border:"none", cursor:"pointer",
                padding:"28px 16px 22px", display:"flex", flexDirection:"column", alignItems:"center",
                color:"#fff", boxShadow:`0 6px 24px ${mod.color}35`,
                transition:"transform .2s, box-shadow .2s",
              }}
                onMouseOver={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 14px 36px ${mod.color}50`; }}
                onMouseOut={e  => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=`0 6px 24px ${mod.color}35`; }}
              >
                {/* Badge */}
                {mod.badge > 0 && <div style={{ position:"absolute", top:10, right:10, background:"#EF4444", color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:800, minWidth:20, textAlign:"center" }}>{mod.badge}</div>}
                {/* Icon */}
                <div style={{ fontSize:isMob?34:44, marginBottom:12, lineHeight:1 }}>{mod.icon}</div>
                {/* Label */}
                <div style={{ fontSize:isMob?13:15, fontWeight:800, letterSpacing:-0.3 }}>{mod.label}</div>
                {/* Sub */}
                <div style={{ fontSize:10, opacity:0.75, marginTop:4, fontWeight:600 }}>{mod.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MODULE CONTENT ── */}
      {activeModule && (
        <div>
          {/* Module header */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, padding:"14px 18px", background:"#fff", borderRadius:14, border:`1px solid ${COLORS.border}`, boxShadow:"0 2px 8px #0001" }}>
            {backBtn}
            <div style={{ width:36, height:36, borderRadius:10, background:activeModuleInfo?.g, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{activeModuleInfo?.icon}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800 }}>{activeModuleInfo?.label}</div>
              <div style={{ fontSize:11, color:COLORS.muted }}>{activeModuleInfo?.sub}</div>
            </div>
            {activeModule === "cases" && isSuperAdmin && (
              <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                <Btn variant="teal" onClick={onExport}>Export</Btn>
              </div>
            )}
            {activeModule === "users" && isSuperAdmin && (
              <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                <Btn variant="primary" onClick={onAddUser}>Add User</Btn>
              </div>
            )}
          </div>

          {/* ── Workflow ─────────────────────────────────────────── */}
          {activeModule === "workflow" && (() => {
            const WfSection = ({ title, badge, badgeColor = COLORS.danger, children }) => (
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px #0001", marginBottom: 20, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}`, background: "#F8FAFC" }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
                  {badge > 0 && <span style={{ background: badgeColor, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 800 }}>{badge}</span>}
                </div>
                <div style={{ padding: "12px 20px" }}>{children}</div>
              </div>
            );
            const WfRow = ({ c, buttons }) => (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primary + "15", borderRadius: 20, padding: "2px 9px" }}>{c.ref}</span>
                    <UrgencyBadge level={c.urgency_level} />
                    <span style={{ fontSize: 12, color: COLORS.muted }}>{c.created_at}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 340 }}>{c.victim_name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>📍 {c.location} · {c._raw?.category?.replace(/_/g," ")}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
                  <Btn size="sm" variant="ghost" onClick={() => onViewCase(c)}>👁 View</Btn>
                  {buttons}
                </div>
              </div>
            );

            // Open publish modal directly — no intermediate status update needed
            // The publish endpoint sets waiting_for_sponsor from any current status
            const approveAndPublish = (c) => onPublish(c);

            return (
              <div>
                {/* Step 1 — New Reports */}
                <WfSection title="📥 Step 1 — New Reports" badge={newReports.length}>
                  {newReports.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: COLORS.muted, fontSize: 13 }}>✅ No new reports pending</div>
                  ) : newReports.map(c => (
                    <WfRow key={c.id} c={c} buttons={<>
                      <Btn size="sm" variant="danger" onClick={() => onReject(c)}>❌ Reject</Btn>
                      <Btn size="sm" variant="primary" onClick={() => approveAndPublish(c)}>✅ Approve → Publish</Btn>
                      <Btn size="sm" variant="teal" onClick={() => onAssign(c)}>🗺️ Assign Team</Btn>
                    </>} />
                  ))}
                </WfSection>

                {/* Step 2 — Under Investigation */}
                {(() => {
                  const underInvestigation = cases.filter(c => ["Under Review","Investigating"].includes(c.status));
                  return (
                    <WfSection title="🔍 Step 2 — Under Investigation" badge={underInvestigation.length} badgeColor={COLORS.secondary}>
                      {underInvestigation.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: COLORS.muted, fontSize: 13 }}>No cases under investigation</div>
                      ) : underInvestigation.map(c => (
                        <WfRow key={c.id} c={c} buttons={<>
                          <Btn size="sm" variant="ghost" onClick={() => onReject(c)}>❌ Reject</Btn>
                          <Btn size="sm" variant="teal" onClick={() => onAssign(c)}>🔄 Reassign</Btn>
                        </>} />
                      ))}
                    </WfSection>
                  );
                })()}

                {/* Step 3 — Investigation Report Ready */}
                {(() => {
                  const invDone = cases.filter(c => c.status === "Awaiting Approval");
                  return (
                    <WfSection title="📋 Step 3 — Investigation Report Ready" badge={invDone.length}>
                      {invDone.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: COLORS.muted, fontSize: 13 }}>No investigation reports ready</div>
                      ) : invDone.map(c => (
                        <WfRow key={c.id} c={c} buttons={<>
                          <Btn size="sm" variant="danger" onClick={() => onReject(c)}>❌ Reject</Btn>
                          <Btn size="sm" variant="primary" onClick={() => onPublish(c)}>✅ Approve → Publish</Btn>
                          <Btn size="sm" variant="teal" onClick={() => onAssign(c)}>🔄 Reassign</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => onRequestInfo(c)}>💬 Request Info</Btn>
                        </>} />
                      ))}
                    </WfSection>
                  );
                })()}

                {/* Step 4 — Pending Donations */}
                <WfSection title="💳 Step 4 — Pending Payments" badge={pendingPayments.length} badgeColor="#F59E0B">
                  {pendingPayments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: COLORS.muted, fontSize: 13 }}>No pending payments</div>
                  ) : pendingPayments.map(d => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>${(d.amount||0).toLocaleString()} — {d.case?.publicTitle || `Case #${d.caseId?.slice(-6)}`}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted }}>{d.donor?.name || "Donor"} · {d.method?.replace(/_/g," ")} · {d.createdAt?.slice(0,10)}</div>
                      </div>
                      <Btn size="sm" variant="primary" onClick={() => onConfirmDonation && onConfirmDonation(d.id)}>✅ Confirm Payment</Btn>
                    </div>
                  ))}
                </WfSection>

                {/* Step 5 — Assign Delivery */}
                <WfSection title="🚚 Step 5 — Ready for Delivery" badge={deliveryCases.length} badgeColor={COLORS.secondary}>
                  {deliveryCases.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: COLORS.muted, fontSize: 13 }}>No cases ready for delivery</div>
                  ) : deliveryCases.map(c => (
                    <WfRow key={c.id} c={c} buttons={
                      <Btn size="sm" variant="primary" onClick={() => onStartDelivery && onStartDelivery(c)}>🚚 Assign Delivery</Btn>
                    } />
                  ))}
                </WfSection>

                {/* Step 6 — Proof Submitted */}
                <WfSection title="📦 Step 6 — Delivery Proof Submitted" badge={proofSubmitted.length} badgeColor={COLORS.secondary}>
                  {proofSubmitted.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: COLORS.muted, fontSize: 13 }}>No delivery proofs pending</div>
                  ) : proofSubmitted.map(c => (
                    <WfRow key={c.id} c={c} buttons={<>
                      <Btn size="sm" variant="primary" onClick={() => onComplete(c)}>🏁 Complete Case</Btn>
                    </>} />
                  ))}
                </WfSection>
              </div>
            );
          })()}

          {/* Overview */}
          {activeModule === "overview" && (
        <div>
          <div className="kf-stats-row">
            <StatCard label={t("totalCases")}   value={cases.length}    icon="📋" color={COLORS.primary} />
            <StatCard label={t("totalUsers")}   value={users.length}    icon="👥" color="#8B5CF6" />
            <StatCard label={t("totalDonated")} value={`$${totalDonated.toLocaleString()}`} icon="💰" color={COLORS.secondary} />
            <StatCard label={t("completed")}    value={cases.filter(c => c.status === "Completed").length} icon="🏁" color="#5A6E8A" />
          </div>

          {/* Proof pending alert */}
          {proofPending.length > 0 && (
            <div style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#065F46" }}>📦 {proofPending.length} case{proofPending.length > 1 ? "s" : ""} with delivery proof — needs your review</div>
                <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>Field agent has submitted proof. Review and mark complete to notify donors & reporter.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {proofPending.map(c => (
                  <button key={c.id} onClick={() => onComplete && onComplete(c)}
                    style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: COLORS.secondary, color: "#fff", border: "none", cursor: "pointer" }}>
                    🏁 Complete {c.ref}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Case Pipeline */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 8px #0001", marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>📊 Live Case Pipeline</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
              {WORKFLOW_STEPS.map(s => (
                <div key={s.num} style={{ textAlign: "center", background: s.color + "12", borderRadius: 12, padding: "14px 8px", border: `1px solid ${s.color}30` }}>
                  <div style={{ fontSize: 22 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4 }}>{byStatus[s.status] || 0}</div>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 700, marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="kf-grid-2">
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>🚨 Needs Attention</h3>
              <CaseTable cases={pendingCases.slice(0,4)} onView={onViewCase} compact />
            </div>
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>💰 Recent Donations</h3>
              <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
                {recentDonations.length === 0 && (
                  <div style={{ padding: "20px 16px", color: COLORS.muted, fontSize: 13, textAlign: "center" }}>No donations yet</div>
                )}
                {recentDonations.map((d, i) => (
                  <div key={d.id} style={{ padding: "12px 16px", borderBottom: i < recentDonations.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {d.donor?.name || "Anonymous"} → {d.case?.publicTitle || `Case #${d.caseId?.slice(-6)}`}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>
                        {d.method?.replace(/_/g," ") || "—"} · {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: d.status === "confirmed" ? "#D1FAE5" : "#FEF3C7", color: d.status === "confirmed" ? "#065F46" : "#92400E" }}>
                        {d.status}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary }}>${d.amount?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {donations.length > 5 && (
                  <div style={{ padding: "10px 16px", textAlign: "center" }}>
                    <button onClick={() => setActiveModule("donations")} style={{ fontSize: 12, color: COLORS.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>View all {donations.length} donations →</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
          )}

          {activeModule === "analytics" && <AnalyticsDashboard cases={cases} donations={donations} users={users} />}

          {activeModule === "users" && (
            <UsersTab users={users} isSuperAdmin={isSuperAdmin} onDeleteUser={onDeleteUser} onChangeRole={onChangeRole} />
          )}

          {activeModule === "cases" && (
            <CaseTable cases={cases} onView={onViewCase} onPublish={onPublish} onReport={isSuperAdmin ? onFullReport : undefined} />
          )}

          {activeModule === "donations" && (
            <div>
              <div className="kf-stats-row">
                <StatCard label="Total Received"  value={`$${totalDonated.toLocaleString()}`}  icon="💵" color={COLORS.secondary} />
                <StatCard label="Confirmed"        value={`$${confirmedTotal.toLocaleString()}`} icon="✅" color="#10B981" />
                <StatCard label="Pending Confirm"  value={`$${pendingTotal.toLocaleString()}`}   icon="⏳" color="#F59E0B" />
                <StatCard label="# Donations"      value={donations.length}                      icon="📊" color={COLORS.primary} />
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                {["all","pending","confirmed"].map(f => (
                  <button key={f} onClick={() => setDonFilter(f)}
                    style={{ padding:"6px 16px", borderRadius:20, fontSize:13, fontWeight:700, border:`1.5px solid ${donFilter===f?COLORS.primary:COLORS.border}`, background:donFilter===f?COLORS.primary:"#fff", color:donFilter===f?"#fff":COLORS.muted, cursor:"pointer" }}>
                    {f === "all" ? "All" : f.charAt(0).toUpperCase()+f.slice(1)}
                    {f !== "all" && <span style={{ marginLeft:6, background:"rgba(255,255,255,0.25)", borderRadius:10, padding:"1px 6px" }}>{donations.filter(d=>d.status===f).length}</span>}
                  </button>
                ))}
              </div>
              <div className="kf-table-wrap">
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr style={{ background:"#F8FAFC" }}>
                    {["Donor","Amount","Case","Method","Date","Status","Action"].map(h=>(
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:COLORS.muted, borderBottom:`1px solid ${COLORS.border}` }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredDonations.length===0 && <tr><td colSpan={7} style={{ padding:"32px 16px", textAlign:"center", color:COLORS.muted }}>No donations found</td></tr>}
                    {filteredDonations.map((d,i) => (
                      <tr key={d.id} style={{ borderBottom:i<filteredDonations.length-1?`1px solid ${COLORS.border}`:"none" }}
                        onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ fontSize:13, fontWeight:700 }}>{d.isAnonymous?"Anonymous":(d.donor?.name||"—")}</div>
                          {!d.isAnonymous && <div style={{ fontSize:11, color:COLORS.muted }}>{d.donor?.email||""}</div>}
                        </td>
                        <td style={{ padding:"12px 16px", fontSize:16, fontWeight:800, color:COLORS.secondary }}>${(d.amount||0).toLocaleString()}</td>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ fontSize:12, fontWeight:700 }}>{d.case?.publicTitle||`Case #${(d.caseId||"").slice(-6)}`}</div>
                          <div style={{ fontSize:11, color:COLORS.muted }}>{d.case?.publicCity||""}</div>
                        </td>
                        <td style={{ padding:"12px 16px", fontSize:12, color:COLORS.muted }}>{(d.method||"—").replace(/_/g," ")}</td>
                        <td style={{ padding:"12px 16px", fontSize:12, color:COLORS.muted }}>{d.createdAt?new Date(d.createdAt).toLocaleDateString():"—"}</td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{ background:d.status==="confirmed"?"#D1FAE5":d.status==="pending"?"#FEF3C7":"#FEE2E2", color:d.status==="confirmed"?"#065F46":d.status==="pending"?"#92400E":"#991B1B", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                            {d.status==="confirmed"?"✅ Confirmed":d.status==="pending"?"⏳ Pending":d.status}
                          </span>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          {d.status==="pending" && onConfirmDonation && <button onClick={()=>onConfirmDonation(d.id)} style={{ padding:"5px 14px", borderRadius:8, fontSize:12, fontWeight:700, background:"#10B981", color:"#fff", border:"none", cursor:"pointer" }}>✓ Confirm</button>}
                          {d.status==="confirmed" && ["sponsored","waiting_for_sponsor"].includes(d.case?.status) && onStartDelivery && (
                            <button onClick={()=>onStartDelivery({ id:d.caseId, victim_name:d.case?.publicTitle||`Case #${(d.caseId||"").slice(-6)}`, location:d.case?.publicCity||"", donation_amount:d.amount, _amount:d.amount, _caseTitle:d.case?.publicTitle, _caseCity:d.case?.publicCity, _caseId:d.caseId })}
                              style={{ padding:"5px 14px", borderRadius:8, fontSize:12, fontWeight:700, background:"#0891B2", color:"#fff", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>🚚 Start Delivery</button>
                          )}
                          {d.status==="confirmed" && d.case?.status==="delivering" && <span style={{ fontSize:11, color:"#0891B2", fontWeight:700 }}>🚚 En Route</span>}
                          {d.status==="confirmed" && d.case?.status==="proof_uploaded" && onComplete && (
                            <button onClick={()=>{ const c=cases.find(x=>x.id===d.caseId); if(c)onComplete(c); }} style={{ padding:"5px 14px", borderRadius:8, fontSize:12, fontWeight:700, background:COLORS.secondary, color:"#fff", border:"none", cursor:"pointer" }}>🏁 Mark Complete</button>
                          )}
                          {d.status==="confirmed" && d.case?.status==="completed" && <span style={{ fontSize:11, color:COLORS.secondary, fontWeight:700 }}>🏁 Completed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeModule === "programs"      && <ProgramsDashboard currentUser={currentUser} showToast={showToast||(() => {})} adminPaymentsApi={programsApi} />}
          {activeModule === "impact_stories" && <ImpactStoriesPanel showToast={showToast||(() => {})} />}
          {activeModule === "partners"       && <PartnerApplicationsPanel showToast={showToast} />}
          {activeModule === "volunteers"     && <VolunteerApplicationsPanel showToast={showToast} />}
          {activeModule === "completed" && (() => {
            const totalDelivered = completedCases.reduce((a, c) => a + (c._raw?.deliveryProof?.amountDelivered || c.donation_amount || 0), 0);
            return (
              <div>
                <div className="kf-stats-row" style={{ marginBottom: 24 }}>
                  <StatCard label="Total Completed"  value={completedCases.length}             icon="🏁" color="#065F46" />
                  <StatCard label="Total Delivered"  value={`$${totalDelivered.toLocaleString()}`} icon="💰" color={COLORS.secondary} />
                  <StatCard label="Families Helped"  value={completedCases.length}             icon="❤️" color={COLORS.primary} />
                </div>
                {completedCases.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"60px 0", color:COLORS.muted }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🏁</div>
                    <div style={{ fontSize:16, fontWeight:700 }}>No completed operations yet</div>
                    <div style={{ fontSize:13, marginTop:6 }}>Completed cases will appear here automatically</div>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
                    {completedCases.map(c => (
                      <div key={c.id} style={{ background:"#fff", borderRadius:16, border:"2px solid #A7F3D0", overflow:"hidden", boxShadow:"0 2px 8px #0001" }}>
                        <div style={{ background:"linear-gradient(135deg,#065F46,#10B981)", padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:800, fontSize:14, color:"#fff" }}>{c.ref}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", marginTop:2 }}>Completed {c._raw?.completedAt?.slice(0,10) || c.created_at}</div>
                          </div>
                          <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:800, color:"#fff" }}>🏁 DONE</span>
                        </div>
                        <div style={{ padding:"14px 16px" }}>
                          <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{c.victim_name}</div>
                          <div style={{ fontSize:12, color:COLORS.muted, marginBottom:10 }}>📍 {c.location} · {c._raw?.category?.replace(/_/g," ")}</div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                            <div style={{ background:"#F0FDF4", borderRadius:8, padding:"8px 12px" }}>
                              <div style={{ fontSize:10, color:"#065F46", fontWeight:700 }}>RAISED</div>
                              <div style={{ fontSize:14, fontWeight:800 }}>${(c.donation_amount||0).toLocaleString()}</div>
                            </div>
                            <div style={{ background:"#EFF6FF", borderRadius:8, padding:"8px 12px" }}>
                              <div style={{ fontSize:10, color:COLORS.primary, fontWeight:700 }}>GOAL</div>
                              <div style={{ fontSize:14, fontWeight:800 }}>${(c.target_goal||0).toLocaleString()}</div>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:8 }}>
                            <Btn size="sm" variant="ghost" onClick={() => onViewCase(c)} style={{ flex:1 }}>👁 View</Btn>
                            {isSuperAdmin && (
                              <Btn size="sm" variant="primary" onClick={() => onFullReport(c.id)} style={{ flex:1 }}>📄 Full Report</Btn>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {activeModule === "history"        && <HistoryPanel showToast={showToast} />}
          {activeModule === "notebook"       && <NotebookPanel users={users} showToast={showToast||(() => {})} />}
          {activeModule === "updates"        && <div style={{ padding:"8px 0" }}><SiteSettingsPanel showToast={showToast||(() => {})} currentUser={currentUser} defaultTab="updates_mgr" /></div>}
          {activeModule === "settings"       && isSuperAdmin && <SiteSettingsPanel showToast={showToast||(() => {})} currentUser={currentUser} />}
        </div>
      )}
    </div>
  );
};

// ─── PROGRAMS ENGINE COMPONENTS ─────────────────────────────────────────────

const PROGRAM_TYPE_LABELS = {
  child_sponsorship: { icon: "👶", label: "Child Sponsorship", color: "#EC4899" },
  education:         { icon: "🎓", label: "Education",         color: "#3B82F6" },
  medical:           { icon: "🩺", label: "Medical Support",   color: "#EF4444" },
  family_care:       { icon: "🏠", label: "Family Care",       color: "#F59E0B" },
  nutrition:         { icon: "🍎", label: "Nutrition",         color: "#10B981" },
  emergency_relief:  { icon: "🚨", label: "Emergency Relief",  color: "#7C3AED" },
};

const PROJECT_CAT_LABELS = {
  water:       { icon: "💧", label: "Water & Sanitation" },
  school:      { icon: "🏫", label: "Education" },
  health:      { icon: "🏥", label: "Healthcare" },
  agriculture: { icon: "🌱", label: "Agriculture" },
  shelter:     { icon: "🏠", label: "Shelter" },
  energy:      { icon: "⚡", label: "Energy" },
};

const BeneficiaryStatusBadge = ({ status }) => {
  const map = {
    pending_verification: { bg: "#F3F4F6", color: COLORS.muted, label: "⏳ Pending" },
    verified:             { bg: "#DBEAFE", color: "#1E40AF",    label: "✅ Verified" },
    seeking_sponsor:      { bg: "#FEF3C7", color: "#92400E",    label: "🤝 Seeking Sponsor" },
    sponsored:            { bg: "#D1FAE5", color: "#065F46",    label: "🤝 Under Sponsor" },
    under_sponsor:        { bg: "#D1FAE5", color: "#065F46",    label: "🤝 Under Sponsor" },
    completed:            { bg: "#F0FDF4", color: "#166534",    label: "🏁 Completed" },
    on_hold:              { bg: "#F3F4F6", color: COLORS.muted, label: "⏸ On Hold" },
  };
  const s = map[status] || { bg: "#F3F4F6", color: COLORS.muted, label: status };
  return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
};

// ── Enroll Beneficiary Modal ──────────────────────────────────────────────────
const EnrollBeneficiaryModal = ({ programs: progList, onClose, onDone, showToast }) => {
  const [form, setForm] = useState({
    programId: progList[0]?.id || "",
    programType: "child_sponsorship",
    privateFullName: "",
    privateGuardianName: "",
    privateGuardianPhone: "",
    privateSchoolName: "",
    privateAddress: "",
    privateMedicalNotes: "",
    privateNotes: "",
    publicAge: "",
    publicGender: "female",
    publicRegion: "",
    publicCity: "",
    publicNeedsDesc: "",
    publicStory: "",
    monthlyNeed: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    if (!form.privateFullName.trim()) return setError("Full name required");
    if (!form.monthlyNeed || isNaN(parseFloat(form.monthlyNeed))) return setError("Monthly need amount required");
    if (!form.programId) return setError("Please select a program");
    setLoading(true);
    try {
      await programsApi.enrollBeneficiary({
        ...form,
        monthlyNeed: parseFloat(form.monthlyNeed),
        publicAge: form.publicAge ? parseInt(form.publicAge) : undefined,
      });
      showToast("✅ Beneficiary enrolled! Pending verification.");
      onDone();
      onClose();
    } catch (e) {
      setError(e.message || "Enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  const TYPE_OPTIONS = getCat("programTypes");

  return (
    <Modal title="👶 Enroll New Beneficiary" onClose={onClose} wide>
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065F46" }}>
        🔐 Private information (full name, guardian, school, medical records) is <strong>never shown publicly</strong>. Only the public profile fields are visible to donors.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 24 }}>
        {/* Left — private */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>🔐 Private Information</div>
          <Input label="Full Name *" value={form.privateFullName} onChange={e => set("privateFullName", e.target.value)} placeholder="Full legal name" />
          <Input label="Guardian / Parent Name" value={form.privateGuardianName} onChange={e => set("privateGuardianName", e.target.value)} />
          <Input label="Guardian Phone" value={form.privateGuardianPhone} onChange={e => set("privateGuardianPhone", e.target.value)} placeholder="+252 61 xxx xxxx" />
          <Input label="School / Institution" value={form.privateSchoolName} onChange={e => set("privateSchoolName", e.target.value)} />
          <Input label="Private Address" value={form.privateAddress} onChange={e => set("privateAddress", e.target.value)} placeholder="District, City, Region" />
          <Textarea label="Medical Notes (if any)" value={form.privateMedicalNotes} onChange={e => set("privateMedicalNotes", e.target.value)} placeholder="Conditions, treatments…" />
          <Textarea label="Admin Notes" value={form.privateNotes} onChange={e => set("privateNotes", e.target.value)} placeholder="Internal context…" />
        </div>

        {/* Right — program + public */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>🌱 Program & Public Profile</div>
          <Select label="Program *" value={form.programId} onChange={e => set("programId", e.target.value)}>
            <option value="">— Select program —</option>
            {progList.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </Select>
          <Select label="Program Type *" value={form.programType} onChange={e => set("programType", e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Age (public)" type="number" value={form.publicAge} onChange={e => set("publicAge", e.target.value)} placeholder="e.g. 10" />
            <Select label="Gender" value={form.publicGender} onChange={e => set("publicGender", e.target.value)}>
              <option value="">— Select —</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Region" value={form.publicRegion} onChange={e => set("publicRegion", e.target.value)} placeholder="e.g. Banaadir" />
            <Input label="City" value={form.publicCity} onChange={e => set("publicCity", e.target.value)} placeholder="e.g. Mogadishu" />
          </div>
          <Input label="Needs Description (public)" value={form.publicNeedsDesc} onChange={e => set("publicNeedsDesc", e.target.value)} placeholder="e.g. School fees + food support" />
          <Input label="Monthly Need (USD) *" type="number" value={form.monthlyNeed} onChange={e => set("monthlyNeed", e.target.value)} placeholder="e.g. 35" />
          <Textarea label="Public Story (AI will help sanitize)" value={form.publicStory} onChange={e => set("publicStory", e.target.value)} placeholder="Write a story without private details. Donors will see this." />
        </div>
      </div>

      {error && <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginTop: 12 }}>⚠️ {error}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }} disabled={loading}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
          {loading ? "Enrolling…" : "👶 Enroll Beneficiary"}
        </Btn>
      </div>
    </Modal>
  );
};

// ── Create Program Modal ──────────────────────────────────────────────────────
const CreateProgramModal = ({ onClose, onDone, showToast }) => {
  const [form, setForm] = useState({ name: "", type: "child_sponsorship", description: "", icon: "🌱", color: "#004B96", monthlyBudget: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (!form.name || !form.description) return;
    setLoading(true);
    try {
      await programsApi.create({ ...form, monthlyBudget: form.monthlyBudget ? parseFloat(form.monthlyBudget) : undefined });
      showToast("✅ Program created successfully!");
      onDone();
      onClose();
    } catch (e) {
      showToast(e.message || "Failed", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="🌱 Create New Program" onClose={onClose}>
      <Select label="Program Type *" value={form.type} onChange={e => set("type", e.target.value)}>
        {Object.entries(PROGRAM_TYPE_LABELS).map(([v, t]) => <option key={v} value={v}>{t.icon} {t.label}</option>)}
      </Select>
      <Input label="Program Name *" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Education Support for Girls" />
      <Textarea label="Description *" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe what this program does and who it helps…" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Icon (emoji)" value={form.icon} onChange={e => set("icon", e.target.value)} placeholder="🌱" />
        <Input label="Color (hex)" value={form.color} onChange={e => set("color", e.target.value)} placeholder="#004B96" />
      </div>
      <Input label="Monthly Budget ($)" type="number" value={form.monthlyBudget} onChange={e => set("monthlyBudget", e.target.value)} placeholder="Optional" />
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="success" onClick={handle} disabled={loading || !form.name || !form.description} style={{ flex: 2 }}>
          {loading ? "Creating…" : "🌱 Create Program"}
        </Btn>
      </div>
    </Modal>
  );
};

// ── Monthly Update Modal (field team) ─────────────────────────────────────────
const MonthlyUpdateModal = ({ beneficiary, onClose, showToast }) => {
  const now = new Date();
  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    schoolAttendance: "",
    healthStatus: "good",
    progressNotes: "",
    needsAssessment: "",
    deliveriesMade: [],
  });
  const [delivery, setDelivery] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const addDelivery = () => {
    if (!delivery.trim()) return;
    set("deliveriesMade", [...form.deliveriesMade, delivery.trim()]);
    setDelivery("");
  };

  const handle = async () => {
    if (!form.progressNotes.trim()) return;
    setLoading(true);
    try {
      await programsApi.submitUpdate(beneficiary.id, {
        ...form,
        schoolAttendance: form.schoolAttendance ? parseInt(form.schoolAttendance) : undefined,
      });
      showToast(`✅ Monthly update for ${MONTH_NAMES[form.month-1]} submitted!`);
      onClose();
    } catch (e) {
      showToast(e.message || "Failed to submit", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`📊 Monthly Update — ${beneficiary.publicId}`} onClose={onClose} wide>
      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: COLORS.primary }}>
        📋 This update will be reviewed by admin and then shared with the sponsor. Include accurate data and any receipts or photos if available.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Select label="Month *" value={form.month} onChange={e => set("month", parseInt(e.target.value))}>
          {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </Select>
        <Input label="Year *" type="number" value={form.year} onChange={e => set("year", parseInt(e.target.value))} />
      </div>

      {["child_sponsorship","education"].includes(beneficiary.programType) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="School Attendance (%)" type="number" min="0" max="100" value={form.schoolAttendance} onChange={e => set("schoolAttendance", e.target.value)} placeholder="0–100" />
          <Select label="Health Status" value={form.healthStatus} onChange={e => set("healthStatus", e.target.value)}>
            <option value="good">🟢 Good</option>
            <option value="fair">🟡 Fair</option>
            <option value="poor">🔴 Poor</option>
          </Select>
        </div>
      )}

      <Textarea label="Progress Notes *" value={form.progressNotes} onChange={e => set("progressNotes", e.target.value)} placeholder="Describe the beneficiary's progress this month — school performance, health, family situation, challenges…" style={{ minHeight: 100 }} />
      <Textarea label="Needs Assessment (optional)" value={form.needsAssessment} onChange={e => set("needsAssessment", e.target.value)} placeholder="What additional support is needed next month?" />

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>✅ What Was Delivered This Month</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={delivery} onChange={e => setDelivery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDelivery()}
            style={{ flex: 1, padding: "8px 12px", border: `1.5px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13 }}
            placeholder="e.g. School fees paid, Books delivered, Medical checkup" />
          <Btn variant="primary" size="sm" onClick={addDelivery}>Add</Btn>
        </div>
        {form.deliveriesMade.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {form.deliveriesMade.map((d, i) => (
              <span key={i} style={{ background: COLORS.secondary + "15", color: COLORS.secondary, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                ✅ {d}
                <button onClick={() => set("deliveriesMade", form.deliveriesMade.filter((_,j) => j !== i))}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: COLORS.muted, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="success" onClick={handle} disabled={loading || !form.progressNotes.trim()} style={{ flex: 2 }}>
          {loading ? "Submitting…" : "📊 Submit Monthly Update"}
        </Btn>
      </div>
    </Modal>
  );
};

// ── Bulk Child Enrollment Modal ───────────────────────────────────────────────
const BulkChildEnrollModal = ({ programs, onClose, onDone, showToast }) => {
  const C = COLORS;
  const emptyRow = () => ({ privateFullName: '', publicAge: '', publicGender: '', privateGuardianName: '', privateGuardianPhone: '', publicRegion: '', publicCity: '', monthlyNeed: '', privateSchoolName: '', privateMedicalNotes: '' });
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id || '');
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(false);

  const setRow = (i, k, v) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const addRow = () => setRows(rs => [...rs, emptyRow()]);
  const removeRow = (i) => setRows(rs => rs.filter((_, idx) => idx !== i));

  const handle = async () => {
    const validRows = rows.filter(r => r.privateFullName.trim().length >= 2);
    if (!validRows.length) { showToast('Add at least one child with a name', 'error'); return; }
    if (!selectedProgram) { showToast('Select a program first', 'error'); return; }
    setLoading(true);
    try {
      const children = validRows.map(r => ({
        programId: selectedProgram,
        privateFullName: r.privateFullName.trim(),
        publicAge: r.publicAge ? parseInt(r.publicAge) : undefined,
        publicGender: r.publicGender || undefined,
        privateGuardianName: r.privateGuardianName || undefined,
        privateGuardianPhone: r.privateGuardianPhone || undefined,
        publicRegion: r.publicRegion || undefined,
        publicCity: r.publicCity || undefined,
        monthlyNeed: r.monthlyNeed ? parseFloat(r.monthlyNeed) : undefined,
        privateSchoolName: r.privateSchoolName || undefined,
        privateMedicalNotes: r.privateMedicalNotes || undefined,
      }));
      const res = await programsApi.bulkEnroll({ children });
      showToast(`✅ ${res.count || validRows.length} children enrolled successfully!`);
      onDone();
      onClose();
    } catch (e) {
      showToast(e.message || 'Bulk enrollment failed', 'error');
    } finally { setLoading(false); }
  };

  const FIELDS = [
    { key: 'privateFullName', label: 'Full Name *', w: 160 },
    { key: 'publicAge', label: 'Age', w: 60, type: 'number' },
    { key: 'publicGender', label: 'Gender', w: 90, select: ['', 'male', 'female'] },
    { key: 'privateGuardianName', label: 'Guardian', w: 130 },
    { key: 'privateGuardianPhone', label: 'Phone', w: 110 },
    { key: 'publicRegion', label: 'Region', w: 110 },
    { key: 'publicCity', label: 'City', w: 100 },
    { key: 'monthlyNeed', label: 'Need ($/mo)', w: 90, type: 'number' },
    { key: 'privateSchoolName', label: 'School', w: 130 },
    { key: 'privateMedicalNotes', label: 'Medical', w: 130 },
  ];

  return (
    <Modal title="👶 Bulk Child Registration" onClose={onClose} wide>
      <Select label="PROGRAM *" value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} wrapStyle={{ marginBottom: 16 }}>
        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>
      <div style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 32, padding: '6px 4px', fontSize: 11, color: C.muted, fontWeight: 700, textAlign: 'center', borderBottom: `2px solid ${C.border}` }}>#</th>
              {FIELDS.map(f => (
                <th key={f.key} style={{ padding: '6px 6px', fontSize: 11, color: C.muted, fontWeight: 700, textAlign: 'left', borderBottom: `2px solid ${C.border}`, minWidth: f.w, whiteSpace: 'nowrap' }}>{f.label}</th>
              ))}
              <th style={{ width: 40, borderBottom: `2px solid ${C.border}` }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                <td style={{ textAlign: 'center', fontSize: 11, color: C.muted, padding: '4px 4px' }}>{i + 1}</td>
                {FIELDS.map(f => (
                  <td key={f.key} style={{ padding: '4px 4px' }}>
                    {f.select ? (
                      <div style={{ display: 'flex', gap: 2 }}>
                        {f.select.filter(s => s !== '').map(s => (
                          <button key={s} type="button"
                            onClick={() => setRow(i, f.key, row[f.key] === s ? '' : s)}
                            style={{
                              flex: 1, padding: '4px 2px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              border: `1.5px solid ${row[f.key] === s ? C.primary : C.border}`,
                              background: row[f.key] === s ? C.primary : '#fff',
                              color: row[f.key] === s ? '#fff' : C.muted,
                            }}>
                            {s === 'male' ? '♂' : s === 'female' ? '♀' : s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input type={f.type || 'text'} value={row[f.key]} onChange={e => setRow(i, f.key, e.target.value)}
                        style={{ width: '100%', padding: '5px 6px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                        placeholder={f.key === 'privateFullName' ? 'Required' : ''} />
                    )}
                  </td>
                ))}
                <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)}
                      style={{ background: 'none', border: 'none', color: C.danger, fontSize: 16, cursor: 'pointer', padding: '2px 6px' }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <button onClick={addRow}
          style={{ padding: '7px 16px', borderRadius: 8, border: `1.5px dashed ${C.primary}`, background: '#EFF6FF', color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Add Row
        </button>
        <span style={{ fontSize: 12, color: C.muted }}>{rows.length} child{rows.length !== 1 ? 'ren' : ''} ready to enroll</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="success" onClick={handle} disabled={loading} style={{ flex: 2 }}>
          {loading ? 'Enrolling…' : `👶 Enroll ${rows.filter(r => r.privateFullName.trim().length >= 2).length || rows.length} Children`}
        </Btn>
      </div>
    </Modal>
  );
};

// ── Assign Donor to Beneficiaries Modal ───────────────────────────────────────
const AssignDonorModal = ({ beneficiaries, onClose, onDone, showToast }) => {
  const C = COLORS;
  const [users, setUsers] = useState([]);
  const [selectedBens, setSelectedBens] = useState([]);
  const [donorId, setDonorId] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [commitmentMonths, setCommitmentMonths] = useState('12');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    adminApi.users().then(u => setUsers(Array.isArray(u) ? u : [])).catch(() => {}).finally(() => setLoadingUsers(false));
  }, []);

  const donors = users.filter(u => ['donor', 'reporter'].includes(u.role));
  const filteredBens = beneficiaries.filter(b =>
    !search || (b.privateFullName || '').toLowerCase().includes(search.toLowerCase()) || (b.publicId || '').toLowerCase().includes(search.toLowerCase())
  );
  const toggleBen = (id) => setSelectedBens(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handle = async () => {
    if (!donorId) { showToast('Select a donor', 'error'); return; }
    if (!selectedBens.length) { showToast('Select at least one beneficiary', 'error'); return; }
    if (!monthlyAmount || parseFloat(monthlyAmount) <= 0) { showToast('Enter monthly amount', 'error'); return; }
    setLoading(true);
    try {
      const months = Math.max(12, parseInt(commitmentMonths) || 12);
      const res = await programsApi.assignDonor({ donorId, beneficiaryIds: selectedBens, monthlyAmount: parseFloat(monthlyAmount), paymentMethod, commitmentMonths: months });
      showToast(`✅ Donor assigned to ${res.count || selectedBens.length} beneficiar${selectedBens.length > 1 ? 'ies' : 'y'}!`);
      onDone();
      onClose();
    } catch (e) {
      showToast(e.message || 'Assignment failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="🤝 Assign Donor to Beneficiaries" onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%),1fr))', gap: 14, marginBottom: 16 }}>
        <div>
          {loadingUsers
            ? <div style={{ color: C.muted, fontSize: 13, padding: '10px 0' }}>Loading users…</div>
            : <Select label="DONOR *" value={donorId} onChange={e => setDonorId(e.target.value)}>
                <option value=''>— Select donor —</option>
                {donors.map(u => <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>)}
              </Select>
          }
        </div>
        <div>
          <Input label="MONTHLY AMOUNT (USD) *" type="number" value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)} placeholder="e.g. 50" />
        </div>
        <div>
          <Select label="PAYMENT METHOD" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money (EVC+)</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
          </Select>
        </div>
        <div>
          <Input label="CONTRACT LENGTH (months, min 12)" type="number" min="12" max="120" value={commitmentMonths} onChange={e => setCommitmentMonths(e.target.value)} placeholder="12" />
        </div>
      </div>
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1E40AF' }}>
        📋 <strong>Minimum contract: 12 months.</strong> The contract is <strong>{Math.max(12, parseInt(commitmentMonths)||12)} months</strong> — expires {new Date(Date.now() + Math.max(12, parseInt(commitmentMonths)||12) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}. Donor will receive a renewal reminder 30 days before expiry.
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>SELECT BENEFICIARIES ({selectedBens.length} selected)</label>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID…"
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
        <div style={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
          {filteredBens.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>No beneficiaries found</div>
          ) : filteredBens.map(b => (
            <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, background: selectedBens.includes(b.id) ? '#EFF6FF' : '#fff' }}>
              <input type="checkbox" checked={selectedBens.includes(b.id)} onChange={() => toggleBen(b.id)} style={{ accentColor: C.primary }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{b.privateFullName || 'Beneficiary'}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{b.publicId} · {b.publicCity || '—'} · ${b.monthlyNeed || 0}/mo · {(b.status || '').replace(/_/g,' ')}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={handle} disabled={loading} style={{ flex: 2 }}>
          {loading ? 'Assigning…' : `🤝 Assign Donor to ${selectedBens.length || '?'} Beneficiar${selectedBens.length !== 1 ? 'ies' : 'y'}`}
        </Btn>
      </div>
    </Modal>
  );
};

// ── Per-child Monthly Report Modal ────────────────────────────────────────────
const ChildMonthlyReportModal = ({ beneficiary, onClose, showToast }) => {
  const C = COLORS;
  const now = new Date();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const [form, setForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear(), schoolAttendance: '', healthStatus: 'good', progressNotes: '', needsAssessment: '', deliveries: [], photoUrl: '' });
  const [newDelivery, setNewDelivery] = useState('');
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    programsApi.getUpdates(beneficiary.id).then(d => setReports(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoadingReports(false));
  }, [beneficiary.id]);

  const addDelivery = () => { if (!newDelivery.trim()) return; setF('deliveries', [...form.deliveries, newDelivery.trim()]); setNewDelivery(''); };
  const removeDelivery = (i) => setF('deliveries', form.deliveries.filter((_, idx) => idx !== i));

  const handle = async () => {
    setLoading(true);
    try {
      await programsApi.submitUpdate(beneficiary.id, {
        month: parseInt(form.month), year: parseInt(form.year),
        schoolAttendance: form.schoolAttendance ? parseFloat(form.schoolAttendance) : undefined,
        healthStatus: form.healthStatus, progressNotes: form.progressNotes, needsAssessment: form.needsAssessment,
        deliveriesMade: JSON.stringify(form.deliveries),
        photoUrls: form.photoUrl ? JSON.stringify([form.photoUrl]) : undefined,
      });
      showToast('✅ Monthly report submitted!');
      programsApi.getUpdates(beneficiary.id).then(d => setReports(Array.isArray(d) ? d : [])).catch(() => {});
      setForm(f => ({ ...f, progressNotes: '', needsAssessment: '', deliveries: [], photoUrl: '', schoolAttendance: '' }));
    } catch (e) {
      showToast(e.message || 'Failed to submit report', 'error');
    } finally { setLoading(false); }
  };

  const HEALTH_COLOR = { good: '#16A34A', fair: '#D97706', poor: '#DC2626', critical: '#7C3AED' };

  return (
    <Modal title={`📊 Monthly Report — ${beneficiary.privateFullName || beneficiary.publicId}`} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px,100%),1fr))', gap: 12, marginBottom: 14 }}>
        <Select label="MONTH" value={form.month} onChange={e => setF('month', e.target.value)}>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </Select>
        <Input label="YEAR" type="number" value={form.year} onChange={e => setF('year', e.target.value)} />
        <Input label="SCHOOL ATTENDANCE (%)" type="number" min="0" max="100" value={form.schoolAttendance} onChange={e => setF('schoolAttendance', e.target.value)} placeholder="e.g. 90" />
        <Select label="HEALTH STATUS" value={form.healthStatus} onChange={e => setF('healthStatus', e.target.value)}>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
          <option value="critical">Critical</option>
        </Select>
      </div>
      <Textarea label="PROGRESS NOTES" value={form.progressNotes} onChange={e => setF('progressNotes', e.target.value)} rows={3} placeholder="Describe the child's progress this month…" />
      <Textarea label="NEEDS ASSESSMENT" value={form.needsAssessment} onChange={e => setF('needsAssessment', e.target.value)} rows={2} placeholder="Any new or ongoing needs…" />
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>DELIVERIES MADE</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={newDelivery} onChange={e => setNewDelivery(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDelivery()} placeholder="e.g. School supplies · Press Enter to add"
            style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
          <button onClick={addDelivery} style={{ padding: '7px 14px', borderRadius: 8, background: C.primary, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {form.deliveries.map((d, i) => (
            <span key={i} style={{ background: '#EFF6FF', color: C.primary, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              {d}
              <button onClick={() => removeDelivery(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
            </span>
          ))}
        </div>
      </div>
      <Input label="PHOTO URL (optional)" value={form.photoUrl} onChange={e => setF('photoUrl', e.target.value)} placeholder="https://…" />
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={handle} disabled={loading} style={{ flex: 2 }}>
          {loading ? 'Submitting…' : '📊 Submit Monthly Report'}
        </Btn>
      </div>

      {/* Previous reports list */}
      {loadingReports ? (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 12 }}>Loading previous reports…</div>
      ) : reports.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📋 Previous Reports ({reports.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map(r => (
              <div key={r.id} style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{MONTHS[(r.month || 1) - 1]} {r.year}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: HEALTH_COLOR[r.healthStatus] || C.muted }}>
                    {r.healthStatus ? r.healthStatus.charAt(0).toUpperCase() + r.healthStatus.slice(1) : '—'}
                  </span>
                </div>
                {r.schoolAttendance != null && <div style={{ fontSize: 12, color: C.muted }}>🎓 School attendance: <b>{r.schoolAttendance}%</b></div>}
                {r.progressNotes && <div style={{ fontSize: 12, marginTop: 4 }}>{r.progressNotes}</div>}
                {r.isPublished && <span style={{ fontSize: 10, background: '#DCFCE7', color: '#166534', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>Published to Sponsor</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Create Community Project Modal ────────────────────────────────────────────
const CreateProjectModal = ({ onClose, onDone, showToast }) => {
  const [form, setForm] = useState({ title: "", description: "", category: "water", location: "", region: "", populationSize: "", problemDesc: "", solutionDesc: "", fundingGoal: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (!form.title || !form.description || !form.fundingGoal) return;
    setLoading(true);
    try {
      await projectsApi.create({ ...form, populationSize: form.populationSize ? parseInt(form.populationSize) : undefined, fundingGoal: parseFloat(form.fundingGoal) });
      showToast("✅ Community project created!");
      onDone();
      onClose();
    } catch (e) {
      showToast(e.message || "Failed", "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="🏗️ Create Community Project" onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 20 }}>
        <div>
          <Select label="Category *" value={form.category} onChange={e => set("category", e.target.value)}>
            {Object.entries(PROJECT_CAT_LABELS).map(([v,l]) => <option key={v} value={v}>{l.icon} {l.label}</option>)}
          </Select>
          <Input label="Project Title *" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Solar Water Well — Daryeel Village" />
          <Input label="Location *" value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Daryeel Village" />
          <Input label="Region *" value={form.region} onChange={e => set("region", e.target.value)} placeholder="e.g. Lower Shabelle" />
          <Input label="Population Size" type="number" value={form.populationSize} onChange={e => set("populationSize", e.target.value)} placeholder="People who will benefit" />
          <Input label="Funding Goal (USD) *" type="number" value={form.fundingGoal} onChange={e => set("fundingGoal", e.target.value)} placeholder="e.g. 12000" />
        </div>
        <div>
          <Textarea label="Description *" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the project…" style={{ minHeight: 80 }} />
          <Textarea label="Problem Description *" value={form.problemDesc} onChange={e => set("problemDesc", e.target.value)} placeholder="What problem does this solve?" />
          <Textarea label="Solution Description *" value={form.solutionDesc} onChange={e => set("solutionDesc", e.target.value)} placeholder="How will this project solve it?" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="teal" onClick={handle} disabled={loading} style={{ flex: 2 }}>
          {loading ? "Creating…" : "🏗️ Create Project"}
        </Btn>
      </div>
    </Modal>
  );
};

// ── Programs Dashboard (admin / program_manager) ───────────────────────────────
const ProgramsDashboard = ({ currentUser, showToast, adminPaymentsApi }) => {
  const [tab, setTab] = useState("overview");
  const [programs, setPrograms] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showCreateProg, setShowCreateProg] = useState(false);
  const [showCreateProj, setShowCreateProj] = useState(false);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [showAssignDonor, setShowAssignDonor] = useState(false);
  const [reportChild, setReportChild] = useState(null);
  const [updateTarget, setUpdateTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loadingPay, setLoadingPay] = useState(false);
  const [docSettings, setDocSettings] = useState(null);
  const [docSaving, setDocSaving] = useState(false);
  const [docEdited, setDocEdited] = useState({});

  const isAdmin = ["super_admin","admin","verification_office","program_manager"].includes(currentUser?.role || "");
  const isSuperAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const load = () => {
    setLoading(true);
    Promise.all([
      programsApi.list().catch(() => []),
      programsApi.beneficiariesAdmin({}).catch(() => []),
      projectsApi.list({ limit: "50" }).catch(() => ({ projects: [] })),
    ]).then(([progs, bens, projs]) => {
      setPrograms(Array.isArray(progs) ? progs : []);
      setBeneficiaries(Array.isArray(bens) ? bens : []);
      setProjects(projs.projects || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "payments") loadPendingPayments(); }, [tab]);
  useEffect(() => {
    if (tab === "documents" && !docSettings) {
      settingsApi.all().then(d => { setDocSettings(d.settings || {}); setDocEdited(d.settings || {}); }).catch(() => {});
    }
  }, [tab]);

  const loadPendingPayments = () => {
    if (!adminPaymentsApi) return;
    setLoadingPay(true);
    programsApi.adminPayments()
      .then(d => setPendingPayments(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingPay(false));
  };

  const confirmSponsorPayment = async (paymentId) => {
    try {
      await programsApi.confirmPayment(paymentId);
      showToast("✅ Payment confirmed — sponsor's total updated.");
      loadPendingPayments();
    } catch { showToast("Failed to confirm payment", "error"); }
  };

  const handleVerify = async (id, status) => {
    try {
      await programsApi.verifyBeneficiary(id, { status });
      showToast(`✅ Beneficiary status updated to: ${status}`);
      load();
    } catch (e) {
      showToast(e.message || "Failed to update", "error");
    }
  };

  const handleEndSponsorship = async (sponsorshipId, reason) => {
    if (!window.confirm("End this sponsorship? The child will return to 'Seeking Sponsor' status and the donor will be notified.")) return;
    try {
      await programsApi.endSponsorship(sponsorshipId, reason);
      showToast("✅ Sponsorship ended — child is now seeking a new sponsor");
      load();
    } catch (e) {
      showToast(e.message || "Failed to end sponsorship", "error");
    }
  };

  const filteredBens = filterStatus
    ? beneficiaries.filter(b => filterStatus === "under_sponsor" ? (b.status === "under_sponsor" || b.status === "sponsored") : b.status === filterStatus)
    : beneficiaries;

  const TABS = [
    { id: "overview",      label: "📊 Overview" },
    { id: "beneficiaries", label: `👶 Beneficiaries (${beneficiaries.length})` },
    { id: "projects",      label: `🏗️ Community Projects (${projects.length})` },
    { id: "payments",      label: `💳 Sponsor Payments${pendingPayments.length > 0 ? ` (${pendingPayments.length} pending)` : ""}` },
    { id: "documents",     label: "📄 Documents" },
  ];

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: COLORS.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
      Loading Programs Engine…
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>🌱 Humanitarian Programs Engine</h2>
          <p style={{ margin: 0, color: COLORS.muted }}>Long-term beneficiary management — Child Sponsorship, Education, Medical, Family Care</p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" size="sm" onClick={() => setShowCreateProg(true)}>+ Program</Btn>
            <Btn variant="success" size="sm" onClick={() => programs.length > 0 ? setShowEnroll(true) : showToast("Create a program first", "error")}>👶 Enroll</Btn>
            <Btn variant="outline" size="sm" onClick={() => programs.length > 0 ? setShowBulkEnroll(true) : showToast("Create a program first", "error")}>📋 Bulk Register</Btn>
            <Btn variant="primary" size="sm" onClick={() => beneficiaries.length > 0 ? setShowAssignDonor(true) : showToast("Enroll beneficiaries first", "error")}>🤝 Assign Donor</Btn>
            <Btn variant="teal" size="sm" onClick={() => setShowCreateProj(true)}>🏗️ Project</Btn>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Programs"         value={programs.length}                                           icon="🌱" color={COLORS.secondary} />
        <StatCard label="Beneficiaries"    value={beneficiaries.length}                                      icon="👶" color="#EC4899" />
        <StatCard label="Seeking Sponsor"  value={beneficiaries.filter(b=>b.status==="seeking_sponsor").length} icon="🤝" color={COLORS.accent} />
        <StatCard label="Under Sponsor"    value={beneficiaries.filter(b=>b.status==="under_sponsor"||b.status==="sponsored").length} icon="❤️" color={COLORS.primary} />
        <StatCard label="Projects"         value={projects.length}                                            icon="🏗️" color={COLORS.teal} />
        <StatCard label="Pending Payments" value={pendingPayments.length}                                     icon="💳" color="#F59E0B" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700, border: "none", background: "none", cursor: "pointer", color: tab === t.id ? COLORS.primary : COLORS.muted, borderBottom: tab === t.id ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === "overview" && (
        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 800 }}>Active Programs</h3>
          {programs.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
              <div>No programs yet. Create your first program to get started.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 16, marginBottom: 32 }}>
              {programs.map(p => {
                const t = PROGRAM_TYPE_LABELS[p.type] || { icon: "🌱", color: COLORS.primary };
                return (
                  <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px #0001", borderLeft: `4px solid ${t.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontSize: 28 }}>{p.icon || t.icon}</div>
                      <span style={{ background: t.color + "15", color: t.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                        {p._count?.beneficiaries || 0} enrolled
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
                    <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 12px", lineHeight: 1.5 }}>{p.description?.slice(0, 100)}{p.description?.length > 100 ? "…" : ""}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Two engines explainer */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 16 }}>
            <div style={{ background: "#FEF2F2", borderRadius: 16, padding: 20, border: "1px solid #FECACA" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🚨</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.danger, marginBottom: 6 }}>Emergency Response</div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.7 }}>Report → Verify → Sponsor → Deliver → Close.<br />One-time emergency cases managed in the main dashboard.</div>
            </div>
            <div style={{ background: "#F0FDF4", borderRadius: 16, padding: 20, border: "1px solid #BBF7D0" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🌱</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.secondary, marginBottom: 6 }}>Long-Term Programs</div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.7 }}>Enroll → Verify → Sponsor Match → Monthly Updates → Graduation.<br />Continuous care for children, students, patients, and families.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Beneficiaries tab ── */}
      {tab === "beneficiaries" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { key: "",                 label: `All (${beneficiaries.length})` },
              { key: "pending_verification", label: `Pending (${beneficiaries.filter(b=>b.status==="pending_verification").length})` },
              { key: "verified",         label: `Verified (${beneficiaries.filter(b=>b.status==="verified").length})` },
              { key: "seeking_sponsor",  label: `🤝 Seeking Sponsor (${beneficiaries.filter(b=>b.status==="seeking_sponsor").length})` },
              { key: "under_sponsor",    label: `❤️ Under Sponsor (${beneficiaries.filter(b=>b.status==="under_sponsor"||b.status==="sponsored").length})` },
              { key: "completed",        label: `Completed (${beneficiaries.filter(b=>b.status==="completed").length})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilterStatus(key)}
                style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filterStatus === key ? COLORS.primary : COLORS.border}`, background: filterStatus === key ? COLORS.primary : "#fff", color: filterStatus === key ? "#fff" : COLORS.muted, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>

          {filteredBens.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>👶</div>
              {beneficiaries.length === 0 ? "No beneficiaries enrolled yet." : "No beneficiaries with this status."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredBens.map(b => {
                const pt = PROGRAM_TYPE_LABELS[b.programType] || { icon: "👤", color: COLORS.primary };
                const activeSponsor = b.sponsorships?.[0];
                return (
                  <div key={b.id} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px #0001", border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: pt.color, background: pt.color + "12", borderRadius: 20, padding: "2px 10px" }}>{pt.icon} {b.publicId}</span>
                          <BeneficiaryStatusBadge status={b.status} />
                          <span style={{ fontSize: 11, color: COLORS.muted, background: "#F3F4F6", borderRadius: 20, padding: "2px 8px" }}>{pt.label}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{b.privateFullName || "Beneficiary"}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                          📍 {b.publicCity || "—"}{b.publicRegion ? `, ${b.publicRegion}` : ""} · {b.publicAge ? `${b.publicAge} yrs` : ""} {b.publicGender ? `· ${b.publicGender}` : ""}
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                          Program: <strong>{b.program?.name || "—"}</strong> · Monthly need: <strong style={{ color: COLORS.secondary }}>${b.monthlyNeed}/mo</strong>
                        </div>
                        {activeSponsor && (
                          <div style={{ marginTop: 4, background: "#ECFDF5", borderRadius: 8, padding: "6px 10px" }}>
                            <div style={{ fontSize: 12, color: "#065F46", fontWeight: 700 }}>
                              ❤️ Sponsored by: {activeSponsor.sponsor?.name || activeSponsor.sponsor?.email || activeSponsor.sponsorId}
                            </div>
                            <div style={{ fontSize: 11, color: "#065F46" }}>
                              ${activeSponsor.monthlyAmount}/mo · {activeSponsor.monthsCompleted} month{activeSponsor.monthsCompleted !== 1 ? 's' : ''} completed
                              {activeSponsor.endDate && ` · Ends ${new Date(activeSponsor.endDate).toLocaleDateString()}`}
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                          {b._count?.monthlyUpdates || 0} monthly updates · Enrolled {new Date(b.enrolledAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignSelf: "flex-start" }}>
                        {isAdmin && b.status === "pending_verification" && <>
                          <Btn variant="success" size="sm" onClick={() => handleVerify(b.id, "seeking_sponsor")}>✅ Verify & Publish</Btn>
                          <Btn variant="danger" size="sm" onClick={() => handleVerify(b.id, "on_hold")}>⏸ Hold</Btn>
                        </>}
                        {isAdmin && b.status === "verified" && (
                          <Btn variant="primary" size="sm" onClick={() => handleVerify(b.id, "seeking_sponsor")}>🤝 Seek Sponsor</Btn>
                        )}
                        {isAdmin && (
                          <Btn variant="outline" size="sm" onClick={() => setReportChild(b)}>📊 Report</Btn>
                        )}
                        {["field_team","program_manager"].some(r => r === currentUser?.role) && (b.status === "sponsored" || b.status === "under_sponsor") && (
                          <Btn variant="purple" size="sm" onClick={() => setUpdateTarget(b)}>📊 Monthly Update</Btn>
                        )}
                        {(b.status === "sponsored" || b.status === "under_sponsor") && isAdmin && (
                          <Btn variant="purple" size="sm" onClick={() => setUpdateTarget(b)}>📊 Submit Update</Btn>
                        )}
                        {isAdmin && (b.status === "sponsored" || b.status === "under_sponsor") && activeSponsor && (
                          <Btn variant="success" size="sm" onClick={async () => {
                            const now = new Date();
                            try {
                              const r = await programsApi.markPaid(activeSponsor.id, { month: now.getMonth()+1, year: now.getFullYear() });
                              showToast(`✅ Payment marked — Receipt ${r.receiptNo}`);
                              load();
                            } catch (e) { showToast(e.message || "Failed to mark payment", "error"); }
                          }}>✅ Mark Paid</Btn>
                        )}
                        {isAdmin && (b.status === "sponsored" || b.status === "under_sponsor") && activeSponsor && (
                          <Btn variant="primary" size="sm" onClick={async () => {
                            if (!window.confirm("Renew this sponsorship contract for another 12 months?")) return;
                            try {
                              await programsApi.renewContract(activeSponsor.id, { months: 12 });
                              showToast("✅ Contract renewed for 12 more months — donor notified");
                              load();
                            } catch (e) { showToast(e.message || "Failed to renew", "error"); }
                          }}>🔄 Renew Contract</Btn>
                        )}
                        {isAdmin && (b.status === "sponsored" || b.status === "under_sponsor") && (
                          <Btn variant="muted" size="sm" onClick={() => handleVerify(b.id, "completed")}>🏁 Complete</Btn>
                        )}
                        {isAdmin && activeSponsor && (
                          <Btn variant="danger" size="sm" onClick={() => handleEndSponsorship(activeSponsor.id, "")}>🔚 End Sponsorship</Btn>
                        )}
                        {isAdmin && (b.status === "sponsored" || b.status === "under_sponsor" || b.status === "seeking_sponsor") && (
                          <Btn variant="outline" size="sm" style={{ borderColor:"#DC2626", color:"#DC2626" }} onClick={async () => {
                            if (!window.confirm("Move this beneficiary back to Seeking Sponsor? All active sponsorships will be ended.")) return;
                            try {
                              await programsApi.releaseToSeeking(b.id);
                              showToast("✅ Beneficiary released — now seeking a new sponsor");
                              load();
                            } catch (e) { showToast(e.message || "Failed to release", "error"); }
                          }}>🔓 Release</Btn>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Projects tab ── */}
      {tab === "projects" && (
        <div>
          {projects.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏗️</div>
              No community projects yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {projects.map(p => {
                const cat = PROJECT_CAT_LABELS[p.category] || { icon: "🌍", label: p.category };
                const pct = p.fundingGoal > 0 ? Math.min(100, Math.round((p.totalRaised / p.fundingGoal) * 100)) : 0;
                const statusColors = { seeking_funding: "#F59E0B", funded: "#10B981", in_progress: "#3B82F6", completed: "#5A6E8A" };
                return (
                  <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px #0001", border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.teal, background: COLORS.teal + "12", borderRadius: 20, padding: "2px 10px" }}>{cat.icon} {p.publicId}</span>
                          <span style={{ background: (statusColors[p.status] || COLORS.muted) + "20", color: statusColors[p.status] || COLORS.muted, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                            {p.status.replace(/_/g," ").toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>📍 {p.location}, {p.region} · {p.populationSize ? `${p.populationSize.toLocaleString()} people` : ""}</div>
                        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ background: COLORS.border, borderRadius: 20, height: 6, flex: 1, overflow: "hidden" }}>
                            <div style={{ background: pct >= 100 ? COLORS.secondary : COLORS.primary, width: `${pct}%`, height: "100%", borderRadius: 20 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>{pct}%</span>
                          <span style={{ fontSize: 12, color: COLORS.muted }}>${p.totalRaised.toLocaleString()} / ${p.fundingGoal.toLocaleString()}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                          {p.status === "seeking_funding" && pct >= 100 && (
                            <Btn variant="success" size="sm" onClick={async () => { await projectsApi.updateStatus(p.id, { status: "funded" }); load(); showToast("✅ Project marked as funded!"); }}>Mark Funded</Btn>
                          )}
                          {p.status === "funded" && (
                            <Btn variant="teal" size="sm" onClick={async () => { await projectsApi.updateStatus(p.id, { status: "in_progress" }); load(); showToast("🔨 Project started!"); }}>Start Project</Btn>
                          )}
                          {p.status === "in_progress" && (
                            <Btn variant="primary" size="sm" onClick={async () => { await projectsApi.updateStatus(p.id, { status: "completed" }); load(); showToast("🏁 Project completed!"); }}>Mark Complete</Btn>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SPONSOR PAYMENTS tab ── */}
      {tab === "payments" && (() => {
        if (!isAdmin) return null;
        if (loadingPay) return <div style={{ textAlign:"center", padding:40, color:COLORS.muted }}>Loading payments…</div>;
        return (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
              <div style={{ fontWeight:800, fontSize:16 }}>💳 Pending Sponsorship Payments</div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn size="sm" variant="primary" onClick={async () => {
                  try {
                    const r = await programsApi.sendReminders({ daysAhead: 5 });
                    showToast(`✅ ${r.message}`);
                  } catch { showToast("Failed to send reminders", "error"); }
                }}>📬 Send Invoice Reminders (5 days)</Btn>
                <Btn size="sm" variant="outline" onClick={loadPendingPayments}>🔄 Refresh</Btn>
              </div>
            </div>
            <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#1E40AF" }}>
              💡 <strong>Auto-reminder:</strong> Donors are automatically notified 5 days before their monthly payment is due (daily at 8 AM). Use the button above to send manually at any time.
            </div>
            {pendingPayments.length === 0 ? (
              <div style={{ textAlign:"center", padding:40, color:COLORS.muted, background:"#fff", borderRadius:16, boxShadow:"0 2px 8px #0001" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                <div style={{ fontWeight:700 }}>No pending payments</div>
                <div style={{ fontSize:13, marginTop:4 }}>All sponsorship payments have been confirmed.</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {pendingPayments.map(p => {
                  const sp  = p.sponsorship;
                  const ben = sp?.beneficiary;
                  const donor = sp?.sponsor;
                  return (
                    <div key={p.id} style={{ background:"#fff", borderRadius:12, padding:"16px 20px", border:`1px solid ${COLORS.border}`, boxShadow:"0 1px 4px #0001" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:15 }}>{donor?.name || "Sponsor"}</div>
                          <div style={{ fontSize:12, color:COLORS.muted }}>{donor?.email} · {donor?.phone}</div>
                          <div style={{ fontSize:13, marginTop:6 }}>
                            Program: <b>{ben?.program?.name}</b> · Beneficiary: <b>{ben?.publicId}</b>
                          </div>
                          <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>
                            {ben?.programType?.replace(/_/g," ")} · {ben?.beneficiary?.publicRegion || "Somalia"}
                          </div>
                          <div style={{ fontSize:11, color:COLORS.muted, marginTop:4 }}>
                            Submitted: {new Date(p.createdAt).toLocaleString()} · Month {p.month}/{p.year}
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:22, fontWeight:900, color:COLORS.primary }}>${(p.amount||0).toLocaleString()}</div>
                          <div style={{ fontSize:11, color:COLORS.muted }}>{p.currency || "USD"}</div>
                          <span style={{ background:"#FEF3C7", color:"#92400E", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, display:"inline-block", marginTop:4 }}>⏳ Pending</span>
                        </div>
                      </div>
                      <div style={{ marginTop:14, display:"flex", gap:8, flexWrap:"wrap" }}>
                        <Btn variant="success" size="sm" onClick={() => confirmSponsorPayment(p.id)}>✅ Confirm Payment Received</Btn>
                        <Btn variant="outline" size="sm" onClick={async () => {
                          try {
                            const r = await programsApi.sendReminders({ sponsorshipId: sp?.id });
                            showToast(`✅ ${r.message}`);
                          } catch { showToast("Failed to send reminder", "error"); }
                        }}>📬 Send Invoice to Donor</Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── DOCUMENTS TAB ── */}
      {tab === "documents" && (() => {
        if (!isSuperAdmin) return <div style={{ textAlign:"center", padding:40, color:COLORS.muted }}>Only admins can edit document templates.</div>;
        if (!docSettings) return <div style={{ textAlign:"center", padding:40, color:COLORS.muted }}>Loading templates…</div>;

        const C = COLORS;
        const save = async () => {
          setDocSaving(true);
          try {
            await settingsApi.update(docEdited);
            setDocSettings({ ...docEdited });
            // Sync invoice fields to localStorage so donor-side invoice modal stays consistent
            const invoiceKeys = ["orgName","orgSub","orgCountry","description","bankName","bankIBAN","bankBIC","mobileNumber","mobileName","footerMsg"];
            const lsInvoice = invoiceKeys.reduce((acc, k) => ({ ...acc, [k]: docEdited[`invoice.${k}`] ?? acc[k] }), {});
            localStorage.setItem("kf_invoice_settings", JSON.stringify(lsInvoice));
            showToast("✅ Templates saved successfully");
          } catch (e) { showToast(e.message || "Save failed", "error"); }
          finally { setDocSaving(false); }
        };
        const reset = async (key) => {
          try {
            const r = await settingsApi.reset(key);
            const updated = { ...docEdited, [key]: r.defaultValue };
            setDocEdited(updated);
            setDocSettings(updated);
            showToast("↺ Reset to default");
          } catch (e) { showToast("Reset failed", "error"); }
        };
        const changed = JSON.stringify(docEdited) !== JSON.stringify(docSettings);

        const DocSection = ({ title, desc, fields }) => (
          <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:15 }}>{title}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{desc}</div>
              </div>
            </div>
            {fields.map(({ key, label, multiline, vars }) => (
              <div key={key} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.muted }}>{label}</div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {vars && <div style={{ fontSize:10, color:C.muted }}>vars: {vars.join(", ")}</div>}
                    <button onClick={() => reset(key)} style={{ fontSize:10, color:C.muted, background:"none", border:"none", cursor:"pointer", padding:"0 4px" }}>↺ reset</button>
                  </div>
                </div>
                {multiline ? (
                  <textarea value={docEdited[key] ?? ""} rows={5}
                    onChange={e => setDocEdited(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1.5px solid ${docEdited[key] !== docSettings[key] ? C.primary : C.border}`, fontSize:12, fontFamily:"monospace", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }} />
                ) : (
                  <input value={docEdited[key] ?? ""} onChange={e => setDocEdited(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1.5px solid ${docEdited[key] !== docSettings[key] ? C.primary : C.border}`, fontSize:13, boxSizing:"border-box" }} />
                )}
              </div>
            ))}
          </div>
        );

        return (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:18 }}>📄 Document Templates</div>
                <div style={{ fontSize:13, color:COLORS.muted, marginTop:2 }}>Edit all letters, invoices, receipts and notification messages sent to donors</div>
              </div>
              <Btn variant="primary" onClick={save} disabled={!changed || docSaving}>
                {docSaving ? "Saving…" : changed ? "💾 Save All Changes" : "✅ All Saved"}
              </Btn>
            </div>

            <DocSection
              title="🧾 Invoice Letter"
              desc="Shown to donors when they click 'Invoice Letter' and used in the printed PDF"
              fields={[
                { key:"invoice.orgName",     label:"Organization Name" },
                { key:"invoice.orgSub",      label:"Subtitle" },
                { key:"invoice.orgCountry",  label:"City · Website" },
                { key:"invoice.description", label:"Line-Item Description" },
                { key:"invoice.bankName",    label:"Bank Account Name" },
                { key:"invoice.bankIBAN",    label:"IBAN" },
                { key:"invoice.bankBIC",     label:"BIC / SWIFT" },
                { key:"invoice.mobileNumber",label:"Mobile Money Number" },
                { key:"invoice.mobileName",  label:"Mobile Money Name" },
                { key:"invoice.footerMsg",   label:"Footer Message", multiline:true },
              ]}
            />

            <DocSection
              title="✅ Payment Receipt"
              desc="Sent to the donor as a notification when an admin clicks 'Mark Paid'"
              fields={[
                { key:"receipt.title", label:"Notification Title" },
                { key:"receipt.body",  label:"Message Body", multiline:true,
                  vars:["{donorName}","{amount}","{currency}","{childId}","{childName}","{region}","{receiptNo}","{month}","{year}"] },
              ]}
            />

            <DocSection
              title="📋 Payment Reminder (auto, 5 days before due)"
              desc="Sent automatically by the daily cron job when a payment is 5 days away"
              fields={[
                { key:"reminder.title", label:"Notification Title" },
                { key:"reminder.body",  label:"Message Body", multiline:true, vars:["{total}","{children}"] },
              ]}
            />

            <DocSection
              title="📬 Invoice Reminder (manual trigger)"
              desc="Sent when an admin clicks 'Send Invoice Reminders' from the Payments tab"
              fields={[
                { key:"invoiceReminder.title", label:"Notification Title" },
                { key:"invoiceReminder.body",  label:"Message Body", multiline:true,
                  vars:["{donorName}","{amount}","{childId}","{dueDate}"] },
              ]}
            />

            <DocSection
              title="🔄 Contract Renewal Reminder (auto, 30 days before end)"
              desc="Sent automatically by the daily cron job when a sponsorship contract is 30 days from expiry"
              fields={[
                { key:"renewal.title", label:"Notification Title" },
                { key:"renewal.body",  label:"Message Body", multiline:true,
                  vars:["{donorName}","{childName}","{endDate}"] },
              ]}
            />

            {changed && (
              <div style={{ position:"sticky", bottom:16, textAlign:"center" }}>
                <Btn variant="primary" onClick={save} disabled={docSaving} style={{ padding:"12px 40px", fontSize:15, boxShadow:"0 4px 20px rgba(0,75,150,0.3)" }}>
                  {docSaving ? "Saving…" : "💾 Save All Changes"}
                </Btn>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modals */}
      {showEnroll && <EnrollBeneficiaryModal programs={programs} onClose={() => setShowEnroll(false)} onDone={load} showToast={showToast} />}
      {showBulkEnroll && <BulkChildEnrollModal programs={programs} onClose={() => setShowBulkEnroll(false)} onDone={load} showToast={showToast} />}
      {showAssignDonor && <AssignDonorModal beneficiaries={beneficiaries} onClose={() => setShowAssignDonor(false)} onDone={load} showToast={showToast} />}
      {reportChild && <ChildMonthlyReportModal beneficiary={reportChild} onClose={() => setReportChild(null)} showToast={showToast} />}
      {showCreateProg && <CreateProgramModal onClose={() => setShowCreateProg(false)} onDone={load} showToast={showToast} />}
      {showCreateProj && <CreateProjectModal onClose={() => setShowCreateProj(false)} onDone={load} showToast={showToast} />}
      {updateTarget && <MonthlyUpdateModal beneficiary={updateTarget} onClose={() => setUpdateTarget(null)} showToast={showToast} />}
    </div>
  );
};

// ── Program Manager Dashboard ──────────────────────────────────────────────────
const ProgramManagerDashboard = ({ currentUser, showToast }) => {
  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>🌱 Program Manager Dashboard</h2>
      <p style={{ margin: "0 0 24px", color: COLORS.muted }}>Welcome, {currentUser.fullname} — manage long-term beneficiaries and monthly updates</p>
      <ProgramsDashboard currentUser={currentUser} showToast={showToast} />
    </div>
  );
};

const ProjectManagerDashboard = ({ currentUser, showToast }) => {
  const C = COLORS;
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const load = () => {
    setLoading(true);
    projectsApi.list({ limit: "100" })
      .then(d => setProjects(d?.projects ?? (Array.isArray(d) ? d : [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = filterStatus ? projects.filter(p => p.status === filterStatus) : projects;

  const STATUS_LABELS = {
    seeking_funding: { label: "Seeking Funding", color: "#F59E0B", bg: "#FEF3C7" },
    funded:          { label: "Funded",           color: "#3B82F6", bg: "#DBEAFE" },
    in_progress:     { label: "In Progress",      color: "#8B5CF6", bg: "#EDE9FE" },
    completed:       { label: "Completed",         color: "#10B981", bg: "#D1FAE5" },
  };
  const CAT_ICONS = { water:"💧", school:"🏫", health:"🏥", agriculture:"🌾", shelter:"🏠", energy:"⚡" };

  const totalGoal   = projects.reduce((a, p) => a + (p.fundingGoal  || 0), 0);
  const totalRaised = projects.reduce((a, p) => a + (p.totalRaised   || 0), 0);
  const active      = projects.filter(p => p.status === "in_progress").length;
  const seeking     = projects.filter(p => p.status === "seeking_funding").length;

  const updateProjectStatus = async (projId, status) => {
    try {
      await projectsApi.updateStatus(projId, { status });
      showToast(`✅ Project status updated to "${STATUS_LABELS[status]?.label || status}"`);
      load();
    } catch { showToast("Failed to update status", "error"); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:24, fontWeight:800 }}>🏗️ Project Manager</h2>
          <p style={{ margin:0, color:C.muted }}>Welcome, {currentUser.fullname} — create and manage community infrastructure projects</p>
        </div>
        <Btn variant="primary" onClick={() => setShowCreate(true)}>+ New Project</Btn>
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
        <StatCard icon="🏗️" label="Total Projects"    value={projects.length}                  color={C.primary}   />
        <StatCard icon="🔧" label="In Progress"        value={active}                           color="#8B5CF6"     />
        <StatCard icon="💰" label="Seeking Funding"    value={seeking}                          color="#F59E0B"     />
        <StatCard icon="🎯" label="Total Goal"         value={`$${totalGoal.toLocaleString()}`} color={C.secondary} />
        <StatCard icon="✅" label="Raised So Far"      value={`$${totalRaised.toLocaleString()}`} color="#10B981"  />
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        {[["","All Projects", projects.length], ["seeking_funding","Seeking Funding", seeking], ["in_progress","In Progress", active], ["funded","Funded", projects.filter(p=>p.status==="funded").length], ["completed","Completed", projects.filter(p=>p.status==="completed").length]].map(([val, lbl, cnt]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            style={{ background: filterStatus===val ? C.primary : "#fff", color: filterStatus===val ? "#fff" : C.text, border:`1px solid ${filterStatus===val ? C.primary : C.border}`, borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            {lbl} ({cnt})
          </button>
        ))}
      </div>

      {/* Project list */}
      <div style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 8px #0001" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:40, color:C.muted }}>Loading projects…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:40, color:C.muted }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏘️</div>
            <div style={{ fontSize:17, fontWeight:700 }}>{filterStatus ? "No projects in this status" : "No community projects yet"}</div>
            <div style={{ fontSize:13, marginTop:4, marginBottom:20 }}>Click "+ New Project" to register a water well, school, clinic, or other infrastructure project.</div>
            <Btn variant="primary" onClick={() => setShowCreate(true)}>+ Create First Project</Btn>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {filtered.map(p => {
              const pct  = p.fundingGoal > 0 ? Math.min(100, Math.round((p.totalRaised || 0) / p.fundingGoal * 100)) : 0;
              const st   = STATUS_LABELS[p.status] || { label: p.status, color: C.muted, bg: "#F3F4F6" };
              const icon = CAT_ICONS[p.category] || "🏗️";
              const nextStatuses = { seeking_funding:["funded","in_progress"], funded:["in_progress"], in_progress:["completed"] };
              const nextSt = nextStatuses[p.status] || [];
              return (
                <div key={p.id} style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ fontSize:18 }}>{icon}</span>
                        <span style={{ fontWeight:800, fontSize:15 }}>{p.title}</span>
                        <span style={{ background:st.bg, color:st.color, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{st.label}</span>
                        <span style={{ background:"#F3F4F6", borderRadius:20, padding:"2px 10px", fontSize:11, color:C.muted, fontWeight:600 }}>{p.category}</span>
                      </div>
                      <div style={{ fontSize:12, color:C.muted }}>📍 {p.location}{p.region ? `, ${p.region}` : ""} {p.populationSize ? `· 👥 ${p.populationSize.toLocaleString()} people` : ""}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontWeight:900, fontSize:18, color:C.primary }}>${(p.totalRaised||0).toLocaleString()}</div>
                      <div style={{ fontSize:11, color:C.muted }}>of ${(p.fundingGoal||0).toLocaleString()}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height:6, background:"#E5E7EB", borderRadius:10, marginBottom:8, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${C.primary},${C.accent})`, borderRadius:10, transition:"width 0.5s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.muted, marginBottom:12 }}>
                    <span>{pct}% funded</span>
                    <span>{p._count?.contributions || 0} contributions</span>
                  </div>
                  {/* Description */}
                  {p.description && <p style={{ fontSize:13, color:C.text, margin:"0 0 12px", lineHeight:1.6 }}>{p.description.slice(0,200)}{p.description.length>200?"…":""}</p>}
                  {/* Actions */}
                  {nextSt.length > 0 && (
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {nextSt.map(ns => (
                        <Btn key={ns} size="sm" variant="outline" onClick={() => updateProjectStatus(p.id, ns)}>
                          → Mark as {STATUS_LABELS[ns]?.label || ns}
                        </Btn>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onDone={() => { load(); setShowCreate(false); }} showToast={showToast} />}
    </div>
  );
};

// ─── Role → internal dashboard key ─────────────────────────────────────────
const ROLE_MAP = {
  reporter:            "public_user",
  donor:               "public_user",
  admin:               "admin",
  super_admin:         "super_admin",
  field_agent:         "field_team",
  observer:            "public_user",
  verification_office: "verification_office",
  field_team:          "field_team",
  program_manager:     "program_manager",
  project_manager:     "project_manager",
};

const ROLE_LABELS = {
  public_user:         { icon: "👤",  label: "User"                  },
  observer:            { icon: "📝",  label: "Reporter"              },
  admin:               { icon: "🟠",  label: "Administrator"         },
  verification_office: { icon: "🏛️", label: "Admin"   },
  field_team:          { icon: "🗺️", label: "Field Agent"            },
  donor:               { icon: "❤️", label: "Donor / Sponsor"        },
  super_admin:         { icon: "🛡️", label: "Super Administrator"    },
  program_manager:     { icon: "🌱",  label: "Program Manager"       },
  project_manager:     { icon: "🏗️", label: "Project Manager"       },
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────
export default function KafaaleQaadApp() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  // API status → display status mapping (defined first so useEffect can use it)
  const STATUS_API_MAP = {
    pending_review:          "Pending Verification",
    team_assigned:           "Under Review",
    investigating:           "Investigating",
    investigation_completed: "Awaiting Approval",
    ai_sanitized:            "Awaiting Approval",
    waiting_for_sponsor:     "Waiting Sponsor",
    sponsored:               "Sponsored",
    delivering:              "Delivering",
    proof_uploaded:          "Proof Submitted",
    completed:               "Completed",
    rejected:                "Archived",
  };

  const mapCase = (c, role) => ({
    id:               c.id,              // internal CUID — used for all API calls
    ref:              c.caseRef || c.id, // short display ID (KQ-2026-0001)
    victim_name:      role === "donor" ? (c.publicTitle || "Verified Case")
                    : (c.privateVictimName || c.publicTitle || "Pending Review"),
    age:              c.privateVictimAge || null,
    gender:           c.privateVictimGender || "—",
    description:      role === "donor" ? (c.publicStory || "")
                    : (c.privateDescription || c.publicStory || ""),
    location:         c.publicCity || c.privateAddress?.split(",").slice(-2).join(",").trim() || "Somalia",
    urgency_level:    c.emergencyLevel ? c.emergencyLevel.charAt(0).toUpperCase() + c.emergencyLevel.slice(1) : "Medium",
    status:           STATUS_API_MAP[c.status] || c.status || "Pending Verification",
    created_at:       (c.createdAt || c.adminPublishedAt || "")?.slice(0,10),
    reporter_id:      c.reporterId,
    team_id:          c.assignedAgentId,
    findings:         c.fieldInvestigation?.officialNotes || "",
    donation_amount:  c.totalRaised || 0,
    caseType:         c.caseType || "emergency",
    needsChecklist:   c.needsChecklist || [],
    target_goal:      c.targetGoal  || 0,
    media_files: (c.mediaFiles || []).map(f => typeof f === 'string' ? { url: f, type: 'image' } : f),
    proof_files: (() => {
      const dp = c.deliveryProof;
      if (!dp) return [];
      const parse = (v) => { try { return JSON.parse(v || '[]'); } catch { return []; } };
      return [
        ...parse(dp.photoUrls).map(u => ({ url: u, type: 'image' })),
        ...parse(dp.videoUrls).map(u => ({ url: u, type: 'video' })),
        ...parse(dp.receiptUrls).map(u => ({ url: u, type: 'document' })),
      ];
    })(),
    fieldInvestigation: c.fieldInvestigation,
    _raw: c,
  });

  // Map real backend role → internal dashboard role
  const internalRole = authUser ? (ROLE_MAP[authUser.role] || "observer") : null;

  const [cases,             setCases]            = useState([]);
  const [users,             setUsers]            = useState([]);
  const [donations,         setDonations]        = useState([]);
  const [sponsors,          setSponsors]         = useState([]);
  const [notifs,            setNotifs]           = useState([]);
  const [agents,            setAgents]           = useState([]);
  const [dataLoading,       setDataLoading]      = useState(true);
  const [showProfile,       setShowProfile]      = useState(false);
  const isMobile = useIsMobile();
  const { t, lang, changeLang, LANGUAGES, currentLang } = useLang();
  const [showLangMenu,      setShowLangMenu]     = useState(false);
  const [selectedCase,      setSelectedCase]     = useState(null);
  const [showReport,        setShowReport]       = useState(false);
  const [sponsorCase,       setSponsorCase]      = useState(null);
  const [showAddUser,       setShowAddUser]      = useState(false);
  const [showExport,        setShowExport]       = useState(false);
  const [showNotifs,        setShowNotifs]       = useState(false);
  const [assignCase,        setAssignCase]       = useState(null);
  const [investigateCase,   setInvestigateCase]  = useState(null);
  const [publishCase,       setPublishCase]      = useState(null);
  const [rejectCase,        setRejectCase]       = useState(null);
  const [requestInfoCase,   setRequestInfoCase]  = useState(null);
  const [enrollCase,        setEnrollCase]       = useState(null);
  const [fieldReportCase,   setFieldReportCase]  = useState(null);
  const [deliveryCase,      setDeliveryCase]     = useState(null);
  const [deliveryAssign,    setDeliveryAssign]   = useState(null);
  const [completeCase,      setCompleteCase]     = useState(null);
  const [fullReportId,      setFullReportId]     = useState(null);
  const [toast,             setToast]            = useState(null);
  const [searchTerm,        setSearchTerm]       = useState("");
  const [filterStatus,      setFilterStatus]     = useState("All");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Redirect if not logged in ─────────────────────────────────────────
  useEffect(() => {
    if (!authUser) navigate("/login");
  }, [authUser, navigate]);

  // ─── Privacy: block copy, right-click, devtools for non-admin roles ────
  useEffect(() => {
    const adminRoles = ['admin','super_admin','verification_office'];
    if (!authUser || adminRoles.includes(authUser.role)) return; // admins unrestricted
    const block    = (e) => e.preventDefault();
    const blockKey = (e) => {
      if (e.ctrlKey && ['c','a','s','p','u','v'].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === 'F12' || e.key === 'PrintScreen') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('keydown', blockKey);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('keydown', blockKey);
    };
  }, [authUser]);

  // ─── Build currentUser from real auth ──────────────────────────────────
  const currentUser = authUser ? {
    id:       authUser.id,
    fullname: authUser.name,
    email:    authUser.email,
    role:     internalRole,
    realRole: authUser.role,
    phone:    authUser.phone || "",
    verification_status: "active",
  } : null;

  // ─── Load data from API ─────────────────────────────────────────────────
  const reloadCases = async (showLoader = false) => {
    if (!authUser) return;
    if (showLoader) setDataLoading(true);
    try {
      if (["admin","super_admin","verification_office","program_manager","project_manager"].includes(authUser.role)) {
        const [data, usersRes, donRes] = await Promise.allSettled([
          adminApi.cases({ limit: 30 }),
          adminApi.users(),
          adminApi.donations(),
        ]);
        if (data.status === "fulfilled" && data.value?.cases)
          setCases(data.value.cases.map(c => mapCase(c, "admin")));
        if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value)) {
          setUsers(usersRes.value);
          setAgents(usersRes.value.filter(u => u.role === "field_agent" && u.isActive));
        }
        if (donRes.status === "fulfilled" && donRes.value?.donations)
          setDonations(donRes.value.donations);
      } else if (["reporter","donor","observer"].includes(authUser.role)) {
        // Public users (reporter OR donor) load both: their submitted cases + public sponsorable cases
        const [myData, publicData] = await Promise.allSettled([
          casesApi.my(),
          casesApi.list({ limit: 30 }),
        ]);
        const myCases = myData.status === "fulfilled"
          ? (myData.value?.cases ?? (Array.isArray(myData.value) ? myData.value : [])).map(c => ({ ...mapCase(c, "reporter"), _isMine: true }))
          : [];
        const publicCases = publicData.status === "fulfilled"
          ? (publicData.value?.cases ?? []).map(c => mapCase(c, "donor"))
          : [];
        // Merge: myCases first (unique by id), then public cases not already in myCases
        const myIds = new Set(myCases.map(c => c.id));
        setCases([...myCases, ...publicCases.filter(c => !myIds.has(c.id))]);
      } else if (authUser.role === "field_agent") {
        const data = await fieldApi.assignments();
        const list = data?.assignments ?? data?.cases ?? (Array.isArray(data) ? data : []);
        setCases(list.map(c => mapCase(c, "field_agent")));
      }
    } catch (e) {
      console.error("Failed to load data:", e);
      // Only hard-logout on explicit auth failure, not generic network errors
      if (e.message === 'Session expired. Please log in again.') { logout(); navigate("/login"); }
    } finally {
      setDataLoading(false);
    }
  };

  // Lazy loaders — called by AdminDashboard when users/donations tabs are opened
  const reloadUsers = async () => {
    try {
      const us = await adminApi.users();
      if (Array.isArray(us)) { setUsers(us); setAgents(us.filter(u => u.role === "field_agent" && u.isActive)); }
    } catch (e) { console.error("Failed to load users:", e); }
  };

  const reloadDonations = async () => {
    try {
      const data = await adminApi.donations();
      if (data?.donations) setDonations(data.donations);
    } catch (e) { console.error("Failed to load donations:", e); }
  };

  const reloadNotifs = async () => {
    if (!authUser) return;
    try {
      const data = await notifsApi.list();
      if (Array.isArray(data)) setNotifs(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    reloadCases(true);  // true = show loading spinner on first load
    reloadNotifs();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(reloadNotifs, 30000);
    return () => clearInterval(interval);
  }, [authUser]);

  // ─── Case status update (optimistic) ───────────────────────────────────
  const handleCaseStatusUpdate = (caseId, newDisplayStatus) => {
    setCases(cs => cs.map(c => c.id === caseId ? { ...c, status: newDisplayStatus } : c));
    setTimeout(reloadCases, 1000); // sync with server after 1s
  };

  const handleSponsor = (caseId, details) => {
    // Optimistic update — show donated amount on the case card immediately
    setCases(cs => cs.map(c => c.id === caseId
      ? { ...c, donation_amount: (c.donation_amount || 0) + details.amount }
      : c
    ));
    // Reload cases from server after a short delay to get real totals
    setTimeout(reloadCases, 1500);
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const handleMarkAllNotifs = async () => {
    try { await notifsApi.readAll(); setNotifs(n => n.map(x => ({ ...x, read: true }))); } catch { /* ignore */ }
    setShowNotifs(false);
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete user "${u.name || u.fullname}"?\nEmail: ${u.email}\nRole: ${u.role}\n\nThis cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(u.id);
      setUsers(us => us.filter(x => x.id !== u.id));
      showToast(`User ${u.name || u.email} deleted.`, "success");
    } catch (e) {
      showToast("Failed to delete user: " + e.message, "error");
    }
  };

  const handleChangeRole = async (u, newRole) => {
    try {
      await adminApi.changeRole(u.id, newRole);
      setUsers(us => us.map(x => x.id === u.id ? { ...x, role: newRole } : x));
      showToast(`${u.name || u.email} is now ${newRole.replace(/_/g, " ")}.`, "success");
    } catch (e) {
      showToast("Failed to change role: " + e.message, "error");
    }
  };

  const handleConfirmDonation = async (donationId) => {
    try {
      await adminApi.confirmDonation(donationId);
      showToast("Donation confirmed! Case totals updated.", "success");
      setTimeout(reloadCases, 800);
    } catch (e) {
      showToast("Failed to confirm donation: " + e.message, "error");
    }
  };

  const handleOpenNotifCase = async (caseId) => {
    setShowNotifs(false);
    const existing = cases.find(c => c.id === caseId);
    if (existing) { setSelectedCase(existing); return; }
    // Load the case if not in current list
    try {
      const data = ["admin","super_admin"].includes(authUser.role)
        ? await adminApi.getCase(caseId) : null;
      if (data) setSelectedCase(mapCase(data, "admin"));
    } catch { /* ignore */ }
  };

  const filteredCases = cases.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s
      || (c.victim_name || "").toLowerCase().includes(s)
      || (c.location || "").toLowerCase().includes(s)
      || (c.id || "").toLowerCase().includes(s);
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const unreadCount = notifs.filter(n => !(n.read || n.isRead)).length;

  // ─── Guard: still loading auth ─────────────────────────────────────────
  if (!authUser || !currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Logo size="lg" linked={false} />
          <div style={{ fontSize: 14, color: COLORS.muted }}>Loading...</div>
        </div>
      </div>
    );
  }

  // ─── Guard: data still loading ─────────────────────────────────────────
  if (dataLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.bg, gap: 20 }}>
        <Logo size="lg" linked={false} />
        <div style={{ fontSize: 13, color: COLORS.muted }}>Loading your dashboard…</div>
        {/* Animated dots */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%", background: COLORS.primary,
              animation: `kf-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes kf-pulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
      </div>
    );
  }

  // ─── Access denied guard ────────────────────────────────────────────────
  const VALID_ROLES = ["public_user","observer","verification_office","field_team","donor","super_admin","admin","program_manager","project_manager"];
  if (!VALID_ROLES.includes(internalRole)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
        <div style={{ textAlign: "center", background: "#fff", padding: 40, borderRadius: 20, boxShadow: "0 4px 20px #0001" }}>
          <div style={{ fontSize: 48 }}>🚫</div>
          <h2 style={{ color: COLORS.danger }}>Access Denied</h2>
          <p style={{ color: COLORS.muted }}>Your account role ({authUser.role}) does not have dashboard access.</p>
          <button onClick={handleLogout} style={{ padding: "10px 24px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>Sign Out</button>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_LABELS[internalRole] || { icon: "👤", label: "User" };

  // ─── ROLE DASHBOARDS MAP (locked to real role) ──────────────────────────
  const sharedAdminProps = {
    cases: filteredCases, users, donations, sponsors, agents,
    onViewCase: setSelectedCase, onAddUser: () => setShowAddUser(true),
    onDeleteUser: handleDeleteUser, onChangeRole: handleChangeRole,
    onExport: () => setShowExport(true),
    onConfirmDonation: handleConfirmDonation, onComplete: setCompleteCase,
    onStartDelivery: setDeliveryAssign, onFullReport: setFullReportId,
    // workflow actions (assign, publish, reject, request-info)
    onAssign: setAssignCase, onPublish: setPublishCase,
    onReject: setRejectCase, onRequestInfo: setRequestInfoCase,
    onEnroll: setEnrollCase,
    currentUser, showToast,
  };
  const ROLE_DASHBOARDS = {
    public_user: (
      <PublicUserDashboard
        cases={filteredCases}
        currentUser={currentUser}
        onReport={() => setShowReport(true)}
        onViewCase={setSelectedCase}
        onSponsor={setSponsorCase}
        realRole={authUser?.role}
      />
    ),
    observer: (
      <PublicUserDashboard
        cases={filteredCases}
        currentUser={currentUser}
        onReport={() => setShowReport(true)}
        onViewCase={setSelectedCase}
        onSponsor={setSponsorCase}
        realRole={authUser?.role}
      />
    ),
    // admin role → new grid dashboard with limited tiles (no Users/Settings)
    admin: (
      <AdminDashboard {...sharedAdminProps} isSuperAdmin={false} />
    ),
    // verification_office → same full admin dashboard
    verification_office: (
      <AdminDashboard {...sharedAdminProps} isSuperAdmin={false} />
    ),
    field_team: (
      <FieldTeamDashboard cases={filteredCases} currentUser={currentUser}
        onViewCase={setSelectedCase} onInvestigate={setInvestigateCase}
        onDeliver={setDeliveryCase} />
    ),
    donor: (
      <PublicUserDashboard
        cases={filteredCases}
        currentUser={currentUser}
        onReport={() => setShowReport(true)}
        onViewCase={setSelectedCase}
        onSponsor={setSponsorCase}
        realRole="donor"
      />
    ),
    // super_admin → full grid (all 12 tiles)
    super_admin: (
      <AdminDashboard {...sharedAdminProps} isSuperAdmin={true} />
    ),
    program_manager: (
      <ProgramManagerDashboard currentUser={currentUser} showToast={showToast} />
    ),
    project_manager: (
      <ProjectManagerDashboard currentUser={currentUser} showToast={showToast} cases={filteredCases} />
    ),
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @media (max-width: 600px) {
          /* Dashboard inline grids → single column */
          [style*="grid-template-columns: repeat(auto-fit, minmax(min(260px"] { grid-template-columns: 1fr !important; }
          [style*="grid-template-columns: repeat(auto-fill, minmax(min(260px"] { grid-template-columns: 1fr !important; }
          /* Workflow cards buttons always wrap */
          .kf-workflow-btns { flex-wrap: wrap !important; }
          /* Modal inner has enough room */
          .kf-modal-inner { max-width: 100vw !important; }
          /* Prevent any fixed-width element from overflowing */
          [style*="width: 340"] { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="kf-header">
        <div className="kf-header-inner">
          {/* Logo */}
          <Logo size={isMobile ? "sm" : "md"} linked={false} dark />

          {/* Search bar */}
          <div className="kf-search" style={{ margin: "0 8px" }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 Search…"
              style={{ flex: 1, padding: "7px 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 13, outline: "none", minWidth: 0 }} />
            {!isMobile && (
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} wrapStyle={{ marginBottom:0 }}>
                <option value="All">All</option>
                {Object.keys(STATUS_MAP).map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            )}
          </div>

          {/* Right: notifications + user + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifs(v => !v)}
                style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                🔔
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "#EF4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + COLORS.primary }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <NotificationsDropdown notifs={notifs} onClose={() => setShowNotifs(false)}
                  onMarkAll={handleMarkAllNotifs} onOpenCase={handleOpenNotifCase} />
              )}
            </div>

            <div onClick={() => setShowProfile(true)} title="My Profile — edit your details"
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div className="kf-hide-mobile" style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{currentUser.fullname}</div>
                <div style={{ fontSize: 9, opacity: 0.65, letterSpacing: 0.5 }}>{roleInfo.icon} {roleInfo.label}</div>
              </div>
              <UserAvatar name={currentUser.fullname} size={34} />
            </div>

            {/* Language switcher */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowLangMenu(v => !v)}
                style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 15, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                {currentLang.flag}{!isMobile && <span style={{ fontSize: 11 }}> ▾</span>}
              </button>
              {showLangMenu && (
                <div className="kf-lang-menu" style={{ position: "absolute", top: 42, right: 0, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px #0003", zIndex: 200, minWidth: 160, border: `1px solid ${COLORS.border}` }}>
                  {LANGUAGES.map(l => (
                    <div key={l.code} onClick={() => { changeLang(l.code); setShowLangMenu(false); }}
                      style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", background: lang === l.code ? COLORS.primary + "10" : "", fontWeight: lang === l.code ? 700 : 400, display: "flex", alignItems: "center", gap: 8, color: COLORS.text }}>
                      {l.flag} {l.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <a href="/" style={{ padding:"6px 10px", borderRadius:8, background:"rgba(255,255,255,0.12)", color:"#fff", textDecoration:"none", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>🌐 {isMobile?"Site":"Visit Site"}</a>
            <Btn variant="muted" size="sm" onClick={handleLogout} style={{ padding: "6px 10px", fontSize: 12 }}>
              {isMobile ? "⏻" : t("exit")}
            </Btn>
          </div>
        </div>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* ── Pipeline Banner (admin/field only) ── */}
      {["admin","verification_office","super_admin","field_team"].includes(internalRole) && (
        <div style={{ background: "#fff", borderBottom: `1px solid ${COLORS.border}`, padding: "8px 16px" }}>
          <div className="kf-pipeline" style={{ maxWidth: 1400, margin: "0 auto" }}>
            <span style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, marginRight: 6, whiteSpace: "nowrap" }}>PIPELINE:</span>
            {WORKFLOW_STEPS.map((s, i) => {
              const count = cases.filter(c => c.status === s.status).length;
              return (
                <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: count > 0 ? s.color + "15" : "#F3F4F6", border: `1px solid ${count > 0 ? s.color + "40" : COLORS.border}`, borderRadius: 20, padding: "3px 8px", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 11 }}>{s.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? s.color : COLORS.muted }}>{s.label}</span>
                    {count > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: s.color, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{count}</span>}
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && <span style={{ color: COLORS.border, fontSize: 12 }}>›</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="kf-main">
        {ROLE_DASHBOARDS[internalRole] || ROLE_DASHBOARDS.observer}
      </div>

      {/* ── Modals ── */}
      {selectedCase && (
        <CaseDetailModal c={selectedCase} currentUser={currentUser} onClose={() => setSelectedCase(null)} onUpdateCase={handleCaseStatusUpdate} onSponsor={setSponsorCase} />
      )}
      {showReport && (
        <ReportCaseModal onClose={() => setShowReport(false)} currentUser={currentUser}
          onSubmit={c => { showToast("✅ Case submitted! Admin will review shortly."); setShowReport(false); reloadCases(); }} />
      )}
      {sponsorCase && (
        <SponsorModal c={sponsorCase} onClose={() => setSponsorCase(null)} onConfirm={handleSponsor} currentUser={currentUser} />
      )}
      {showAddUser && (
        <AddUserModal onClose={() => setShowAddUser(false)} onAdd={u => { setUsers(us => [...us, u]); showToast("User added successfully!"); }} />
      )}
      {showExport && (
        <ExportModal cases={cases} onClose={() => setShowExport(false)} />
      )}
      {assignCase && (
        <AssignAgentModal caseItem={assignCase} agents={agents} onClose={() => setAssignCase(null)}
          onDone={handleCaseStatusUpdate} showToast={showToast} />
      )}
      {investigateCase && (
        <InvestigationModal caseItem={investigateCase} onClose={() => setInvestigateCase(null)}
          onDone={handleCaseStatusUpdate} showToast={showToast} />
      )}
      {publishCase && (
        <PublishCaseModal caseItem={publishCase} onClose={() => setPublishCase(null)}
          onDone={handleCaseStatusUpdate} showToast={showToast} />
      )}
      {rejectCase && (
        <RejectCaseModal caseItem={rejectCase} onClose={() => setRejectCase(null)}
          onDone={handleCaseStatusUpdate} showToast={showToast} />
      )}
      {requestInfoCase && (
        <RequestMoreInfoModal caseItem={requestInfoCase} onClose={() => setRequestInfoCase(null)}
          onDone={() => reloadCases()} showToast={showToast} />
      )}
      {enrollCase && (
        <EnrollBeneficiaryFromCaseModal caseItem={enrollCase} onClose={() => setEnrollCase(null)}
          onDone={() => { reloadCases(); showToast("🌱 Child enrolled in program and seeking sponsor!"); }}
          showToast={showToast} />
      )}
      {fieldReportCase && (
        <FieldReportModal caseItem={fieldReportCase} onClose={() => setFieldReportCase(null)} />
      )}
      {deliveryAssign && (
        <AssignDeliveryModal caseItem={deliveryAssign} agents={agents}
          onClose={() => setDeliveryAssign(null)}
          onDone={() => { setTimeout(reloadCases, 800); showToast("🚚 Delivery started! Field agent has been notified."); }}
          showToast={showToast} />
      )}
      {deliveryCase && (
        <DeliveryProofModal caseItem={deliveryCase} onClose={() => setDeliveryCase(null)}
          onDone={() => { setTimeout(reloadCases, 800); }} showToast={showToast} />
      )}
      {completeCase && (
        <CompleteCaseModal caseItem={completeCase} onClose={() => setCompleteCase(null)}
          onDone={() => { const id = completeCase.id; setTimeout(reloadCases, 800); setTimeout(() => setFullReportId(id), 400); }}
          showToast={showToast} />
      )}
      {fullReportId && internalRole === "super_admin" && (
        <CaseFullReportModal caseId={fullReportId} onClose={() => setFullReportId(null)} />
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 16, background: toast.type === "success" ? COLORS.secondary : COLORS.danger, color: "#fff", borderRadius: 14, padding: "12px 20px", boxShadow: "0 8px 32px #0003", fontSize: 14, fontWeight: 700, zIndex: 2000, maxWidth: 360, left: "auto" }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", padding: "20px 24px", color: COLORS.muted, fontSize: 12, borderTop: `1px solid ${COLORS.border}`, background: "#fff", marginTop: 32 }}>
        <strong style={{ color: COLORS.primary }}>🤝 KAFAALE QAAD</strong> · Humanitarian Aid Platform · React + Express + PostgreSQL · Claude AI
        <br />
        <span style={{ fontSize: 11, opacity: 0.7 }}>🔐 JWT Auth · Role-Based Access · AI Sanitization · Field Verification · Audit Trails · Real-Time Notifications</span>
      </div>
    </div>
  );
}
