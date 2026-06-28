// ─── Kafaale Qaad — Central API Client ───────────────────────────────────
// Host-agnostic: set VITE_API_URL at build time to your backend's /api URL.
// Dev falls back to the local API; prod falls back to same-origin "/api"
// (works behind a reverse proxy / same domain) — never a hardcoded host.
const IS_DEV = import.meta.env.DEV;
const API = import.meta.env.VITE_API_URL || (IS_DEV ? 'http://localhost:4000/api' : '/api');
if (!IS_DEV && !import.meta.env.VITE_API_URL) {
  console.warn('[Kafaale] VITE_API_URL is not set — falling back to same-origin "/api". Set it in your Vercel/host env to point at the backend.');
}

// ── Auth helpers ─────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('kf_token');
export const getUser  = () => { try { return JSON.parse(localStorage.getItem('kf_user') || 'null'); } catch { return null; } };
export const setAuth  = (user, token) => { localStorage.setItem('kf_token', token); localStorage.setItem('kf_user', JSON.stringify(user)); };
export const clearAuth = () => { localStorage.removeItem('kf_token'); localStorage.removeItem('kf_user'); };
export const isLoggedIn = () => !!getToken();

const DEMO_TOKEN = 'demo-token-kafaale-qaad';

// True when the current session is the offline demo session (backend unreachable).
export const isDemoMode = () => getToken() === DEMO_TOKEN;

const emit = (name) => { try { window.dispatchEvent(new CustomEvent(name)); } catch { /* SSR */ } };

