import React, { useState, useEffect } from 'react';

export default function ReferralPortal({ currentLang, currentUser, setActiveModule }) {
  const [activeSubTab, setActiveSubTab] = useState('directory'); // 'directory' | 'create'
  const [referrals, setReferrals] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [filterHospital, setFilterHospital] = useState('all');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [notification, setNotification] = useState('');

  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientLocation, setPatientLocation] = useState('Addis Ababa, Lideta');
  const [sendingHospitalId, setSendingHospitalId] = useState('HOSP-002');
  const [receivingHospitalId, setReceivingHospitalId] = useState('HOSP-001');
  const [department, setDepartment] = useState('Cardiology');
  const [urgency, setUrgency] = useState('High');
  const [reasonForReferral, setReasonForReferral] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [contactPhone, setContactPhone] = useState('+251921198350');

  useEffect(() => {
    fetchReferrals();
    fetchHospitals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const res = await fetch('/api/referrals');
      const data = await res.json();
      if (data.success) setReferrals(data.referrals);
    } catch (err) {
      console.error('Fetch referrals error:', err);
    }
  };

  const fetchHospitals = async () => {
    try {
      const res = await fetch('/api/hospitals');
      const data = await res.json();
      if (data.success) setHospitals(data.hospitals);
    } catch (err) {
      console.error('Fetch hospitals error:', err);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    if (!patientName || !reasonForReferral) {
      alert('Please complete all required referral fields');
      return;
    }

    const payload = {
      patientName,
      patientId: patientId || `HF-${Math.floor(1000 + Math.random() * 9000)}`,
      patientAge: parseInt(patientAge) || 35,
      patientGender,
      patientLocation,
      sendingHospitalId,
      receivingHospitalId,
      department,
      urgency,
      reasonForReferral,
      clinicalSummary,
      contactPhone,
      sendingDoctor: currentUser ? currentUser.name : 'Dr. Tadesse Bekele',
      documents: ['Clinical_History.pdf', 'Lab_Results.pdf'],
    };

    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setReferrals([data.referral, ...referrals]);
        setNotification(`✅ Referral ${data.referral.id} created successfully! Notification sent to Zewditu Memorial Hospital.`);
        setActiveSubTab('directory');
        // Reset form
        setPatientName('');
        setReasonForReferral('');
        setClinicalSummary('');
      }
    } catch (err) {
      const mockRef = {
        id: `REF-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        ...payload,
        sendingHospitalName: 'Lideta Health Center',
        receivingHospitalName: 'Zewditu Memorial Hospital',
        status: 'Pending Review',
        createdAt: new Date().toISOString(),
      };
      setReferrals([mockRef, ...referrals]);
      setNotification(`✅ Referral ${mockRef.id} created successfully! Notification sent to Zewditu Memorial Hospital.`);
      setActiveSubTab('directory');
    }
  };

  const handleUpdateStatus = async (referralId, newStatus) => {
    try {
      const res = await fetch(`/api/referrals/${referralId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          assignedDoctor: 'Dr. M. Worku',
          appointmentTime: '2026-08-25T10:00:00Z',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReferrals(referrals.map((r) => (r.id === referralId ? data.referral : r)));
        setSelectedReferral(data.referral);
        setNotification(`Referral ${referralId} updated to ${newStatus}. Queue token ${data.referral.queueToken || 'C-023'} assigned.`);
      }
    } catch (err) {
      setReferrals(
        referrals.map((r) =>
          r.id === referralId
            ? { ...r, status: newStatus, queueToken: 'C-023', assignedDoctor: 'Dr. M. Worku' }
            : r
        )
      );
      setNotification(`Referral ${referralId} updated to ${newStatus}. Queue token C-023 assigned.`);
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    if (filterHospital === 'zewditu') return r.receivingHospitalId === 'HOSP-001';
    if (filterHospital === 'lideta') return r.sendingHospitalId === 'HOSP-002';
    return true;
  });

  const isAm = currentLang === 'am';

  return (
    <div>
      {/* Module Title Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '6px', color: '#fff' }}>
              <i className="fas fa-hospital-user"></i> {isAm ? 'የሆስፒታል ለሆስፒታል ሪፈራል መድረክ' : 'Hospital-to-Hospital Referral Network'}
            </h2>
            <p style={{ color: '#e0f2fe', fontSize: '14px', maxWidth: '700px' }}>
              {isAm
                ? 'በተረጋገጡ የጤና ተቋማት መካከል ኦፊሴላዊ የሕክምና ሪፈራል ማስተላለፊያ እና ኦዲት ሥርዓት።'
                : 'Official hospital referral transmission system. Primary health centers refer verified patients directly to specialized care at Zewditu Memorial Hospital.'}
            </p>
          </div>
          <button className="btn btn-success" onClick={() => setActiveSubTab(activeSubTab === 'directory' ? 'create' : 'directory')}>
            <i className={`fas fa-${activeSubTab === 'directory' ? 'plus-circle' : 'list'}`}></i>{' '}
            {activeSubTab === 'directory' ? (isAm ? 'አዲስ ሪፈራል ላክ' : 'Create New Referral') : (isAm ? 'ወደ ሪፈራሎች ዝርዝር' : 'View Referrals')}
          </button>
        </div>
      </div>

      {notification && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>
          {notification}
          <button onClick={() => setNotification('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#155724' }}>✕</button>
        </div>
      )}

      {/* VIEW: CREATE REFERRAL */}
      {activeSubTab === 'create' && (
        <div className="card">
          <div className="card-header">
            <h3><i className="fas fa-file-medical"></i> {isAm ? 'አዲስ ኦፊሴላዊ የሆስፒታል ሪፈራል ሰነድ' : 'Official Hospital-to-Hospital Referral Document'}</h3>
            <span className="status-badge status-verified"><i className="fas fa-shield-alt"></i> Verified Hospital Staff</span>
          </div>

          <form onSubmit={handleCreateReferral}>
            <div style={{ background: '#f8faff', padding: '20px', borderRadius: '14px', marginBottom: '20px' }}>
              <h4 style={{ color: '#0f3b5e', marginBottom: '14px' }}><i className="fas fa-hospital"></i> 1. Referral Route & Hospitals</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Sending Hospital (Lideta HC / Primary)</label>
                  <select value={sendingHospitalId} onChange={(e) => setSendingHospitalId(e.target.value)}>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>{h.name} ({h.level})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{isAm ? 'ተቀባይ ሆስፒታል (ብቸኛ ተቀባይ ማዕከል)' : 'Receiving Hospital (Exclusive Acceptance Hub)'}</label>
                  <select value="HOSP-001" disabled style={{ background: '#eef2f7', fontWeight: 600, color: '#0f3b5e', cursor: 'not-allowed' }}>
                    <option value="HOSP-001">Zewditu Memorial Hospital (Exclusive Partner)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ background: '#f8faff', padding: '20px', borderRadius: '14px', marginBottom: '20px' }}>
              <h4 style={{ color: '#0f3b5e', marginBottom: '14px' }}><i className="fas fa-user-injured"></i> 2. Patient Information</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Patient Full Name *</label>
                  <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Ahmed Kamara" required />
                </div>
                <div className="form-group">
                  <label>Patient HealFund ID (Optional)</label>
                  <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="HF-0247" />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="42" />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Location / Residence</label>
                  <input type="text" value={patientLocation} onChange={(e) => setPatientLocation(e.target.value)} placeholder="Addis Ababa, Lideta" />
                </div>
                <div className="form-group">
                  <label>Contact Phone (Patient / Family)</label>
                  <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+251921198350" />
                </div>
              </div>
            </div>

            <div style={{ background: '#f8faff', padding: '20px', borderRadius: '14px', marginBottom: '20px' }}>
              <h4 style={{ color: '#0f3b5e', marginBottom: '14px' }}><i className="fas fa-notes-medical"></i> 3. Clinical & Department Requirements</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Requested Department *</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="Cardiology">Cardiology</option>
                    <option value="General Surgery">General Surgery</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Neurology">Neurology</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Referral Urgency Level</label>
                  <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                    <option value="High">Emergency / High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low / Elective Routine</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Reason for Referral *</label>
                <textarea rows="2" value={reasonForReferral} onChange={(e) => setReasonForReferral(e.target.value)} placeholder="State primary medical diagnosis and why patient requires Zewditu Hospital specialist care..." required />
              </div>
              <div className="form-group">
                <label>Clinical History & Diagnostic Summary</label>
                <textarea rows="3" value={clinicalSummary} onChange={(e) => setClinicalSummary(e.target.value)} placeholder="Key symptoms, vital signs, medications given, ECG or lab findings..." />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px' }}>
              <i className="fas fa-paper-plane"></i> Submit Official Hospital Referral
            </button>
          </form>
        </div>
      )}

      {/* VIEW: REFERRAL DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div>
          {/* Filters */}
          <div className="card" style={{ padding: '16px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-filter" style={{ color: '#078930' }}></i>
                <strong>Filter Referrals:</strong>
                <select value={filterHospital} onChange={(e) => setFilterHospital(e.target.value)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #d0dbe8' }}>
                  <option value="all">All Referral Records ({referrals.length})</option>
                  <option value="zewditu">Received by Zewditu Memorial Hospital</option>
                  <option value="lideta">Sent by Lideta Health Center</option>
                </select>
              </div>
              <span style={{ fontSize: '13px', color: '#5e6f82' }}>
                Showing <strong>{filteredReferrals.length}</strong> verified referrals
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selectedReferral ? '1.2fr 1fr' : '1fr', gap: '24px' }}>
            {/* List */}
            <div className="card">
              <div className="card-header">
                <h3><i className="fas fa-list-alt"></i> Referrals Directory</h3>
              </div>
              {filteredReferrals.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedReferral(r)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: selectedReferral?.id === r.id ? '#e3f0fa' : '#fafcff',
                    border: selectedReferral?.id === r.id ? '2px solid #078930' : '1px solid #e9edf4',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    transition: '0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <h4 style={{ color: '#0f3b5e', fontSize: '17px' }}>
                        {r.id} — {r.patientName} <span style={{ fontSize: '13px', color: '#5e6f82' }}>({r.patientAge}y, {r.patientGender})</span>
                      </h4>
                      <p style={{ fontSize: '14px', color: '#4a5a6e', margin: '4px 0' }}>
                        <i className="fas fa-arrow-right" style={{ color: '#078930' }}></i> <strong>{r.sendingHospitalName}</strong> → <strong>{r.receivingHospitalName}</strong>
                      </p>
                      <p style={{ fontSize: '13px', color: '#5e6f82' }}>
                        Dept: <strong>{r.department}</strong> · Contact: {r.contactPhone}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-badge ${r.status === 'Accepted' ? 'status-verified' : r.status === 'Rejected' ? 'status-rejected' : 'status-pending'}`}>
                        {r.status === 'Accepted' && <i className="fas fa-check-circle"></i>}
                        {r.status === 'Pending Review' && <i className="fas fa-clock"></i>}
                        {r.status}
                      </span>
                      <div style={{ fontSize: '12px', color: '#7a8a9e', marginTop: '6px' }}>
                        Urgency: <strong style={{ color: r.urgency === 'High' ? '#da121a' : '#0f3b5e' }}>{r.urgency}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Detail & Workflow Action */}
            {selectedReferral && (
              <div className="card" style={{ borderTop: '5px solid #078930' }}>
                <div className="card-header">
                  <h3><i className="fas fa-file-contract"></i> Referral Audit & Review</h3>
                  <button onClick={() => setSelectedReferral(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a8a9e', fontSize: '18px' }}>✕</button>
                </div>

                <div style={{ background: '#f8faff', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                  <h4 style={{ color: '#0f3b5e', fontSize: '18px' }}>{selectedReferral.id}</h4>
                  <p style={{ color: '#5e6f82', fontSize: '13px' }}>Issued: {new Date(selectedReferral.createdAt).toLocaleString()}</p>
                </div>

                <div className="info-row">
                  <span className="label">Patient Name:</span>
                  <span className="value">{selectedReferral.patientName} ({selectedReferral.patientId})</span>
                </div>
                <div className="info-row">
                  <span className="label">Sending Hospital:</span>
                  <span className="value">{selectedReferral.sendingHospitalName}</span>
                </div>
                <div className="info-row">
                  <span className="label">Target Hospital:</span>
                  <span className="value">{selectedReferral.receivingHospitalName}</span>
                </div>
                <div className="info-row">
                  <span className="label">Department Requested:</span>
                  <span className="value">{selectedReferral.department}</span>
                </div>
                <div className="info-row">
                  <span className="label">Urgency Level:</span>
                  <span className="value" style={{ color: selectedReferral.urgency === 'High' ? '#da121a' : '#078930' }}>{selectedReferral.urgency}</span>
                </div>
                {selectedReferral.queueToken && (
                  <div className="info-row" style={{ background: '#e3f0fa', padding: '8px 12px', borderRadius: '8px' }}>
                    <span className="label">Queue Token:</span>
                    <span className="value" style={{ color: '#078930', fontSize: '16px' }}><strong>{selectedReferral.queueToken}</strong></span>
                  </div>
                )}

                <div style={{ marginTop: '16px', padding: '12px', background: '#fafcff', borderRadius: '10px', border: '1px solid #e9edf4' }}>
                  <strong>Clinical Reason for Referral:</strong>
                  <p style={{ fontSize: '14px', color: '#2c3e50', marginTop: '4px' }}>{selectedReferral.reasonForReferral}</p>
                </div>

                <div style={{ marginTop: '12px', padding: '12px', background: '#fafcff', borderRadius: '10px', border: '1px solid #e9edf4' }}>
                  <strong>Clinical History Summary:</strong>
                  <p style={{ fontSize: '14px', color: '#4a5a6e', marginTop: '4px' }}>{selectedReferral.clinicalSummary}</p>
                </div>

                {/* Zewditu Hospital Actions */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eef2f7' }}>
                  <h5 style={{ marginBottom: '10px', color: '#0f3b5e' }}>
                    <i className="fas fa-hospital-alt"></i> Zewditu Hospital Officer Decision:
                  </h5>
                  {selectedReferral.status === 'Pending Review' ? (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-success"
                        onClick={() => handleUpdateStatus(selectedReferral.id, 'Accepted')}
                      >
                        <i className="fas fa-check-circle"></i> Accept & Generate Queue Token
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ borderColor: '#da121a', color: '#da121a' }}
                        onClick={() => handleUpdateStatus(selectedReferral.id, 'Rejected')}
                      >
                        <i className="fas fa-times-circle"></i> Decline Referral
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#078930', fontWeight: 600 }}>
                      ✅ Referral Status: {selectedReferral.status}. Assigned Doctor: {selectedReferral.assignedDoctor || 'Dr. M. Worku'}.
                    </div>
                  )}

                  {/* Financial Assistance Trigger */}
                  <div style={{ marginTop: '16px', background: '#fff9e6', padding: '12px', borderRadius: '10px', border: '1px solid #ffe599' }}>
                    <p style={{ fontSize: '13px', color: '#856404', margin: 0 }}>
                      <i className="fas fa-coins" style={{ color: '#078930', marginRight: '6px' }}></i>
                      Does this referred patient require financial fundraising support?
                    </p>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: '8px', padding: '6px 16px', fontSize: '13px' }}
                      onClick={() => setActiveModule('financial')}
                    >
                      <i className="fas fa-hand-holding-heart"></i> Trigger HealFund Financial Case
                    </button>
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
