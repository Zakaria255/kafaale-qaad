import { createContext, useContext, useState } from 'react';
import { auth as authApi, setAuth, clearAuth, getUser, getToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(false);

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
      // Never fabricate a session on network failure — surface a real
      // connection error instead of silently logging into fake demo data.
      const isNetworkError = err instanceof TypeError || err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('network');
      if (isNetworkError) {
        throw new Error('Unable to connect. Please check your connection and try again.');
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
