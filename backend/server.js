import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dataStore } from './dataStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Allow requests from both frontends
const allowedOrigins = [
  'http://localhost:3000',  // user frontend (dev)
  'http://localhost:3001',  // admin frontend (dev)
  process.env.USER_FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile, curl) or matching origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json());

// Setup file storage directory
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// ─── AUTHENTICATION ────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = dataStore.users[email];

  if (user && user.password === password) {
    const { password: _, ...userWithoutPass } = user;
    return res.json({ success: true, user: userWithoutPass });
  }

  return res.status(401).json({ success: false, message: 'Invalid email or password' });
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, age, gender, location } = req.body;

  if (!name || !email || !password || !age || !gender || !location) {
    return res.status(400).json({ success: false, message: 'Please fill in all fields' });
  }

  if (dataStore.users[email]) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const nextIdNumber = Object.keys(dataStore.users).length + 248;
  const patientId = `HF-${String(nextIdNumber).padStart(4, '0')}`;

  const newUser = {
    name,
    email,
    password,
    age: parseInt(age),
    gender,
    location,
    patientId,
    status: 'Verified',
    registered: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };

  dataStore.users[email] = newUser;
  const { password: _, ...userWithoutPass } = newUser;
  res.json({ success: true, user: userWithoutPass });
});

// ─── HOSPITALS ─────────────────────────────────────────────────────────────────
app.get('/api/hospitals', (req, res) => {
  res.json({ success: true, hospitals: dataStore.hospitals });
});

// ─── REFERRALS ─────────────────────────────────────────────────────────────────
app.get('/api/referrals', (req, res) => {
  const { sendingHospitalId, receivingHospitalId, patientId } = req.query;
  let list = dataStore.referrals;

  if (sendingHospitalId) list = list.filter((r) => r.sendingHospitalId === sendingHospitalId);
  if (receivingHospitalId) list = list.filter((r) => r.receivingHospitalId === receivingHospitalId);
  if (patientId) list = list.filter((r) => r.patientId === patientId);

  res.json({ success: true, referrals: list });
});

app.post('/api/referrals', (req, res) => {
  const {
    patientName, patientId, patientAge, patientGender, patientLocation,
    sendingHospitalId, receivingHospitalId, department, urgency,
    reasonForReferral, clinicalSummary, contactPhone, documents,
  } = req.body;

  if (!patientName || !sendingHospitalId || !receivingHospitalId || !department || !reasonForReferral) {
    return res.status(400).json({ success: false, message: 'Missing required referral fields' });
  }

  const sendingHosp = dataStore.hospitals.find((h) => h.id === sendingHospitalId) || { name: 'Referring Health Center' };
  const refNumber = String(dataStore.referrals.length + 453).padStart(5, '0');

  const newReferral = {
    id: `REF-2026-${refNumber}`,
    patientName,
    patientId: patientId || `HF-${Math.floor(1000 + Math.random() * 9000)}`,
    patientAge: parseInt(patientAge) || 30,
    patientGender: patientGender || 'Other',
    patientLocation: patientLocation || 'Addis Ababa',
    sendingHospitalId,
    sendingHospitalName: sendingHosp.name,
    sendingDoctor: req.body.sendingDoctor || 'Authorized Officer',
    receivingHospitalId: 'HOSP-001',
    receivingHospitalName: 'Zewditu Memorial Hospital',
    department,
    urgency: urgency || 'Medium',
    reasonForReferral,
    clinicalSummary: clinicalSummary || 'Referred for specialized tertiary evaluation.',
    documents: documents || [],
    contactPhone: contactPhone || '+251900000000',
    status: 'Pending Review',
    createdAt: new Date().toISOString(),
  };

  dataStore.referrals.unshift(newReferral);
  res.json({ success: true, referral: newReferral });
});

app.put('/api/referrals/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, assignedDoctor, appointmentTime } = req.body;

  const referral = dataStore.referrals.find((r) => r.id === id);
  if (!referral) return res.status(404).json({ success: false, message: 'Referral not found' });

  referral.status = status;
  if (status === 'Accepted') {
    referral.acceptedAt = new Date().toISOString();
    referral.assignedDoctor = assignedDoctor || 'Dr. M. Worku';

    const tokenNum = String(dataStore.queue.length + 24).padStart(3, '0');
    const queueToken = `C-${tokenNum}`;
    referral.queueToken = queueToken;
    referral.appointmentTime = appointmentTime || '2026-08-25T10:00:00Z';

    dataStore.appointments.unshift({
      id: `APT-${1000 + dataStore.appointments.length + 1}`,
      patientId: referral.patientId,
      patientName: referral.patientName,
      hospitalName: referral.receivingHospitalName,
      doctorName: referral.assignedDoctor,
      department: referral.department,
      datetime: referral.appointmentTime,
      status: 'Confirmed',
      queueToken,
      referralId: referral.id,
    });

    dataStore.queue.unshift({
      token: queueToken,
      patientId: referral.patientId,
      patientName: referral.patientName,
      department: `${referral.department} Clinic`,
      assignedDoctor: referral.assignedDoctor,
      estimatedTime: referral.appointmentTime,
      status: 'Scheduled',
      urgency: referral.urgency,
      requiredDocuments: [`Referral Letter ${referral.id}`, 'ID / QR Card', 'Lab Reports'],
    });
  }

  res.json({ success: true, referral });
});

