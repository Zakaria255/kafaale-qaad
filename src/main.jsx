import { StrictMode, Component, useState } from 'react';
import { createRoot } from 'react-dom/client';

class ErrorBoundary extends Component {
  state = { error: null, info: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(error, info) { this.setState({ info }); }
  render() {
    if (this.state.error) return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F4F7FC', fontFamily: 'system-ui', gap: 12, padding: 24 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#C0392B' }}>Something went wrong</div>
        <pre style={{ fontSize: 11, color: '#C0392B', background: '#FEE2E2', padding: 12, borderRadius: 8, maxWidth: 600, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
        <pre style={{ fontSize: 10, color: '#5A6E8A', background: '#fff', padding: 12, borderRadius: 8, maxWidth: 600, overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{this.state.info?.componentStack}</pre>
        <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} style={{ padding: '10px 24px', background: '#004B96', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Clear & Back to Login</button>
      </div>
    );
    return this.props.children;
  }
}
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import Navbar       from './components/Navbar.jsx';
import Footer       from './components/Footer.jsx';
import AiAssistant  from './components/AiAssistant.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import Home         from './pages/Home.jsx';
import About        from './pages/About.jsx';
import HowItWorks   from './pages/HowItWorks.jsx';
import Cases        from './pages/Cases.jsx';
import CaseDetail   from './pages/CaseDetail.jsx';
import Donate       from './pages/Donate.jsx';
import Contact        from './pages/Contact.jsx';
import ImpactPartners from './pages/ImpactPartners.jsx';
import Programs       from './pages/Programs.jsx';
import Stories        from './pages/Stories.jsx';
import StoryDetail    from './pages/StoryDetail.jsx';
import Volunteer      from './pages/Volunteer.jsx';
import FAQ            from './pages/FAQ.jsx';
import Transparency   from './pages/Transparency.jsx';
import Projects       from './pages/Projects.jsx';
import Updates        from './pages/Updates.jsx';
import MediaFeed      from './pages/MediaFeed.jsx';
import Login          from './pages/Login.jsx';
import Dashboard    from './KafaaleQaadApp.jsx';

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
    <div style={{
      position: "relative", overflow: "hidden",
      minHeight: 200,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 24,
      padding: "52px clamp(20px, 6vw, 80px)",
    }}>
      {/* Photo bg */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url("https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1400&q=80")`,
        backgroundSize: "cover", backgroundPosition: "center 30%",
        filter: "brightness(0.28)",
      }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(0,38,81,0.75) 0%,rgba(75,125,25,0.55) 100%)" }} />

      {/* Text */}
      <div style={{ position: "relative", zIndex: 1, color: "#fff", maxWidth: 580 }}>
        <div style={{ fontSize: "clamp(22px,3.5vw,34px)", fontWeight: 900, marginBottom: 12, letterSpacing: -0.5, lineHeight: 1.2 }}>
          ✍️ Have a Story to Share?
        </div>
        <p style={{ fontSize: 15, opacity: 0.88, margin: 0, lineHeight: 1.75 }}>
          Are you a beneficiary, community member, or field volunteer? Submit your story — our team reviews every submission and publishes verified stories to inspire more donors.
        </p>
      </div>

      {/* CTA */}
      <a href="/stories#share" style={{
        position: "relative", zIndex: 1,
        padding: "15px 36px", borderRadius: 14, fontWeight: 800, fontSize: 15,
        background: "#E0AB21", color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
        boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
        fontFamily: "inherit",
      }}>
        Share My Story →
      </a>
    </div>
  );
}

function Layout({ children }) {
  return (
    <>
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
          <Route path="/transparency"  element={<Layout><PageGate pageKey="transparency"><Transparency /></PageGate></Layout>} />
          <Route path="/updates"       element={<Layout><PageGate pageKey="updates"><Updates /></PageGate></Layout>} />
          <Route path="/media"         element={<Layout><MediaFeed /></Layout>} />
          <Route path="/login"         element={<Login />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/dashboard/*"   element={<Dashboard />} />
          <Route path="*"              element={<Layout><NotFound /></Layout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>
);
