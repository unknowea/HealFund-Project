import React, { useState, useEffect } from 'react';
import { apiUrl } from '../api.js';

// --- API Helper ---
const getAuthHeaders = () => {
  const token = localStorage.getItem('healfund_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
const API = (path, opts = {}) => {
  const { headers: extraHeaders, ...rest } = opts;
  return fetch(apiUrl(path), { headers: { ...getAuthHeaders(), ...extraHeaders }, ...rest }).then(async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed (${response.status})`);
    }
    return response;
  });
};

const openDocumentFile = async (documentId, action = 'view') => {
  const fileWindow = window.open('', '_blank');
  try {
    const token = localStorage.getItem('healfund_token');
    const response = await fetch(apiUrl(`/api/admin/documents/${encodeURIComponent(documentId)}/file?action=${action}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Unable to access document (${response.status})`);
    }
    const blob = await response.blob();
    const fileUrl = URL.createObjectURL(blob);
    if (action === 'download') {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = documentId;
      link.click();
      fileWindow?.close();
      URL.revokeObjectURL(fileUrl);
    } else if (fileWindow) {
      fileWindow.location.href = fileUrl;
    }
  } catch (error) {
    fileWindow?.close();
    alert(error.message);
  }
};

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function GenderChoice({ value, onChange, required = false }) {
  return (
    <fieldset className="gender-choice-field">
      <legend>Gender</legend>
      <div className="gender-choice-options" role="group" aria-label="Gender">
        {[
          { value: 'Male', icon: 'fa-mars' },
          { value: 'Female', icon: 'fa-venus' },
        ].map((option) => (
          <button
            className={`gender-choice-button${value === option.value ? ' selected' : ''}`}
            type="button"
            key={option.value}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <i className={`fas ${option.icon}`} aria-hidden="true"></i>{option.value}
          </button>
        ))}
      </div>
      {required && !value && <span className="gender-choice-error">Choose Male or Female.</span>}
    </fieldset>
  );
}

// --- Admin Login Gate ---
function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.user?.role === 'patient') {
          setError('Access denied. Staff credentials required.');
          setLoading(false);
          return;
        }
        localStorage.setItem('healfund_token', data.token);
        localStorage.setItem('healfund_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Server unreachable. Make sure the backend is running.'
        : err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-box">
        <div className="admin-login-icon"><i className="fas fa-shield-alt"></i></div>
        <h2>Admin Access</h2>
        <p className="admin-login-sub">HealFund System Administration</p>
        {error && <div className="admin-alert admin-alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email" required autoComplete="username" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Authenticating…</>
              : <><i className="fas fa-unlock-alt"></i> Sign In</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Stat Card ---
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="admin-stat-card" style={{ borderTopColor: color }}>
      <div className="admin-stat-icon" style={{ background: color + '18', color }}>
        <i className={icon}></i>
      </div>
      <div>
        <div className="admin-stat-value">{value}</div>
        <div className="admin-stat-label">{label}</div>
        {sub && <div className="admin-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// --- Dashboard Tab ---
function DashboardTab({ stats, log, loading, error, onRetry }) {
  if (loading && !stats) return <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading stats…</div>;
  if (error && !stats) {
    return (
      <div className="card" role="alert" style={{ textAlign: 'center', padding: '32px' }}>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={onRetry}><i className="fas fa-sync-alt"></i> Retry</button>
      </div>
    );
  }
  if (!stats) return null;
  const pct = stats.totalTarget > 0 ? Math.min(100, Math.round((stats.totalRaised / stats.totalTarget) * 100)) : 0;
  return (
    <div>
      <div className="admin-stats-grid">
        <StatCard icon="fas fa-users" label="Registered Patients" value={fmt(stats.totalUsers)} color="#078930" />
        <StatCard icon="fas fa-file-medical" label="Uploaded Documents" value={fmt(stats.totalDocuments)} color="#6f42c1" sub={stats.totalDocuments === 0 ? 'No files uploaded yet' : `${stats.pendingDocuments} awaiting review`} />
        <StatCard icon="fas fa-hand-holding-heart" label="Financial Cases" value={fmt(stats.totalFinancialCases)} color="#e07b00" sub={`${fmt(stats.totalDonors)} total donors`} />
        <StatCard icon="fas fa-calendar-check" label="Appointments" value={fmt(stats.totalAppointments)} color="#078930" />
      </div>

      {/* Document verification summary */}
      <div className="card" style={{ marginTop: 0, marginBottom: '24px' }}>
        <div className="card-header">
          <h3><i className="fas fa-file-medical"></i> Document Verification Summary</h3>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { label: 'Pending Review', value: stats.pendingDocuments, color: '#e07b00', icon: 'fas fa-clock' },
            { label: 'Verified', value: stats.verifiedDocuments, color: '#078930', icon: 'fas fa-check-circle' },
            { label: 'Rejected', value: stats.rejectedDocuments, color: '#da121a', icon: 'fas fa-times-circle' },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f4f9f6', borderRadius: '12px', padding: '14px 20px', flex: '1', minWidth: '140px' }}>
              <i className={s.icon} style={{ fontSize: '22px', color: s.color }}></i>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#7a8a9e', fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fundraising */}
      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-chart-line"></i> Fundraising Overview</h3>
          <span className="admin-pct-badge">{pct}% funded</span>
        </div>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div><div className="admin-fund-label">Total Raised</div><div className="admin-fund-value" style={{ color: '#078930' }}>{fmt(stats.totalRaised)} ETB</div></div>
          <div><div className="admin-fund-label">Total Target</div><div className="admin-fund-value" style={{ color: '#0d5a3d' }}>{fmt(stats.totalTarget)} ETB</div></div>
          <div><div className="admin-fund-label">Total Donors</div><div className="admin-fund-value" style={{ color: '#e07b00' }}>{fmt(stats.totalDonors)}</div></div>
        </div>
        <div className="progress-container"><div className="progress-bar-fill" style={{ width: pct + '%' }}></div></div>
      </div>

      {/* Activity Log */}
      <div className="card">
        <div className="card-header"><h3><i className="fas fa-history"></i> Recent Activity</h3></div>
        <table className="admin-table">
          <thead><tr><th>Action</th><th>Detail</th><th>Actor</th><th>Time</th></tr></thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#7a8a9e' }}>No activity yet</td></tr>}
            {log.map((e) => (
              <tr key={e.id}>
                <td><span className="admin-tag">{e.action}</span></td>
                <td style={{ fontSize: '13px' }}>{e.detail}</td>
                <td style={{ fontSize: '13px' }}>{e.actor}</td>
                <td style={{ fontSize: '12px', color: '#7a8a9e', whiteSpace: 'nowrap' }}>{fmtDate(e.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Documents Tab (core feature: verification, privacy access & waiting list placement) ---
function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [addToWaitingList, setAddToWaitingList] = useState(true);
  const [department, setDepartment] = useState('Cardiology Clinic (Room 104)');
  const [urgency, setUrgency] = useState('Medium');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const load = async (status = filter) => {
    setLoading(true);
    setError('');
    try {
      const q = status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
      const res = await API(`/api/admin/documents${q}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not load documents');
      setDocs(data.documents || []);
    } catch (err) {
      setError(err.message || 'Could not load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFilterChange = (f) => { setFilter(f); load(f); };

  const openDetail = (doc) => {
    setSelected(doc);
    setNote(doc.adminNote || '');
    setAddToWaitingList(true);
    setDepartment('Cardiology Clinic (Room 104)');
    setUrgency('Medium');
  };

  const handleVerify = async (status) => {
    if (!selected) return;
    if (status === 'Rejected' && !note.trim()) {
      alert('Please provide a reason / note for rejecting the patient document.');
      return;
    }
    setSaving(true);
    try {
      const res = await API(`/api/admin/documents/${selected.id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          adminNote: note,
          addToWaitingList,
          department,
          urgency,
          assignedDoctor: 'Dr. M. Worku',
        }),
      });
      const data = await res.json();
      if (data.success) {
        const tokenMsg = data.queueToken ? ` (Waiting List Token: ${data.queueToken})` : '';
        setToast(`Document marked as ${status}${tokenMsg}`);
        setTimeout(() => setToast(''), 4000);
        setSelected(data.document);
        load(filter);
      } else setError(data.message || 'Could not update document');
    } catch (err) {
      setError(err.message || 'Could not update document');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      const res = await API(`/api/admin/documents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not delete document');
      setSelected(null);
      await load(filter);
    } catch (err) {
      setError(err.message || 'Could not delete document');
    }
  };

  const statusClass = (s) => {
    if (s === 'Verified') return 'status-verified';
    if (s === 'Rejected') return 'status-rejected';
    return 'status-pending';
  };

  const fileIcon = (type) => {
    if (type === 'pdf') return 'fas fa-file-pdf';
    if (['jpg', 'jpeg', 'png'].includes(type)) return 'fas fa-file-image';
    return 'fas fa-file-alt';
  };

  const filtered = docs.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.patientName.toLowerCase().includes(q) ||
      d.patientId.toLowerCase().includes(q) ||
      d.originalName.toLowerCase().includes(q)
    );
  });

  const counts = {
    All: docs.length,
    'Pending Verification': docs.filter((d) => d.status === 'Pending Verification').length,
    Verified: docs.filter((d) => d.status === 'Verified').length,
    Rejected: docs.filter((d) => d.status === 'Rejected').length,
  };

  return (
    <div>
      {toast && (
        <div className="admin-alert admin-alert-success" style={{ marginBottom: '16px' }}>
          <i className="fas fa-check-circle"></i> {toast}
        </div>
      )}
      {error && <div className="admin-alert admin-alert-error" role="alert">{error} <button type="button" onClick={() => load(filter)}>Retry</button></div>}

      {/* Admin Privacy Access Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0d5a3d 0%, #105a3d 100%)', color: '#fff', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h4 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <i className="fas fa-user-shield" style={{ color: '#10b981' }}></i> Restricted Patient Privacy Document Access
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
            As an Administrator, you have exclusive authorization to inspect confidential patient medical records, verify document validity, and place patients on the hospital waiting list.
          </p>
        </div>
        <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981', padding: '6px 14px', fontSize: '12px' }}>
          <i className="fas fa-lock"></i> Confidential — Admin Only
        </span>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search patient name, ID or filename…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="admin-filter-pills">
          {Object.entries(counts).map(([label, count]) => (
            <button key={label} className={`admin-pill ${filter === label ? 'active' : ''}`}
              onClick={() => handleFilterChange(label)}>
              {label === 'Pending Verification' ? 'Pending' : label}
              <span style={{ marginLeft: '5px', background: 'rgba(0,0,0,0.12)', borderRadius: '30px', padding: '1px 7px', fontSize: '11px' }}>{count}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-outline" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => load(filter)}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {loading ? (
        <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading privacy documents…</div>
      ) : (
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Document & Privacy Tag</th>
                <th>Patient</th>
                <th>Category</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th>Queue Token</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#7a8a9e', padding: '32px' }}>No documents found</td></tr>
              )}
              {filtered.map((doc) => (
                <tr key={doc.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(doc)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className={fileIcon(doc.type)} style={{ fontSize: '22px', color: doc.type === 'pdf' ? '#da121a' : '#0d5a3d' }}></i>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0d5a3d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {doc.originalName}
                          <i className="fas fa-lock" title="Confidential Privacy Document" style={{ fontSize: '11px', color: '#64748b' }}></i>
                        </div>
                        <div style={{ fontSize: '11px', color: '#7a8a9e' }}>{doc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{doc.patientName}</div>
                    <div style={{ fontSize: '12px', color: '#7a8a9e' }}>{doc.patientId}</div>
                  </td>
                  <td style={{ fontSize: '13px', color: '#4a5a6e' }}>
                    <span style={{ background: '#edf9f3', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      {doc.category || 'Privacy Record'}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: '#7a8a9e' }}>{doc.size}</td>
                  <td style={{ fontSize: '12px', color: '#7a8a9e', whiteSpace: 'nowrap' }}>{fmtDate(doc.uploadDate)}</td>
                  <td><span className={`status-badge ${statusClass(doc.status)}`}>{doc.status}</span></td>
                  <td>
                    {doc.queueToken ? (
                      <span className="admin-token" style={{ background: '#d4f0e0', color: '#078930', fontWeight: 700 }}>
                        <i className="fas fa-ticket-alt"></i> {doc.queueToken}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>Not Queued</span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="admin-btn-success" title="Review & Verify Document"
                        onClick={() => { openDetail(doc); }}>
                        <i className="fas fa-check-square"></i>
                      </button>
                      <button type="button" className="admin-btn-warning" title="Open Confidential File (Admin Only)"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', textDecoration: 'none' }}
                        onClick={(e) => { e.stopPropagation(); openDocumentFile(doc.id); }}>
                        <i className="fas fa-eye"></i>
                      </button>
                      <button className="admin-btn-danger" title="Delete"
                        onClick={() => handleDelete(doc.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Detail / Verification & Waiting List Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: '600px', maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#0d5a3d', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <i className={fileIcon(selected.type)} style={{ color: selected.type === 'pdf' ? '#da121a' : '#0d5a3d' }}></i>
                Document Verification & Waiting List Portal
              </h3>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
            </div>

            {/* Privacy Security Notice */}
            <div style={{ background: '#f0f8f4', borderLeft: '4px solid #0d5a3d', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#0d5a3d' }}>
              <i className="fas fa-shield-alt" style={{ color: '#078930', marginRight: '6px' }}></i>
              <strong>🔒 Confidential Patient File:</strong> Accessible solely by authorized HealFund Administrators for medical verification.
            </div>

            {/* Doc info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              {[
                ['Document ID', selected.id],
                ['Filename', selected.originalName],
                ['Patient', selected.patientName],
                ['Patient ID', selected.patientId],
                ['Category', selected.category || 'Privacy File'],
                ['File Size', selected.size],
                ['Uploaded', fmtDate(selected.uploadDate)],
                ['Current Status', selected.status],
              ].map(([label, val]) => (
                <div key={label} className="admin-detail-row">
                  <div className="admin-detail-label">{label}</div>
                  <div className="admin-detail-value">{val}</div>
                </div>
              ))}
            </div>

            {/* View / Download Privacy File */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => openDocumentFile(selected.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 18px' }}>
                <i className="fas fa-eye"></i> Open Privacy File
              </button>
              <button type="button" className="btn btn-outline" onClick={() => openDocumentFile(selected.id, 'download')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 18px' }}>
                <i className="fas fa-download"></i> Download
              </button>
              {selected.queueToken && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#d4f0e0', color: '#078930', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '13px' }}>
                  <i className="fas fa-ticket-alt"></i> Waiting List Token: {selected.queueToken}
                </div>
              )}
            </div>

            {/* Waiting List Configuration (when Accepting) */}
            <div style={{ background: '#f8fef9', border: '1px solid #d4f0e0', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#0d5a3d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-list-ol" style={{ color: '#078930' }}></i> Hospital Waiting List Settings
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                  <input type="checkbox" checked={addToWaitingList} onChange={(e) => setAddToWaitingList(e.target.checked)}
                    style={{ width: '17px', height: '17px', accentColor: '#078930' }} />
                  Automatically place patient on Hospital Waiting List (Queue) upon verification
                </label>
              </div>

              {addToWaitingList && (
                <div className="form-grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Clinic / Department</label>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} style={{ padding: '8px', fontSize: '13px' }}>
                      <option value="General Medicine Clinic">General Medicine Clinic</option>
                      <option value="Cardiology Clinic (Room 104)">Cardiology Clinic (Room 104)</option>
                      <option value="General Surgery Clinic (Room 201)">General Surgery Clinic (Room 201)</option>
                      <option value="Pediatrics Clinic (Room 108)">Pediatrics Clinic (Room 108)</option>
                      <option value="Internal Medicine Clinic (Room 105)">Internal Medicine Clinic (Room 105)</option>
                      <option value="Oncology Consultation (Room 302)">Oncology Consultation (Room 302)</option>
                      <option value="Orthopedics Clinic">Orthopedics Clinic</option>
                      <option value="Neurology & Neurosurgery Clinic">Neurology & Neurosurgery Clinic</option>
                      <option value="Nephrology & Dialysis Unit">Nephrology & Dialysis Unit</option>
                      <option value="Ophthalmology Specialty Clinic">Ophthalmology Specialty Clinic</option>
                      <option value="Obstetrics & Gynecology Clinic">Obstetrics & Gynecology Clinic</option>
                      <option value="Pulmonology & Respiratory Clinic">Pulmonology & Respiratory Clinic</option>
                      <option value="Gastroenterology & Hepatology Clinic">Gastroenterology & Hepatology Clinic</option>
                      <option value="Urology Surgery Clinic">Urology Surgery Clinic</option>
                      <option value="Dermatology Clinic">Dermatology Clinic</option>
                      <option value="ENT Specialty Clinic">ENT Specialty Clinic</option>
                      <option value="Psychiatry & Mental Health Clinic">Psychiatry & Mental Health Clinic</option>
                      <option value="Endocrinology Clinic">Endocrinology Clinic</option>
                      <option value="Hematology Clinic">Hematology Clinic</option>
                      <option value="Infectious Diseases Clinic">Infectious Diseases Clinic</option>
                      <option value="Emergency & Trauma Triage">Emergency & Trauma Triage</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Priority / Urgency Level</label>
                    <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ padding: '8px', fontSize: '13px' }}>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Routine">Routine Priority</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Admin note & rejection reason */}
            <div className="form-group">
              <label><i className="fas fa-sticky-note" style={{ color: '#078930' }}></i> Admin Note / Rejection Reason</label>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Verified lab report & ECG. Patient assigned to Cardiology waiting list. / Rejection reason: Document scan is unreadable."
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d0dbe8', fontSize: '14px' }} />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-success" style={{ flex: 1.2, padding: '10px', borderRadius: '30px' }} disabled={saving}
                onClick={() => handleVerify('Verified')}>
                {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>} Verify & Accept to Waiting List
              </button>
              <button className="btn" style={{ flex: 1, background: '#da121a', color: '#fff', padding: '10px', borderRadius: '30px' }} disabled={saving}
                onClick={() => handleVerify('Rejected')}>
                {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-times-circle"></i>} Reject Document
              </button>
              <button className="btn btn-outline" disabled={saving}
                onClick={() => handleVerify('Pending Verification')}>
                <i className="fas fa-clock"></i> Reset
              </button>
            </div>

            {selected.adminNote && (
              <div className="admin-detail-block" style={{ marginTop: '16px' }}>
                <strong>Last admin note:</strong> {selected.adminNote}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Users Tab ---
function UsersTab({ canDeleteUsers, currentUserEmail, isOwner, isHospitalOfficer }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', gender: 'Male', location: '', status: 'Verified' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', gender: '' });
  const [patientForm, setPatientForm] = useState({ name: '', email: '', password: '', age: '', gender: 'Male', location: '' });
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API('/api/admin/users');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not load users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Could not load users');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (user) => {
    setError('');
    try {
      const endpoint = user.role === 'admin'
        ? `/api/admin/users/admins/${encodeURIComponent(user.email)}`
        : `/api/admin/users/${encodeURIComponent(user.email)}`;
      const res = await API(endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not delete user');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not delete user');
    }
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setError('');
    try {
      const res = await API(`/api/admin/users/${encodeURIComponent(editingUser.email)}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not update profile');
      setEditingUser(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    if (!adminForm.gender) {
      setError('Choose Male or Female for the admin account.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await API('/api/admin/users/admins', {
        method: 'POST',
        body: JSON.stringify(adminForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not create admin account');
      setAdminForm({ name: '', email: '', password: '', gender: '' });
      setShowAdminForm(false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not create admin account');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePatient = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await API('/api/admin/users/patients', {
        method: 'POST',
        body: JSON.stringify(patientForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not create patient account');
      setPatientForm({ name: '', email: '', password: '', age: '', gender: 'Male', location: '' });
      setShowPatientForm(false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not create patient account');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.patientId || u.adminId || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error} <button type="button" onClick={load}>Retry</button></div>}
      <div className="card admin-account-card" style={{ marginBottom: '18px', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Patient accounts</h3>
            <p style={{ color: '#5e6f82', fontSize: '13px', margin: '4px 0 0' }}>Admins and staff can create accounts for patients they are helping.</p>
          </div>
          <button className={`btn admin-account-toggle ${showPatientForm ? 'admin-account-toggle-cancel' : 'btn-primary'}`} type="button" onClick={() => setShowPatientForm((open) => !open)}>
            <i className={`fas ${showPatientForm ? 'fa-times' : 'fa-user-plus'}`}></i> {showPatientForm ? 'Cancel' : 'Add Patient'}
          </button>
        </div>
        {showPatientForm && (
          <form className="admin-account-form admin-patient-form" onSubmit={handleCreatePatient}>
            <label className="admin-form-field">Full name<input required value={patientForm.name} onChange={(event) => setPatientForm({ ...patientForm, name: event.target.value })} /></label>
            <label className="admin-form-field">Email<input required type="email" value={patientForm.email} onChange={(event) => setPatientForm({ ...patientForm, email: event.target.value })} /></label>
            <label className="admin-form-field">Initial password<input required type="password" minLength={8} autoComplete="new-password" value={patientForm.password} onChange={(event) => setPatientForm({ ...patientForm, password: event.target.value })} /></label>
            <label className="admin-form-field">Age<input required type="number" min="1" max="120" step="1" value={patientForm.age} onChange={(event) => setPatientForm({ ...patientForm, age: event.target.value })} /></label>
            <GenderChoice
              value={patientForm.gender}
              onChange={(gender) => setPatientForm({ ...patientForm, gender })}
              required
            />
            <label className="admin-form-field">Location<input required value={patientForm.location} onChange={(event) => setPatientForm({ ...patientForm, location: event.target.value })} /></label>
            <p className="admin-form-hint">Give the initial password to the patient privately and ask them to change it after signing in.</p>
            <button className="btn btn-success admin-patient-submit" type="submit" disabled={saving}><i className="fas fa-user-plus"></i>{saving ? 'Creating…' : 'Create Patient'}</button>
          </form>
        )}
      </div>
      {isOwner && (
        <div className="card admin-account-card" style={{ marginBottom: '18px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0 }}>Admin accounts</h3>
              <p style={{ color: '#5e6f82', fontSize: '13px', margin: '4px 0 0' }}>Owner-only controls for creating and removing administrators.</p>
            </div>
            <button className={`btn admin-account-toggle ${showAdminForm ? 'admin-account-toggle-cancel' : 'btn-primary'}`} type="button" onClick={() => setShowAdminForm((open) => !open)}>
              <i className="fas fa-user-plus"></i> {showAdminForm ? 'Cancel' : 'Add Admin'}
            </button>
          </div>
          {showAdminForm && (
            <form className="admin-account-form" onSubmit={handleCreateAdmin}>
              <label className="admin-form-field">Name<input required value={adminForm.name} onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })} /></label>
              <label className="admin-form-field">Email<input required type="email" value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} /></label>
              <label className="admin-form-field">Temporary password<input required type="password" minLength={8} value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} /></label>
              <GenderChoice
                value={adminForm.gender}
                onChange={(gender) => setAdminForm({ ...adminForm, gender })}
                required
              />
              <button className="btn btn-success" type="submit" disabled={saving}><i className="fas fa-user-plus"></i>{saving ? 'Creating…' : 'Create Admin'}</button>
            </form>
          )}
        </div>
      )}
      <div className="admin-toolbar">
        <div className="admin-search">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search by name, email or Patient ID…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="admin-count-badge">{filtered.length} users</span>
      </div>
      {loading ? (
        <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading users…</div>
      ) : (
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>ID</th><th>Gender</th><th>Location</th><th>Role / Status</th><th>Registered</th>{(canDeleteUsers || isOwner) && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={canDeleteUsers || isOwner || isHospitalOfficer ? 8 : 7} style={{ textAlign: 'center', color: '#7a8a9e' }}>No users found</td></tr>}
              {filtered.map((u, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="admin-avatar">{(u.name || 'U').charAt(0)}</div>
                      <span style={{ fontWeight: 600 }}>{u.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: '#4a5a6e' }}>{u.email}</td>
                  <td><code className="admin-code">{u.adminId || u.patientId || u.hospitalId || '—'}</code></td>
                  <td>{u.gender || '—'}</td>
                  <td style={{ fontSize: '13px' }}>{u.location || u.hospitalName || '—'}</td>
                  <td>
                    <span className={`status-badge ${u.status === 'Verified' || u.role ? 'status-verified' : 'status-pending'}`}>
                      {u.adminId?.startsWith('HFO-') ? 'Owner' : u.role || u.status || 'Patient'}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: '#7a8a9e' }}>{u.registered || '—'}</td>
                  {(canDeleteUsers || isOwner || isHospitalOfficer) && <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(isOwner || (isHospitalOfficer && u.role === 'patient' && u.createdByCurrentUser)) && (
                        <button className="admin-btn admin-btn-edit" type="button" aria-label={`Edit ${u.name || u.email} profile`} title="Edit profile" onClick={() => {
                          setEditingUser(u);
                          setEditForm({ name: u.name || '', gender: u.gender === 'Female' ? 'Female' : 'Male', location: u.location || '', status: u.status || 'Verified' });
                        }}>
                          <i className="fas fa-edit"></i>
                        </button>
                      )}
                      {u.email.toLowerCase() !== (currentUserEmail || '').toLowerCase() &&
                        ((u.role === 'patient' && canDeleteUsers) ||
                          (u.role === 'patient' && isHospitalOfficer && u.createdByCurrentUser) ||
                          ((u.role === 'admin' || u.role === 'hospital_officer') && isOwner)) && (
                        <button className="admin-btn-danger" type="button" aria-label={`Delete ${u.role === 'admin' ? 'admin' : u.role === 'hospital_officer' ? 'staff' : 'patient'} ${u.email}`} title={u.role === 'admin' ? 'Delete admin' : u.role === 'hospital_officer' ? 'Delete staff account' : 'Delete patient'} onClick={() => setConfirmDelete(u)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '40px', color: '#da121a', marginBottom: '16px' }}></i>
            <h3 style={{ marginBottom: '8px' }}>Delete {confirmDelete.role === 'admin' ? 'Admin' : 'User'}?</h3>
            <p style={{ color: '#5e6f82', marginBottom: '24px' }}>Permanently remove <strong>{confirmDelete.email}</strong>. Cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: '#da121a', color: '#fff' }} onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {editingUser && (
        <div className="modal-overlay">
          <form className="modal-box profile-edit-form" onSubmit={handleUpdateProfile}>
            <div className="profile-edit-heading">
              <div className="profile-edit-icon"><i className="fas fa-user-edit"></i></div>
              <h3>Edit profile</h3>
              <p>{editingUser.email} · {editingUser.role}</p>
            </div>
            <label className="profile-edit-field">Name<input required value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
            <GenderChoice
              value={editForm.gender}
              onChange={(gender) => setEditForm({ ...editForm, gender })}
              required
            />
            <label className="profile-edit-field">Location<input required value={editForm.location} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })} /></label>
            <label className="profile-edit-field">Status
              <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                <option>Verified</option><option>Pending</option><option>Suspended</option>
              </select>
            </label>
            <div className="profile-edit-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={saving}><i className="fas fa-save"></i>{saving ? 'Saving…' : 'Save profile'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// --- Financial Tab ---
function FinancialTab({ canDeleteCases }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [form, setForm] = useState({ patientName: '', patientId: '', diagnosis: '', targetAmount: '', description: '', verifyingHospital: '', verifiedByDoctor: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API('/api/admin/financial-cases');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not load financial cases');
      setCases(data.cases || []);
    } catch (err) {
      setError(err.message || 'Could not load financial cases');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleStatusToggle = async (caseId, current) => {
    setError('');
    try {
      const res = await API(`/api/admin/financial-cases/${caseId}/status`, { method: 'PUT', body: JSON.stringify({ status: current === 'Active' ? 'Closed' : 'Active' }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not update case status');
      await load();
    } catch (err) {
      setError(err.message || 'Could not update case status');
    }
  };
  const handleDelete = async (caseId) => {
    if (!window.confirm('Delete this financial case?')) return;
    setError('');
    try {
      const res = await API(`/api/admin/financial-cases/${caseId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not delete case');
      await load();
    } catch (err) {
      setError(err.message || 'Could not delete case');
    }
  };
  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await API('/api/admin/financial-cases', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not create financial case');
      setShowForm(false);
      setForm({ patientName: '', patientId: '', diagnosis: '', targetAmount: '', description: '', verifyingHospital: '', verifiedByDoctor: '' });
      await load();
    } catch (err) {
      setError(err.message || 'Could not create financial case');
    } finally { setSaving(false); }
  };

  const statusBadgeClass = (status) => {
    if (status === 'Active') return 'status-verified';
    if (status === 'Funded') return 'status-approved';
    return 'status-pending'; // Closed
  };

  const filtered = statusFilter === 'All' ? cases : cases.filter((c) => c.status === statusFilter);

  return (
    <div>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error} <button type="button" onClick={load}>Retry</button></div>}
      <div className="admin-toolbar">
        <h3 style={{ color: '#0f3b5e', fontSize: '17px', fontWeight: 700 }}><i className="fas fa-hand-holding-heart" style={{ color: '#e07b00' }}></i> Financial Cases</h3>
        <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }} onClick={() => setShowForm(true)}><i className="fas fa-plus"></i> New Case</button>
      </div>
      {/* Status filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {['All', 'Active', 'Funded', 'Closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '5px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontWeight: statusFilter === s ? 700 : 400,
              border: statusFilter === s ? '2px solid #0f3b5e' : '1.5px solid #d0d9e6',
              background: statusFilter === s ? '#0f3b5e' : '#fff',
              color: statusFilter === s ? '#fff' : '#4a5a6e',
            }}
          >
            {s}
            <span style={{ marginLeft: '6px', fontSize: '12px', opacity: 0.8 }}>
              ({s === 'All' ? cases.length : cases.filter((c) => c.status === s).length})
            </span>
          </button>
        ))}
      </div>
      {loading ? <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading cases…</div> : (
        <div className="admin-cases-grid">
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: '#7a8a9e', padding: '40px' }}>No {statusFilter !== 'All' ? statusFilter.toLowerCase() + ' ' : ''}financial cases yet.</div>}
          {filtered.map((c) => {
            const pct = c.targetAmount > 0 ? Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100)) : 0;
            return (
              <div key={c._id || c.caseId} className="admin-case-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f3b5e' }}>{c.patientName}</div>
                    <div style={{ fontSize: '12px', color: '#7a8a9e' }}>{c.caseId} · {c.patientId}</div>
                  </div>
                  <span className={`status-badge ${statusBadgeClass(c.status)}`}>{c.status}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#4a5a6e', marginBottom: '8px' }}><i className="fas fa-stethoscope" style={{ color: '#078930', marginRight: '6px' }}></i>{c.diagnosis}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                  <span style={{ color: '#078930', fontWeight: 700 }}>{fmt(c.raisedAmount)} ETB</span>
                  <span style={{ color: '#7a8a9e' }}>of {fmt(c.targetAmount)} ETB ({pct}%)</span>
                </div>
                <div className="progress-container"><div className="progress-bar-fill" style={{ width: pct + '%' }}></div></div>
                <div style={{ fontSize: '13px', color: '#7a8a9e', margin: '6px 0 14px' }}><i className="fas fa-users" style={{ marginRight: '4px' }}></i>{fmt(c.donorsCount)} donors</div>
                {c.donations?.length > 0 && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f3b5e', marginBottom: '6px' }}>
                      <i className="fas fa-receipt" style={{ marginRight: '5px' }}></i> Donation History
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {c.donations.slice().reverse().map((donation, index) => (
                        <div key={donation._id || index} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: '#4a5a6e' }}>
                          <span><strong>{donation.donorName}</strong> · {donation.paymentMethod}</span>
                          <strong style={{ color: '#078930', whiteSpace: 'nowrap' }}>{fmt(donation.amount)} ETB</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={`btn ${c.status === 'Active' ? 'btn-outline' : 'btn-success'}`} style={{ flex: 1, fontSize: '13px', padding: '6px 12px' }} onClick={() => handleStatusToggle(c.caseId, c.status)} disabled={c.status === 'Funded'} title={c.status === 'Funded' ? 'Funded cases cannot be reopened' : undefined}>
                    {c.status === 'Active' ? <><i className="fas fa-pause"></i> Close</> : c.status === 'Funded' ? 'Funded' : <><i className="fas fa-play"></i> Reopen</>}
                  </button>
                  {canDeleteCases && <button className="admin-btn-danger" onClick={() => handleDelete(c.caseId)} title="Delete case"><i className="fas fa-trash"></i></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#0f3b5e' }}><i className="fas fa-plus-circle" style={{ color: '#078930' }}></i> New Financial Case</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-grid-2">
                <div className="form-group"><label>Patient Name *</label><input type="text" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} required /></div>
                <div className="form-group"><label>Patient ID</label><input type="text" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="HF-XXXX" /></div>
              </div>
              <div className="form-group"><label>Diagnosis *</label><input type="text" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} required /></div>
              <div className="form-grid-2">
                <div className="form-group"><label>Target Amount (ETB) *</label><input type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} required min="1" /></div>
                <div className="form-group"><label>Verifying Hospital</label><input type="text" value={form.verifyingHospital} onChange={(e) => setForm({ ...form, verifyingHospital: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Verified by Doctor</label><input type="text" value={form.verifiedByDoctor} onChange={(e) => setForm({ ...form, verifiedByDoctor: e.target.value })} /></div>
              <div className="form-group"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Creating…</> : <><i className="fas fa-check"></i> Create Case</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Appointments Tab (Core Triage Workflow: Approve with Dept/Room/10-min slot, Reject, Request Docs) ---
function AppointmentsTab() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Action Modals: 'view' | 'approve' | 'reject' | 'requestDocs' | null
  const [actionType, setActionType] = useState(null);

  // Form states for approval
  const [dept, setDept] = useState('Cardiology Clinic');
  const [roomNum, setRoomNum] = useState('Room 104');
  const [doctor, setDoctor] = useState('Dr. M. Worku');
  const [urgencyVal, setUrgencyVal] = useState('Medium');

  // Form states for rejection
  const [rejectReason, setRejectReason] = useState('');

  // Form states for document request
  const [docListText, setDocListText] = useState('');
  const [reqNote, setReqNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const load = async (status = filter) => {
    setLoading(true);
    setError('');
    try {
      const q = status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
      const res = await API(`/api/appointments${q}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not load appointments');
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err.message || 'Could not load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFilterChange = (f) => { setFilter(f); load(f); };

  const openApproveModal = (appt) => {
    setSelectedAppt(appt);
    setDept(appt.preferredDepartment ? (appt.preferredDepartment.includes('Clinic') ? appt.preferredDepartment : `${appt.preferredDepartment} Clinic`) : 'General Medicine Clinic');
    setRoomNum(appt.assignedRoom || 'Room 101');
    setDoctor(appt.assignedDoctor || 'Dr. M. Worku');
    setUrgencyVal(appt.urgency || 'Medium');
    setActionType('approve');
  };

  const openRejectModal = (appt) => {
    setSelectedAppt(appt);
    setRejectReason(appt.rejectionReason || '');
    setActionType('reject');
  };

  const openRequestDocsModal = (appt) => {
    setSelectedAppt(appt);
    setDocListText(appt.requestedDocuments && appt.requestedDocuments.length > 0 ? appt.requestedDocuments.join(', ') : 'Lab Report, Doctor Referral, Government ID');
    setReqNote(appt.adminNote || '');
    setActionType('requestDocs');
  };

  const openViewDetail = (appt) => {
    setSelectedAppt(appt);
    setActionType('view');
  };

  const submitApprove = async () => {
    if (!selectedAppt) return;
    if (!roomNum.trim()) { alert('Please enter a Room Number (e.g. Room 104)'); return; }
    setSubmitting(true);
    try {
      const apptId = selectedAppt.id || selectedAppt.appointmentId || selectedAppt._id;
      const res = await API(`/api/appointments/${apptId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({
          department: dept,
          roomNumber: roomNum,
          assignedDoctor: doctor,
          urgency: urgencyVal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(`Appointment approved! Assigned to ${data.appointment?.assignedDepartment || dept}, ${data.appointment?.assignedRoom || roomNum} · Queue Token: ${data.queueToken}`);
        setTimeout(() => setToast(''), 5000);
        setActionType(null);
        setSelectedAppt(null);
        load(filter);
      } else {
        alert(data.message || 'Failed to approve appointment.');
      }
    } catch (err) {
      alert('Error approving appointment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!selectedAppt) return;
    if (!rejectReason.trim()) { alert('Please enter a rejection reason.'); return; }
    setSubmitting(true);
    try {
      const apptId = selectedAppt.id || selectedAppt.appointmentId || selectedAppt._id;
      const res = await API(`/api/appointments/${apptId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({
          rejectionReason: rejectReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(`Appointment marked as Rejected.`);
        setTimeout(() => setToast(''), 4000);
        setActionType(null);
        setSelectedAppt(null);
        load(filter);
      } else {
        alert(data.message || 'Failed to reject appointment.');
      }
    } catch (err) {
      alert('Error rejecting appointment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRequestDocs = async () => {
    if (!selectedAppt) return;
    if (!docListText.trim()) { alert('Please specify the required documents.'); return; }
    setSubmitting(true);
    try {
      const apptId = selectedAppt.id || selectedAppt.appointmentId || selectedAppt._id;
      const docList = docListText.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await API(`/api/appointments/${apptId}/request-docs`, {
        method: 'PUT',
        body: JSON.stringify({
          requestedDocuments: docList,
          adminNote: reqNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(`Additional documents requested for patient ${selectedAppt.patientName}.`);
        setTimeout(() => setToast(''), 4000);
        setActionType(null);
        setSelectedAppt(null);
        load(filter);
      } else {
        alert(data.message || 'Failed to request documents.');
      }
    } catch (err) {
      alert('Error requesting documents: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const urgencyClass = (u) =>
    u === 'Emergency' ? 'status-urgency-high' :
    u === 'High' ? 'status-urgency-high' :
    u === 'Medium' ? 'status-urgency-medium' : 'status-urgency-low';

  const urgencyBadgeStyle = (u) => {
    if (u === 'Emergency') return { background: '#da121a', color: '#fff' };
    if (u === 'High') return { background: '#e05000', color: '#fff' };
    if (u === 'Medium') return { background: '#e07b00', color: '#fff' };
    return { background: '#078930', color: '#fff' };
  };

  const filtered = appointments.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.patientName && a.patientName.toLowerCase().includes(q)) ||
      (a.patientId && a.patientId.toLowerCase().includes(q)) ||
      (a.disease && a.disease.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  });

  const counts = {
    All: appointments.length,
    'Pending Review': appointments.filter((a) => a.status === 'Pending Review' || a.status === 'Pending').length,
    'Additional Documents Required': appointments.filter((a) => a.status === 'Additional Documents Required').length,
    Approved: appointments.filter((a) => a.status === 'Approved' || a.status === 'Confirmed').length,
    Rejected: appointments.filter((a) => a.status === 'Rejected').length,
  };

  return (
    <div>
      {toast && (
        <div className="admin-alert admin-alert-success" style={{ marginBottom: '16px' }}>
          <i className="fas fa-check-circle"></i> {toast}
        </div>
      )}
      {error && <div className="admin-alert admin-alert-error" role="alert">{error} <button type="button" onClick={() => load(filter)}>Retry</button></div>}

      {/* Admin Triage Overview Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h4 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px' }}>
            <i className="fas fa-stethoscope"></i> Patient Appointment Triage & Queue Allocation
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#e0f2fe' }}>
            Review submitted patient symptoms, evaluate urgency levels and attached medical files. Approve requests by assigning a <strong>Department</strong> and <strong>Room Number</strong> (allocating a 10-minute queue slot), request additional documents, or reject.
          </p>
        </div>
        <span className="status-badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '6px 14px', fontSize: '12px' }}>
          <i className="fas fa-user-clock"></i> ~10 Mins / Patient Slot
        </span>
      </div>

      {/* Toolbar & Filter Pills */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search patient, symptoms, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-pills">
          {Object.entries(counts).map(([label, count]) => (
            <button
              key={label}
              className={`admin-pill ${filter === label ? 'active' : ''}`}
              onClick={() => handleFilterChange(label)}
            >
              {label === 'Additional Documents Required' ? 'Docs Needed' : label}
              <span style={{ marginLeft: '5px', background: 'rgba(0,0,0,0.12)', borderRadius: '30px', padding: '1px 7px', fontSize: '11px' }}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <button className="btn btn-outline" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => load(filter)}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {loading ? (
        <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading appointment requests…</div>
      ) : (
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient & Booker</th>
                <th>Relationship</th>
                <th>Condition / Disease</th>
                <th>Urgency</th>
                <th>Docs Attached</th>
                <th>Status</th>
                <th>Assigned Dept / Room</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#7a8a9e', padding: '32px' }}>
                    No appointment requests found
                  </td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f3b5e' }}>{a.patientName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {a.patientId} · {a.patientAge ? `${a.patientAge}y/o ` : ''}{a.patientGender || ''}
                    </div>
                  </td>
                  <td>
                    <span className="admin-tag" style={{ background: a.isForSelf ? '#e8f5e9' : '#e0f2fe', color: a.isForSelf ? '#078930' : '#0369a1' }}>
                      {a.isForSelf ? 'Self' : a.relationship || 'Dependent'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '220px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.disease}>
                      {a.disease}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Dept Pref: {a.preferredDepartment || 'General'}
                    </div>
                  </td>
                  <td>
                    <span className="status-badge" style={{ ...urgencyBadgeStyle(a.urgency), fontSize: '11px', padding: '2px 8px' }}>
                      {a.urgency}
                    </span>
                  </td>
                  <td>
                    {a.supportingFiles && a.supportingFiles.length > 0 ? (
                      <span style={{ color: '#078930', fontWeight: 600, fontSize: '12px' }}>
                        <i className="fas fa-paperclip"></i> {a.supportingFiles.length} file(s)
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>None</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${a.status === 'Approved' ? 'status-verified' : a.status === 'Rejected' ? 'status-rejected' : 'status-pending'}`} style={{ fontSize: '12px' }}>
                      {a.status === 'Additional Documents Required' ? 'Docs Needed' : a.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {a.assignedRoom ? (
                      <div>
                        <strong>{a.assignedRoom}</strong>
                        <div style={{ color: '#64748b' }}>{a.assignedDepartment}</div>
                        {a.queueToken && <span style={{ color: '#078930', fontWeight: 700 }}>Token: {a.queueToken}</span>}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-outline"
                        title="View Details"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => openViewDetail(a)}
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button
                        className="btn btn-primary appointment-approve-action"
                        title="Approve & Assign Room"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => openApproveModal(a)}
                      >
                        <i className="fas fa-check"></i>
                      </button>
                      <button
                        className="btn btn-outline"
                        title="Request Additional Docs"
                        style={{ padding: '4px 8px', fontSize: '12px', color: '#e07b00', borderColor: '#e07b00' }}
                        onClick={() => openRequestDocsModal(a)}
                      >
                        <i className="fas fa-file-medical"></i>
                      </button>
                      <button
                        className="admin-btn-danger"
                        title="Reject Appointment"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => openRejectModal(a)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {actionType === 'view' && selectedAppt && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#0f3b5e', margin: 0 }}>
                <i className="fas fa-id-card-alt" style={{ color: '#078930' }}></i> Appointment Request Details
              </h3>
              <button onClick={() => { setActionType(null); setSelectedAppt(null); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <div className="info-row"><span className="label">Patient Name:</span><span className="value"><strong>{selectedAppt.patientName}</strong></span></div>
              <div className="info-row"><span className="label">Patient ID:</span><span className="value">{selectedAppt.patientId}</span></div>
              <div className="info-row"><span className="label">Booked By:</span><span className="value">{selectedAppt.isForSelf ? 'Self' : `Relative / Dependent (${selectedAppt.relationship})`}</span></div>
              <div className="info-row"><span className="label">Age & Gender:</span><span className="value">{selectedAppt.patientAge || '—'} years / {selectedAppt.patientGender || '—'}</span></div>
              <div className="info-row"><span className="label">Phone:</span><span className="value">{selectedAppt.patientPhone || 'Not provided'}</span></div>
              <div className="info-row">
                <span className="label">Urgency:</span>
                <span className="value"><span className="status-badge" style={urgencyBadgeStyle(selectedAppt.urgency)}>{selectedAppt.urgency}</span></span>
              </div>
              <div className="info-row"><span className="label">Current Status:</span><span className="value"><strong>{selectedAppt.status}</strong></span></div>
              {selectedAppt.assignedRoom && (
                <>
                  <div className="info-row"><span className="label">Assigned Room:</span><span className="value"><strong style={{ color: '#078930' }}>{selectedAppt.assignedRoom}</strong></span></div>
                  <div className="info-row"><span className="label">Assigned Department:</span><span className="value"><strong>{selectedAppt.assignedDepartment}</strong></span></div>
                  <div className="info-row"><span className="label">Doctor:</span><span className="value">{selectedAppt.assignedDoctor}</span></div>
                  <div className="info-row"><span className="label">Queue Token:</span><span className="value"><strong>{selectedAppt.queueToken}</strong></span></div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ color: '#0f3b5e', marginBottom: '6px' }}><i className="fas fa-notes-medical"></i> Reported Condition / Symptoms:</h5>
              <div style={{ background: '#fff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#334155' }}>
                {selectedAppt.disease}
              </div>
            </div>

            {selectedAppt.supportingFiles && selectedAppt.supportingFiles.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ color: '#0f3b5e', marginBottom: '8px' }}><i className="fas fa-paperclip"></i> Attached Supporting Documents:</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedAppt.supportingFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '8px 14px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        <i className="fas fa-file-pdf" style={{ color: '#da121a', marginRight: '6px' }}></i> {f.originalName} ({f.size})
                      </span>
                      {f.id && (
                        <span style={{ display: 'inline-flex', gap: '6px' }}>
                          <button type="button" onClick={() => openDocumentFile(f.id)} className="btn btn-outline" style={{ fontSize: '12px', padding: '4px 10px' }}>
                            <i className="fas fa-eye"></i> Open
                          </button>
                          <button type="button" onClick={() => openDocumentFile(f.id, 'download')} className="btn btn-outline" style={{ fontSize: '12px', padding: '4px 10px' }}>
                            <i className="fas fa-download"></i> Download
                          </button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary appointment-approve-action" onClick={() => openApproveModal(selectedAppt)}>
                <i className="fas fa-check"></i> Approve
              </button>
              <button className="btn btn-outline" style={{ color: '#e07b00', borderColor: '#e07b00' }} onClick={() => openRequestDocsModal(selectedAppt)}>
                <i className="fas fa-file-medical"></i> Request Docs
              </button>
              <button className="btn btn-outline" style={{ color: '#da121a', borderColor: '#da121a' }} onClick={() => openRejectModal(selectedAppt)}>
                <i className="fas fa-times"></i> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE MODAL (Assigns Department, Room Number, Doctor, & 10-min Queue Slot) */}
      {actionType === 'approve' && selectedAppt && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#078930', margin: 0 }}>
                <i className="fas fa-check-circle"></i> Approve & Assign Clinic Room
              </h3>
              <button onClick={() => setActionType(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: '#4a5a6e', marginBottom: '16px' }}>
              Approve appointment for <strong>{selectedAppt.patientName}</strong> ({selectedAppt.patientId}). The system will generate a queue token and assign a sequential <strong>~10-minute consultation slot</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700 }}>Assigned Department *</label>
                <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: '100%' }}>
                  <option value="General Medicine Clinic">General Medicine Clinic</option>
                  <option value="Cardiology Clinic">Cardiology Clinic</option>
                  <option value="General Surgery Clinic">General Surgery Clinic</option>
                  <option value="Pediatrics Clinic">Pediatrics Clinic</option>
                  <option value="Orthopedics Clinic">Orthopedics Clinic</option>
                  <option value="Oncology Clinic">Oncology Clinic</option>
                  <option value="Internal Medicine Clinic">Internal Medicine Clinic</option>
                  <option value="Neurology & Neurosurgery Clinic">Neurology & Neurosurgery Clinic</option>
                  <option value="Nephrology & Dialysis Unit">Nephrology & Dialysis Unit</option>
                  <option value="Ophthalmology Specialty Clinic">Ophthalmology Specialty Clinic</option>
                  <option value="Obstetrics & Gynecology Clinic">Obstetrics & Gynecology Clinic</option>
                  <option value="Pulmonology & Respiratory Clinic">Pulmonology & Respiratory Clinic</option>
                  <option value="Gastroenterology & Hepatology Clinic">Gastroenterology & Hepatology Clinic</option>
                  <option value="Urology Surgery Clinic">Urology Surgery Clinic</option>
                  <option value="Dermatology Clinic">Dermatology Clinic</option>
                  <option value="ENT Specialty Clinic">ENT Specialty Clinic</option>
                  <option value="Psychiatry & Mental Health Clinic">Psychiatry & Mental Health Clinic</option>
                  <option value="Endocrinology Clinic">Endocrinology Clinic</option>
                  <option value="Hematology Clinic">Hematology Clinic</option>
                  <option value="Infectious Diseases Clinic">Infectious Diseases Clinic</option>
                  <option value="Emergency & Trauma Triage">Emergency & Trauma Triage</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700 }}>Assigned Room Number *</label>
                <input
                  type="text"
                  placeholder="e.g. Room 104, Room 202, Room 3B"
                  value={roomNum}
                  onChange={(e) => setRoomNum(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700 }}>Assigned Doctor</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. M. Worku"
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700 }}>Triage Urgency Level</label>
                <select value={urgencyVal} onChange={(e) => setUrgencyVal(e.target.value)}>
                  <option value="Routine">Routine (Low)</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High Urgency</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  className="btn btn-primary appointment-approve-action"
                  style={{ flex: 1 }}
                  disabled={submitting}
                  onClick={submitApprove}
                >
                  {submitting ? <><i className="fas fa-spinner fa-spin"></i> Approving…</> : <><i className="fas fa-check"></i> Confirm Approval & Queue</>}
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setActionType(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {actionType === 'reject' && selectedAppt && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#da121a', margin: 0 }}>
                <i className="fas fa-times-circle"></i> Reject Appointment Request
              </h3>
              <button onClick={() => setActionType(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: '#4a5a6e', marginBottom: '16px' }}>
              Please specify the reason for rejecting <strong>{selectedAppt.patientName}'s</strong> appointment request.
            </p>

            <div className="form-group">
              <label style={{ fontWeight: 700 }}>Rejection Reason / Admin Note *</label>
              <textarea
                rows="3"
                placeholder="e.g. Hospital specialized capacity full for this week; please visit the outpatient clinic or re-submit."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d0dbe8' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: '#da121a' }}
                disabled={submitting}
                onClick={submitReject}
              >
                {submitting ? <><i className="fas fa-spinner fa-spin"></i> Rejecting…</> : <><i className="fas fa-times"></i> Confirm Rejection</>}
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setActionType(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST ADDITIONAL DOCUMENTS MODAL */}
      {actionType === 'requestDocs' && selectedAppt && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#e07b00', margin: 0 }}>
                <i className="fas fa-file-medical"></i> Request Additional Documents
              </h3>
              <button onClick={() => setActionType(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: '#4a5a6e', marginBottom: '16px' }}>
              Specify the documents required from <strong>{selectedAppt.patientName}</strong> before approval can proceed.
            </p>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontWeight: 700 }}>List Required Documents (Comma-separated) *</label>
              <input
                type="text"
                placeholder="e.g. Previous Echocardiogram, Government ID, Referral Note"
                value={docListText}
                onChange={(e) => setDocListText(e.target.value)}
              />
              <small style={{ color: '#64748b' }}>Separate each required item with a comma.</small>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 700 }}>Instructions / Note for Patient</label>
              <textarea
                rows="2"
                placeholder="e.g. Please upload your recent lab test report from the past 3 months."
                value={reqNote}
                onChange={(e) => setReqNote(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d0dbe8' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: '#e07b00' }}
                disabled={submitting}
                onClick={submitRequestDocs}
              >
                {submitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting Request…</> : <><i className="fas fa-paper-plane"></i> Send Request to Patient</>}
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setActionType(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HospitalsTab({ canVerifyHospitals }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API('/api/admin/hospitals');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Could not load hospitals');
      setHospitals(data.hospitals || []);
    } catch (err) {
      setError(err.message || 'Could not load hospitals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleVerification = async (hospital) => {
    setUpdatingId(hospital.id);
    setError('');
    try {
      const response = await API(`/api/admin/hospitals/${encodeURIComponent(hospital.id)}/verify`, { method: 'PUT' });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Could not update hospital verification');
      setHospitals((current) => current.map((item) => (
        item.id === hospital.id ? { ...item, verified: data.hospital.verified } : item
      )));
    } catch (err) {
      setError(err.message || 'Could not update hospital verification');
    } finally {
      setUpdatingId('');
    }
  };

  if (loading) return <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading hospitals…</div>;

  return (
    <div>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error} <button type="button" onClick={load}>Retry</button></div>}
      {hospitals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>No hospitals found.</div>
      ) : (
        <div className="admin-cases-grid">
          {hospitals.map((hospital) => (
            <section className="admin-case-card" key={hospital.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ color: '#0d5a3d', fontSize: '17px', margin: 0 }}>{hospital.name}</h3>
                  <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{hospital.id} · {hospital.level}</div>
                </div>
                <span className={`status-badge ${hospital.verified ? 'status-verified' : 'status-pending'}`}>
                  {hospital.verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <p style={{ margin: '12px 0 6px', color: '#334155' }}>{hospital.location}</p>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '13px' }}>
                {hospital.phone || 'No phone listed'} · {(hospital.departments || []).length} departments
              </p>
              {canVerifyHospitals && (
                <button className={`btn ${hospital.verified ? 'btn-outline' : 'btn-success'}`} onClick={() => toggleVerification(hospital)} disabled={updatingId === hospital.id}>
                  {updatingId === hospital.id
                    ? <><i className="fas fa-spinner fa-spin"></i> Updating…</>
                    : hospital.verified ? 'Revoke verification' : 'Verify hospital'}
                </button>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Queue Tab (With Reordering & 10-Minute Consultation Slot Tracking) ---
function QueueTab() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API('/api/admin/queue');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not load queue');
      setQueue(data.queue || []);
    } catch (err) {
      setError(err.message || 'Could not load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (token, status) => {
    setToast('');
    try {
      const res = await API(`/api/admin/queue/${token}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not update queue status');
      setQueue((current) => current.map((item) => item.token === token ? data.item : item));
      setToast(`Token ${token} status updated to ${status}.`);
      setTimeout(() => setToast(''), 4000);
    } catch (err) {
      setToast(`Queue status update failed: ${err.message}`);
    }
  };

  const handleRemove = async (token, patientName) => {
    const confirmed = window.confirm(
      `Remove ${patientName || token} from the queue?\n\nThis will cancel their appointment and they will see "Cancelled by Admin" on their portal.`
    );
    if (!confirmed) return;
    try {
      const res = await API(`/api/admin/queue/${token}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setQueue(data.queue || []);
        setToast(`${patientName || token} removed from queue. Their appointment has been cancelled.`);
        setTimeout(() => setToast(''), 5000);
      }
    } catch (err) {
      setToast(`Queue removal failed: ${err.message}`);
    }
  };

  const handleMove = async (token, direction) => {
    try {
      const res = await API('/api/admin/queue/reorder', {
        method: 'PUT',
        body: JSON.stringify({ action: 'move', token, direction }),
      });
      const data = await res.json();
      if (data.success) {
        setQueue(data.queue);
        setToast(`Queue order updated and 10-minute consultation times recalculated.`);
        setTimeout(() => setToast(''), 4000);
      } else {
        setToast(`❌ Reorder failed: ${data.message || 'Unknown error'}`);
        setTimeout(() => setToast(''), 5000);
      }
    } catch (err) {
      setToast(`Queue update failed: ${err.message}`);
      setTimeout(() => setToast(''), 5000);
    }
  };

  const handlePrioritizeUrgency = async () => {
    try {
      const res = await API('/api/admin/queue/reorder', {
        method: 'PUT',
        body: JSON.stringify({ action: 'prioritize_urgency' }),
      });
      const data = await res.json();
      if (data.success) {
        setQueue(data.queue);
        setToast(`Queue re-prioritized: Emergency & High Urgency patients moved to the front!`);
        setTimeout(() => setToast(''), 4000);
      } else setToast(`Queue prioritization failed: ${data.message || 'Unknown error'}`);
    } catch (err) {
      setToast(`Queue prioritization failed: ${err.message}`);
    }
  };

  const statusColors = { Scheduled: '#0f3b5e', Waiting: '#e07b00', 'In Progress': '#078930', Completed: '#28a745', Cancelled: '#da121a' };
  const urgencyClass = (u) => u === 'Emergency' || u === 'High' ? 'status-urgency-high' : u === 'Medium' ? 'status-urgency-medium' : 'status-urgency-low';

  return (
    <div>
      {toast && (
        <div className="admin-alert admin-alert-success" style={{ marginBottom: '16px' }}>
          <i className="fas fa-check-circle"></i> {toast}
        </div>
      )}
      {error && <div className="admin-alert admin-alert-error" role="alert">{error} <button type="button" onClick={load}>Retry</button></div>}

      <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ color: '#0f3b5e', fontSize: '17px', fontWeight: 700, margin: 0 }}>
            <i className="fas fa-list-ol" style={{ color: '#da121a' }}></i> Queue & Consultation Slot Management
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            ~10 minutes allocated per patient in sequence. Admin can reorder or prioritize high urgency patients.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary"
            style={{ background: '#da121a', fontSize: '13px', padding: '6px 14px', borderRadius: '30px' }}
            onClick={handlePrioritizeUrgency}
            title="Auto-sort High/Emergency urgency patients to the front"
          >
            <i className="fas fa-bolt"></i> Auto-Prioritize by Urgency
          </button>
          <button className="btn btn-outline" style={{ fontSize: '13px', padding: '6px 16px' }} onClick={load}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading queue…</div>
      ) : (
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Token</th>
                <th>Patient</th>
                <th>Dept & Room Number</th>
                <th>Doctor</th>
                <th>Consultation Slot (~10m)</th>
                <th>Urgency</th>
                <th>Status</th>
                <th>Reorder & Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#7a8a9e', padding: '24px' }}>Queue is empty</td></tr>
              )}
              {queue.map((q, idx) => (
                <tr key={q.token}>
                  <td style={{ fontWeight: 800, color: '#64748b' }}>#{idx + 1}</td>
                  <td><span className="admin-token">{q.token}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{q.patientName}</div>
                    <div style={{ fontSize: '12px', color: '#7a8a9e' }}>{q.patientId}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#078930' }}>{q.roomNumber || 'Room 101'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{q.department}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{q.assignedDoctor}</td>
                  <td style={{ fontSize: '12px', color: '#0f3b5e', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {fmtDate(q.estimatedTime)}
                  </td>
                  <td><span className={`status-badge ${urgencyClass(q.urgency)}`}>{q.urgency}</span></td>
                  <td>
                    <select
                      value={q.status}
                      onChange={(e) => handleStatus(q.token, e.target.value)}
                      style={{
                        border: `2px solid ${statusColors[q.status] || '#d0dbe8'}`,
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        color: statusColors[q.status] || '#1e2b3c',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {['Scheduled', 'Waiting', 'In Progress', 'Completed', 'Cancelled'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        disabled={idx === 0}
                        onClick={() => handleMove(q.token, 'up')}
                        title="Move Up in Queue (Earlier Slot)"
                      >
                        ▲
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        disabled={idx === queue.length - 1}
                        onClick={() => handleMove(q.token, 'down')}
                        title="Move Down in Queue (Later Slot)"
                      >
                        ▼
                      </button>
                      <button
                        className="admin-btn-danger"
                        style={{ padding: '3px 8px', fontSize: '11px', marginLeft: '4px' }}
                        title="Remove from Queue & Cancel Appointment"
                        onClick={() => handleRemove(q.token, q.patientName)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Messages Tab ---
function MessagesTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [replyOk, setReplyOk] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState('');
  const messageKey = (message) => message.messageId || message.id || message._id;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('healfund_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/messages'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || `Could not load messages (${res.status})`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message || 'Could not load messages');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      const response = await fetch(apiUrl(`/api/messages/${id}/status`), {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'Read' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not mark message as read');
      setMessages((current) => current.map((message) => message._id === id || message.messageId === id ? data.data : message));
      if (selected && (selected._id === id || selected.messageId === id)) setSelected(data.data);
    } catch (err) {
      setError(err.message || 'Could not mark message as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(apiUrl(`/api/messages/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not delete message');
      setSelected(null);
      setMessages((current) => current.filter((message) => message._id !== id && message.messageId !== id));
    } catch (err) {
      setError(err.message || 'Could not delete message');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setReplyOk('');
    setReplyError('');
    setReplying(true);
    try {
      const msgId = selected.messageId || selected.id || selected._id;
      const res = await fetch(apiUrl(`/api/messages/${msgId}/reply`), {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ replyText: reply }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || `Reply failed (${res.status})`);

      setReplyOk(data.info || `Reply email sent to ${selected.contact}`);
      const updatedMessage = data.data || { ...selected, status: 'Replied', reply };
      setMessages((current) => current.map((message) => (
        message.messageId === updatedMessage.messageId || message._id === updatedMessage._id
          ? updatedMessage
          : message
      )));
      setSelected(updatedMessage);
      setReply('');
      setTimeout(() => setReplyOk(''), 5000);
    } catch (err) {
      setReplyError(err.message || 'Could not send reply email');
    } finally {
      setReplying(false);
    }
  };

  const unread = messages.filter((m) => m.status === 'Unread').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px', alignItems: 'start' }}>
      <div className="card" style={{ padding: '18px' }}>
        {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ color: '#0f3b5e', fontSize: '16px', margin: 0 }}><i className="fas fa-inbox"></i> Messages</h3>
          <span className="admin-count-badge">{unread} unread</span>
        </div>
        {loading ? <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {messages.length === 0 && <p style={{ color: '#7a8a9e', textAlign: 'center', padding: '24px' }}>No messages</p>}
            {messages.map((m) => (
              <div key={messageKey(m)} onClick={() => { setSelected(m); if (m.status === 'Unread') markRead(messageKey(m)); }}
                style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', border: selected && messageKey(selected) === messageKey(m) ? '2px solid #0f3b5e' : '1px solid #e2eaf3', background: selected && messageKey(selected) === messageKey(m) ? '#f0f4fc' : m.status === 'Unread' ? '#fff' : '#f8fafd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {m.status === 'Unread' && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#078930', display: 'inline-block' }}></span>}
                    <strong style={{ fontSize: '14px', color: '#0f3b5e' }}>{m.name}</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: '#7a8a9e' }}>{new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
                <span style={{ fontSize: '11px', background: '#e8f0fe', color: '#0f3b5e', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{m.category}</span>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#4a5a6e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card" style={{ padding: '24px' }}>
        {selected ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eef2f7', paddingBottom: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div className="admin-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>{selected.name.charAt(0)}</div>
                <div><div style={{ fontWeight: 700, color: '#0f3b5e' }}>{selected.name}</div><div style={{ fontSize: '13px', color: '#7a8a9e' }}>{selected.contact}</div></div>
              </div>
              <button className="admin-btn-danger" onClick={() => handleDelete(messageKey(selected))}><i className="fas fa-trash"></i></button>
            </div>
            <div style={{ fontSize: '13px', color: '#4a5a6e', marginBottom: '10px' }}>
              <span style={{ background: '#e8f0fe', color: '#0f3b5e', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, marginRight: '10px' }}>{selected.category}</span>
              {fmtDate(selected.createdAt)}
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2eaf3', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' }}>{selected.message}</div>
            {replyOk && <div className="admin-alert admin-alert-success"><i className="fas fa-check-circle"></i> {replyOk}</div>}
            {replyError && <div className="admin-alert admin-alert-error" role="alert"><i className="fas fa-exclamation-circle"></i> {replyError}</div>}
            <form onSubmit={handleReply}>
              <div className="form-group"><label><i className="fas fa-reply" style={{ color: '#078930' }}></i> Reply</label>
                <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${selected.name}…`} required /></div>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '13px' }} disabled={replying}>
                {replying ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : <><i className="fas fa-paper-plane"></i> Send Reply</>}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a8a9e' }}>
            <i className="fas fa-envelope-open-text" style={{ fontSize: '44px', marginBottom: '12px', color: '#cbd5e1' }}></i>
            <p>Select a message to read and reply</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main AdminPortal ---
export default function AdminPortal({ currentLang, currentUser, activeTab: propActiveTab, onLoginSuccess, onLogout }) {
  const [adminUser, setAdminUser] = useState(currentUser || null);
  const [activeTab, setActiveTab] = useState(propActiveTab || 'dashboard');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [log, setLog] = useState([]);

  // Check saved session on mount if currentUser not passed
  useEffect(() => {
    if (currentUser) {
      setAdminUser(currentUser);
    } else {
      const savedUser = localStorage.getItem('healfund_user');
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          if (u.role === 'admin' || u.role === 'hospital_officer') {
            setAdminUser(u);
          }
        } catch (e) {}
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  useEffect(() => {
    if (adminUser) loadDashboard();
  }, [adminUser]);

  const loadDashboard = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const token = localStorage.getItem('healfund_token');
      if (!token) {
        handleLogout();
        return;
      }
      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const [sRes, lRes] = await Promise.all([
        fetch(apiUrl('/api/admin/stats'), { headers: authHeaders }),
        fetch(apiUrl('/api/admin/activity-log'), { headers: authHeaders }),
      ]);
      if (sRes.status === 401 || lRes.status === 401) {
        handleLogout();
        return;
      }
      const [sData, lData] = await Promise.all([
        sRes.json().catch(() => ({})),
        lRes.json().catch(() => ({})),
      ]);
      if (!sRes.ok || !sData.success) throw new Error(sData.message || 'Could not load dashboard statistics');
      if (!lRes.ok || !lData.success) throw new Error(lData.message || 'Could not load dashboard activity');
      setStats(sData.stats);
      setLog(lData.log || []);
    } catch (err) {
      setStatsError(err.message || 'Could not load dashboard data. Check the backend connection and retry.');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogin = (user) => {
    setAdminUser(user);
    if (onLoginSuccess) onLoginSuccess(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('healfund_token');
    localStorage.removeItem('healfund_user');
    setAdminUser(null);
    if (onLogout) onLogout();
  };

  if (!adminUser) return <AdminLogin onLoginSuccess={handleLogin} />;

  const tabs = [
    { id: 'dashboard',    label: 'Dashboard',    icon: 'fas fa-tachometer-alt' },
    { id: 'appointments', label: 'Appointments', icon: 'fas fa-calendar-check', badge: stats?.pendingAppointments || null },
    { id: 'queue',        label: 'Queue',        icon: 'fas fa-list-ol' },
    { id: 'documents',    label: 'Documents',    icon: 'fas fa-file-medical',   badge: stats?.pendingDocuments || null },
    { id: 'users',        label: 'Users',        icon: 'fas fa-users' },
    { id: 'financial',    label: 'Financials',   icon: 'fas fa-hand-holding-heart' },
    { id: 'hospitals',    label: 'Hospitals',    icon: 'fas fa-hospital' },
  ];
  return (
    <div className="admin-portal">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2 className="admin-header-title"><i className="fas fa-shield-alt"></i> System Administration</h2>
          <p className="admin-header-sub">HealFund · Full Control Panel</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="admin-avatar" style={{ width: '36px', height: '36px', fontSize: '15px' }}>
            {adminUser.avatar || (adminUser.name ? adminUser.name.charAt(0) : 'A')}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{adminUser.name || 'Admin'}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{adminUser.role || 'Administrator'}</div>
          </div>
          <button onClick={handleLogout}
            style={{ background: 'none', border: '1.5px solid #da121a', color: '#fca5a5', borderRadius: '30px', padding: '5px 14px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-content">
        {activeTab === 'dashboard'    && <DashboardTab stats={stats} log={log} loading={statsLoading} error={statsError} onRetry={loadDashboard} />}
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'queue'        && <QueueTab />}
        {activeTab === 'documents'    && <DocumentsTab />}
        {activeTab === 'users'        && <UsersTab
          canDeleteUsers={adminUser.role === 'admin'}
          currentUserEmail={adminUser.email}
          isOwner={adminUser.role === 'admin' && adminUser.email?.toLowerCase() === 'healfund2006@gmail.com'}
          isHospitalOfficer={adminUser.role === 'hospital_officer'}
        />}
        {activeTab === 'financial'    && <FinancialTab canDeleteCases={adminUser.role === 'admin'} />}
        {activeTab === 'hospitals'    && <HospitalsTab canVerifyHospitals={adminUser.role === 'admin'} />}
        {activeTab === 'messages'     && <MessagesTab />}
      </div>
    </div>
  );
}