// ─── APPOINTMENTS ──────────────────────────────────────────────────────────────
app.get('/api/appointments', (req, res) => {
  const { patientId } = req.query;
  let list = dataStore.appointments;
  if (patientId) list = list.filter((a) => a.patientId === patientId);
  res.json({ success: true, appointments: list });
});

app.post('/api/appointments', (req, res) => {
  const { patientId, patientName, department, datetime } = req.body;
  const tokenNum = String(dataStore.queue.length + 25).padStart(3, '0');
  const queueToken = `C-${tokenNum}`;

  const newAppt = {
    id: `APT-${1000 + dataStore.appointments.length + 1}`,
    patientId: patientId || 'HF-0247',
    patientName: patientName || 'Ahmed Kamara',
    hospitalName: 'Zewditu Memorial Hospital',
    doctorName: 'Dr. M. Worku',
    department: department || 'General Medicine',
    datetime: datetime || new Date().toISOString(),
    status: 'Confirmed',
    queueToken,
  };

  dataStore.appointments.unshift(newAppt);
  dataStore.queue.unshift({
    token: queueToken,
    patientId: newAppt.patientId,
    patientName: newAppt.patientName,
    department: `${newAppt.department} Clinic`,
    assignedDoctor: newAppt.doctorName,
    estimatedTime: newAppt.datetime,
    status: 'Scheduled',
    urgency: 'Routine',
    requiredDocuments: ['Patient ID / QR Card'],
  });

  res.json({ success: true, appointment: newAppt });
});

// ─── QUEUE ─────────────────────────────────────────────────────────────────────
app.get('/api/queue', (req, res) => {
  res.json({ success: true, queue: dataStore.queue });
});

// ─── FINANCIAL ASSISTANCE ──────────────────────────────────────────────────────
app.get('/api/financial-cases', (req, res) => {
  res.json({ success: true, cases: dataStore.financialCases });
});

app.post('/api/financial-cases/:id/donate', (req, res) => {
  const { id } = req.params;
  const { amount, donorName, paymentMethod } = req.body;

  const caseObj = dataStore.financialCases.find((c) => c.id === id);
  if (!caseObj) return res.status(404).json({ success: false, message: 'Case not found' });

  const donationVal = parseFloat(amount) || 500;
  caseObj.raisedAmount += donationVal;
  caseObj.donorsCount += 1;

  res.json({
    success: true,
    message: `Thank you ${donorName || 'Supporter'}! Donation of ${donationVal} ETB via ${paymentMethod || 'Telebirr'} processed.`,
    case: caseObj,
  });
});

// ─── FILE UPLOAD ───────────────────────────────────────────────────────────────
app.post('/api/files/upload', upload.single('medicalFile'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  res.json({
    success: true,
    message: 'File uploaded successfully! Waiting for Zewditu Hospital to verify.',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadDate: new Date().toLocaleDateString('en-GB'),
      status: 'Pending Verification',
    },
  });
});

// ─── MESSAGES / ADMIN INBOX ────────────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  res.json({ success: true, messages: dataStore.messages || [] });
});

app.post('/api/messages', (req, res) => {
  const { name, contact, category, message } = req.body;
  if (!name || !message) return res.status(400).json({ success: false, message: 'Name and message are required' });

  const msgNumber = String((dataStore.messages || []).length + 1001);
  const newMessage = {
    id: `MSG-${msgNumber}`,
    name,
    contact: contact || 'Anonymous / Not provided',
    category: category || 'General Inquiry',
    message,
    status: 'Unread',
    createdAt: new Date().toISOString(),
  };

  if (!dataStore.messages) dataStore.messages = [];
  dataStore.messages.unshift(newMessage);

  res.json({ success: true, message: 'Message received successfully', data: newMessage });
});

app.put('/api/messages/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const msg = (dataStore.messages || []).find((m) => m.id === id);
  if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
  msg.status = status || 'Read';
  res.json({ success: true, data: msg });
});

app.delete('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const index = (dataStore.messages || []).findIndex((m) => m.id === id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Message not found' });
  const deleted = dataStore.messages.splice(index, 1);
  res.json({ success: true, deleted: deleted[0] });
});

app.listen(PORT, () => {
  console.log(`HealFund backend running on http://localhost:${PORT}`);
});
