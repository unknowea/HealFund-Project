/**
 * HealFund API utility — all fetch calls go through here.
 * Automatically attaches the JWT token stored for the current session.
 */

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  return import.meta.env.PROD ? 'https://healfund-backend.onrender.com/api' : '/api';
};

const BASE = getApiBase();

const getToken = () => localStorage.getItem('healfund_token') || sessionStorage.getItem('healfund_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handle = async (fetchPromise) => {
  try {
    const res = await fetchPromise;
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const data = contentType.includes('application/json') ? await res.json() : {};
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error('Unexpected response format from server. Check backend configuration.');
    }
    return await res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot reach the HealFund backend. Please ensure the backend is running.');
    }
    throw error;
  }
};

const uploadWithProgress = (url, formData, onProgress = () => {}) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  const token = getToken();
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
  });
  xhr.addEventListener('load', () => {
    const contentType = xhr.getResponseHeader('content-type') || '';
    let data = {};
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('The server returned an invalid response.'));
        return;
      }
    }
    if (xhr.status < 200 || xhr.status >= 300) {
      reject(new Error(data.message || `Request failed (${xhr.status})`));
      return;
    }
    if (!contentType.includes('application/json')) {
      reject(new Error('Unexpected response format from server. Check backend configuration.'));
      return;
    }
    resolve(data);
  });
  xhr.addEventListener('error', () => reject(new Error('Cannot reach the HealFund backend. Please ensure the backend is running.')));
  xhr.addEventListener('abort', () => reject(new Error('The upload was cancelled.')));
  xhr.send(formData);
});

// ─── AUTH ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  handle(fetch(`${BASE}/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) }));

export const changePassword = (currentPassword, newPassword) =>
  handle(fetch(`${BASE}/auth/change-password`, { method: 'PUT', headers: headers(), body: JSON.stringify({ currentPassword, newPassword }) }));

export const deleteAccount = () =>
  handle(fetch(`${BASE}/auth/account`, { method: 'DELETE', headers: headers() }));

export const sendOtp = (email, purpose = 'signup') =>
  handle(fetch(`${BASE}/auth/send-otp`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, purpose }) }));

export const verifyOtp = (email, otp, purpose = 'signup') =>
  handle(fetch(`${BASE}/auth/verify-otp`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, otp, purpose }) }));

export const resetPasswordWithOtp = (email, otp, newPassword) =>
  handle(fetch(`${BASE}/auth/reset-password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, otp, newPassword }) }));

export const signup = (payload) =>
  handle(fetch(`${BASE}/auth/signup`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

export const getProfile = () =>
  handle(fetch(`${BASE}/auth/profile`, { headers: headers() }));

export const updateProfile = (payload) =>
  handle(fetch(`${BASE}/auth/profile`, { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }));

// ─── PUBLIC ────────────────────────────────────────────────────────────────────
export const getPublicStats = () =>
  handle(fetch(`${BASE}/public/stats`, { headers: { 'Content-Type': 'application/json' } }));

// ─── HOSPITALS ─────────────────────────────────────────────────────────────────
export const getHospitals = () =>
  handle(fetch(`${BASE}/hospitals`, { headers: headers() }));

// ─── APPOINTMENTS ──────────────────────────────────────────────────────────────
export const getAppointments = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return handle(fetch(`${BASE}/appointments${q ? '?' + q : ''}`, { headers: headers() }));
};

export const requestAppointmentCancellation = (appointmentId, reason) =>
  handle(fetch(`${BASE}/appointments/${encodeURIComponent(appointmentId)}/cancellation-request`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason }),
  }));

export const getAppointmentFileBlob = async (appointmentId, fileId, download = false) => {
  const query = download ? '?download=true' : '';
  const res = await fetch(`${BASE}/appointments/${encodeURIComponent(appointmentId)}/files/${encodeURIComponent(fileId)}${query}`, {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Unable to open this document');
  }
  return res.blob();
};

export const createAppointment = (payload) => {
  if (payload instanceof FormData) {
    return handle(
      fetch(`${BASE}/appointments`, {
        method: 'POST',
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        body: payload,
      })
    );
  }
  return handle(fetch(`${BASE}/appointments`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));
};

export const uploadAdditionalAppointmentDocs = (appointmentId, file, onProgress) => {
  const formData = new FormData();
  formData.append('supportingFile', file);
  return uploadWithProgress(`${BASE}/appointments/${encodeURIComponent(appointmentId)}/upload-additional-docs`, formData, onProgress);
};
export const getQueue = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return handle(fetch(`${BASE}/queue${q ? '?' + q : ''}`, { headers: headers() }));
};

export const updateQueueStatus = (token, status) =>
  handle(fetch(`${BASE}/queue/${encodeURIComponent(token)}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) }));

// ─── FINANCIAL CASES ───────────────────────────────────────────────────────────
export const getFinancialCases = () =>
  handle(fetch(`${BASE}/financial-cases`, { headers: headers() }));

export const donate = (id, payload) =>
  handle(fetch(`${BASE}/financial-cases/${id}/donate`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

export const verifyDonation = (txRef) =>
  handle(fetch(`${BASE}/financial-cases/donations/${encodeURIComponent(txRef)}/verify`, { method: 'POST', headers: headers() }));

// ─── MESSAGES ──────────────────────────────────────────────────────────────────
export const getMessages = () =>
  handle(fetch(`${BASE}/messages`, { headers: headers() }));

export const sendMessage = (payload) =>
  handle(fetch(`${BASE}/messages`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));

export const updateMessageStatus = (id, status) =>
  handle(fetch(`${BASE}/messages/${encodeURIComponent(id)}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) }));

export const replyToMessage = (id, replyText) =>
  handle(fetch(`${BASE}/messages/${encodeURIComponent(id)}/reply`, { method: 'POST', headers: headers(), body: JSON.stringify({ replyText }) }));

export const deleteMessage = (id) =>
  handle(fetch(`${BASE}/messages/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() }));

// ─── FILE UPLOAD ───────────────────────────────────────────────────────────────
export const getPatientDocuments = () =>
  handle(fetch(`${BASE}/files`, { headers: headers() }));

export const getNotifications = () =>
  handle(fetch(`${BASE}/notifications`, { headers: headers() }));

export const getPushPublicKey = () =>
  handle(fetch(`${BASE}/notifications/public-key`, { headers: { 'Content-Type': 'application/json' } }));

export const savePushSubscription = (subscription) =>
  handle(fetch(`${BASE}/notifications/subscriptions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(subscription),
  }));

export const removePushSubscription = (endpoint) =>
  handle(fetch(`${BASE}/notifications/subscriptions`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify(endpoint ? { endpoint } : {}),
  }));

export const markNotificationRead = (id) =>
  handle(fetch(`${BASE}/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',
    headers: headers(),
  }));

export const uploadFile = (file, onProgress) => {
  const formData = new FormData();
  formData.append('medicalFile', file);
  return uploadWithProgress(`${BASE}/files/upload`, formData, onProgress);
};
