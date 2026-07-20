import { createContext, useContext, useEffect, useState } from 'react';
import { auth as authApi, setAuth, clearAuth, getUser, getToken } from '../api/client';

const AuthContext = createContext(null);

// Demo-mode accounts — used when the backend is unreachable
const DEMO_ACCOUNTS = {
  'superadmin@kafaale.org': { id: 'demo-superadmin', name: 'Super Admin',      role: 'super_admin',        email: 'superadmin@kafaale.org' },
  'admin@kafaale.org':      { id: 'demo-admin',      name: 'Ahmed Kafaale',    role: 'admin',              email: 'admin@kafaale.org' },
  'verifier@kafaale.org':   { id: 'demo-verifier',   name: 'Fadumo Warsame',   role: 'verification_office',email: 'verifier@kafaale.org' },
  'agent@kafaale.org':      { id: 'demo-agent',      name: 'Abdi Yusuf',       role: 'field_agent',        email: 'agent@kafaale.org' },
  'donor@kafaale.org':      { id: 'demo-donor',      name: 'Fatima Al-Thani',  role: 'donor',              email: 'donor@kafaale.org' },
  'reporter@kafaale.org':   { id: 'demo-reporter',   name: 'Hodan Farah',      role: 'reporter',           email: 'reporter@kafaale.org' },
  'programs@kafaale.org':   { id: 'demo-programs',   name: 'Sahra Programs',   role: 'program_manager',    email: 'programs@kafaale.org' },
};
const DEMO_PASSWORD = 'Kafaale123!';
const DEMO_TOKEN = 'demo-token-kafaale-qaad';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(false);

  // A demo session is only ever valid while the backend is down. If it's up
  // again, retire the session on boot — otherwise whoever was caught by a
  // transient outage stays pinned to fake empty data with no way out.
  useEffect(() => {
    if (getToken() !== DEMO_TOKEN) return;
    let cancelled = false;
    fetch('/api/health')
      .then((res) => {
        if (cancelled || !res.ok) return;
        clearAuth();
        setUser(null);
      })
      .catch(() => { /* still offline — keep the demo session */ });
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      if (data.token) {
        setAuth(data.user, data.token);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      // Only fall back to demo if the backend is truly unreachable (network/fetch error).
      // Do NOT fall back on 429 (rate limited), 401 (wrong password), or any HTTP error.
      const isNetworkError = err instanceof TypeError || err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('network');
      if (isNetworkError) {
        const demo = DEMO_ACCOUNTS[email.toLowerCase()];
        if (demo && password === DEMO_PASSWORD) {
          setAuth(demo, DEMO_TOKEN);
          setUser(demo);
          return { user: demo, token: DEMO_TOKEN };
        }
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const data = await authApi.register(formData);
      if (data.token) {
        setAuth(data.user, data.token);
        setUser(data.user);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with a Google ID token (credential) obtained from Google Identity Services.
  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const data = await authApi.google(credential);
      if (data.token) { setAuth(data.user, data.token); setUser(data.user); }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    clearAuth();
    setUser(null);
  };

  // Merge fresh profile fields into the current session and persist them.
  const updateUser = (patch) => {
    setUser(prev => {
      const next = { ...(prev || {}), ...patch };
      setAuth(next, getToken());
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updateUser, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
