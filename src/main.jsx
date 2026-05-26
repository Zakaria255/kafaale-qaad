import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar       from './components/Navbar.jsx';
import Footer       from './components/Footer.jsx';
import AiAssistant  from './components/AiAssistant.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import Home         from './pages/Home.jsx';
import About        from './pages/About.jsx';
import HowItWorks   from './pages/HowItWorks.jsx';
import Cases        from './pages/Cases.jsx';
import Donate       from './pages/Donate.jsx';
import Contact      from './pages/Contact.jsx';
import Login        from './pages/Login.jsx';
import Dashboard    from './KafaaleQaadApp.jsx';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <AiAssistant context="website" />
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"              element={<Layout><Home /></Layout>} />
          <Route path="/about"         element={<Layout><About /></Layout>} />
          <Route path="/how-it-works"  element={<Layout><HowItWorks /></Layout>} />
          <Route path="/cases"         element={<Layout><Cases /></Layout>} />
          <Route path="/donate"        element={<Layout><Donate /></Layout>} />
          <Route path="/contact"       element={<Layout><Contact /></Layout>} />
          <Route path="/login"         element={<Login />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/dashboard/*"   element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
