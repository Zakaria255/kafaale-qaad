import { useState, useEffect } from "react";
import { isDemoMode } from "../api/client.js";

// Visible banner so users are never silently shown sample/empty data when the
// backend is down or the session fell back to offline demo mode.
export default function ConnectionBanner() {
  const [demo, setDemo] = useState(isDemoMode());
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const recheck = () => setDemo(isDemoMode());
    const goOffline = () => setOffline(true);
    const goOnline = () => { setOffline(false); recheck(); };
    window.addEventListener("kf-api-offline", goOffline);
    window.addEventListener("kf-api-online", goOnline);
    window.addEventListener("storage", recheck);   // other tabs
    window.addEventListener("focus", recheck);
    const id = setInterval(recheck, 5000);          // same-tab demo login
    return () => {
      window.removeEventListener("kf-api-offline", goOffline);
      window.removeEventListener("kf-api-online", goOnline);
      window.removeEventListener("storage", recheck);
      window.removeEventListener("focus", recheck);
      clearInterval(id);
    };
  }, []);

  if (!demo && !offline) return null;

  const msg = demo
    ? "Demo mode — you’re viewing sample data. The live server isn’t connected, so changes won’t be saved."
    : "Can’t reach the server right now — showing limited data. Some actions may not work.";

  return (
    <div role="status" style={{
      background: "#B45309", color: "#fff", textAlign: "center",
      padding: "9px 16px", fontSize: 13, fontWeight: 700,
      fontFamily: "'Source Sans 3','Inter',system-ui,sans-serif",
      letterSpacing: 0.2, lineHeight: 1.4,
    }}>
      ⚠️ {msg}
    </div>
  );
}
