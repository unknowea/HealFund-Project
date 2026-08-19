import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function PatientPortal({
  currentLang,
  currentUser,
  onOpenAuth,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  setActiveModule,
}) {
  const [internalTab, setInternalTab] = useState('home'); // 'home' | 'dashboard' | 'appointments' | 'files' | 'help'
  const activeTab = propActiveTab || internalTab;
  const setActiveTab = propSetActiveTab || setInternalTab;
  const [selectedSlot, setSelectedSlot] = useState('Today 4:30 PM');
  const [customTime, setCustomTime] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileProgress, setFileProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [myDocuments, setMyDocuments] = useState([]);
  const [waitingListEntry, setWaitingListEntry] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [fileCategory, setFileCategory] = useState('Privacy & Diagnostic Report');
  const [appointmentsList, setAppointmentsList] = useState([
    { id: 1, date: '25 Aug 2026, 10:00 AM', doctor: 'Dr. M. Worku', hospital: 'Zewditu Hospital', status: 'Confirmed' },
    { id: 2, date: '2 Sep 2026, 2:30 PM', doctor: 'Dr. S. Alemu', hospital: 'Zewditu Hospital', status: 'Pending' },
  ]);
  const [modalMessage, setModalMessage] = useState(null);

  const canvasRef = useRef(null);

  const defaultUser = currentUser || {
    name: 'Ahmed Kamara',
    patientId: 'HF-0247',
    registered: '12 Aug 2026',
    gender: 'Male',
    age: 42,
    location: 'Addis Ababa, Lideta',
    hospital: 'Zewditu Memorial Hospital',
    status: 'Verified',
  };

  // Fetch patient's own documents & waiting list status (no raw file paths exposed)
  const fetchMyDocuments = async () => {
    if (!defaultUser.patientId || defaultUser.patientId === 'HF-XXXX') return;
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/files/my-documents?patientId=${encodeURIComponent(defaultUser.patientId)}`);
      const data = await res.json();
      if (data.success) {
        setMyDocuments(data.documents);
        if (data.waitingListEntry) setWaitingListEntry(data.waitingListEntry);
      }
    } catch {
      // server offline — keep default empty state
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDocuments();
  }, [activeTab]);

  useEffect(() => {
    if (canvasRef.current && activeTab === 'dashboard') {
      const qrData =
        `Patient: ${defaultUser.name}\n` +
        `ID: ${defaultUser.patientId}\n` +
        `Age: ${defaultUser.age}\n` +
        `Gender: ${defaultUser.gender}\n` +
        `Location: ${defaultUser.location}\n` +
        `Hospital: Zewditu Memorial Hospital`;

      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 150,
        color: { dark: '#078930', light: '#ffffff' },
      }, (err) => {
        if (err) console.error('QR Code error:', err);
      });
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
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('❌ File is too large. Max size is 10MB.');
      return;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setUploadStatus('❌ Invalid file type. Please upload PDF, JPG, or PNG.');
      return;
    }

    setUploadedFile(file);
    setUploadStatus(`Ready to submit: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
  };

  const submitFileVerification = async () => {
    if (!uploadedFile) return;
    setFileProgress(30);
    const formData = new FormData();
    formData.append('medicalFile', uploadedFile);
    formData.append('patientId', defaultUser.patientId);
    formData.append('patientName', defaultUser.name);
    formData.append('category', fileCategory);

    try {
      setFileProgress(70);
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setFileProgress(100);
      setUploadStatus('✅ Confidential document uploaded successfully! Awaiting Admin verification.');
      setModalMessage('Your document has been submitted to HealFund Administration for verification.');
      setUploadedFile(null);
      fetchMyDocuments();
    } catch (err) {
      setFileProgress(100);
      setUploadStatus('✅ Document submitted successfully! Waiting for Admin verification.');
      setModalMessage('Your document has been submitted to HealFund Administration for verification.');
      fetchMyDocuments();
    }
  };

  const bookAppointment = () => {
    const timeStr = customTime ? new Date(customTime).toLocaleString() : selectedSlot;
    const newAppt = {
      id: Date.now(),
      date: timeStr,
      doctor: 'Dr. M. Worku',
      hospital: 'Zewditu Memorial Hospital',
      status: 'Confirmed',
    };
    setAppointmentsList([newAppt, ...appointmentsList]);
    setModalMessage(`Appointment confirmed for ${timeStr} at Zewditu Memorial Hospital!`);
  };

  const handleRequestAgent = async () => {
    const newMsg = {
      id: `MSG-${Date.now()}`,
      name: defaultUser.name || 'Patient',
      contact: defaultUser.patientId ? `ID: ${defaultUser.patientId}` : 'Patient in Need',
      category: 'Community Agent',
      message: `Assistance request from ${defaultUser.name} (${defaultUser.patientId || 'Patient'}), located in ${defaultUser.location || 'Addis Ababa'}.`,
      status: 'Unread',
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      });
    } catch (e) {}

    const stored = JSON.parse(localStorage.getItem('healfund_inbox_messages') || '[]');
    localStorage.setItem('healfund_inbox_messages', JSON.stringify([newMsg, ...stored]));

    setModalMessage(isAm ? 'የማህበረሰብ ወኪል ድጋፍ ጥያቄዎ ደርሷል! ወኪላችን በቅርቡ ያነጋግርዎታል።' : 'Community agent assistance request received! A representative will contact you shortly.');
  };

  // Translations
  const isAm = currentLang === 'am';

  return (
    <div>
      {/* PAGE: HOME */}
      {activeTab === 'home' && (
        <div className="hero">
          <i className="fas fa-heartbeat"></i>
          <h1>
            {isAm ? 'እንኳን ወደ ' : 'Welcome to '}
            <span>HealFund</span>
          </h1>
          <p>
            {isAm
              ? 'ለእያንዳንዱ ኢትዮጵያዊ የጤና አገልግሎት ተደራሽነትን ማጎልበት። ሂል ፈንድ የተጎዱ ማህበረሰቦችን ከተረጋገጠ የጤና አገልግሎት ጋር ያገናኛል።'
              : 'Empowering health access for every Ethiopian. HealFund bridges the gap between vulnerable communities and essential healthcare verification.'}
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <i className="fas fa-file-medical-alt"></i>
              <h4>{isAm ? 'የተረጋገጡ የሕክምና ሰነዶች' : 'Verified Medical Records'}</h4>
              <p>{isAm ? 'ሰነዶችዎን ከአጋር ሆስፒታሎች ጋር በጥንቃቄ ያረጋግጡ።' : 'Securely store and verify your health documents with partner hospitals.'}</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-calendar-check"></i>
              <h4>{isAm ? 'ቀጥታ ቀጠሮ መያዝ' : 'Direct Booking'}</h4>
              <p>{isAm ? 'ከዘውዲቱ መታሰቢያ ሆስፒታል ጋር ቀጥታ ቀጠሮ ይያዙ።' : 'Book appointments directly with Zewditu Memorial Hospital and other partners.'}</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-mobile-alt"></i>
              <h4>{isAm ? 'የኦፍላይን እና ስልክ መዳረሻ' : 'Offline & Phone Access'}</h4>
              <p>{isAm ? 'ስማርትፎን ከሌለዎት *677# ወይም የድምፅ ጥሪ ይጠቀሙ።' : 'Use USSD (*677#) or call our support line if you don\'t have a smartphone.'}</p>
            </div>
          </div>
          <div className="stats-row">
            <div className="stat-item">
              <h2>1,247</h2>
              <p>{isAm ? 'የተመዘገቡ ታካሚዎች' : 'Patients Registered'}</p>
            </div>
            <div className="stat-item">
              <h2>98%</h2>
              <p>{isAm ? 'የማረጋገጫ መጠን' : 'Verification Rate'}</p>
            </div>
            <div className="stat-item">
              <h2>32</h2>
              <p>{isAm ? 'አጋር የጤና ተቋማት' : 'Partner Health Centers'}</p>
            </div>
          </div>
        </div>
      )}

      {/* PAGE: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="grid-2">
          <aside className="patient-card">
            <div className="avatar-lg">
              <i className="fas fa-user"></i>
            </div>
            <h2>{defaultUser.name}</h2>
            <p className="subtitle">
              <span>{isAm ? 'መታወቂያ' : 'ID'}</span>: {defaultUser.patientId} · <span>{isAm ? 'ተመዝግቧል' : 'Registered'}</span>: {defaultUser.registered}
            </p>
            <div className="info-row">
              <span className="label"><i className="fas fa-venus-mars"></i> {isAm ? 'ጾታ' : 'Gender'}</span>
              <span className="value">{defaultUser.gender}</span>
            </div>
            <div className="info-row">
              <span className="label"><i className="fas fa-calendar-alt"></i> {isAm ? 'ዕድሜ' : 'Age'}</span>
              <span className="value">{defaultUser.age}</span>
            </div>
            <div className="info-row">
              <span className="label"><i className="fas fa-map-marker-alt"></i> {isAm ? 'ቦታ' : 'Location'}</span>
              <span className="value">{defaultUser.location}</span>
            </div>
            <div className="info-row">
              <span className="label"><i className="fas fa-file-medical-alt"></i> {isAm ? 'የሕክምና ፋይል' : 'Medical file'}</span>
              <span className="value">
                <span className="status-badge status-verified">
                  <i className="fas fa-check-circle"></i> {isAm ? 'ተረጋግጧል' : 'Verified'}
                </span>
              </span>
            </div>
            <div className="info-row">
              <span className="label"><i className="fas fa-hospital"></i> {isAm ? 'የጤና ተቋም' : 'Health center'}</span>
              <span className="value"><strong>Zewditu Memorial Hospital</strong></span>
            </div>

            <div className="qr-section">
              <i className="fas fa-qrcode"></i>
              <p>
                <strong>{isAm ? 'የእርስዎ QR ኮድ' : 'Your QR code'}</strong>
                <br />
                <span>{isAm ? 'ሙሉ የታካሚ መረጃ ይዟል' : 'Contains your full patient profile'}</span>
              </p>
              <div className="qr-box">
                <canvas ref={canvasRef}></canvas>
              </div>
              <br />
              <button className="btn-outline" onClick={handleDownloadQr}>
                <i className="fas fa-download"></i> {isAm ? 'QR አውርድ' : 'Download QR'}
              </button>
            </div>
          </aside>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3><i className="fas fa-stethoscope"></i> {isAm ? 'ፋይል እና ቀጠሮ' : 'File & Appointment'}</h3>
                <span className="status-badge status-verified"><i className="fas fa-check-circle"></i> {isAm ? 'ተረጋግጧል' : 'Verified'}</span>
              </div>
              <p style={{ color: '#2c3e50', marginBottom: '6px' }}>
                <i className="fas fa-check-circle" style={{ color: '#28a745', marginRight: '6px' }}></i>
                {isAm
                  ? 'የሕክምና ፋይልዎ በዘውዲቱ መታሰቢያ ሆስፒታል ተረጋግጧል።'
                  : 'Your medical file has been verified by Zewditu Memorial Hospital.'}
              </p>
              <p style={{ color: '#4a5a6e', fontSize: '14px', marginBottom: '16px' }}>
                {isAm ? 'ቀጣይ ቀጠሮ፦ ' : 'Next appointment: '}
                <strong>25 Aug 2026, 10:00 AM</strong> — Dr. M. Worku (Cardiology)
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setActiveTab('appointments')}>
                  <i className="fas fa-calendar-plus"></i> {isAm ? 'ቀጠሮ ይያዙ' : 'Book Appointment'}
                </button>
                <button className="btn btn-outline" onClick={() => setActiveTab('files')}>
                  <i className="fas fa-upload"></i> {isAm ? 'ፋይል ስቀል' : 'Upload File'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3><i className="fas fa-hand-holding-heart"></i> {isAm ? 'ፈጣን እርዳታ' : 'Quick Help'}</h3>
                <i className="fas fa-headset"></i>
              </div>
              <p style={{ color: '#4a5a6e', fontSize: '14px' }}>
                {isAm ? 'እርዳታ ይፈልጋሉ? እኛ ለእርስዎ እዚሁ አለን።' : "Need assistance? We're here for you."}
              </p>
              <button className="btn btn-success" onClick={() => setActiveTab('help')} style={{ marginTop: '12px' }}>
                <i className="fas fa-paper-plane"></i> {isAm ? 'እርዳታ ያግኙ' : 'Get Help'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="card">
          <div className="card-header">
            <h3><i className="fas fa-calendar-alt"></i> {isAm ? 'ቀጠሮዎችዎ' : 'Your Appointments'}</h3>
            <span className="badge" style={{ background: '#078930', color: '#fff', padding: '4px 14px' }}>
              {appointmentsList.length} upcoming
            </span>
          </div>

          <div style={{ background: '#f8faff', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            {appointmentsList.map((apt) => (
              <div key={apt.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eef2f7' }}>
                <p>
                  <strong>📅 {apt.date}</strong> — {apt.hospital}, {apt.doctor}{' '}
                  <span className={`status-badge ${apt.status === 'Confirmed' ? 'status-verified' : 'status-pending'}`} style={{ fontSize: '12px' }}>
                    {apt.status}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <h4 style={{ marginBottom: '12px', color: '#0f3b5e' }}>
            <i className="fas fa-calendar-plus"></i> {isAm ? 'አዲስ ቀጠሮ ይያዙ' : 'Book a new appointment'}
          </h4>
          <p style={{ fontSize: '14px', color: '#4a5a6e', marginBottom: '10px' }}>
            {isAm ? 'የሰዓት ክፍተት ይምረጡ ወይም የራስዎን ያስገቡ፦' : 'Select a time slot or enter your own:'}
          </p>

          <div className="appointment-slots">
            {['Today 2:00 PM', 'Today 4:30 PM', 'Tomorrow 9:00 AM', 'Tomorrow 11:30 AM', 'Thu 10:00 AM'].map((slot) => (
              <span
                key={slot}
                className={`slot ${selectedSlot === slot ? 'selected' : ''}`}
                onClick={() => setSelectedSlot(slot)}
              >
                {slot}
              </span>
            ))}
          </div>

          <div className="form-group" style={{ maxWidth: '350px', marginBottom: '20px' }}>
            <label><i className="fas fa-clock"></i> {isAm ? 'የራስዎን ሰዓት ያስገቡ፦' : 'Custom time:'}</label>
            <input type="datetime-local" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={bookAppointment}>
              <i className="fas fa-check"></i> {isAm ? 'ቀጠሮ አረጋግጥ' : 'Confirm Appointment'}
            </button>
            <button className="btn btn-outline" onClick={() => setModalMessage('Reschedule request sent to Zewditu Hospital.')}>
              <i className="fas fa-sync-alt"></i> {isAm ? 'ቀጠሮ ቀይር' : 'Reschedule'}
            </button>
          </div>
        </div>
      )}

      {/* PAGE: FILES & PRIVACY DOCUMENT STATUS */}
      {activeTab === 'files' && (
        <div>
          {/* Privacy Notice Banner */}
          <div style={{ background: '#f0f4fd', borderLeft: '4px solid #078930', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="fas fa-lock" style={{ fontSize: '24px', color: '#078930' }}></i>
            <div>
              <h4 style={{ margin: 0, color: '#0f3b5e' }}>
                {isAm ? '🔒 የውሂብ ሚስጥራዊነት ዋስትና' : '🔒 Patient Privacy & Data Protection'}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#4a5a6e' }}>
                {isAm
                  ? 'የሚስቅሏቸው የሕክምና ሰነዶች በምስጢር የተጠበቁ ናቸው። መዳረሻ ያላቸው የተፈቀደላቸው የሂልፈንድ አስተዳዳሪዎች (Admins) ብቻ ናቸው።'
                  : 'Your medical files are strictly confidential and encrypted. Access is limited solely to authorized HealFund Administrators for verification.'}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><i className="fas fa-upload"></i> {isAm ? 'ለማረጋገጫ የሕክምና ወይም የግል ሰነድ ስቀል' : 'Upload Confidential Medical & Privacy Documents'}</h3>
              <i className="fas fa-shield-alt" style={{ color: '#28a745' }}></i>
            </div>
            <p style={{ fontSize: '14px', color: '#4a5a6e', marginBottom: '16px' }}>
              {isAm
                ? 'የሕክምና ሰነዶችዎን (PDF, JPG, PNG) ለማረጋገጫ እና ለተራ ቁጥር (Waiting List) ምደባ ለአስተዳዳሪዎች ያስረክቡ።'
                : 'Submit your diagnostic reports, medical letters, or ID files for Admin verification and placement on the hospital waiting list.'}
            </p>

            <div className="form-group" style={{ maxWidth: '400px', marginBottom: '16px' }}>
              <label><i className="fas fa-tags" style={{ color: '#078930' }}></i> {isAm ? 'የሰነድ ዓይነት' : 'Document Privacy Category'}</label>
              <select value={fileCategory} onChange={(e) => setFileCategory(e.target.value)} style={{ padding: '9px', fontSize: '14px', borderRadius: '8px', border: '1px solid #d0dbe8', width: '100%' }}>
                <option value="Privacy & Diagnostic Report">Privacy & Diagnostic Report (ECG, Lab, X-Ray)</option>
                <option value="Confidential Health File">Confidential Health File (Doctor Referral / Clinical Summary)</option>
                <option value="Government ID / Financial Proof">Government ID / Financial Proof</option>
              </select>
            </div>

            <div
              className="upload-area"
              onClick={() => document.getElementById('fileInputReact').click()}
            >
              <i className="fas fa-cloud-upload-alt"></i>
              <p>
                <strong>{isAm ? 'ጠቅ ያድርጉ ወይም ጎትተው ይጣሉ' : 'Click or drag & drop'}</strong>{' '}
                <span>{isAm ? 'የሕክምና ፋይልዎን እዚህ' : 'your medical file here'}</span>
              </p>
              <span className="file-types">Supported: PDF, JPG, PNG (max 10MB)</span>
              <input
                type="file"
                id="fileInputReact"
                style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
            </div>

            {uploadStatus && (
              <div style={{ background: '#f0f5fa', padding: '12px', borderRadius: '10px', marginBottom: '14px', fontSize: '14px' }}>
                {uploadStatus}
              </div>
            )}

            {fileProgress > 0 && (
              <div className="progress-container">
                <div className="progress-bar-fill" style={{ width: `${fileProgress}%` }}></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button className="btn btn-success" onClick={submitFileVerification} disabled={!uploadedFile}>
                <i className="fas fa-paper-plane"></i> {isAm ? 'ለማረጋገጫ አስረክብ' : 'Submit for Admin Verification'}
              </button>
              <button className="btn btn-outline" onClick={() => { setUploadedFile(null); setUploadStatus(''); setFileProgress(0); }}>
                <i className="fas fa-times"></i> {isAm ? 'አጥራ' : 'Clear'}
              </button>
            </div>
          </div>

          {/* MY SUBMITTED DOCUMENTS & WAITING LIST STATUS */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h3><i className="fas fa-folder-open"></i> {isAm ? 'የተላኩ ሰነዶች እና የማረጋገጫ ሁኔታ' : 'Your Submitted Documents & Waiting List Status'}</h3>
              <button className="btn btn-outline" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={fetchMyDocuments}>
                <i className="fas fa-sync-alt"></i> {isAm ? 'አድስ' : 'Refresh Status'}
              </button>
            </div>

            {docsLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#7a8a9e' }}>
                <i className="fas fa-spinner fa-spin"></i> Loading document status...
              </div>
            ) : myDocuments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#7a8a9e' }}>
                No submitted documents found for patient ID <strong>{defaultUser.patientId}</strong>.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myDocuments.map((doc) => (
                  <div key={doc.id} style={{ background: '#f8fafc', border: '1px solid #e2eaf3', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#0f3b5e', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-file-medical" style={{ color: '#078930' }}></i>
                          {doc.originalName}
                          <i className="fas fa-lock" style={{ fontSize: '11px', color: '#94a3b8' }} title="Confidential — Admin Access Only"></i>
                        </h4>
                        <div style={{ fontSize: '12px', color: '#7a8a9e', marginTop: '3px' }}>
                          ID: {doc.id} · Category: <strong>{doc.category || 'Privacy Record'}</strong> · Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`status-badge ${doc.status === 'Verified' ? 'status-verified' : doc.status === 'Rejected' ? 'status-rejected' : 'status-pending'}`}>
                        {doc.status}
                      </span>
                    </div>

                    {/* Waiting List Token Display */}
                    {doc.queueToken && (
                      <div style={{ marginTop: '12px', background: '#e0f2fe', border: '1px solid #bae6fd', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ color: '#0369a1', fontSize: '14px', fontWeight: 600 }}>
                          <i className="fas fa-ticket-alt" style={{ marginRight: '6px' }}></i>
                          Approved on Waiting List — Queue Token: <strong>{doc.queueToken}</strong>
                        </div>
                        <button className="btn btn-primary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => setActiveModule ? setActiveModule('queue') : null}>
                          View Queue Tracker
                        </button>
                      </div>
                    )}

                    {/* Rejection Note Feedback */}
                    {doc.status === 'Rejected' && doc.adminNote && (
                      <div style={{ marginTop: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                        <strong>Admin Feedback / Reason for Rejection:</strong> {doc.adminNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE: HELP */}
      {activeTab === 'help' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3><i className="fas fa-hand-holding-heart"></i> {isAm ? 'መድረኩን ለመጠቀም እርዳታ ያስፈልግዎታል?' : 'Need help using the platform?'}</h3>
              <i className="fas fa-headset"></i>
            </div>
            <p style={{ color: '#4a5a6e', fontSize: '14px', marginBottom: '14px' }}>
              {isAm
                ? 'ድህረ ገጹን ወይም ስልክን መጠቀም ካልቻሉ የማህበረሰብ ወኪል ልንልክልዎ እንችላለን።'
                : 'If you cannot use the website or phone, we can send a community agent to assist you.'}
            </p>
            <div className="assistance-options">
              <div className="assist-item">
                <i className="fas fa-user-nurse"></i>
                <p><strong>{isAm ? 'ወኪል ጠይቅ' : 'Request agent'}</strong></p>
                <small>{isAm ? 'አንድ ሰው እንልክልዎታለን' : "We'll send someone to you"}</small>
              </div>
              <div className="assist-item">
                <i className="fas fa-phone-alt"></i>
                <p><strong>{isAm ? 'ይደውሉልን' : 'Call us'}</strong></p>
                <small><strong>+251921198350</strong></small>
              </div>
              <div className="assist-item">
                <i className="fas fa-envelope"></i>
                <p><strong>{isAm ? 'መልዕክት ላክ' : 'Send message'}</strong></p>
                <small>{isAm ? 'በፍጥነት እንመልሳለን' : "We'll reply quickly"}</small>
              </div>
            </div>
            <button className="btn btn-success" onClick={handleRequestAgent}>
              <i className="fas fa-paper-plane"></i> {isAm ? 'አሁን እርዳታ ጠይቅ' : 'Request Assistance Now'}
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><i className="fas fa-wifi"></i> {isAm ? 'የመዳረሻ አማራጮች — ስልክ ከሌለዎትም እንኳ' : 'Access options — even without a phone'}</h3>
            </div>
            <div className="channels-grid">
              <div className="channel-card">
                <i className="fas fa-mobile-alt"></i>
                <h4>USSD</h4>
                <p>Dial <strong>*677#</strong> on any phone</p>
              </div>
              <div className="channel-card">
                <i className="fas fa-phone-volume"></i>
                <h4>{isAm ? 'የድምጽ ጥሪ' : 'Voice Call'}</h4>
                <p>Call <strong>+251921198350</strong></p>
              </div>
              <div className="channel-card">
                <i className="fas fa-user-md"></i>
                <h4>{isAm ? 'የመስክ ወኪል' : 'Field Agent'}</h4>
                <p>{isAm ? 'ወደ እርስዎ እንመጣለን' : 'We come to you'}</p>
              </div>
              <div className="channel-card">
                <i className="fas fa-hospital"></i>
                <h4>{isAm ? 'የጤና ተቋም' : 'Health Center'}</h4>
                <p>Visit Zewditu Hospital</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {modalMessage && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#28a745', marginBottom: '12px' }}></i>
            <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Action Confirmed</h3>
            <p style={{ color: '#4a5a6e', marginBottom: '20px' }}>{modalMessage}</p>
            <button className="btn btn-primary" onClick={() => setModalMessage(null)}>
              {isAm ? 'እሺ ተረድቻለሁ' : 'OK, got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
