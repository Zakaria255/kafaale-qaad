import React from "react";

/**
 * Professional photo adjuster — drag to move, slider/wheel to zoom, framed to a
 * fixed aspect ratio (defaults to the case-card 16:10). On confirm it renders the
 * visible frame to a canvas and returns a new JPEG File, so what you see is exactly
 * what gets uploaded. Self-contained (no libraries, no design-token deps).
 */
export default function ImageCropper({
  file,
  aspect = 16 / 10,
  outWidth = 1280,
  frameWidth = 360,
  onConfirm,
  onCancel,
}) {
  const FRAME_W = frameWidth;
  const FRAME_H = Math.round(FRAME_W / aspect);

  const [url, setUrl] = React.useState("");
  const [nat, setNat] = React.useState({ w: 0, h: 0 });
  const [minScale, setMinScale] = React.useState(1);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const imgRef = React.useRef(null);
  const drag = React.useRef(null);

  React.useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const clamp = React.useCallback(
    (off, s) => {
      const dispW = nat.w * s;
      const dispH = nat.h * s;
      const maxX = Math.max(0, (dispW - FRAME_W) / 2);
      const maxY = Math.max(0, (dispH - FRAME_H) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, off.x)),
        y: Math.max(-maxY, Math.min(maxY, off.y)),
      };
    },
    [nat.w, nat.h, FRAME_W, FRAME_H]
  );

  const onImgLoad = (e) => {
    const nw = e.target.naturalWidth;
    const nh = e.target.naturalHeight;
    setNat({ w: nw, h: nh });
    const cover = Math.max(FRAME_W / nw, FRAME_H / nh); // fill the frame
    setMinScale(cover);
    setScale(cover);
    setOffset({ x: 0, y: 0 });
  };

  const applyZoom = (val) => {
    const s = Math.max(minScale, Math.min(minScale * 5, val));
    setScale(s);
    setOffset((o) => clamp(o, s));
  };

  // Drag with window listeners so it keeps tracking outside the frame.
  const startDrag = (clientX, clientY) => {
    drag.current = { sx: clientX, sy: clientY, ox: offset.x, oy: offset.y };
    const move = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      const nx = drag.current.ox + (p.clientX - drag.current.sx);
      const ny = drag.current.oy + (p.clientY - drag.current.sy);
      setOffset(clamp({ x: nx, y: ny }, scale));
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  const onWheel = (e) => {
    e.preventDefault();
    applyZoom(scale * (e.deltaY < 0 ? 1.06 : 0.94));
  };

  const confirm = () => {
    const outW = outWidth;
    const outH = Math.round(outW / aspect);
    const s = scale;
    const dispW = nat.w * s;
    const dispH = nat.h * s;
    const imgLeft = (FRAME_W - dispW) / 2 + offset.x;
    const imgTop = (FRAME_H - dispH) / 2 + offset.y;
    const srcX = (0 - imgLeft) / s;
    const srcY = (0 - imgTop) / s;
    const srcW = FRAME_W / s;
    const srcH = FRAME_H / s;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
    canvas.toBlob(
      (blob) => {
        const base = (file.name || "photo").replace(/\.[^.]+$/, "");
        const cropped = new File([blob], base + ".jpg", { type: "image/jpeg" });
        onConfirm(cropped);
      },
      "image/jpeg",
      0.9
    );
  };

  const btn = {
    border: "none",
    borderRadius: 10,
    padding: "11px 20px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(3,20,45,0.72)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: 22,
          width: "min(440px, 100%)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 17, color: "#0D1F3C" }}>Adjust photo</div>
        <div style={{ fontSize: 13, color: "#5A6E8A", margin: "4px 0 16px" }}>
          Drag to move · scroll or use the slider to zoom
        </div>

        <div
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
          }}
          onWheel={onWheel}
          style={{
            position: "relative",
            width: FRAME_W,
            height: FRAME_H,
            margin: "0 auto",
            overflow: "hidden",
            borderRadius: 12,
            background: "#0b1f3a",
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {url && (
            <img
              ref={imgRef}
              src={url}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: nat.w || "auto",
                height: nat.h || "auto",
                maxWidth: "none",
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            />
          )}
          {/* Rule-of-thirds framing guide */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.55)",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
              backgroundSize: `${FRAME_W / 3}px ${FRAME_H / 3}px`,
              borderRadius: 12,
              pointerEvents: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 2px 18px" }}>
          <span style={{ fontSize: 12, color: "#5A6E8A", fontWeight: 700 }}>−</span>
          <input
            type="range"
            min={minScale}
            max={minScale * 5}
            step="0.001"
            value={scale}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: "#204BA0" }}
          />
          <span style={{ fontSize: 14, color: "#5A6E8A", fontWeight: 700 }}>+</span>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancel} style={{ ...btn, background: "#eef2f7", color: "#0D1F3C" }}>
            Cancel
          </button>
          <button type="button" onClick={confirm} style={{ ...btn, background: "#204BA0", color: "#fff" }}>
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
