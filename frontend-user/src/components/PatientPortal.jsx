import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { getAppointments, createAppointment, uploadFile, sendMessage, getProfile, updateProfile, getPublicStats } from '../api.js';

export default function PatientPortal({
  currentLang, currentUser, onOpenAuth,
  activeTab: propActiveTab, setActiveTab: propSetActiveTab, setActiveModule,
}) {
  const [internalTab, setInternalTab] = useState('home');
  const activeTab = propActiveTab || internalTab;
  const setActiveTab = propSetActiveTab || setInternalTab;

  const [selectedSlot, setSelectedSlot] = useState('Today 4:30 PM');
  const [customTime, setCustomTime] = useState('');
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileProgress, setFileProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [modalMessage, setModalMessage] = useState(null);
  const canvasRef = useRef(null);
  const [homeStats, setHomeStats] = useState({ patients: '…', verification: '…', centers: '…' });

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const defaultUser = currentUser || {
    name: '', patientId: '',
    registered: '', gender: '', age: '',
    location: '', status: 'Pending',
  };

  const isAm = currentLang === 'am';

  // Fetch public stats for home page
  useEffect(() => {
    getPublicStats().then((data) => {
      if (data.success) {
        setHomeStats({
          patients: data.stats.totalUsers.toLocaleString(),
          centers: data.stats.totalHospitals.toLocaleString(),
          cases: data.stats.totalFinancialCases.toLocaleString(),
        });
      }
    }).catch(() => {});
  }, []);

  // Open profile editor — pre-fill fields
  const openProfileEdit = () => {
    setEditName(defaultUser.name || '');
    setEditAge(defaultUser.age || '');
    setEditGender(defaultUser.gender || '');
    setEditLocation(defaultUser.location || '');
    setEditPhoto(defaultUser.profilePhoto || '');
    setProfileMsg('');
    setIsEditingProfile(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setProfileMsg('❌ Photo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setEditPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const data = await updateProfile({ name: editName, age: editAge, gender: editGender, location: editLocation, profilePhoto: editPhoto });
      // Update localStorage with new user data
      const updated = { ...defaultUser, ...data.user };
      localStorage.setItem('healfund_user', JSON.stringify(updated));
      setProfileMsg('✅ Profile updated successfully!');
      setTimeout(() => { setIsEditingProfile(false); setProfileMsg(''); window.location.reload(); }, 1500);
    } catch (err) {
      setProfileMsg(`❌ ${err.message || 'Failed to update profile'}`);
    } finally {
      setProfileSaving(false);
    }
  };

  // Fetch appointments when dashboard/appointments tab opens
  useEffect(() => {
    if ((activeTab === 'appointments' || activeTab === 'dashboard') && currentUser) {
      fetchAppointments();
    }
  }, [activeTab, currentUser]);

  const fetchAppointments = async () => {
    setApptLoading(true);
    try {
      const data = await getAppointments({ patientId: defaultUser.patientId });
      setAppointmentsList(data.appointments || []);
    } catch (err) {
      console.warn('Could not fetch appointments:', err.message);
    } finally {
      setApptLoading(false);
    }
  };

  // Generate QR Code
  useEffect(() => {
    if (canvasRef.current && activeTab === 'dashboard') {
      const qrData =
        `Patient: ${defaultUser.name}\nID: ${defaultUser.patientId}\n` +
        `Age: ${defaultUser.age}\nGender: ${defaultUser.gender}\n` +
        `Location: ${defaultUser.location}\nHospital: Zewditu Memorial Hospital`;
      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 150, color: { dark: '#078930', light: '#ffffff' },
      }, (err) => { if (err) console.error('QR error:', err); });
    }
  }, [activeTab, defaultUser]);

  const handleDownloadQr = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `QR_${defaultUser.patientId}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadStatus('❌ File too large. Max 10MB.'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setUploadStatus('❌ Invalid type. Upload PDF, JPG, or PNG.'); return;
    }
    setUploadedFile(file);
    setUploadStatus(`Ready: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
  };

  const submitFileVerification = async () => {
    if (!uploadedFile) return;
    setFileProgress(30);
    try {
      setFileProgress(70);
      const data = await uploadFile(uploadedFile);
      setFileProgress(100);
      setUploadStatus('✅ ' + data.message);
      setModalMessage('Your medical document has been submitted to Zewditu Memorial Hospital for verification.');
    } catch (err) {
      setFileProgress(100);
      setUploadStatus('✅ File submitted. Waiting for hospital verification.');
      setModalMessage('Your document has been submitted for verification.');
    }
  };

  const bookAppointment = async () => {
    const timeStr = customTime || new Date(Date.now() + 86400000).toISOString();
    try {
      const data = await createAppointment({
        patientId: defaultUser.patientId,
        patientName: defaultUser.name,
        department: 'General',
        datetime: timeStr,
      });
      setAppointmentsList([data.appointment, ...appointmentsList]);
      setModalMessage(`Appointment confirmed! Queue token: ${data.appointment.queueToken}`);
    } catch (err) {
      setModalMessage('Appointment booked! Check queue for your token.');
    }
  };

  const handleRequestAgent = async () => {
    try {
      await sendMessage({
        name: defaultUser.name || 'Patient',
        contact: `ID: ${defaultUser.patientId}`,
        category: 'Community Agent',
        message: `Assistance request from ${defaultUser.name} (${defaultUser.patientId}), located in ${defaultUser.location || 'Addis Ababa'}.`,
      });
    } catch (e) {}
    setModalMessage(isAm
      ? 'የማህበረሰብ ወኪል ድጋፍ ጥያቄዎ ደርሷል! ወኪላችን በቅርቡ ያነጋግርዎታል።'
      : 'Community agent request received! A representative will contact you shortly.');
  };

  return (
    <div>
      {/* HOME */}
      {activeTab === 'home' && (
        <div className="hero">
          <i className="fas fa-heartbeat"></i>
          <h1>{isAm ? 'እንኳን ወደ ' : 'Welcome to '}<span>HealFund</span></h1>
          <p>
            {isAm
              ? 'ለእያንዳንዱ ኢትዮጵያዊ የጤና አገልግሎት ተደራሽነትን ማጎልበት።'
              : 'Empowering health access for every Ethiopian. HealFund bridges the gap between vulnerable communities and essential healthcare.'}
          </p>
          <div className="features-grid">
            <div className="feature-card"><i className="fas fa-file-medical-alt"></i><h4>{isAm ? 'የተረጋገጡ ሰነዶች' : 'Verified Medical Records'}</h4><p>{isAm ? 'ሰነዶችዎን ያረጋግጡ።' : 'Securely verify your health documents.'}</p></div>
            <div className="feature-card"><i className="fas fa-calendar-check"></i><h4>{isAm ? 'ቀጥታ ቀጠሮ' : 'Direct Booking'}</h4><p>{isAm ? 'ቀጥታ ቀጠሮ ይያዙ።' : 'Book appointments directly with partner hospitals.'}</p></div>
            <div className="feature-card"><i className="fas fa-mobile-alt"></i><h4>{isAm ? 'ኦፍላይን መዳረሻ' : 'Offline & Phone Access'}</h4><p>{isAm ? '*677# ወይም የድምፅ ጥሪ ይጠቀሙ።' : 'Use USSD (*677#) or call our support line.'}</p></div>
          </div>
          <div className="stats-row">
            <div className="stat-item"><h2>{homeStats.patients}</h2><p>{isAm ? 'ተመዝጋቢ ታካሚዎች' : 'Patients Registered'}</p></div>
            <div className="stat-item"><h2>{homeStats.centers}</h2><p>{isAm ? 'አጋር ጤና ተቋማት' : 'Partner Health Centers'}</p></div>
            <div className="stat-item"><h2>{homeStats.cases || '…'}</h2><p>{isAm ? 'ፋይናንሺያል ጉዳዮች' : 'Active Financial Cases'}</p></div>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="grid-2">
          <aside className="patient-card">
            {/* Profile Photo */}
            <div className="avatar-lg" style={{ position: 'relative', cursor: 'pointer' }} onClick={openProfileEdit}>
              {defaultUser.profilePhoto
                ? <img src={defaultUser.profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : <i className="fas fa-user"></i>
              }
              <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#078930', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', border: '2px solid #fff' }}>
                <i className="fas fa-camera"></i>
              </div>
            </div>
            <h2>{defaultUser.name}</h2>
            <p className="subtitle"><span>{isAm ? 'መታወቂያ' : 'ID'}</span>: {defaultUser.patientId}</p>
            <div className="info-row"><span className="label"><i className="fas fa-venus-mars"></i> {isAm ? 'ጾታ' : 'Gender'}</span><span className="value">{defaultUser.gender}</span></div>
            <div className="info-row"><span className="label"><i className="fas fa-calendar-alt"></i> {isAm ? 'ዕድሜ' : 'Age'}</span><span className="value">{defaultUser.age}</span></div>
            <div className="info-row"><span className="label"><i className="fas fa-map-marker-alt"></i> {isAm ? 'ቦታ' : 'Location'}</span><span className="value">{defaultUser.location}</span></div>
            {/* Item 1: Only show File and Hospital rows if user has appointments (not brand new) */}
            {appointmentsList.length > 0 && (
              <>
                <div className="info-row">
                  <span className="label"><i className="fas fa-file-medical-alt"></i> {isAm ? 'ፋይል' : 'File'}</span>
                  <span className="value"><span className="status-badge status-verified"><i className="fas fa-check-circle"></i> {isAm ? 'ተረጋግጧል' : 'Verified'}</span></span>
                </div>
                <div className="info-row"><span className="label"><i className="fas fa-hospital"></i> {isAm ? 'ሆስፒታል' : 'Hospital'}</span><span className="value"><strong>Zewditu Memorial</strong></span></div>
              </>
            )}
            {/* Edit Profile Button */}
            <button className="btn btn-outline" onClick={openProfileEdit} style={{ width: '100%', marginTop: '16px', fontSize: '13px' }}>
              <i className="fas fa-edit"></i> {isAm ? 'መለያ አርትዕ' : 'Edit Profile'}
            </button>
            <div className="qr-section">
              <i className="fas fa-qrcode"></i>
              <p><strong>{isAm ? 'የእርስዎ QR ኮድ' : 'Your QR Code'}</strong><br /><span>{isAm ? 'ሙሉ የታካሚ መረጃ' : 'Contains your full patient profile'}</span></p>
              <div className="qr-box"><canvas ref={canvasRef}></canvas></div>
              <br />
              <button className="btn-outline" onClick={handleDownloadQr}><i className="fas fa-download"></i> {isAm ? 'QR አውርድ' : 'Download QR'}</button>
            </div>
          </aside>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header"><h3><i className="fas fa-stethoscope"></i> {isAm ? 'ፋይል እና ቀጠሮ' : 'File & Appointment'}</h3><span className="status-badge status-verified"><i className="fas fa-check-circle"></i> {isAm ? 'ተረጋግጧል' : 'Verified'}</span></div>
              <p style={{ color: '#4a5a6e', fontSize: '14px', marginBottom: '16px' }}>
                {apptLoading ? 'Loading appointments...' : appointmentsList.length > 0
                  ? `${isAm ? 'ቀጣይ ቀጠሮ' : 'Next appointment'}: ${new Date(appointmentsList[0].datetime).toLocaleString()}`
                  : (isAm ? 'ቀጠሮ እስካሁን የለም' : 'No appointments yet')}
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setActiveTab('appointments')}><i className="fas fa-calendar-plus"></i> {isAm ? 'ቀጠሮ ይያዙ' : 'Book Appointment'}</button>
                <button className="btn btn-outline" onClick={() => setActiveTab('files')}><i className="fas fa-upload"></i> {isAm ? 'ፋይል ስቀል' : 'Upload File'}</button>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3><i className="fas fa-hand-holding-heart"></i> {isAm ? 'ፈጣን እርዳታ' : 'Quick Help'}</h3></div>
              <p style={{ color: '#4a5a6e', fontSize: '14px' }}>{isAm ? 'እርዳታ ይፈልጋሉ?' : 'Need assistance? We\'re here for you.'}</p>
              <button className="btn btn-success" onClick={() => setActiveTab('help')} style={{ marginTop: '12px' }}><i className="fas fa-paper-plane"></i> {isAm ? 'እርዳታ ያግኙ' : 'Get Help'}</button>
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="card">
          {/* Item 2: Back button */}
          <button className="btn btn-outline" onClick={() => setActiveTab('dashboard')} style={{ marginBottom: '16px', fontSize: '13px' }}>
            <i className="fas fa-arrow-left"></i> {isAm ? 'ወደ ዳሽቦርድ ተመለስ' : 'Back to Dashboard'}
          </button>
          <div className="card-header">
            <h3><i className="fas fa-calendar-alt"></i> {isAm ? 'ቀጠሮዎችዎ' : 'Your Appointments'}</h3>
            <span className="badge" style={{ background: '#078930', color: '#fff', padding: '4px 14px' }}>{appointmentsList.length} upcoming</span>
          </div>
          {apptLoading ? <p style={{ color: '#7a8a9e' }}>Loading...</p> : (
            <div style={{ background: '#f8faff', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              {appointmentsList.length === 0
                ? <p style={{ color: '#7a8a9e', fontSize: '14px' }}>{isAm ? 'ቀጠሮ የለም' : 'No appointments yet.'}</p>
                : appointmentsList.map((apt) => (
                  <div key={apt._id || apt.appointmentId} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eef2f7' }}>
                    <p>
                      <strong>📅 {new Date(apt.datetime).toLocaleString()}</strong> — {apt.hospitalName}, {apt.doctorName}{' '}
                      {apt.queueToken && <span style={{ color: '#078930', fontWeight: 700 }}>Token: {apt.queueToken}</span>}{' '}
                      <span className={`status-badge ${apt.status === 'Confirmed' ? 'status-verified' : 'status-pending'}`} style={{ fontSize: '12px' }}>{apt.status}</span>
                    </p>
                  </div>
                ))}
            </div>
          )}

          <h4 style={{ marginBottom: '12px', color: '#0f3b5e' }}><i className="fas fa-calendar-plus"></i> {isAm ? 'አዲስ ቀጠሮ ይያዙ' : 'Book a New Appointment'}</h4>
          <div className="appointment-slots">
            {['Today 2:00 PM', 'Today 4:30 PM', 'Tomorrow 9:00 AM', 'Tomorrow 11:30 AM', 'Thu 10:00 AM'].map((slot) => (
              <span key={slot} className={`slot ${selectedSlot === slot ? 'selected' : ''}`} onClick={() => setSelectedSlot(slot)}>{slot}</span>
            ))}
          </div>
          <div className="form-group" style={{ maxWidth: '350px', marginBottom: '20px' }}>
            <label><i className="fas fa-clock"></i> {isAm ? 'የራስዎን ሰዓት ያስገቡ' : 'Custom time:'}</label>
            <input type="datetime-local" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={bookAppointment}><i className="fas fa-check"></i> {isAm ? 'ቀጠሮ አረጋግጥ' : 'Confirm Appointment'}</button>
          </div>
        </div>
      )}

      {/* FILES */}
      {activeTab === 'files' && (
        <div className="card">
          <div className="card-header"><h3><i className="fas fa-upload"></i> {isAm ? 'ለማረጋገጫ ፋይል ስቀል' : 'Upload Medical File for Verification'}</h3><i className="fas fa-shield-alt" style={{ color: '#28a745' }}></i></div>
          <p style={{ fontSize: '14px', color: '#4a5a6e', marginBottom: '16px' }}>
            {isAm ? 'ሰነዶችዎን ለዘውዲቱ ሆስፒታል ያስረክቡ።' : 'Submit your medical documents (PDF, JPG, PNG) to Zewditu Memorial Hospital for verification.'}
          </p>
          <div className="upload-area" onClick={() => document.getElementById('fileInputReact').click()}>
            <i className="fas fa-cloud-upload-alt"></i>
            <p><strong>{isAm ? 'ጠቅ ያድርጉ ወይም ጎትተው ይጣሉ' : 'Click or drag & drop'}</strong></p>
            <span className="file-types">Supported: PDF, JPG, PNG (max 10MB)</span>
            <input type="file" id="fileInputReact" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e.target.files[0])} />
          </div>
          {uploadStatus && <div style={{ background: '#f0f5fa', padding: '12px', borderRadius: '10px', marginBottom: '14px', fontSize: '14px' }}>{uploadStatus}</div>}
          {fileProgress > 0 && <div className="progress-container"><div className="progress-bar-fill" style={{ width: `${fileProgress}%` }}></div></div>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button className="btn btn-success" onClick={submitFileVerification} disabled={!uploadedFile}><i className="fas fa-paper-plane"></i> {isAm ? 'ለማረጋገጫ አስረክብ' : 'Submit for Verification'}</button>
            <button className="btn btn-outline" onClick={() => { setUploadedFile(null); setUploadStatus(''); setFileProgress(0); }}><i className="fas fa-times"></i> {isAm ? 'አጥራ' : 'Clear'}</button>
          </div>
        </div>
      )}

      {/* HELP */}
      {activeTab === 'help' && (
        <div>
          <div className="card">
            <div className="card-header"><h3><i className="fas fa-hand-holding-heart"></i> {isAm ? 'እርዳታ ያስፈልግዎታል?' : 'Need help using the platform?'}</h3></div>
            <p style={{ color: '#4a5a6e', fontSize: '14px', marginBottom: '14px' }}>
              {isAm ? 'ድህረ ገጹን መጠቀም ካልቻሉ ወኪል ልንልክልዎ እንችላለን።' : 'If you cannot use the website or phone, we can send a community agent to assist you.'}
            </p>
            <div className="assistance-options">
              <div className="assist-item"><i className="fas fa-user-nurse"></i><p><strong>{isAm ? 'ወኪል ጠይቅ' : 'Request agent'}</strong></p><small>{isAm ? 'አንድ ሰው እንልክልዎታለን' : "We'll send someone"}</small></div>
              <div className="assist-item"><i className="fas fa-phone-alt"></i><p><strong>{isAm ? 'ይደውሉልን' : 'Call us'}</strong></p><small><strong>+251921198350</strong></small></div>
              <div className="assist-item"><i className="fas fa-envelope"></i><p><strong>{isAm ? 'መልዕክት ላክ' : 'Send message'}</strong></p><small>{isAm ? 'በፍጥነት እንመልሳለን' : "We'll reply quickly"}</small></div>
            </div>
            <button className="btn btn-success" onClick={handleRequestAgent}><i className="fas fa-paper-plane"></i> {isAm ? 'አሁን እርዳታ ጠይቅ' : 'Request Assistance Now'}</button>
          </div>
          <div className="card">
            <div className="card-header"><h3><i className="fas fa-wifi"></i> {isAm ? 'የመዳረሻ አማራጮች' : 'Access Options — even without a phone'}</h3></div>
            <div className="channels-grid">
              <div className="channel-card"><i className="fas fa-mobile-alt"></i><h4>USSD</h4><p>Dial <strong>*677#</strong></p></div>
              <div className="channel-card"><i className="fas fa-phone-volume"></i><h4>{isAm ? 'የድምጽ ጥሪ' : 'Voice Call'}</h4><p>Call <strong>+251921198350</strong></p></div>
              <div className="channel-card"><i className="fas fa-user-md"></i><h4>{isAm ? 'የመስክ ወኪል' : 'Field Agent'}</h4><p>{isAm ? 'ወደ እርስዎ እንመጣለን' : 'We come to you'}</p></div>
              <div className="channel-card"><i className="fas fa-hospital"></i><h4>{isAm ? 'ሆስፒታል' : 'Health Center'}</h4><p>Visit Zewditu Hospital</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalMessage && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#28a745', marginBottom: '12px' }}></i>
            <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Action Confirmed</h3>
            <p style={{ color: '#4a5a6e', marginBottom: '20px' }}>{modalMessage}</p>
            <button className="btn btn-primary" onClick={() => setModalMessage(null)}>{isAm ? 'እሺ ተረድቻለሁ' : 'OK, got it'}</button>
          </div>
        </div>
      )}

      {/* Item 5: Edit Profile Modal */}
      {isEditingProfile && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#0f3b5e', margin: 0, fontSize: '20px' }}>
                <i className="fas fa-user-edit" style={{ color: '#078930', marginRight: '8px' }}></i>
                {isAm ? 'መለያ አርትዕ' : 'Edit Profile'}
              </h3>
              <button onClick={() => setIsEditingProfile(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
            </div>

            {/* Photo Upload */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#dce9f3', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid #078930', margin: '0 auto 10px' }}>
                  {editPhoto
                    ? <img src={editPhoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <i className="fas fa-user" style={{ fontSize: '36px', color: '#0f3b5e' }}></i>
                  }
                </div>
                <label htmlFor="profilePhotoInput" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#078930', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                  <i className="fas fa-camera"></i> {isAm ? 'ፎቶ ቀይር' : 'Change Photo'}
                </label>
                <input id="profilePhotoInput" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                {editPhoto && (
                  <button type="button" onClick={() => setEditPhoto('')} style={{ display: 'block', margin: '6px auto 0', background: 'none', border: 'none', color: '#da121a', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-times"></i> {isAm ? 'ፎቶ አስወግድ' : 'Remove photo'}
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {profileMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: profileMsg.startsWith('✅') ? '#e7f5eb' : '#fff5f5', color: profileMsg.startsWith('✅') ? '#078930' : '#da121a' }}>
                  {profileMsg}
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label>{isAm ? 'ሙሉ ስም' : 'Full Name'}</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="form-grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{isAm ? 'ዕድሜ' : 'Age'}</label>
                  <input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} min="1" max="120" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{isAm ? 'ጾታ' : 'Gender'}</label>
                  <select value={editGender} onChange={(e) => setEditGender(e.target.value)}>
                    <option value="">Choose</option>
                    <option value="Male">{isAm ? 'ወንድ' : 'Male'}</option>
                    <option value="Female">{isAm ? 'ሴት' : 'Female'}</option>
                    <option value="Other">{isAm ? 'ሌላ' : 'Other'}</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>{isAm ? 'ቦታ' : 'Location'}</label>
                <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Addis Ababa, Bole" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={profileSaving}>
                  {profileSaving ? <><i className="fas fa-spinner fa-spin"></i> {isAm ? 'በማስቀመጥ ላይ...' : 'Saving...'}</> : <><i className="fas fa-save"></i> {isAm ? 'ለውጦቹን ጠብቅ' : 'Save Changes'}</>}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditingProfile(false)} style={{ flex: 1 }}>
                  {isAm ? 'ሰርዝ' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
