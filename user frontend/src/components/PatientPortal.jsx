import React, { useState, useEffect } from 'react';
import { getAppointments, getAppointmentFileBlob, createAppointment, uploadFile, uploadAdditionalAppointmentDocs, sendMessage, updateProfile, getPublicStats } from '../api.js';

const APPOINTMENT_FILE_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'jpg', 'jpeg', 'png', 'webp',
  'bmp', 'gif', 'tiff', 'heic', 'dcm', 'dicom', 'xls', 'xlsx', 'csv', 'zip', 'rar', '7z',
]);
const MAX_APPOINTMENT_FILES = 10;
const MAX_APPOINTMENT_FILE_SIZE = 25 * 1024 * 1024;

function GenderChoice({ value, onChange, isAm = false }) {
  return (
    <fieldset className="gender-choice-field">
      <legend>{isAm ? 'ጾታ' : 'Gender'}</legend>
      <div className="gender-choice-options" role="group" aria-label={isAm ? 'ጾታ' : 'Gender'}>
        {[
          { value: 'Male', label: isAm ? 'ወንድ' : 'Male', icon: 'fa-mars' },
          { value: 'Female', label: isAm ? 'ሴት' : 'Female', icon: 'fa-venus' },
        ].map((option) => (
          <button
            className={`gender-choice-button${value === option.value ? ' selected' : ''}`}
            type="button"
            key={option.value}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <i className={`fas ${option.icon}`} aria-hidden="true"></i>{option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function PatientPortal({
  currentLang, currentUser, onOpenAuth,
  activeTab: propActiveTab, setActiveTab: propSetActiveTab, setActiveModule,
}) {
  const [internalTab, setInternalTab] = useState('home');
  const activeTab = propActiveTab || internalTab;
  const setActiveTab = propSetActiveTab || setInternalTab;

  const [appointmentsList, setAppointmentsList] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptError, setApptError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileProgress, setFileProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [fileUploading, setFileUploading] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const [homeStats, setHomeStats] = useState({ patients: '…', centers: '…', cases: '…' });
  const isAm = currentLang === 'am';

  const heroSlides = [
    {
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ጤና ተደራሽነት ለሁሉም' : 'Healthcare access for everyone',
      text: isAm ? 'ሂል ፈንድ ታካሚዎችን ከተረጋገጠ እና አስተማማኝ ህክምና ጋር ያገናኛል።' : 'HealFund connects patients with trusted care, verified records, and the support they need to move forward.',
    },
    {
      image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ከተረጋገጠ መረጃ ወደ ተሻለ እንክብካቤ' : 'From verified records to better care',
      text: isAm ? 'የህክምና ሰነዶችን በዲጂታል መንገድ ያስተዳድሩ እና ቀጠሮዎን በቀላሉ ይከታተሉ።' : 'Manage medical records digitally, request appointments, and follow every step with confidence.',
    },
    {
      image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ማህበረሰቦችን በጤና ያጠናክሩ' : 'Stronger communities through care',
      text: isAm ? 'የተራ አስተዳደር፣ የገንዘብ ድጋፍ እና የሆስፒታል ግንኙነትን በአንድ ቦታ ያግኙ።' : 'Bring appointments, queue tracking, hospital coordination, and financial assistance together in one place.',
    },
    {
      image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895977?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'የታካሚ ድጋፍ እና የመርሃ ግብር ክትትል' : 'Support that follows each patient',
      text: isAm ? 'የህክምና ተከታታይ እንቅስቃሴዎችን በማየት እንዲቀጥሉ እንረዳዎታለን።' : 'Stay on track with follow-up care, reminders, and support throughout every stage of treatment.',
    },
    {
      image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ከሞተር ማርክ ወደ እንክብካቤ እና ህክምና' : 'Care teams working together',
      text: isAm ? 'ከሆስፒታል ቡድኖች፣ ታካሚዎች እና የገንዘብ እርዳታ ወኪሎች ጋር በአንድ ተስማሚ ሥርዓት ውስጥ ይሰራል።' : 'Connect patients, hospital teams, and financial support partners in one coordinated care journey.',
    },
    {
      image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'በተረጋገጠ ሁኔታ ወደ የተሻለ ጤና' : 'A healthier future, made easier',
      text: isAm ? 'እንዲሁ ማረጋገጫ፣ ማስተዳደር እና ቀጠሮ አገልግሎት በአንድ እንዲቀላቀል እንደሚያስችል ያስተዋውቃሉ።' : 'Access trusted verification, organized appointments, and compassionate support for a healthier tomorrow.',
    },
    {
      image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'የህክምና ሰነዶችን በአስተማማኝ መንገድ ያስተዳድሩ' : 'Trusted records, better decisions',
      text: isAm ? 'ለሁሉም ታካሚዎች የሰነዶች እንዲከተሉ በእውነተኛ ዘዴ እንረዳዎታለን።' : 'Keep every patient record organized and ready so care teams can act quickly and confidently.',
    },
    {
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ጤና ከመጀመሪያ እስከ መጨረሻ' : 'Care from start to finish',
      text: isAm ? 'ከመጀመሪያው ምዝገባ እስከ የምርመራ ክትትል ድረስ የሚያስፈልገውን ድጋፍ እንሰጣለን።' : 'From the first registration to the final follow-up, we help patients stay connected to care.',
    },
    {
      image: 'https://images.unsplash.com/photo-1527613426441-4da17471b8dd?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'የታካሚ ተሞክሮ የሚታይ እና የሚተዳደር' : 'Patient experience made simple',
      text: isAm ? 'መረጃማለት ብቻ ሳይሆን የህክምና ተሞክሮ በማመቻቸት እንረዳዎታለን።' : 'Simplify the patient journey with easier access, communication, and support at every step.',
    },
    {
      image: 'https://images.unsplash.com/photo-1542736667-069246bdbc6d?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'የሆስፒታል ቡድን ተያያዥነት' : 'Connected hospital teams',
      text: isAm ? 'የአስተዳደር እና የህክምና ቡድኖች በግልጽ እና በተስማሚ መንገድ ይሰራሉ።' : 'Coordinate care more clearly across clinical teams, admin staff, and support partners.',
    },
    {
      image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ከእውቀት ወደ እድገት' : 'Knowledge that drives progress',
      text: isAm ? 'የህክምና እውቀትን ወደ ማሰተካከያ እና የጤና እድገት እንደሚቀይር እንደሚያስተምሩ እናስተዋውቃለን።' : 'Turn health information into action so communities can move toward better outcomes.',
    },
    {
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'የህክምና አስተዳደር በመስመር ላይ' : 'Healthcare coordination in one place',
      text: isAm ? 'ከቀጠሮ እስከ የእርዳታ አገልግሎት መረጃዎን በአንድ ቦታ ያስተዳድሩ።' : 'Organize appointments, care updates, and support services in a single, simpler flow.',
    },
    {
      image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ለእያንዳንዱ ታካሚ ግልጽ እና ምቹ አገልግሎት' : 'Clear care for every patient',
      text: isAm ? 'ታካሚዎች የህክምና እድሎችን በፍጥነት እና በደህና ሁኔታ ሊያገኙ ይችላሉ።' : 'Patients can move through care with clearer communication, quicker answers, and stronger support.',
    },
    {
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ታካሚዎችን ከእውነተኛ የጤና ድጋፍ ጋር ማገናኘት' : 'Connecting patients to real support',
      text: isAm ? 'የቀጠሮ ማስተዳደር፣ የድጋፍ እቅድ እና የህክምና ክትትል በአንድ እንዲሰራ እንረዳዎታለን።' : 'Help people receive the care and guidance they need through one connected system.',
    },
    {
      image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ሀብታም ጤና ለማለፍ የሚያስችል መንገድ' : 'A pathway to better health',
      text: isAm ? 'የህክምና ግንኙነትን በእርጋታ እና በቀላሉ ያግኙ።' : 'Build healthier routines and stronger medical access with guidance from a trusted platform.',
    },
    {
      image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1800&q=85',
      title: isAm ? 'ከህክምና አስተዳደር ወደ ህመም መቀነስ' : 'From planning to recovery',
      text: isAm ? 'የታካሚዎችን ጉዞ እየተከተልን በተሳካ ሁኔታ እድገትን እንረዳለን።' : 'Follow every step of the journey so patients can move from uncertainty to confident recovery.',
    },
  ];

  useEffect(() => {
    if (activeTab !== 'home') return undefined;
    const timer = window.setInterval(() => setHeroSlide((slide) => (slide + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [activeTab, heroSlides.length]);

  // Appointment booking form state
  const [isForSelf, setIsForSelf] = useState(true);
  const [bookPatientName, setBookPatientName] = useState('');
  const [bookPatientAge, setBookPatientAge] = useState('');
  const [bookPatientGender, setBookPatientGender] = useState('');
  const [bookRelationship, setBookRelationship] = useState('Child');
  const [bookUrgency, setBookUrgency] = useState('Medium');
  const [bookDisease, setBookDisease] = useState('');
  const [bookDepartment, setBookDepartment] = useState('General Medicine');
  const [bookPhone, setBookPhone] = useState('');
  const [bookFiles, setBookFiles] = useState([]);
  const [bookFileError, setBookFileError] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);

  // Additional document upload state
  const [additionalDocFile, setAdditionalDocFile] = useState(null);
  const [additionalDocError, setAdditionalDocError] = useState('');
  const [additionalDocUploading, setAdditionalDocUploading] = useState(false);

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
    setEditGender(defaultUser.gender === 'Female' ? 'Female' : 'Male');
    setEditLocation(defaultUser.location || '');
    setEditPhoto(defaultUser.profilePhoto || '');
    setProfileMsg('');
    setIsEditingProfile(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileMsg('❌ Choose a PNG, JPEG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg('❌ Photo must be under 2MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target.result === 'string') {
        setEditPhoto(ev.target.result);
        setProfileMsg('');
      }
    };
    reader.onerror = () => setProfileMsg('❌ Could not read the selected photo.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setProfileMsg(isAm ? 'እባክዎ ስም ያስገቡ።' : 'Name is required.');
      return;
    }
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const data = await updateProfile({ name: editName, age: editAge, gender: editGender, location: editLocation, profilePhoto: editPhoto });
      const updated = { ...defaultUser, ...data.user };
      const storage = localStorage.getItem('healfund_remember_me') === 'true' ? localStorage : sessionStorage;
      storage.setItem('healfund_user', JSON.stringify(updated));
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
    setApptError('');
    try {
      // Don't pass patientId — backend determines it from the JWT token
      const data = await getAppointments({});
      if (!data.success || !Array.isArray(data.appointments)) {
        throw new Error(data.message || 'Could not load appointments.');
      }
      setAppointmentsList(data.appointments || []);
    } catch (err) {
      console.warn('Could not fetch appointments:', err.message);
      setApptError(err.message || 'Could not load appointments.');
    } finally {
      setApptLoading(false);
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadedFile(null); setUploadStatus('❌ File too large. Max 10MB.'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setUploadedFile(null);
      setUploadStatus('❌ Invalid type. Upload PDF, JPG, or PNG.'); return;
    }
    setUploadedFile(file);
    setFileProgress(0);
    setUploadStatus(`Ready: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
  };

  const handleBookFilesSelected = (selectedFiles) => {
    const incoming = Array.from(selectedFiles || []);
    if (!incoming.length) return;
    const invalidFile = incoming.find((file) => {
      const extension = file.name.split('.').pop().toLowerCase();
      return !APPOINTMENT_FILE_EXTENSIONS.has(extension) || file.size > MAX_APPOINTMENT_FILE_SIZE;
    });
    if (invalidFile) {
      setBookFileError(`${invalidFile.name}: choose a supported file under 25 MB.`);
      return;
    }
    if (bookFiles.length + incoming.length > MAX_APPOINTMENT_FILES) {
      setBookFileError(`You can attach up to ${MAX_APPOINTMENT_FILES} files per appointment.`);
      return;
    }
    setBookFiles((currentFiles) => [...currentFiles, ...incoming]);
    setBookFileError('');
  };

  const submitFileVerification = async () => {
    if (!uploadedFile || fileUploading) return;
    setFileUploading(true);
    setFileProgress(30);
    try {
      setFileProgress(70);
      const data = await uploadFile(uploadedFile);
      if (!data.success) throw new Error(data.message || 'Could not submit the medical document.');
      setFileProgress(100);
      setUploadStatus('✅ ' + data.message);
      setUploadedFile(null);
      setModalMessage('Your medical document has been submitted to Zewditu Memorial Hospital for verification.');
    } catch (err) {
      setFileProgress(100);
      setUploadStatus(`❌ Upload failed: ${err.message || 'Please try again.'}`);
    } finally {
      setFileUploading(false);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookDisease.trim()) {
      setModalMessage(isAm ? 'እባክዎ የበሽታዎን ወይም የቀጠሮዎን ዝርዝር ያስገቡ።' : 'Please describe your medical condition / symptoms.');
      return;
    }
    setBookSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('patientId', defaultUser.patientId || '');
      formData.append('bookedByUserId', defaultUser.email || defaultUser.patientId || '');
      formData.append('isForSelf', isForSelf);
      formData.append('patientName', isForSelf ? (defaultUser.name || 'Patient') : (bookPatientName || 'Dependent Patient'));
      formData.append('patientAge', isForSelf ? (defaultUser.age || '') : bookPatientAge);
      formData.append('patientGender', isForSelf ? (defaultUser.gender || '') : bookPatientGender);
      formData.append('relationship', isForSelf ? 'Self' : (bookRelationship || 'Dependent'));
      formData.append('urgency', bookUrgency);
      formData.append('disease', bookDisease);
      formData.append('preferredDepartment', bookDepartment);
      formData.append('patientPhone', bookPhone);
      if (bookFiles && bookFiles.length > 0) {
        bookFiles.forEach((file) => {
          formData.append('supportingFiles', file);
        });
      }

      const res = await createAppointment(formData);
      if (!res.success || !res.appointment) {
        throw new Error(res.message || 'Could not submit the appointment request.');
      }
        setAppointmentsList((appointments) => [res.appointment, ...appointments]);
        setApptError('');
        setBookDisease('');
        setBookFiles([]);
        setBookFileError('');
        setBookPhone('');
        if (!isForSelf) {
          setBookPatientName('');
          setBookPatientAge('');
          setBookPatientGender('');
        }
        setModalMessage(
          isAm
            ? 'የቀጠሮ ጥያቄዎ በተሳካ ሁኔታ ተልኳል! ሆስፒታሉ የህመምዎን አጣዳፊነት ገምግሞ ክፍል እና የ10 ደቂቃ ተራ ቁጥር ይመድብልዎታል።'
            : 'Appointment request submitted successfully! Hospital administration will triage your request, assign your Department and Room Number, and allocate your ~10-minute queue slot.'
        );
    } catch (err) {
      setModalMessage(isAm ? `ስህተት ተከስቷል: ${err.message}` : `Failed to submit appointment request: ${err.message}`);
    } finally {
      setBookSubmitting(false);
    }
  };

  const handleUploadAdditionalDoc = async (appointmentId) => {
    if (!additionalDocFile) return;
    setAdditionalDocUploading(true);
    setAdditionalDocError('');
    try {
      const res = await uploadAdditionalAppointmentDocs(appointmentId, additionalDocFile);
      if (!res.success || !res.appointment) {
        throw new Error(res.message || 'Could not upload the requested document.');
      }
        setAppointmentsList((prev) =>
          prev.map((a) => (a.id === appointmentId || a._id === appointmentId ? res.appointment : a))
        );
        setAdditionalDocFile(null);
        setModalMessage(
          isAm
            ? 'ተጨማሪ ሰነድ በተሳካ ሁኔታ ተልኳል! የሆስፒታሉ አስተዳዳሪ ተመልክቶ ያጸድቀዋል።'
            : 'Additional document submitted successfully! Hospital administration will review your updated file.'
        );
    } catch (err) {
      setAdditionalDocError(err.message || 'Could not upload the requested document.');
    } finally {
      setAdditionalDocUploading(false);
    }
  };

  const handleAppointmentFile = async (event, appointmentId, file, download = false) => {
    event.preventDefault();
    const previewWindow = download ? null : window.open('', '_blank');
    if (previewWindow) previewWindow.opener = null;

    try {
      const blob = await getAppointmentFileBlob(appointmentId, file.id, download);
      const fileUrl = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = file.originalName;
        link.click();
      } else if (previewWindow) {
        previewWindow.location.href = fileUrl;
      } else {
        throw new Error('Allow pop-ups to preview this document');
      }
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      previewWindow?.close();
      setModalMessage(`Could not open document: ${err.message}`);
    }
  };

  const handleRequestAgent = async () => {
    try {
      const data = await sendMessage({
        name: defaultUser.name || 'Patient',
        contact: defaultUser.email || `ID: ${defaultUser.patientId}`,
        category: 'Community Agent',
        message: `Assistance request from ${defaultUser.name} (${defaultUser.patientId}), located in ${defaultUser.location || 'Addis Ababa'}.`,
      });
      if (!data.success) throw new Error(data.message || 'Request could not be sent');
      setModalMessage(isAm
        ? 'የማህበረሰብ ወኪል ድጋፍ ጥያቄዎ ደርሷል! ወኪላችን በቅርቡ ያነጋግርዎታል።'
        : 'Community agent request received! A representative will contact you shortly.');
    } catch (err) {
      setModalMessage(isAm
        ? `ጥያቄውን መላክ አልተቻለም፦ ${err.message}`
        : `Could not send your request: ${err.message}`);
    }
  };

  return (
    <div>
      {/* HOME */}
      {activeTab === 'home' && (
        <div className="home-page">
          <section className="hero hero-carousel" style={{ backgroundImage: `url(${heroSlides[heroSlide].image})` }}>
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <span className="hero-eyebrow"><i className="fas fa-heartbeat"></i> HealFund Healthcare Access</span>
              <h1>{heroSlides[heroSlide].title}</h1>
              <p>{heroSlides[heroSlide].text}</p>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={() => setActiveModule(currentUser ? 'appointments' : 'about')}><i className="fas fa-arrow-right"></i> {currentUser ? 'Book an Appointment' : 'Discover HealFund'}</button>
                <button className="btn hero-secondary-action" onClick={() => setActiveModule('contact')}><i className="fas fa-envelope"></i> Contact Support</button>
              </div>
            </div>
            <button className="hero-arrow hero-arrow-prev" aria-label="Previous image" onClick={() => setHeroSlide((heroSlide - 1 + heroSlides.length) % heroSlides.length)}><i className="fas fa-chevron-left"></i></button>
            <button className="hero-arrow hero-arrow-next" aria-label="Next image" onClick={() => setHeroSlide((heroSlide + 1) % heroSlides.length)}><i className="fas fa-chevron-right"></i></button>
            <div className="hero-dots" aria-label="Hero image navigation">
              {heroSlides.map((slide, index) => <button key={`${slide.image}-${index}`} className={index === heroSlide ? 'active' : ''} aria-label={`Show image ${index + 1}`} onClick={() => setHeroSlide(index)} />)}
            </div>
          </section>
          <p className="home-intro">{isAm ? 'ከመጀመሪያ ማረጋገጫ እስከ የሆስፒታል ክትትል፣ የHealFund መድረክ ታካሚዎችን፣ ቤተሰቦችን እና የጤና ባለሙያዎችን በአንድ ያገናኛል።' : 'From first verification to hospital follow-up, HealFund brings patients, families, and care teams together in one trusted place.'}</p>
          <div className="features-grid">
            <div className="feature-card"><i className="fas fa-file-medical-alt"></i><h4>{isAm ? 'የተረጋገጡ ሰነዶች' : 'Verified Medical Records'}</h4><p>{isAm ? 'ሰነዶችዎን ያረጋግጡ።' : 'Securely verify your health documents.'}</p></div>
            <div className="feature-card"><i className="fas fa-calendar-check"></i><h4>{isAm ? 'ቀጥታ ቀጠሮ' : 'Direct Booking'}</h4><p>{isAm ? 'በዘውዲቱ ሆስፒታል ቀጠሮ ይያዙ።' : 'Book appointments directly at Zewditu Memorial Hospital.'}</p></div>
            <div className="feature-card"><i className="fas fa-mobile-alt"></i><h4>{isAm ? 'ኦፍላይን መዳረሻ' : 'Offline & Phone Access'}</h4><p>{isAm ? '*677# ወይም የድምፅ ጥሪ ይጠቀሙ።' : 'Use USSD (*677#) or call our support line.'}</p></div>
          </div>
          <div className="stats-row">
            <div className="stat-item"><h2>{homeStats.patients}</h2><p>{isAm ? 'ተመዝጋቢ ታካሚዎች' : 'Patients Registered'}</p></div>
            <div className="stat-item"><h2>{homeStats.centers}</h2><p>{isAm ? 'የሆስፒታል ማዕከል' : 'Hospital Facility'}</p></div>
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
            <div className="info-row">
              <span className="label"><i className="fas fa-shield-alt"></i> {isAm ? 'የመለያ ሁኔታ' : 'Account status'}</span>
              <span className="value">{defaultUser.status || (isAm ? 'በመጠባበቅ ላይ' : 'Pending')}</span>
            </div>
            {/* Edit Profile Button */}
            <button className="btn btn-outline" onClick={openProfileEdit} style={{ width: '100%', marginTop: '16px', fontSize: '13px' }}>
              <i className="fas fa-edit"></i> {isAm ? 'መለያ አርትዕ' : 'Edit Profile'}
            </button>
          </aside>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header"><h3><i className="fas fa-stethoscope"></i> {isAm ? 'ፋይል እና ቀጠሮ' : 'File & Appointment'}</h3></div>
              <p style={{ color: '#4a5a6e', fontSize: '14px', marginBottom: '16px' }}>
                {apptLoading ? 'Loading appointments...' : appointmentsList.length > 0
                  ? (() => {
                    const scheduled = appointmentsList.find((appointment) => appointment.estimatedTime || appointment.datetime);
                    return scheduled
                      ? `${isAm ? 'ቀጣይ ቀጠሮ' : 'Next appointment'}: ${new Date(scheduled.estimatedTime || scheduled.datetime).toLocaleString()}`
                      : (isAm ? 'የቀጠሮ ጥያቄ በግምገማ ላይ ነው' : 'Appointment request awaiting hospital review');
                  })()
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
        <div>
          {/* Back button */}
          <button className="btn btn-outline" onClick={() => setActiveTab('dashboard')} style={{ marginBottom: '16px', fontSize: '13px' }}>
            <i className="fas fa-arrow-left"></i> {isAm ? 'ወደ ዳሽቦርድ ተመለስ' : 'Back to Dashboard'}
          </button>

          {/* List of Existing Appointments */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3><i className="fas fa-calendar-alt"></i> {isAm ? 'የእርስዎ የቀጠሮ ጥያቄዎች እና መርሃግብር' : 'Your Appointment Requests & Schedule'}</h3>
              <span className="badge" style={{ background: '#078930', color: '#fff', padding: '4px 14px' }}>
                {appointmentsList.length} {isAm ? 'ቀጠሮዎች' : 'Total'}
              </span>
            </div>

            {apptLoading ? (
              <p style={{ color: '#7a8a9e', textAlign: 'center', padding: '24px' }}><i className="fas fa-spinner fa-spin"></i> Loading appointments...</p>
            ) : apptError ? (
              <div role="alert" style={{ textAlign: 'center', padding: '24px', color: '#9f242b' }}>
                <p>{apptError}</p>
                <button className="btn btn-outline" type="button" onClick={fetchAppointments}>Retry</button>
              </div>
            ) : appointmentsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#7a8a9e' }}>
                <i className="fas fa-calendar-times" style={{ fontSize: '36px', marginBottom: '10px', color: '#b0bec5' }}></i>
                <p>{isAm ? 'እስካሁን ምንም የቀጠሮ ጥያቄ አልቀረበም። ከታች አዲስ ቀጠሮ ይጠይቁ።' : 'No appointment requests yet. Fill out the form below to request an appointment.'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {appointmentsList.map((apt) => {
                  const urgencyColor =
                    apt.urgency === 'Emergency' ? '#da121a' :
                    apt.urgency === 'High' ? '#e05000' :
                    apt.urgency === 'Medium' ? '#e07b00' : '#078930';

                  const isApproved = apt.status === 'Approved' || apt.status === 'Confirmed';
                  const isDocsRequired = apt.status === 'Additional Documents Required';
                  const isPending = apt.status === 'Pending Review' || apt.status === 'Pending';
                  const isRejected = apt.status === 'Rejected';
                  const isCancelled = apt.status === 'Cancelled';
                  const isCompleted = apt.status === 'Completed';

                  return (
                    <div
                      key={apt.id || apt._id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        padding: '18px',
                        border: `1.5px solid ${isApproved || isCompleted ? '#86efac' : isDocsRequired ? '#fdba74' : (isRejected || isCancelled) ? '#fca5a5' : '#e2e8f0'}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Top row: Patient Info & Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, color: '#0f3b5e', fontSize: '17px', fontWeight: 700 }}>
                              <i className="fas fa-user-circle" style={{ color: '#078930' }}></i> {apt.patientName}
                            </h4>
                            {apt.relationship && apt.relationship !== 'Self' && (
                              <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                                {apt.relationship}
                              </span>
                            )}
                            <span style={{ background: urgencyColor, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                              <i className="fas fa-heartbeat"></i> {apt.urgency} Urgency
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            ID: <strong>{apt.patientId}</strong> · Request ID: {apt.id} · Requested: {apt.requestedAt ? new Date(apt.requestedAt).toLocaleDateString() : 'Recent'}
                          </div>
                        </div>

                        <div>
                          {isApproved && (
                            <span className="status-badge status-verified" style={{ fontSize: '13px', padding: '6px 14px' }}>
                              <i className="fas fa-check-circle"></i> {isAm ? 'ጸድቋል' : 'Approved & Scheduled'}
                            </span>
                          )}
                          {isDocsRequired && (
                            <span className="status-badge" style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #f97316', fontSize: '13px', padding: '6px 14px' }}>
                              <i className="fas fa-exclamation-triangle"></i> {isAm ? 'ተጨማሪ ሰነዶች ያስፈልጋሉ' : 'Additional Docs Required'}
                            </span>
                          )}
                          {isPending && (
                            <span className="status-badge" style={{ background: '#fefce8', color: '#a16207', border: '1.5px solid #eab308', fontSize: '13px', padding: '6px 14px' }}>
                              <i className="fas fa-clock"></i> {isAm ? 'በሆስፒታሉ ምርመራ ላይ' : 'Under Admin Triage'}
                            </span>
                          )}
                          {isRejected && (
                            <span className="status-badge status-rejected" style={{ fontSize: '13px', padding: '6px 14px' }}>
                              <i className="fas fa-times-circle"></i> {isAm ? 'ተቀባይነት አላገኘም' : 'Rejected'}
                            </span>
                          )}
                          {isCancelled && (
                            <span className="status-badge status-rejected" style={{ fontSize: '13px', padding: '6px 14px', background: '#6b7280', borderColor: '#6b7280' }}>
                              <i className="fas fa-ban"></i> {isAm ? 'ቀጠሮ ተሰርዟል' : 'Cancelled by Admin'}
                            </span>
                          )}
                          {isCompleted && (
                            <span className="status-badge status-verified" style={{ fontSize: '13px', padding: '6px 14px' }}>
                              <i className="fas fa-check-circle"></i> {isAm ? 'ተጠናቋል' : 'Completed'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Disease and Details */}
                      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '13px', color: '#334155' }}>
                          <strong><i className="fas fa-notes-medical" style={{ color: '#078930' }}></i> {isAm ? 'የህመም ዝርዝር' : 'Condition / Symptoms'}:</strong> {apt.disease}
                        </div>
                        {apt.preferredDepartment && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {isAm ? 'የተመረጠ ክፍል' : 'Department of Interest'}: <strong>{apt.preferredDepartment}</strong>
                          </div>
                        )}
                      </div>

                      {/* Case 1: APPROVED - Show Queue Token, Room, Department, and Estimated 10-min Time */}
                      {isApproved && (
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1.5px solid #86efac', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#166534', fontWeight: 700 }}>Queue Token</span>
                              <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d' }}>{apt.queueToken || '—'}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#166534', fontWeight: 700 }}>Department</span>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f3b5e' }}>{apt.assignedDepartment || 'General Clinic'}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#166534', fontWeight: 700 }}>Room Number</span>
                              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f3b5e' }}>
                                <i className="fas fa-door-open" style={{ color: '#078930' }}></i> {apt.assignedRoom || '—'}
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#166534', fontWeight: 700 }}>Consultation Time</span>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f3b5e' }}>
                                📅 {apt.estimatedTime ? new Date(apt.estimatedTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Scheduled'}
                                <span style={{ display: 'block', fontSize: '11px', color: '#166534', fontWeight: 500 }}>(~10 min slot)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Case 2: ADDITIONAL DOCUMENTS REQUIRED */}
                      {isDocsRequired && (
                        <div style={{ background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                          <h5 style={{ color: '#9a3412', margin: '0 0 6px 0', fontSize: '14px' }}>
                            <i className="fas fa-file-upload"></i> {isAm ? 'ሆስፒታሉ የጠየቃቸው ተጨማሪ ሰነዶች' : 'Hospital Admin Requested Additional Documents'}:
                          </h5>
                          {apt.requestedDocuments && apt.requestedDocuments.length > 0 && (
                            <ul style={{ margin: '4px 0 10px 20px', fontSize: '13px', color: '#7c2d12' }}>
                              {apt.requestedDocuments.map((doc, idx) => (
                                <li key={idx}><strong>{doc}</strong></li>
                              ))}
                            </ul>
                          )}
                          {apt.adminNote && (
                            <p style={{ margin: '4px 0 10px 0', fontSize: '12px', color: '#9a3412', fontStyle: 'italic' }}>
                              "{apt.adminNote}"
                            </p>
                          )}

                          {/* Upload Box for Requested Docs */}
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                            <input
                              type="file"
                              id={`additionalDocInput-${apt.id}`}
                              style={{ fontSize: '13px' }}
                              accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.heic,.dcm,.dicom,.xls,.xlsx,.csv,.zip,.rar,.7z"
                                        onChange={(e) => {
                                          const file = e.target.files[0];
                                          setAdditionalDocError('');
                                          if (!file) return;
                                          const extension = file.name.split('.').pop().toLowerCase();
                                          if (!APPOINTMENT_FILE_EXTENSIONS.has(extension) || file.size > MAX_APPOINTMENT_FILE_SIZE) {
                                            setAdditionalDocFile(null);
                                            setAdditionalDocError('Choose a supported file under 25 MB.');
                                            return;
                                          }
                                          setAdditionalDocFile(file);
                                        }}
                            />
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: '13px', padding: '6px 16px' }}
                              disabled={!additionalDocFile || additionalDocUploading}
                              onClick={() => handleUploadAdditionalDoc(apt.id)}
                            >
                              {additionalDocUploading ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : <><i className="fas fa-upload"></i> Submit Document</>}
                            </button>
                          </div>
                          {additionalDocError && <p role="alert" style={{ color: '#b42318', fontSize: '13px', marginBottom: 0 }}>{additionalDocError}</p>}
                        </div>
                      )}

                      {/* Case 3: PENDING REVIEW */}
                      {isPending && (
                        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#854d0e', marginBottom: '8px' }}>
                          <i className="fas fa-info-circle"></i> {isAm ? 'የቀጠሮ ጥያቄዎ በአስተዳዳሪው እየተገመገመ ነው። ህመምዎ ተመርምሮ ክፍል እና የ10 ደቂቃ ተራ ቁጥር በቅርቡ ይመደብልዎታል።' : 'Your request is in queue for administrative review. Department, Room Number, and 10-minute service time slot will be assigned upon approval.'}
                        </div>
                      )}

                      {/* Case 4: REJECTED */}
                      {isRejected && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', marginBottom: '8px' }}>
                          <i className="fas fa-times-circle"></i> <strong>{isAm ? 'ውድቅ የተደረገበት ምክንያት' : 'Rejection Reason'}:</strong> {apt.rejectionReason || apt.adminNote || 'Criteria not met.'}
                        </div>
                      )}

                      {/* Attached supporting files list */}
                      {apt.supportingFiles && apt.supportingFiles.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                          <i className="fas fa-paperclip"></i> {isAm ? 'የተያያዙ ሰነዶች' : 'Attached Documents'}:{' '}
                          {apt.supportingFiles.map((f, i) => (
                            <span key={i} style={{ background: '#e2e8f0', padding: '6px 8px', borderRadius: '6px', marginRight: '6px', marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span>{f.originalName} ({f.size || 'Attached'})</span>
                              <a href="#" onClick={(event) => handleAppointmentFile(event, apt.id, f)} title="View file" style={{ color: '#0f3b5e' }}>
                                <i className="fas fa-eye"></i>
                              </a>
                              <a href="#" onClick={(event) => handleAppointmentFile(event, apt.id, f, true)} title="Download file" style={{ color: '#078930' }}>
                                <i className="fas fa-download"></i>
                              </a>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Appointment Request Booking Form */}
          <div className="card" style={{ borderTop: '5px solid #078930' }}>
            <div className="card-header">
              <h3><i className="fas fa-calendar-plus" style={{ color: '#078930' }}></i> {isAm ? 'አዲስ የቀጠሮ ጥያቄ ያስገቡ' : 'Request a New Hospital Appointment'}</h3>
              <span className="badge" style={{ background: '#0f3b5e', color: '#fff', padding: '4px 12px' }}>
                <i className="fas fa-stethoscope"></i> {isAm ? 'የ10 ደቂቃ ምርመራ' : '10-Min Consultations'}
              </span>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#166534' }}>
              <i className="fas fa-info-circle"></i> <strong>{isAm ? 'ማሳሰቢያ' : 'Appointment Scheduling Notice'}:</strong>{' '}
              {isAm
                ? 'በዘውዲቱ ሆስፒታል ህመምተኞች እንደ ህመማቸው አጣዳፊነትና ቅደም ተከተል ይስተናገዳሉ። ሰዓት መምረጥ አያስፈልግዎትም፤ አስተዳዳሪው ጥያቄዎን ገምግሞ ክፍል እና የ10 ደቂቃ ተራ ቁጥር ይመድብልዎታል።'
                : 'To ensure efficient patient flow, appointments are scheduled by hospital administration in sequential ~10-minute intervals based on medical urgency. Please provide full patient information and supporting documents.'}
            </div>

            <form onSubmit={handleBookAppointment}>
              {/* Step 1: Who is the appointment for? */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 700, color: '#0f3b5e', marginBottom: '8px', display: 'block' }}>
                  <i className="fas fa-user-friends" style={{ color: '#078930' }}></i> {isAm ? 'ቀጠሮው ለማን ነው?' : 'Who is this appointment for?'} *
                </label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: isForSelf ? '#e8f5e9' : '#f8fafc', padding: '10px 18px', borderRadius: '10px', border: `2px solid ${isForSelf ? '#078930' : '#e2e8f0'}`, fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="forWhom"
                      checked={isForSelf}
                      onChange={() => setIsForSelf(true)}
                    />
                    <span><i className="fas fa-user"></i> {isAm ? 'ለራሴ' : 'For Myself'} ({defaultUser.name || 'Account Holder'})</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: !isForSelf ? '#e8f5e9' : '#f8fafc', padding: '10px 18px', borderRadius: '10px', border: `2px solid ${!isForSelf ? '#078930' : '#e2e8f0'}`, fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="forWhom"
                      checked={!isForSelf}
                      onChange={() => setIsForSelf(false)}
                    />
                    <span><i className="fas fa-user-plus"></i> {isAm ? 'ለሌላ ሰው (ልጅ / ቤተሰብ)' : 'For Someone Else (Child, Parent, Dependent)'}</span>
                  </label>
                </div>
              </div>

              {/* Patient Details (Editable if for someone else) */}
              {!isForSelf && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <h5 style={{ margin: '0 0 12px 0', color: '#0f3b5e' }}>
                    <i className="fas fa-id-card"></i> {isAm ? 'የታካሚው መረጃ' : 'Dependent / Patient Details'}
                  </h5>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>{isAm ? 'የታካሚው ሙሉ ስም' : "Patient's Full Name"} *</label>
                      <input
                        type="text"
                        placeholder="e.g. Fatima Kamara"
                        value={bookPatientName}
                        onChange={(e) => setBookPatientName(e.target.value)}
                        required={!isForSelf}
                      />
                    </div>
                    <div className="form-group">
                      <label>{isAm ? 'ዝምድና' : 'Relationship to You'} *</label>
                      <select value={bookRelationship} onChange={(e) => setBookRelationship(e.target.value)}>
                        <option value="Child">{isAm ? 'ልጅ' : 'Child / Son / Daughter'}</option>
                        <option value="Parent">{isAm ? 'ወላጅ' : 'Parent (Mother / Father)'}</option>
                        <option value="Spouse">{isAm ? 'የትዳር አጋር' : 'Spouse (Husband / Wife)'}</option>
                        <option value="Sibling">{isAm ? 'ወንድም / እህት' : 'Sibling (Brother / Sister)'}</option>
                        <option value="Relative">{isAm ? 'ዘመድ' : 'Relative'}</option>
                        <option value="Other">{isAm ? 'ሌላ' : 'Other'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>{isAm ? 'ዕድሜ' : 'Age'}</label>
                      <input
                        type="number"
                        placeholder="e.g. 12"
                        min="0"
                        max="120"
                        value={bookPatientAge}
                        onChange={(e) => setBookPatientAge(e.target.value)}
                      />
                    </div>
                    <GenderChoice value={bookPatientGender} onChange={setBookPatientGender} isAm={isAm} />
                  </div>
                </div>
              )}

              {/* Urgency Level Selector */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 700, color: '#0f3b5e', marginBottom: '8px', display: 'block' }}>
                  <i className="fas fa-heartbeat" style={{ color: '#da121a' }}></i> {isAm ? 'የህመሙ አጣዳፊነት ደረጃ' : 'Medical Urgency Level'} *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {[
                    { id: 'Routine', label: isAm ? 'መደበኛ' : 'Routine / Low', desc: 'General checkup', color: '#078930' },
                    { id: 'Medium', label: isAm ? 'መካከለኛ' : 'Medium', desc: 'Mild symptoms', color: '#e07b00' },
                    { id: 'High', label: isAm ? 'ከፍተኛ' : 'High Urgency', desc: 'Severe discomfort', color: '#e05000' },
                    { id: 'Emergency', label: isAm ? 'አስቸኳይ' : 'Emergency', desc: 'Critical care', color: '#da121a' },
                  ].map((u) => (
                    <div
                      key={u.id}
                      onClick={() => setBookUrgency(u.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: `2px solid ${bookUrgency === u.id ? u.color : '#e2e8f0'}`,
                        background: bookUrgency === u.id ? `${u.color}15` : '#fff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: '0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: u.color, fontSize: '14px' }}>{u.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{u.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disease & Symptoms Description */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 700, color: '#0f3b5e' }}>
                  <i className="fas fa-stethoscope" style={{ color: '#078930' }}></i> {isAm ? 'የህመም ምልክቶች እና ዝርዝር' : 'Medical Condition & Symptoms Description'} *
                </label>
                <textarea
                  rows="3"
                  placeholder={isAm ? 'እባክዎ ስለሚሰማዎት ህመም፣ ምልክቶች ወይም የዶክተር ማዘዣ በዝርዝር ይጻፉ...' : 'Describe your symptoms, illness duration, any known condition, or reason for appointment...'}
                  value={bookDisease}
                  onChange={(e) => setBookDisease(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d0dbe8' }}
                ></textarea>
              </div>

              {/* Department Preference & Contact Phone */}
              <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label>{isAm ? 'የሚፈለገው የህክምና ክፍል' : 'Department of Interest'}</label>
                  <select value={bookDepartment} onChange={(e) => setBookDepartment(e.target.value)}>
                    <option value="General Medicine">General Medicine / OPD</option>
                    <option value="Cardiology">Cardiology (Heart & Cardiovascular)</option>
                    <option value="General Surgery">General Surgery</option>
                    <option value="Pediatrics">Pediatrics & Child Health</option>
                    <option value="Orthopedics">Orthopedics & Traumatology (Bone/Joint)</option>
                    <option value="Oncology">Oncology & Chemotherapy (Cancer/Tumor)</option>
                    <option value="Internal Medicine">Internal Medicine (Chronic Illness & Diabetes)</option>
                    <option value="Neurology">Neurology & Neurosurgery (Brain/Spine)</option>
                    <option value="Nephrology">Nephrology & Dialysis (Kidney Disease/Renal)</option>
                    <option value="Ophthalmology">Ophthalmology (Eye Specialty)</option>
                    <option value="Obstetrics & Gynecology">Obstetrics & Gynecology (OB/GYN & Maternal)</option>
                    <option value="Pulmonology">Pulmonology & Chest Diseases (Lung/Asthma/TB)</option>
                    <option value="Gastroenterology">Gastroenterology & Hepatology (GI/Liver)</option>
                    <option value="Urology">Urology (Urinary Tract & Prostate)</option>
                    <option value="Dermatology">Dermatology (Skin Diseases)</option>
                    <option value="ENT">ENT / Otorhinolaryngology (Ear, Nose, Throat)</option>
                    <option value="Psychiatry">Psychiatry & Mental Health</option>
                    <option value="Endocrinology">Endocrinology (Hormone & Thyroid)</option>
                    <option value="Hematology">Hematology (Blood Disorders & Anemia)</option>
                    <option value="Infectious Diseases">Infectious Diseases & Tropical Medicine</option>
                    <option value="Emergency & Trauma">Emergency & Trauma Triage</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{isAm ? 'ተጠሪ ስልክ ቁጥር' : 'Contact Phone Number'}</label>
                  <input
                    type="tel"
                    placeholder="+251 9..."
                    value={bookPhone}
                    onChange={(e) => setBookPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Supporting File Attachment */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 700, color: '#0f3b5e' }}>
                  <i className="fas fa-paperclip" style={{ color: '#078930' }}></i> {isAm ? 'ደጋፊ የህክምና ሰነዶችን አያይዝ' : 'Attach Supporting Medical Files for Admin Review'} ({isAm ? 'አማራጭ' : 'Optional'})
                </label>
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '18px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('bookFileInput').click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleBookFilesSelected(event.dataTransfer.files);
                  }}
                >
                  <i className="fas fa-file-medical-alt" style={{ fontSize: '28px', color: '#078930', marginBottom: '6px' }}></i>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {isAm
                      ? 'ሰነዶችን ለመምረጥ እዚህ ጠቅ ያድርጉ (PDF, Word, Images, DICOM, ZIP እስከ 25MB)'
                      : 'Click to select Lab Reports, Referrals, DICOM Scans, Images, or Documents (PDF, DOCX, JPG, PNG, DICOM, ZIP up to 25MB)'}
                  </p>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {isAm ? 'አንድ ወይም ከዚያ በላይ ፋይሎችን በአንድ ጊዜ ማያያዝ ይችላሉ' : 'You can attach single or multiple files'}
                  </span>
                  <input
                    type="file"
                    id="bookFileInput"
                    multiple
                    style={{ display: 'none' }}
                    onClick={(event) => event.stopPropagation()}
                    accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.heic,.dcm,.dicom,.xls,.xlsx,.csv,.zip,.rar,.7z"
                    onChange={(e) => {
                      handleBookFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>

                {bookFileError && <p role="alert" style={{ color: '#b42318', fontSize: '13px' }}>{bookFileError}</p>}
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>Up to {MAX_APPOINTMENT_FILES} files, 25 MB each.</p>
                {bookFiles.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bookFiles.map((file, idx) => {
                      const ext = (file.name || '').split('.').pop().toLowerCase();
                      let iconClass = 'fas fa-file-alt';
                      let iconColor = '#64748b';
                      if (['pdf'].includes(ext)) { iconClass = 'fas fa-file-pdf'; iconColor = '#da121a'; }
                      else if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff', 'heic'].includes(ext)) { iconClass = 'fas fa-file-image'; iconColor = '#0284c7'; }
                      else if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) { iconClass = 'fas fa-file-word'; iconColor = '#2563eb'; }
                      else if (['xls', 'xlsx', 'csv'].includes(ext)) { iconClass = 'fas fa-file-excel'; iconColor = '#16a34a'; }
                      else if (['zip', 'rar', '7z'].includes(ext)) { iconClass = 'fas fa-file-archive'; iconColor = '#d97706'; }
                      else if (['dcm', 'dicom'].includes(ext)) { iconClass = 'fas fa-file-medical'; iconColor = '#7c3aed'; }

                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <i className={iconClass} style={{ fontSize: '18px', color: iconColor }}></i>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>
                              {file.name}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setBookFiles((prev) => prev.filter((_, i) => i !== idx));
                              setBookFileError('');
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 8px', fontSize: '14px' }}
                            title="Remove file"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bookSubmitting}
                  style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700 }}
                >
                  {bookSubmitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> {isAm ? 'ጥያቄው እየተላከ ነው...' : 'Submitting Request for Admin Triage...'}</>
                  ) : (
                    <><i className="fas fa-paper-plane"></i> {isAm ? 'የቀጠሮ ጥያቄውን ላክ' : 'Submit Appointment Request for Admin Triage'}</>
                  )}
                </button>
              </div>
            </form>
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
          <div className="upload-area" onClick={() => document.getElementById('fileInputReact').click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFileUpload(event.dataTransfer.files[0]);
            }}>
            <i className="fas fa-cloud-upload-alt"></i>
            <p><strong>{isAm ? 'ጠቅ ያድርጉ ወይም ጎትተው ይጣሉ' : 'Click or drag & drop'}</strong></p>
            <span className="file-types">Supported: PDF, JPG, PNG (max 10MB)</span>
            <input type="file" id="fileInputReact" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onClick={(event) => event.stopPropagation()} onChange={(e) => { handleFileUpload(e.target.files[0]); e.target.value = ''; }} />
          </div>
          {uploadStatus && <div style={{ background: '#f0f5fa', padding: '12px', borderRadius: '10px', marginBottom: '14px', fontSize: '14px' }}>{uploadStatus}</div>}
          {fileProgress > 0 && <div className="progress-container"><div className="progress-bar-fill" style={{ width: `${fileProgress}%` }}></div></div>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button className="btn btn-success" onClick={submitFileVerification} disabled={!uploadedFile || fileUploading}><i className="fas fa-paper-plane"></i> {isAm ? 'ለማረጋገጫ አስረክብ' : 'Submit for Verification'}</button>
            <button className="btn btn-outline" onClick={() => { setUploadedFile(null); setUploadStatus(''); setFileProgress(0); }} disabled={fileUploading}><i className="fas fa-times"></i> {isAm ? 'አጥራ' : 'Clear'}</button>
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
                <GenderChoice value={editGender} onChange={setEditGender} isAm={isAm} />
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
