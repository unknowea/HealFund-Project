/**
 * HealFund API utility — all fetch calls go through here.
 * Automatically attaches the JWT token stored in localStorage.
 */

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  return import.meta.env.PROD ? 'https://healfund-backend.onrender.com/api' : '/api';
};

const BASE = getApiBase();

export const apiUrl = (path) => {
  const apiPath = path.startsWith('/api/') ? path.slice(4) : path;
  return `${BASE}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
};

const getToken = () => localStorage.getItem('healfund_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handle = async (fetchPromise) => {
  const res = await fetchPromise;
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const data = contentType.includes('application/json') ? await res.json() : {};
    throw new Error(data.message || 'Request failed');
  }
  if (!contentType.includes('application/json')) {
    throw new Error('Unexpected response format from server. Check backend configuration.');
  }
  return await res.json();
};

// ─── AUTH ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  handle(fetch(apiUrl('/auth/login'), { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) }));

export const adminLogin = (email, password) =>
  handle(fetch(apiUrl('/auth/admin-login'), { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) }));

export const changePassword = (currentPassword, newPassword) =>
  handle(fetch(apiUrl('/auth/change-password'), { method: 'PUT', headers: headers(), body: JSON.stringify({ currentPassword, newPassword }) }));

export const sendOtp = (email, purpose = 'signup') =>
  handle(fetch(apiUrl('/auth/send-otp'), { method: 'POST', headers: headers(), body: JSON.stringify({ email, purpose }) }));

export const verifyOtp = (email, otp, purpose = 'signup') =>
  handle(fetch(apiUrl('/auth/verify-otp'), { method: 'POST', headers: headers(), body: JSON.stringify({ email, otp, purpose }) }));

export const resetPasswordWithOtp = (email, otp, newPassword) =>
  handle(fetch(apiUrl('/auth/reset-password'), { method: 'POST', headers: headers(), body: JSON.stringify({ email, otp, newPassword }) }));

export const signup = (payload) =>
  handle(fetch(apiUrl('/auth/signup'), { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

export const getProfile = () =>
  handle(fetch(apiUrl('/auth/profile'), { headers: headers() }));

export const updateProfile = (payload) =>
  handle(fetch(apiUrl('/auth/profile'), { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }));

// ─── PUBLIC ────────────────────────────────────────────────────────────────────
export const getPublicStats = () =>
  handle(fetch(apiUrl('/public/stats'), { headers: { 'Content-Type': 'application/json' } }));

// ─── HOSPITALS ─────────────────────────────────────────────────────────────────
export const getHospitals = () =>
  handle(fetch(apiUrl('/hospitals'), { headers: headers() }));

// ─── APPOINTMENTS ──────────────────────────────────────────────────────────────
export const getAppointments = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return handle(fetch(`${apiUrl('/appointments')}${q ? '?' + q : ''}`, { headers: headers() }));
};

export const getAppointmentById = (id) =>
  handle(fetch(apiUrl(`/appointments/${id}`), { headers: headers() }));

export const approveAppointment = (id, payload) =>
  handle(fetch(apiUrl(`/appointments/${id}/approve`), { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }));

export const rejectAppointment = (id, payload) =>
  handle(fetch(apiUrl(`/appointments/${id}/reject`), { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }));

export const requestAdditionalDocs = (id, payload) =>
  handle(fetch(apiUrl(`/appointments/${id}/request-docs`), { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }));

// ─── QUEUE ─────────────────────────────────────────────────────────────────────
export const getQueue = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return handle(fetch(`${apiUrl('/queue')}${q ? '?' + q : ''}`, { headers: headers() }));
};

export const updateQueueStatus = (token, status) =>
  handle(fetch(apiUrl(`/queue/${token}/status`), { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) }));

export const reorderQueue = (payload) =>
  handle(fetch(apiUrl('/admin/queue/reorder'), { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }));

// ─── FINANCIAL CASES ───────────────────────────────────────────────────────────
export const getFinancialCases = () =>
  handle(fetch(apiUrl('/financial-cases'), { headers: headers() }));

export const donate = (id, payload) =>
  handle(fetch(apiUrl(`/financial-cases/${id}/donate`), { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

// ─── MESSAGES ──────────────────────────────────────────────────────────────────
export const getMessages = () =>
  handle(fetch(apiUrl('/messages'), { headers: headers() }));

export const sendMessage = (payload) =>
  handle(fetch(apiUrl('/messages'), { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

export const updateMessageStatus = (id, status) =>
  handle(fetch(apiUrl(`/messages/${id}/status`), { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) }));

export const replyToMessage = (id, replyText) =>
  handle(fetch(apiUrl(`/messages/${id}/reply`), { method: 'POST', headers: headers(), body: JSON.stringify({ replyText }) }));

export const deleteMessage = (id) =>
  handle(fetch(apiUrl(`/messages/${id}`), { method: 'DELETE', headers: headers() }));

// ─── FILE UPLOAD ───────────────────────────────────────────────────────────────
export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('medicalFile', file);
  return handle(
    fetch(apiUrl('/files/upload'), {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: formData,
    })
  );
};
