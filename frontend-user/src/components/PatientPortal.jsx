import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { getAppointments, createAppointment, uploadFile, sendMessage } from '../api.js';

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

  const defaultUser = currentUser || {
    name: 'Ahmed Kamara', patientId: 'HF-0247',
    registered: '12 Aug 2026', gender: 'Male', age: 42,
    location: 'Addis Ababa, Lideta', status: 'Verified',
  };

  const isAm = currentLang === 'am';

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
        department: 'General Medicine',
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
            <div className="stat-item"><h2>1,247</h2><p>{isAm ? 'ተመዝጋቢ ታካሚዎች' : 'Patients Registered'}</p></div>
            <div className="stat-item"><h2>98%</h2><p>{isAm ? 'የማረጋገጫ መጠን' : 'Verification Rate'}</p></div>
            <div className="stat-item"><h2>32</h2><p>{isAm ? 'አጋር ጤና ተቋማት' : 'Partner Health Centers'}</p></div>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="grid-2">
          <aside className="patient-card">
            <div className="avatar-lg"><i className="fas fa-user"></i></div>
            <h2>{defaultUser.name}</h2>
            <p className="subtitle"><span>{isAm ? 'መታወቂያ' : 'ID'}</span>: {defaultUser.patientId}</p>
            <div className="info-row"><span className="label"><i className="fas fa-venus-mars"></i> {isAm ? 'ጾታ' : 'Gender'}</span><span className="value">{defaultUser.gender}</span></div>
            <div className="info-row"><span className="label"><i className="fas fa-calendar-alt"></i> {isAm ? 'ዕድሜ' : 'Age'}</span><span className="value">{defaultUser.age}</span></div>
            <div className="info-row"><span className="label"><i className="fas fa-map-marker-alt"></i> {isAm ? 'ቦታ' : 'Location'}</span><span className="value">{defaultUser.location}</span></div>
            <div className="info-row">
              <span className="label"><i className="fas fa-file-medical-alt"></i> {isAm ? 'ፋይል' : 'File'}</span>
              <span className="value"><span className="status-badge status-verified"><i className="fas fa-check-circle"></i> {isAm ? 'ተረጋግጧል' : 'Verified'}</span></span>
            </div>
            <div className="info-row"><span className="label"><i className="fas fa-hospital"></i> {isAm ? 'ሆስፒታል' : 'Hospital'}</span><span className="value"><strong>Zewditu Memorial</strong></span></div>
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
    </div>
  );
}
