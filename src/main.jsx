import { StrictMode, Component, useState } from 'react';
import { createRoot } from 'react-dom/client';

// True for "stale chunk after a new deploy" errors — the referenced JS file no
// longer exists, so a reload (fetching the fresh index.html + new hashes) fixes it.
const isChunkError = (msg = '') =>
  /dynamically imported module|module script failed|ChunkLoadError|Failed to fetch|error loading dynamically/i.test(msg);

// Reload at most once per session so a persistent failure can't loop forever.
function reloadOnce() {
  try {
    if (!sessionStorage.getItem('kf-chunk-reloaded')) {
      sessionStorage.setItem('kf-chunk-reloaded', '1');
      window.location.reload();
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

class ErrorBoundary extends Component {
  state = { error: null, info: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(error, info) {
    if (isChunkError(error?.message) && reloadOnce()) return; // silently self-heal
    this.setState({ info });
  }
  render() {
    if (this.state.error) {
      if (isChunkError(this.state.error.message)) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F4F7FC', fontFamily: 'system-ui', gap: 14, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#004B96' }}>Updating to the latest version…</div>
          <button onClick={() => { try { sessionStorage.removeItem('kf-chunk-reloaded'); } catch {} window.location.reload(); }} style={{ padding: '10px 24px', background: '#004B96', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Reload now</button>
        </div>
      );
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F4F7FC', fontFamily: 'system-ui', gap: 12, padding: 24 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#C0392B' }}>Something went wrong</div>
          <pre style={{ fontSize: 11, color: '#C0392B', background: '#FEE2E2', padding: 12, borderRadius: 8, maxWidth: 600, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <pre style={{ fontSize: 10, color: '#5A6E8A', background: '#fff', padding: 12, borderRadius: 8, maxWidth: 600, overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{this.state.info?.componentStack}</pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} style={{ padding: '10px 24px', background: '#004B96', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Clear & Back to Login</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType(); // 'PUSH' | 'REPLACE' | 'POP'
  useEffect(() => {
    // Only scroll to top on forward navigation — back/forward (POP) keeps position
    if (navType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navType]);
  return null;
}
import { lazy, Suspense } from 'react';

// lazy() that auto-recovers from stale chunks after a deploy: on a failed
// dynamic import it reloads once (fresh index.html + new hashes); on success it
// clears the reload guard so a later deploy can self-heal again.
function lazyWithReload(factory) {
  return lazy(() =>
    factory()
      .then(m => { try { sessionStorage.removeItem('kf-chunk-reloaded'); } catch { /* ignore */ } return m; })
      .catch(err => {
        if (isChunkError(err?.message) && reloadOnce()) return new Promise(() => {});
        throw err;
      })
  );
}
import Navbar       from './components/Navbar.jsx';
import Footer       from './components/Footer.jsx';
import AiAssistant  from './components/AiAssistant.jsx';
import ConnectionBanner from './components/ConnectionBanner.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
// Eager — always needed on first load
import Home  from './pages/Home.jsx';
import Login from './pages/Login.jsx';
// Lazy — code-split to reduce initial bundle
const About         = lazyWithReload(() => import('./pages/About.jsx'));
const HowItWorks    = lazyWithReload(() => import('./pages/HowItWorks.jsx'));
const Cases         = lazyWithReload(() => import('./pages/Cases.jsx'));
const CaseDetail    = lazyWithReload(() => import('./pages/CaseDetail.jsx'));
const Donate        = lazyWithReload(() => import('./pages/Donate.jsx'));
const Contact       = lazyWithReload(() => import('./pages/Contact.jsx'));
const ImpactPartners= lazyWithReload(() => import('./pages/ImpactPartners.jsx'));
const Programs      = lazyWithReload(() => import('./pages/Programs.jsx'));
const Stories       = lazyWithReload(() => import('./pages/Stories.jsx'));
const StoryDetail   = lazyWithReload(() => import('./pages/StoryDetail.jsx'));
const Volunteer     = lazyWithReload(() => import('./pages/Volunteer.jsx'));
const FAQ           = lazyWithReload(() => import('./pages/FAQ.jsx'));
const Projects      = lazyWithReload(() => import('./pages/Projects.jsx'));
const Updates       = lazyWithReload(() => import('./pages/Updates.jsx'));
const MediaFeed     = lazyWithReload(() => import('./pages/MediaFeed.jsx'));
const Dashboard     = lazyWithReload(() => import('./KafaaleQaadApp.jsx'));

function PageLoader() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#5A6E8A", fontSize: 14 }}>Loading…</div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "system-ui", color: "#0D1F3C", textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 72 }}>🔍</div>
      <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>404 — Page Not Found</h1>
      <p style={{ fontSize: 16, color: "#5A6E8A", maxWidth: 420, lineHeight: 1.7 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a href="/" style={{ padding: "12px 28px", background: "#004B96", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
        ← Back to Home
      </a>
    </div>
  );
}

function ShareStoryBanner() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/dashboard') || pathname === '/login') return null;
  return (
    <div style={{ background: "#F4F7FC", paddingTop: 64 }}>
    <div style={{
      position: "relative", overflow: "hidden",
      minHeight: 260,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 32,
      padding: "64px clamp(24px, 7vw, 96px)",
    }}>
      {/* Solid brand navy base */}
      <div style={{ position: "absolute", inset: 0, background: "#0D1F3C" }} />
      {/* Photo — full-bleed cover, fills the entire banner edge to edge */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url("/story-bg.png")`,
        backgroundSize: "cover", backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
      }} />
      {/* Left-weighted overlay so text stays readable over the photo */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(13,31,60,0.95) 0%, rgba(13,31,60,0.85) 30%, rgba(13,31,60,0.45) 55%, rgba(13,31,60,0.30) 100%)" }} />
      {/* Subtle top & bottom fade */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(13,31,60,0.4) 0%, transparent 30%, transparent 70%, rgba(13,31,60,0.4) 100%)" }} />

      {/* Text */}
      <div style={{ position: "relative", zIndex: 1, color: "#fff", maxWidth: 600 }}>
        <div style={{
          display: "inline-block",
          background: "rgba(224,171,33,0.18)", border: "1.5px solid rgba(224,171,33,0.55)",
          color: "#F5C842", borderRadius: 24, padding: "5px 18px",
          fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
          marginBottom: 18, backdropFilter: "blur(6px)",
        }}>Your Voice Matters</div>
        <div style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 900, marginBottom: 14, letterSpacing: -0.5, lineHeight: 1.15, textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}>
          Have a Story to Share?
        </div>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.86)", margin: 0, lineHeight: 1.8, maxWidth: 480, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
          Are you a beneficiary, community member, or field volunteer? Submit your story — our team reviews every submission and publishes verified stories to inspire more donors.
        </p>
      </div>

      {/* CTA */}
      <a href="/stories#share" style={{
        position: "relative", zIndex: 1, flexShrink: 0,
        padding: "17px 42px", borderRadius: 50, fontWeight: 800, fontSize: 15,
        background: "#E0AB21", color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
        boxShadow: "0 8px 32px rgba(224,171,33,0.45)",
        fontFamily: "inherit", letterSpacing: 0.3,
      }}>
        Share My Story →
      </a>
    </div>
    </div>
  );
}

function Layout({ children }) {
  return (
    <>
      <ConnectionBanner />
      <Navbar />
      <main>{children}</main>
      <ShareStoryBanner />
      <Footer />
      <AiAssistant context="website" />
    </>
  );
}

// Wraps a page — if super admin has disabled it, show coming soon instead
function PageGate({ pageKey, children }) {
  const [vis] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kf_page_settings") || "{}"); } catch { return {}; }
  });
  if (vis[pageKey] === false) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "system-ui", color: "#0D1F3C", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 64 }}>🔒</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Page Temporarily Unavailable</h1>
        <p style={{ fontSize: 15, color: "#5A6E8A", maxWidth: 400, lineHeight: 1.7 }}>
          This section is currently offline. Please check back soon or contact us for more information.
        </p>
        <a href="/" style={{ padding: "12px 28px", background: "#004B96", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>← Back to Home</a>
      </div>
    );
  }
  return children;
}

function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"              element={<Layout><Home /></Layout>} />
            <Route path="/about"         element={<Layout><PageGate pageKey="about"><About /></PageGate></Layout>} />
            <Route path="/how-it-works"  element={<Layout><PageGate pageKey="howItWorks"><HowItWorks /></PageGate></Layout>} />
            <Route path="/cases"         element={<Layout><PageGate pageKey="cases"><Cases /></PageGate></Layout>} />
            <Route path="/cases/:id"     element={<Layout><CaseDetail /></Layout>} />
            <Route path="/donate"        element={<Layout><PageGate pageKey="donate"><Donate /></PageGate></Layout>} />
            <Route path="/contact"       element={<Layout><PageGate pageKey="contact"><Contact /></PageGate></Layout>} />
            <Route path="/partners"      element={<Layout><PageGate pageKey="partners"><ImpactPartners /></PageGate></Layout>} />
            <Route path="/programs"      element={<Layout><PageGate pageKey="programs"><Programs /></PageGate></Layout>} />
            <Route path="/projects"      element={<Layout><PageGate pageKey="projects"><Projects /></PageGate></Layout>} />
            <Route path="/stories"       element={<Layout><PageGate pageKey="stories"><Stories /></PageGate></Layout>} />
            <Route path="/stories/:id"   element={<Layout><PageGate pageKey="stories"><StoryDetail /></PageGate></Layout>} />
            <Route path="/volunteer"     element={<Layout><PageGate pageKey="volunteer"><Volunteer /></PageGate></Layout>} />
            <Route path="/faq"           element={<Layout><PageGate pageKey="faq"><FAQ /></PageGate></Layout>} />
            <Route path="/updates"       element={<Layout><PageGate pageKey="updates"><Updates /></PageGate></Layout>} />
            <Route path="/media"         element={<Layout><MediaFeed /></Layout>} />
            <Route path="/login"         element={<Login />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/dashboard/*"   element={<Dashboard />} />
            <Route path="*"              element={<Layout><NotFound /></Layout>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>
);
