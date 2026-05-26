// ─── Kafaale Qaad — Central API Client ───────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ── Auth helpers ─────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('kf_token');
export const getUser  = () => { try { return JSON.parse(localStorage.getItem('kf_user') || 'null'); } catch { return null; } };
export const setAuth  = (user, token) => { localStorage.setItem('kf_token', token); localStorage.setItem('kf_user', JSON.stringify(user)); };
export const clearAuth = () => { localStorage.removeItem('kf_token'); localStorage.removeItem('kf_user'); };
export const isLoggedIn = () => !!getToken();

// ── Core fetch wrapper ────────────────────────────────────────────
async function req(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (res.status === 401) {
    clearAuth();
    // Avoid infinite redirect loop if already on /login
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Invalid email or password');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

// ── Auth endpoints ────────────────────────────────────────────────
export const auth = {
  login:    (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data)            => req('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me:       ()                => req('/auth/me'),
};

// ── Cases endpoints ───────────────────────────────────────────────
export const cases = {
  list:   (params = {}) => req('/cases?' + new URLSearchParams(params)),
  get:    (id)          => req(`/cases/${id}`),
  my:     ()            => req('/cases/my'),
  submit: (data)        => req('/cases', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Admin endpoints ───────────────────────────────────────────────
export const admin = {
  stats:            ()                        => req('/admin/stats'),
  cases:            (params = {})             => req('/admin/cases?' + new URLSearchParams(params)),
  getCase:          (id)                      => req(`/admin/cases/${id}`),
  updateStatus:     (id, status, notes, rejectionReason) => req(`/admin/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes, rejectionReason }) }),
  assign:           (id, agentId)             => req(`/admin/cases/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ agentId }) }),
  publish:          (id, data)                => req(`/admin/cases/${id}/publish`, { method: 'PATCH', body: JSON.stringify(data) }),
  users:            ()                        => req('/admin/users'),
  audit:            ()                        => req('/admin/audit'),
  donations:        ()                        => req('/admin/donations'),
  confirmDonation:  (id)                      => req(`/admin/donations/${id}/confirm`,         { method: 'PATCH' }),
  assignDelivery:   (id, agentId)             => req(`/admin/cases/${id}/assign-delivery`,     { method: 'PATCH', body: JSON.stringify({ agentId }) }),
  completeCase:     (id, notes)               => req(`/admin/cases/${id}/complete`,            { method: 'PATCH', body: JSON.stringify({ adminNotes: notes }) }),
};

// ── Donations endpoints ───────────────────────────────────────────
export const donations = {
  donate: (data) => req('/donate', { method: 'POST', body: JSON.stringify(data) }),
  my:     ()     => req('/donate/my'),
};

// ── Field endpoints ───────────────────────────────────────────────
export const field = {
  assignments: ()     => req('/field/assignments'),
  investigate: (data) => req('/field/investigate', { method: 'POST', body: JSON.stringify(data) }),
  delivery:    (data) => req('/field/delivery',    { method: 'POST', body: JSON.stringify(data) }),
};

// ── Notifications endpoints ───────────────────────────────────────
export const notifications = {
  list:    ()   => req('/notifications'),
  read:    (id) => req(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: ()   => req('/notifications/read-all', { method: 'PATCH' }),
};

// ── Impact endpoints ──────────────────────────────────────────────
export const impact = {
  stats: () => req('/impact'),
};

// ── AI endpoints ──────────────────────────────────────────────────
export const ai = {
  chat:     (message, context, caseId) => req('/ai/chat', { method: 'POST', body: JSON.stringify({ message, context, caseId }) }),
  sanitize: (caseId)                   => req(`/ai/sanitize/${caseId}`, { method: 'POST' }),
};

export default { auth, cases, admin, donations, field, notifications, impact, ai, getUser, getToken, isLoggedIn, setAuth, clearAuth };
