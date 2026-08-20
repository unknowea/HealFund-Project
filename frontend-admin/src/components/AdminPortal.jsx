import React, { useState, useEffect } from 'react';
import WhatsAppMessaging from './WhatsAppMessaging';

// --- API Helper ---
const API = (path, opts) =>
  fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

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
      const res = await API('/api/auth/login', {
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
    } catch {
      setError('Server unreachable. Make sure the backend is running.');
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
              placeholder="superadmin@healfund.et" required autoComplete="username" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Authenticating…</>
              : <><i className="fas fa-unlock-alt"></i> Sign In as Admin</>}
          </button>
        </form>
        <p className="admin-login-hint">
          <i className="fas fa-info-circle"></i> Demo: <code>admin@zewditu.gov.et</code> / <code>admin123</code>
          &nbsp;or&nbsp; <code>staff@lidetahc.gov.et</code> / <code>hospital123</code>
        </p>
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
function DashboardTab({ stats, log }) {
  if (!stats) return <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading stats…</div>;
  const pct = stats.totalTarget > 0 ? Math.min(100, Math.round((stats.totalRaised / stats.totalTarget) * 100)) : 0;
  return (
    <div>
      <div className="admin-stats-grid">
        <StatCard icon="fas fa-users" label="Registered Users" value={fmt(stats.totalUsers)} color="#078930" />
        <StatCard icon="fas fa-file-medical" label="Documents" value={fmt(stats.totalDocuments)} color="#6f42c1" sub={`${stats.pendingDocuments} awaiting review`} />
        <StatCard icon="fas fa-hand-holding-heart" label="Financial Cases" value={fmt(stats.totalFinancialCases)} color="#e07b00" sub={`${fmt(stats.totalDonors)} donors`} />
        <StatCard icon="fas fa-calendar-check" label="Appointments" value={fmt(stats.totalAppointments)} color="#078930" />
        <StatCard icon="fas fa-hospital" label="Hospitals" value={fmt(stats.totalHospitals)} color="#078930" />
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

  const load = async (status = filter) => {
    setLoading(true);
    try {
      const q = status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
      const res = await API(`/api/admin/documents${q}`);
      const data = await res.json();
      if (data.success) setDocs(data.documents);
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
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await API(`/api/admin/documents/${id}`, { method: 'DELETE' });
    setSelected(null);
    load(filter);
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
                      <a href={`/api/admin/documents/${doc.id}/file`} target="_blank" rel="noreferrer"
                        className="admin-btn-warning" title="Download Confidential File (Admin Only)"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}>
                        <i className="fas fa-download"></i>
                      </a>
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
              <a href={`/api/admin/documents/${selected.id}/file`} target="_blank" rel="noreferrer"
                className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 18px' }}>
                <i className="fas fa-download"></i> Inspect & Download Privacy File
              </a>
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
                      <option value="Cardiology Clinic (Room 104)">Cardiology Clinic (Room 104)</option>
                      <option value="General Surgery Clinic (Room 201)">General Surgery Clinic (Room 201)</option>
                      <option value="Pediatrics Clinic (Room 108)">Pediatrics Clinic (Room 108)</option>
                      <option value="Internal Medicine Clinic (Room 105)">Internal Medicine Clinic (Room 105)</option>
                      <option value="Oncology Consultation (Room 302)">Oncology Consultation (Room 302)</option>
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
              <button className="btn btn-success" style={{ flex: 1.2, padding: '10px' }} disabled={saving}
                onClick={() => handleVerify('Verified')}>
                {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>} Verify & Accept to Waiting List
              </button>
              <button className="btn" style={{ flex: 1, background: '#da121a', color: '#fff', padding: '10px' }} disabled={saving}
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
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (email) => {
    await API(`/api/admin/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
    setConfirmDelete(null);
    load();
  };

  const filtered = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.patientId || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
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
              <tr><th>Name</th><th>Email</th><th>Patient ID</th><th>Gender</th><th>Location</th><th>Status</th><th>Registered</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#7a8a9e' }}>No users found</td></tr>}
              {filtered.map((u, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="admin-avatar">{(u.name || 'U').charAt(0)}</div>
                      <span style={{ fontWeight: 600 }}>{u.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: '#4a5a6e' }}>{u.email}</td>
                  <td><code className="admin-code">{u.patientId || u.hospitalId || '—'}</code></td>
                  <td>{u.gender || '—'}</td>
                  <td style={{ fontSize: '13px' }}>{u.location || u.hospitalName || '—'}</td>
                  <td>
                    <span className={`status-badge ${u.status === 'Verified' || u.role ? 'status-verified' : 'status-pending'}`}>
                      {u.role || u.status || 'Patient'}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: '#7a8a9e' }}>{u.registered || '—'}</td>
                  <td>
                    <button className="admin-btn-danger" title="Delete user" onClick={() => setConfirmDelete(u.email)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
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
            <h3 style={{ marginBottom: '8px' }}>Delete User?</h3>
            <p style={{ color: '#5e6f82', marginBottom: '24px' }}>Permanently remove <strong>{confirmDelete}</strong>. Cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: '#da121a', color: '#fff' }} onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Financial Tab ---
function FinancialTab() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientName: '', patientId: '', diagnosis: '', targetAmount: '', description: '', verifyingHospital: '', verifiedByDoctor: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API('/api/admin/financial-cases');
      const data = await res.json();
      if (data.success) setCases(data.cases);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleStatusToggle = async (id, current) => {
    await API(`/api/admin/financial-cases/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: current === 'Active' ? 'Closed' : 'Active' }) });
    load();
  };
  const handleDelete = async (id) => { await API(`/api/admin/financial-cases/${id}`, { method: 'DELETE' }); load(); };
  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await API('/api/admin/financial-cases', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ patientName: '', patientId: '', diagnosis: '', targetAmount: '', description: '', verifyingHospital: '', verifiedByDoctor: '' });
      load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h3 style={{ color: '#0f3b5e', fontSize: '17px', fontWeight: 700 }}><i className="fas fa-hand-holding-heart" style={{ color: '#e07b00' }}></i> Financial Cases</h3>
        <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }} onClick={() => setShowForm(true)}><i className="fas fa-plus"></i> New Case</button>
      </div>
      {loading ? <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading cases…</div> : (
        <div className="admin-cases-grid">
          {cases.length === 0 && <div style={{ textAlign: 'center', color: '#7a8a9e', padding: '40px' }}>No financial cases yet.</div>}
          {cases.map((c) => {
            const pct = c.targetAmount > 0 ? Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100)) : 0;
            return (
              <div key={c.id} className="admin-case-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div><div style={{ fontWeight: 700, fontSize: '16px', color: '#0f3b5e' }}>{c.patientName}</div><div style={{ fontSize: '12px', color: '#7a8a9e' }}>{c.id} · {c.patientId}</div></div>
                  <span className={`status-badge ${c.status === 'Active' ? 'status-verified' : 'status-pending'}`}>{c.status}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#4a5a6e', marginBottom: '8px' }}><i className="fas fa-stethoscope" style={{ color: '#078930', marginRight: '6px' }}></i>{c.diagnosis}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                  <span style={{ color: '#078930', fontWeight: 700 }}>{fmt(c.raisedAmount)} ETB</span>
                  <span style={{ color: '#7a8a9e' }}>of {fmt(c.targetAmount)} ETB ({pct}%)</span>
                </div>
                <div className="progress-container"><div className="progress-bar-fill" style={{ width: pct + '%' }}></div></div>
                <div style={{ fontSize: '13px', color: '#7a8a9e', margin: '6px 0 14px' }}><i className="fas fa-users" style={{ marginRight: '4px' }}></i>{fmt(c.donorsCount)} donors</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={`btn ${c.status === 'Active' ? 'btn-outline' : 'btn-success'}`} style={{ flex: 1, fontSize: '13px', padding: '6px 12px' }} onClick={() => handleStatusToggle(c.id, c.status)}>
                    {c.status === 'Active' ? <><i className="fas fa-pause"></i> Close</> : <><i className="fas fa-play"></i> Reopen</>}
                  </button>
                  <button className="admin-btn-danger" onClick={() => handleDelete(c.id)}><i className="fas fa-trash"></i></button>
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

// --- Hospitals Tab ---
function HospitalsTab() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', level: '', phone: '', departments: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await API('/api/admin/hospitals'); const data = await res.json(); if (data.success) setHospitals(data.hospitals); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleVerify = async (id) => { await API(`/api/admin/hospitals/${id}/verify`, { method: 'PUT' }); load(); };
  const handleDelete = async (id) => { await API(`/api/admin/hospitals/${id}`, { method: 'DELETE' }); load(); };
  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await API('/api/admin/hospitals', { method: 'POST', body: JSON.stringify({ ...form, departments: form.departments.split(',').map((d) => d.trim()).filter(Boolean) }) });
      setShowForm(false); setForm({ name: '', location: '', level: '', phone: '', departments: '' }); load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h3 style={{ color: '#0f3b5e', fontSize: '17px', fontWeight: 700 }}><i className="fas fa-hospital" style={{ color: '#17a2b8' }}></i> Hospitals</h3>
        <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }} onClick={() => setShowForm(true)}><i className="fas fa-plus"></i> Add Hospital</button>
      </div>
      {loading ? <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading hospitals…</div> : (
        <div className="card">
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Name</th><th>Location</th><th>Level</th><th>Departments</th><th>Phone</th><th>Verified</th><th>Actions</th></tr></thead>
            <tbody>
              {hospitals.map((h) => (
                <tr key={h.id}>
                  <td><code className="admin-code">{h.id}</code></td>
                  <td style={{ fontWeight: 600 }}>{h.name}</td>
                  <td style={{ fontSize: '13px' }}>{h.location}</td>
                  <td style={{ fontSize: '13px', color: '#4a5a6e' }}>{h.level}</td>
                  <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{(h.departments || []).slice(0, 3).map((d) => <span key={d} className="admin-dept-pill">{d}</span>)}{h.departments && h.departments.length > 3 && <span className="admin-dept-pill">+{h.departments.length - 3}</span>}</div></td>
                  <td style={{ fontSize: '13px' }}>{h.phone}</td>
                  <td><span className={`status-badge ${h.verified ? 'status-verified' : 'status-pending'}`}>{h.verified ? <><i className="fas fa-check-circle"></i> Verified</> : 'Unverified'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className={h.verified ? 'admin-btn-warning' : 'admin-btn-success'} title={h.verified ? 'Revoke' : 'Verify'} onClick={() => handleVerify(h.id)}><i className={`fas ${h.verified ? 'fa-times-circle' : 'fa-check-circle'}`}></i></button>
                      <button className="admin-btn-danger" title="Delete" onClick={() => handleDelete(h.id)}><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#0f3b5e' }}><i className="fas fa-hospital" style={{ color: '#17a2b8' }}></i> Add Hospital</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Hospital Name *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label>Location *</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></div>
              <div className="form-grid-2">
                <div className="form-group"><label>Level</label>
                  <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option value="">Select level</option>
                    {['Primary Health Care Unit','General Hospital','General & Referral Hospital','Specialized Referral Hospital','Tertiary / Referral Hospital','National Specialized Hospital'].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Phone</label><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Departments <span style={{ color: '#7a8a9e', fontWeight: 400 }}>(comma-separated)</span></label><input type="text" value={form.departments} onChange={(e) => setForm({ ...form, departments: e.target.value })} placeholder="Cardiology, Surgery, Pediatrics" /></div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-plus"></i> Add Hospital</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Queue Tab ---
function QueueTab() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const res = await API('/api/admin/queue'); const data = await res.json(); if (data.success) setQueue(data.queue); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleStatus = async (token, status) => {
    await API(`/api/admin/queue/${token}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    load();
  };
  const handleRemove = async (token) => { await API(`/api/admin/queue/${token}`, { method: 'DELETE' }); load(); };

  const statusColors = { Scheduled: '#0f3b5e', Waiting: '#e07b00', 'In Progress': '#078930', Completed: '#28a745', Cancelled: '#da121a' };
  const urgencyClass = (u) => u === 'High' ? 'status-urgency-high' : u === 'Medium' ? 'status-urgency-medium' : 'status-urgency-low';

  return (
    <div>
      <div className="admin-toolbar">
        <h3 style={{ color: '#0f3b5e', fontSize: '17px', fontWeight: 700 }}><i className="fas fa-list-ol" style={{ color: '#da121a' }}></i> Queue Management</h3>
        <button className="btn btn-outline" style={{ fontSize: '13px', padding: '6px 16px' }} onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
      </div>
      {loading ? <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Loading queue…</div> : (
        <div className="card">
          <table className="admin-table">
            <thead><tr><th>Token</th><th>Patient</th><th>Department</th><th>Doctor</th><th>Est. Time</th><th>Urgency</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {queue.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#7a8a9e' }}>Queue is empty</td></tr>}
              {queue.map((q) => (
                <tr key={q.token}>
                  <td><span className="admin-token">{q.token}</span></td>
                  <td><div style={{ fontWeight: 600 }}>{q.patientName}</div><div style={{ fontSize: '12px', color: '#7a8a9e' }}>{q.patientId}</div></td>
                  <td style={{ fontSize: '13px' }}>{q.department}</td>
                  <td style={{ fontSize: '13px' }}>{q.assignedDoctor}</td>
                  <td style={{ fontSize: '12px', color: '#7a8a9e', whiteSpace: 'nowrap' }}>{fmtDate(q.estimatedTime)}</td>
                  <td><span className={`status-badge ${urgencyClass(q.urgency)}`}>{q.urgency}</span></td>
                  <td>
                    <select value={q.status} onChange={(e) => handleStatus(q.token, e.target.value)}
                      style={{ border: `2px solid ${statusColors[q.status] || '#d0dbe8'}`, borderRadius: '8px', padding: '4px 8px', fontWeight: 600, fontSize: '13px', color: statusColors[q.status] || '#1e2b3c', background: '#fff', cursor: 'pointer' }}>
                      {['Scheduled','Waiting','In Progress','Completed','Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="admin-btn-danger" title="Remove" onClick={() => handleRemove(q.token)}><i className="fas fa-trash"></i></button></td>
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
  const [replying, setReplying] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('healfund_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setMessages(data.messages);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await fetch(`/api/messages/${id}/status`, {
      method: 'PUT', headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Read' }),
    });
    load();
  };

  const handleDelete = async (id) => {
    await fetch(`/api/messages/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    setSelected(null);
    load();
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setReplying(true);
    try {
      const msgId = selected.messageId || selected.id || selected._id;
      const res = await fetch(`/api/messages/${msgId}/reply`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ replyText: reply }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyOk(`✅ Reply saved. In production this would be emailed to ${selected.contact}`);
      } else {
        setReplyOk(`Reply marked as sent to ${selected.contact}`);
      }
    } catch (err) {
      setReplyOk(`Reply saved for ${selected.contact}`);
    }
    const updated = messages.map((m) => (m.messageId === selected.messageId || m._id === selected._id) ? { ...m, status: 'Replied' } : m);
    setMessages(updated);
    setSelected({ ...selected, status: 'Replied' });
    setReply('');
    setReplying(false);
    setTimeout(() => setReplyOk(''), 5000);
  };

  const unread = messages.filter((m) => m.status === 'Unread').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px', alignItems: 'start' }}>
      <div className="card" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ color: '#0f3b5e', fontSize: '16px', margin: 0 }}><i className="fas fa-inbox"></i> Inbox</h3>
          <span className="admin-count-badge">{unread} unread</span>
        </div>
        {loading ? <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {messages.length === 0 && <p style={{ color: '#7a8a9e', textAlign: 'center', padding: '24px' }}>No messages</p>}
            {messages.map((m) => (
              <div key={m.id || m._id} onClick={() => { setSelected(m); if (m.status === 'Unread') markRead(m.id || m._id); }}
                style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', border: selected?.id === m.id ? '2px solid #0f3b5e' : '1px solid #e2eaf3', background: selected?.id === m.id ? '#f0f4fc' : m.status === 'Unread' ? '#fff' : '#f8fafd' }}>
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
              <button className="admin-btn-danger" onClick={() => handleDelete(selected.id || selected._id)}><i className="fas fa-trash"></i></button>
            </div>
            <div style={{ fontSize: '13px', color: '#4a5a6e', marginBottom: '10px' }}>
              <span style={{ background: '#e8f0fe', color: '#0f3b5e', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, marginRight: '10px' }}>{selected.category}</span>
              {fmtDate(selected.createdAt)}
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2eaf3', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' }}>{selected.message}</div>
            {replyOk && <div className="admin-alert admin-alert-success"><i className="fas fa-check-circle"></i> {replyOk}</div>}
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
    try {
      const token = localStorage.getItem('healfund_token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const [sRes, lRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders }),
        fetch('/api/admin/activity-log', { headers: authHeaders }),
      ]);
      const sData = await sRes.json();
      const lData = await lRes.json();
      if (sData.success) setStats(sData.stats);
      if (lData.success) setLog(lData.log);
    } catch { /* server may not be running */ }
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
    { id: 'dashboard', label: 'Dashboard',  icon: 'fas fa-tachometer-alt' },
    { id: 'documents', label: 'Documents',  icon: 'fas fa-file-medical', badge: stats?.pendingDocuments || null },
    { id: 'users',     label: 'Users',      icon: 'fas fa-users' },
    { id: 'financial', label: 'Financials', icon: 'fas fa-hand-holding-heart' },
    { id: 'hospitals', label: 'Hospitals',  icon: 'fas fa-hospital' },
    { id: 'queue',     label: 'Queue',      icon: 'fas fa-list-ol' },
    { id: 'messages',  label: 'Messages',   icon: 'fas fa-inbox' },
    { id: 'chat',      label: 'Live Chat',  icon: 'fas fa-comments' },
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

      {/* Tab Nav */}
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`admin-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.id); if (t.id === 'dashboard') loadDashboard(); }}>
            <i className={t.icon}></i>
            <span>{t.label}</span>
            {t.badge > 0 && (
              <span style={{ background: '#da121a', color: '#fff', borderRadius: '30px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="admin-content">
        {activeTab === 'dashboard' && <DashboardTab stats={stats} log={log} />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'users'     && <UsersTab />}
        {activeTab === 'financial' && <FinancialTab />}
        {activeTab === 'hospitals' && <HospitalsTab />}
        {activeTab === 'queue'     && <QueueTab />}
        {activeTab === 'messages'  && <MessagesTab />}
        {activeTab === 'chat'      && <WhatsAppMessaging currentLang={currentLang} currentUser={adminUser} isAdmin={true} />}
      </div>
    </div>
  );
}
