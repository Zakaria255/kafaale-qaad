import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const C = { primary: "#004B96", border: "#D8E4F0", text: "#0D1F3C", muted: "#5A6E8A", bg: "#F4F7FC" };

/**
 * Drop-in replacement for native <select> that renders its dropdown via a
 * fixed-position portal, so it is NEVER clipped by overflow:hidden/auto on
 * any ancestor.
 *
 * Usage — identical to a native select:
 *   <FixedSelect value={v} onChange={e => setV(e.target.value)} style={...}>
 *     <option value="a">A</option>
 *     <option value="b">B</option>
 *   </FixedSelect>
 */
export default function FixedSelect({ value, onChange, children, disabled, style = {}, placeholder }) {
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState({ top: 0, left: 0, width: 0, flipUp: false });
  const btnRef            = useRef(null);

  // Flatten <option> children into a flat list
  const flatOptions = [];
  const parseChildren = (nodes) => {
    if (!nodes) return;
    const arr = Array.isArray(nodes) ? nodes : [nodes];
    arr.forEach(child => {
      if (!child) return;
      if (Array.isArray(child)) { parseChildren(child); return; }
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

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("resize",  close);
    window.addEventListener("scroll",  close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize",  close);
      window.removeEventListener("scroll",  close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const baseBtn = {
    width: "100%",
    border: `1.5px solid ${open ? C.primary : (style.borderColor || C.border)}`,
    borderRadius: style.borderRadius || 10, fontSize: style.fontSize || 14,
    background: disabled ? "#F9FAFB" : (style.background || "#fff"),
    boxSizing: "border-box", fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
    textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
    color: disabled ? C.muted : (style.color || C.text), outline: "none",
    boxShadow: open ? `0 0 0 3px ${C.primary}22` : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    ...style,
    // override these so the button doesn't look like a block element from style spread
    padding: style.padding || "10px 14px",
  };

  return (
    <>
      <button ref={btnRef} type="button" onClick={openDrop} disabled={disabled} style={baseBtn}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {selected?.label ?? placeholder ?? "— Select —"}
        </span>
        <span style={{ color: C.muted, fontSize: 11, marginLeft: 8, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </button>

      {open && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 8998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed",
            top:    pos.flipUp ? "auto" : pos.top,
            bottom: pos.flipUp ? window.innerHeight - pos.top : "auto",
            left: pos.left, width: pos.width,
            zIndex: 8999, background: "#fff", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            border: `1.5px solid ${C.border}`,
            maxHeight: 260, overflowY: "auto",
          }}>
            {flatOptions.map((opt, i) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div key={opt.value ?? i}
                  onClick={(e) => { e.stopPropagation(); onChange?.({ target: { value: opt.value } }); setOpen(false); }}
                  style={{
                    padding: "10px 14px", cursor: "pointer", fontSize: style.fontSize || 14,
                    background: isSelected ? C.primary + "12" : "transparent",
                    color: isSelected ? C.primary : C.text,
                    fontWeight: isSelected ? 700 : 400,
                    borderBottom: i < flatOptions.length - 1 ? `1px solid ${C.border}` : "none",
                    userSelect: "none",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.bg; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