// ── Core fetch wrapper ────────────────────────────────────────────
async function req(path, opts = {}) {
  const token = getToken();
  // Demo mode — skip real API calls, return empty success shapes
  if (token === DEMO_TOKEN) {
    return demoFallback(path, opts);
  }
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
  let res;
  try {
    res = await fetch(`${API}${path}`, { ...opts, headers });
    emit('kf-api-online'); // got a response → server reachable
  } catch (e) {
    emit('kf-api-offline'); // network/fetch failure → server unreachable
    throw e;
  }
  if (res.status === 401) {
    clearAuth();
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

// Demo fallback — returns plausible empty shapes for every endpoint
function demoFallback(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  if (path.startsWith('/auth/me'))     return Promise.resolve(getUser());
  if (path.startsWith('/auth/logout')) return Promise.resolve({});
  if (path.startsWith('/auth/refresh'))return Promise.resolve({ token: DEMO_TOKEN });
  if (path.startsWith('/cases'))       return Promise.resolve({ cases: [], total: 0, page: 1, pages: 1 });
  if (path.startsWith('/admin/stats')) return Promise.resolve({ totalCases: 0, pendingReview: 0, published: 0, totalRaised: 0, totalDonations: 0, activeAgents: 0 });
  if (path.startsWith('/admin'))       return Promise.resolve({ success: true, items: [], data: [], cases: [], users: [], donations: [] });
  if (path.startsWith('/donations'))   return Promise.resolve({ donations: [], total: 0 });
  if (path.startsWith('/programs'))    return Promise.resolve({ programs: [], beneficiaries: [] });
  if (path.startsWith('/notifications'))return Promise.resolve({ notifications: [], unread: 0 });
  if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')
    return Promise.resolve({ success: true, message: 'Demo mode — changes are local only' });
  return Promise.resolve({});
}

// ── Auth endpoints ────────────────────────────────────────────────
export const auth = {
  login:    (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data)            => req('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me:       ()                => req('/auth/me'),
  logout:   ()                => req('/auth/logout', { method: 'POST' }),
  refresh:  ()                => req('/auth/refresh', { method: 'POST' }),
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
  deleteUser:       (id)                      => req(`/admin/users/${id}`, { method: 'DELETE' }),
  changeRole:       (id, role)                => req(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  audit:            ()                        => req('/admin/audit'),
  donations:        ()                        => req('/admin/donations'),
  confirmDonation:  (id)                      => req(`/admin/donations/${id}/confirm`,         { method: 'PATCH' }),
  assignDelivery:   (id, agentId)             => req(`/admin/cases/${id}/assign-delivery`,     { method: 'PATCH', body: JSON.stringify({ agentId }) }),
  completeCase:     (id, notes)               => req(`/admin/cases/${id}/complete`,            { method: 'PATCH', body: JSON.stringify({ adminNotes: notes }) }),
  requestMoreInfo:  (id, message)             => req(`/admin/cases/${id}/request-info`,        { method: 'PATCH', body: JSON.stringify({ message }) }),
  enrollBeneficiary:(id, data)               => req(`/admin/cases/${id}/enroll-beneficiary`,  { method: 'POST',  body: JSON.stringify(data) }),
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

// ── Partners endpoints ────────────────────────────────────────────
export const partners = {
  all:     () => req('/partners'),
  stories: () => req('/partners/stories'),
};

// ── AI endpoints ──────────────────────────────────────────────────
export const ai = {
  chat:     (message, context, caseId) => req('/ai/chat', { method: 'POST', body: JSON.stringify({ message, context, caseId }) }),
  sanitize: (caseId)                   => req(`/ai/sanitize/${caseId}`, { method: 'POST' }),
};

// ── Programs endpoints ────────────────────────────────────────────
export const programs = {
  list:               ()                      => req('/programs'),
  stats:              ()                      => req('/programs/stats'),
  create:             (data)                  => req('/programs', { method: 'POST', body: JSON.stringify(data) }),
  beneficiaries:      (params = {})           => req('/programs/beneficiaries?' + new URLSearchParams(params)),
  beneficiariesAdmin: (params = {})           => req('/programs/beneficiaries/admin?' + new URLSearchParams(params)),
  enrollBeneficiary:  (data)                  => req('/programs/beneficiaries', { method: 'POST', body: JSON.stringify(data) }),
  verifyBeneficiary:  (id, data)              => req(`/programs/beneficiaries/${id}/verify`, { method: 'PATCH', body: JSON.stringify(data) }),
  getUpdates:         (beneficiaryId)         => req(`/programs/beneficiaries/${beneficiaryId}/updates`),
  submitUpdate:       (beneficiaryId, data)   => req(`/programs/beneficiaries/${beneficiaryId}/updates`, { method: 'POST', body: JSON.stringify(data) }),
  publishUpdate:      (updateId)              => req(`/programs/updates/${updateId}/publish`, { method: 'PATCH' }),
  mySponsorships:     ()                      => req('/programs/sponsorships/my'),
  createSponsorship:  (data)                  => req('/programs/sponsorships', { method: 'POST', body: JSON.stringify(data) }),
  submitPayment:      (sponsorshipId, data)   => req(`/programs/sponsorships/${sponsorshipId}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  getPayments:        (sponsorshipId)         => req(`/programs/sponsorships/${sponsorshipId}/payments`),
  confirmPayment:     (paymentId)             => req(`/programs/payments/${paymentId}/confirm`, { method: 'PATCH' }),
  getInvoice:         (sponsorshipId)         => req(`/programs/sponsorships/${sponsorshipId}/invoice`),
  getMonthlyReport:   (sponsorshipId, y, m)   => req(`/programs/sponsorships/${sponsorshipId}/report/${y}/${m}`),
  adminPayments:      ()                      => req('/programs/admin/payments'),
  bulkEnroll:         (data)                  => req('/programs/beneficiaries/bulk', { method: 'POST', body: JSON.stringify(data) }),
  assignDonor:        (data)                  => req('/programs/beneficiaries/assign-donor', { method: 'POST', body: JSON.stringify(data) }),
  endSponsorship:     (sponsorshipId, reason) => req(`/programs/sponsorships/${sponsorshipId}/end`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  sendReminders:      (data = {})             => req('/programs/send-reminders', { method: 'POST', body: JSON.stringify(data) }),
  markPaid:           (sponsorshipId, data)   => req(`/programs/sponsorships/${sponsorshipId}/mark-paid`, { method: 'POST', body: JSON.stringify(data) }),
  renewContract:      (sponsorshipId, data)   => req(`/programs/sponsorships/${sponsorshipId}/renew`, { method: 'PATCH', body: JSON.stringify(data) }),
  releaseToSeeking:   (beneficiaryId)         => req(`/programs/beneficiaries/${beneficiaryId}/release`, { method: 'PATCH' }),
};

// ── Settings / Document templates endpoints ───────────────────────
export const settings = {
  all:    ()       => req('/settings'),
  update: (data)   => req('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  reset:  (key)    => req(`/settings/${encodeURIComponent(key)}`, { method: 'DELETE' }),
};

// ── Community Projects endpoints ──────────────────────────────────
export const projects = {
  list:        (params = {})  => req('/projects?' + new URLSearchParams(params)),
  get:         (id)           => req(`/projects/${id}`),
  create:      (data)         => req('/projects', { method: 'POST', body: JSON.stringify(data) }),
  contribute:  (id, data)     => req(`/projects/${id}/contribute`, { method: 'POST', body: JSON.stringify(data) }),
  updateStatus:(id, data)     => req(`/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export default { auth, cases, admin, donations, field, notifications, impact, ai, partners, programs, projects, getUser, getToken, isLoggedIn, setAuth, clearAuth };
