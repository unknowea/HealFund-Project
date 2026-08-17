/**
 * HealFund API utility — all fetch calls go through here.
 * Automatically attaches the JWT token stored in localStorage.
 */

const BASE = '/api';

const getToken = () => localStorage.getItem('healfund_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handle = async (fetchPromise) => {
  const res = await fetchPromise;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ─── AUTH ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  handle(fetch(`${BASE}/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) }));

export const signup = (payload) =>
  handle(fetch(`${BASE}/auth/signup`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

// ─── HOSPITALS ─────────────────────────────────────────────────────────────────
export const getHospitals = () =>
  handle(fetch(`${BASE}/hospitals`, { headers: headers() }));

// ─── REFERRALS ─────────────────────────────────────────────────────────────────
export const getReferrals = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return handle(fetch(`${BASE}/referrals${q ? '?' + q : ''}`, { headers: headers() }));
};

export const createReferral = (payload) =>
  handle(fetch(`${BASE}/referrals`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

export const updateReferralStatus = (id, payload) =>
  handle(fetch(`${BASE}/referrals/${id}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }));

// ─── APPOINTMENTS ──────────────────────────────────────────────────────────────
export const getAppointments = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return handle(fetch(`${BASE}/appointments${q ? '?' + q : ''}`, { headers: headers() }));
};

export const createAppointment = (payload) =>
  handle(fetch(`${BASE}/appointments`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

// ─── QUEUE ─────────────────────────────────────────────────────────────────────
export const getQueue = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return handle(fetch(`${BASE}/queue${q ? '?' + q : ''}`, { headers: headers() }));
};

export const updateQueueStatus = (token, status) =>
  handle(fetch(`${BASE}/queue/${token}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) }));

// ─── FINANCIAL CASES ───────────────────────────────────────────────────────────
export const getFinancialCases = () =>
  handle(fetch(`${BASE}/financial-cases`, { headers: headers() }));

export const donate = (id, payload) =>
  handle(fetch(`${BASE}/financial-cases/${id}/donate`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

// ─── MESSAGES ──────────────────────────────────────────────────────────────────
export const getMessages = () =>
  handle(fetch(`${BASE}/messages`, { headers: headers() }));

export const sendMessage = (payload) =>
  handle(fetch(`${BASE}/messages`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

export const updateMessageStatus = (id, status) =>
  handle(fetch(`${BASE}/messages/${id}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) }));

export const deleteMessage = (id) =>
  handle(fetch(`${BASE}/messages/${id}`, { method: 'DELETE', headers: headers() }));

// ─── FILE UPLOAD ───────────────────────────────────────────────────────────────
export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('medicalFile', file);
  return handle(
    fetch(`${BASE}/files/upload`, {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: formData,
    })
  );
};
