import { useState, useEffect } from "react";

// Visible banner so users are never silently shown stale/empty data without
// knowing the backend is actually unreachable.
export default function ConnectionBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("kf-api-offline", goOffline);
    window.addEventListener("kf-api-online", goOnline);
    return () => {
      window.removeEventListener("kf-api-offline", goOffline);
      window.removeEventListener("kf-api-online", goOnline);
    };
  }, []);

  if (!offline) return null;

  const msg = "Can’t reach the server right now — showing limited data. Some actions may not work.";

  return (
    <div role="status" style={{
      background: "#B45309", color: "#fff", textAlign: "center",
      padding: "9px 16px", fontSize: 13, fontWeight: 700,
      fontFamily: "'Source Sans 3','Inter',system-ui,sans-serif",
      letterSpacing: 0.2, lineHeight: 1.4,
    }}>
      {msg}
    </div>
  );
}
