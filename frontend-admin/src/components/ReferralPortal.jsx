import React, { useState, useEffect } from 'react';
import { getReferrals, createReferral, updateReferralStatus, getHospitals } from '../api.js';

export default function ReferralPortal({ currentLang, currentUser, setActiveModule }) {
  const [activeSubTab, setActiveSubTab] = useState('directory');
  const [referrals, setReferrals] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [filterHospital, setFilterHospital] = useState('all');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    patientName: '', patientId: '', patientAge: '', patientGender: 'Male',
    patientLocation: 'Addis Ababa, Lideta', sendingHospitalId: 'HOSP-002',
    department: 'Cardiology', urgency: 'High',
    reasonForReferral: '', clinicalSummary: '', contactPhone: '+251921198350',
  });

  const isAm = currentLang === 'am';

  useEffect(() => {
    fetchReferrals();
    fetchHospitals();
  }, []);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const data = await getReferrals();
      setReferrals(data.referrals || []);
    } catch (err) {
      console.error('Fetch referrals error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const data = await getHospitals();
      setHospitals(data.hospitals || []);
    } catch (err) {
      console.error('Fetch hospitals error:', err.message);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    if (!form.patientName || !form.reasonForReferral) {
      alert('Please complete all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const data = await createReferral({
        ...form,
        patientAge: parseInt(form.patientAge) || 35,
        receivingHospitalId: 'HOSP-001',
        sendingDoctor: currentUser ? currentUser.name : 'Dr. Tadesse Bekele',
        documents: ['Clinical_History.pdf', 'Lab_Results.pdf'],
      });
      setReferrals([data.referral, ...referrals]);
      setNotification(`✅ Referral ${data.referral.referralId} created successfully!`);
      setActiveSubTab('directory');
      setForm({ patientName: '', patientId: '', patientAge: '', patientGender: 'Male', patientLocation: 'Addis Ababa, Lideta', sendingHospitalId: 'HOSP-002', department: 'Cardiology', urgency: 'High', reasonForReferral: '', clinicalSummary: '', contactPhone: '+251921198350' });
    } catch (err) {
      setNotification(`❌ Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (referralId, newStatus) => {
    try {
      const data = await updateReferralStatus(referralId, {
        status: newStatus,
        assignedDoctor: 'Dr. M. Worku',
        appointmentTime: '2026-08-25T10:00:00Z',
      });
      const updated = referrals.map((r) => r.referralId === referralId ? data.referral : r);
      setReferrals(updated);
      setSelectedReferral(data.referral);
      setNotification(`Referral ${referralId} updated to ${newStatus}. Queue token: ${data.referral.queueToken || 'assigned'}.`);
    } catch (err) {
      setNotification(`❌ Error: ${err.message}`);
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    if (filterHospital === 'zewditu') return r.receivingHospitalId === 'HOSP-001';
    if (filterHospital === 'lideta') return r.sendingHospitalId === 'HOSP-002';
    return true;
  });

  return (
    <div>
      {/* Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '6px', color: '#fff' }}>
              <i className="fas fa-hospital-user"></i> {isAm ? 'ሆስፒታል ሪፈራል ኔትወርክ' : 'Hospital-to-Hospital Referral Network'}
            </h2>
            <p style={{ color: '#e0f2fe', fontSize: '14px', maxWidth: '700px' }}>
              {isAm ? 'ኦፊሴላዊ ሪፈራል ማስተላለፊያ ሥርዓት።' : 'Official referral transmission system between verified health facilities.'}
            </p>
          </div>
          <button className="btn btn-success" onClick={() => setActiveSubTab(activeSubTab === 'directory' ? 'create' : 'directory')}>
            <i className={`fas fa-${activeSubTab === 'directory' ? 'plus-circle' : 'list'}`}></i>{' '}
            {activeSubTab === 'directory' ? (isAm ? 'አዲስ ሪፈራል' : 'Create New Referral') : (isAm ? 'ዝርዝር' : 'View Referrals')}
          </button>
        </div>
      </div>

      {notification && (
        <div style={{ background: notification.startsWith('❌') ? '#fde8e8' : '#d4edda', color: notification.startsWith('❌') ? '#721c24' : '#155724', padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>
          {notification}
          <button onClick={() => setNotification('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* CREATE REFERRAL */}
      {activeSubTab === 'create' && (
        <div className="card">
          <div className="card-header">
            <h3><i className="fas fa-file-medical"></i> {isAm ? 'አዲስ ሪፈራል ሰነድ' : 'New Hospital Referral Document'}</h3>
            <span className="status-badge status-verified"><i className="fas fa-shield-alt"></i> Verified Staff</span>
          </div>
          <form onSubmit={handleCreateReferral}>
            {/* Section 1: Hospitals */}
            <div style={{ background: '#f8faff', padding: '20px', borderRadius: '14px', marginBottom: '20px' }}>
              <h4 style={{ color: '#0f3b5e', marginBottom: '14px' }}><i className="fas fa-hospital"></i> 1. Referral Route</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Sending Hospital *</label>
                  <select value={form.sendingHospitalId} onChange={(e) => setForm({ ...form, sendingHospitalId: e.target.value })}>
                    {hospitals.map((h) => <option key={h.hospitalId} value={h.hospitalId}>{h.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Receiving Hospital (Fixed)</label>
                  <select disabled style={{ background: '#eef2f7', color: '#0f3b5e', fontWeight: 600, cursor: 'not-allowed' }}>
                    <option>Zewditu Memorial Hospital (Exclusive Partner)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Patient */}
            <div style={{ background: '#f8faff', padding: '20px', borderRadius: '14px', marginBottom: '20px' }}>
              <h4 style={{ color: '#0f3b5e', marginBottom: '14px' }}><i className="fas fa-user-injured"></i> 2. Patient Information</h4>
              <div className="form-grid-2">
                <div className="form-group"><label>Patient Full Name *</label><input type="text" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="Ahmed Kamara" required /></div>
                <div className="form-group"><label>HealFund ID (Optional)</label><input type="text" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="HF-0247" /></div>
              </div>
              <div className="form-grid-2">
                <div className="form-group"><label>Age</label><input type="number" value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })} placeholder="42" /></div>
                <div className="form-group"><label>Gender</label><select value={form.patientGender} onChange={(e) => setForm({ ...form, patientGender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></div>
              </div>
              <div className="form-grid-2">
                <div className="form-group"><label>Location</label><input type="text" value={form.patientLocation} onChange={(e) => setForm({ ...form, patientLocation: e.target.value })} /></div>
                <div className="form-group"><label>Contact Phone</label><input type="text" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
              </div>
            </div>

            {/* Section 3: Clinical */}
            <div style={{ background: '#f8faff', padding: '20px', borderRadius: '14px', marginBottom: '20px' }}>
              <h4 style={{ color: '#0f3b5e', marginBottom: '14px' }}><i className="fas fa-notes-medical"></i> 3. Clinical Details</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Department *</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    {['Cardiology', 'General Surgery', 'Pediatrics', 'Oncology', 'Orthopedics', 'Neurology'].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Urgency</label>
                  <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                    <option value="High">Emergency / High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low / Elective</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Reason for Referral *</label><textarea rows="2" value={form.reasonForReferral} onChange={(e) => setForm({ ...form, reasonForReferral: e.target.value })} placeholder="State primary diagnosis and reason for specialist care..." required /></div>
              <div className="form-group"><label>Clinical Summary</label><textarea rows="3" value={form.clinicalSummary} onChange={(e) => setForm({ ...form, clinicalSummary: e.target.value })} placeholder="Key symptoms, vitals, medications, lab findings..." /></div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px' }} disabled={submitting}>
              {submitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : <><i className="fas fa-paper-plane"></i> Submit Official Referral</>}
            </button>
          </form>
        </div>
      )}

      {/* REFERRAL DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div>
          <div className="card" style={{ padding: '16px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-filter" style={{ color: '#078930' }}></i>
                <strong>Filter:</strong>
                <select value={filterHospital} onChange={(e) => setFilterHospital(e.target.value)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #d0dbe8' }}>
                  <option value="all">All Records ({referrals.length})</option>
                  <option value="zewditu">Received by Zewditu</option>
                  <option value="lideta">Sent by Lideta HC</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#5e6f82' }}>Showing <strong>{filteredReferrals.length}</strong> referrals</span>
                <button className="btn btn-outline" onClick={fetchReferrals} style={{ fontSize: '13px', padding: '6px 14px' }}>
                  <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selectedReferral ? '1.2fr 1fr' : '1fr', gap: '24px' }}>
            {/* List */}
            <div className="card">
              <div className="card-header"><h3><i className="fas fa-list-alt"></i> Referrals Directory</h3></div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#7a8a9e' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
              ) : filteredReferrals.length === 0 ? (
                <p style={{ color: '#7a8a9e', textAlign: 'center', padding: '20px' }}>No referrals found.</p>
              ) : filteredReferrals.map((r) => (
                <div key={r._id || r.referralId} onClick={() => setSelectedReferral(r)}
                  style={{ padding: '16px', borderRadius: '12px', background: selectedReferral?.referralId === r.referralId ? '#e3f0fa' : '#fafcff', border: selectedReferral?.referralId === r.referralId ? '2px solid #078930' : '1px solid #e9edf4', marginBottom: '12px', cursor: 'pointer', transition: '0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div>
                      <h4 style={{ color: '#0f3b5e', fontSize: '17px' }}>{r.referralId} — {r.patientName} <span style={{ fontSize: '13px', color: '#5e6f82' }}>({r.patientAge}y, {r.patientGender})</span></h4>
                      <p style={{ fontSize: '14px', color: '#4a5a6e', margin: '4px 0' }}>
                        <i className="fas fa-arrow-right" style={{ color: '#078930' }}></i> <strong>{r.sendingHospitalName}</strong> → <strong>{r.receivingHospitalName}</strong>
                      </p>
                      <p style={{ fontSize: '13px', color: '#5e6f82' }}>Dept: <strong>{r.department}</strong> · {r.contactPhone}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-badge ${r.status === 'Accepted' ? 'status-verified' : r.status === 'Rejected' ? 'status-rejected' : 'status-pending'}`}>
                        {r.status === 'Accepted' && <i className="fas fa-check-circle"></i>}
                        {r.status === 'Pending Review' && <i className="fas fa-clock"></i>}
                        {' '}{r.status}
                      </span>
                      <div style={{ fontSize: '12px', color: r.urgency === 'High' ? '#da121a' : '#0f3b5e', marginTop: '6px', fontWeight: 600 }}>{r.urgency} Priority</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail */}
            {selectedReferral && (
              <div className="card" style={{ borderTop: '5px solid #078930' }}>
                <div className="card-header">
                  <h3><i className="fas fa-file-contract"></i> Referral Audit & Review</h3>
                  <button onClick={() => setSelectedReferral(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a8a9e', fontSize: '18px' }}>✕</button>
                </div>

                <div style={{ background: '#f8faff', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                  <h4 style={{ color: '#0f3b5e', fontSize: '18px' }}>{selectedReferral.referralId}</h4>
                  <p style={{ color: '#5e6f82', fontSize: '13px' }}>Issued: {new Date(selectedReferral.createdAt).toLocaleString()}</p>
                </div>

                {[
                  ['Patient', `${selectedReferral.patientName} (${selectedReferral.patientId})`],
                  ['Sending Hospital', selectedReferral.sendingHospitalName],
                  ['Receiving Hospital', selectedReferral.receivingHospitalName],
                  ['Department', selectedReferral.department],
                  ['Urgency', selectedReferral.urgency],
                ].map(([label, val]) => (
                  <div key={label} className="info-row">
                    <span className="label">{label}:</span>
                    <span className="value" style={label === 'Urgency' ? { color: selectedReferral.urgency === 'High' ? '#da121a' : '#078930' } : {}}>{val}</span>
                  </div>
                ))}

                {selectedReferral.queueToken && (
                  <div className="info-row" style={{ background: '#e3f0fa', padding: '8px 12px', borderRadius: '8px' }}>
                    <span className="label">Queue Token:</span>
                    <span className="value" style={{ color: '#078930', fontSize: '16px' }}><strong>{selectedReferral.queueToken}</strong></span>
                  </div>
                )}

                <div style={{ marginTop: '16px', padding: '12px', background: '#fafcff', borderRadius: '10px', border: '1px solid #e9edf4' }}>
                  <strong>Reason for Referral:</strong>
                  <p style={{ fontSize: '14px', color: '#2c3e50', marginTop: '4px' }}>{selectedReferral.reasonForReferral}</p>
                </div>

                {selectedReferral.clinicalSummary && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#fafcff', borderRadius: '10px', border: '1px solid #e9edf4' }}>
                    <strong>Clinical Summary:</strong>
                    <p style={{ fontSize: '14px', color: '#4a5a6e', marginTop: '4px' }}>{selectedReferral.clinicalSummary}</p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eef2f7' }}>
                  <h5 style={{ marginBottom: '10px', color: '#0f3b5e' }}>
                    <i className="fas fa-hospital-alt"></i> Zewditu Hospital Decision:
                  </h5>
                  {selectedReferral.status === 'Pending Review' ? (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="btn btn-success" onClick={() => handleUpdateStatus(selectedReferral.referralId, 'Accepted')}>
                        <i className="fas fa-check-circle"></i> Accept & Generate Queue Token
                      </button>
                      <button className="btn btn-outline" style={{ borderColor: '#da121a', color: '#da121a' }} onClick={() => handleUpdateStatus(selectedReferral.referralId, 'Rejected')}>
                        <i className="fas fa-times-circle"></i> Decline Referral
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#078930', fontWeight: 600 }}>
                      ✅ Status: {selectedReferral.status}. Doctor: {selectedReferral.assignedDoctor || 'Dr. M. Worku'}
                    </div>
                  )}

                  <div style={{ marginTop: '16px', background: '#fff9e6', padding: '12px', borderRadius: '10px', border: '1px solid #ffe599' }}>
                    <p style={{ fontSize: '13px', color: '#856404', margin: '0 0 8px 0' }}>
                      <i className="fas fa-coins" style={{ color: '#078930', marginRight: '6px' }}></i>
                      Does this patient require financial fundraising support?
                    </p>
                    <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                      <i className="fas fa-hand-holding-heart"></i> Open Patient Portal → Financial Aid
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
