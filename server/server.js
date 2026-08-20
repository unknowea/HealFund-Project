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

app.use(cors());
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

// Root route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'HealFund Backend API running', version: '2.0.0' });
});

// API Routes

// --- AUTHENTICATION ---
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

// --- HOSPITALS ---
app.get('/api/hospitals', (req, res) => {
  res.json({ success: true, hospitals: dataStore.hospitals });
});

// --- APPOINTMENTS ---
app.get('/api/appointments', (req, res) => {
  const { patientId } = req.query;
  let list = dataStore.appointments;
  if (patientId) {
    list = list.filter((a) => a.patientId === patientId);
  }
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

// --- QUEUE ---
app.get('/api/queue', (req, res) => {
  res.json({ success: true, queue: dataStore.queue });
});

// --- FINANCIAL ASSISTANCE (Crowdfunding) ---
app.get('/api/financial-cases', (req, res) => {
  res.json({ success: true, cases: dataStore.financialCases });
});

app.post('/api/financial-cases/:id/donate', (req, res) => {
  const { id } = req.params;
  const { amount, donorName, paymentMethod } = req.body;

  const caseObj = dataStore.financialCases.find((c) => c.id === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  const donationVal = parseFloat(amount) || 500;
  caseObj.raisedAmount += donationVal;
  caseObj.donorsCount += 1;

  res.json({
    success: true,
    message: `Thank you ${donorName || 'Supporter'}! Donation of ${donationVal} ETB via ${paymentMethod || 'Telebirr'} processed.`,
    case: caseObj,
  });
});

// --- FILE UPLOAD (patients submit docs — stored, awaiting admin verification) ---
app.post('/api/files/upload', upload.single('medicalFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { patientId, patientName, category } = req.body;
  const ext = req.file.originalname.split('.').pop().toLowerCase();

  const docId = `DOC-${String(Date.now()).slice(-6)}`;
  const newDoc = {
    id: docId,
    patientId: patientId || 'HF-UNKNOWN',
    patientName: patientName || 'Unknown Patient',
    originalName: req.file.originalname,
    filename: req.file.filename,
    size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
    type: ext,
    category: category || 'General Medical Document',
    uploadDate: new Date().toISOString(),
    status: 'Pending Verification',
    adminNote: '',
  };

  dataStore.patientDocuments.unshift(newDoc);

  // Add to activity log
  dataStore.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    action: 'Document Uploaded',
    detail: `${req.file.originalname} uploaded by ${patientName || patientId || 'patient'} — awaiting admin verification`,
    actor: patientName || patientId || 'Patient',
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'File uploaded successfully! Waiting for admin verification.',
    file: {
      id: docId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: newDoc.size,
      uploadDate: newDoc.uploadDate,
      status: 'Pending Verification',
    },
  });
});

// Patient fetches their OWN documents and waiting list status (no content, raw path hidden)
app.get('/api/files/my-documents', (req, res) => {
  const { patientId } = req.query;
  if (!patientId) {
    return res.status(400).json({ success: false, message: 'patientId is required' });
  }
  // Strip filename (server path) — patient only sees metadata + verification status
  const docs = dataStore.patientDocuments
    .filter((d) => d.patientId === patientId)
    .map(({ filename, ...rest }) => rest);

  // Find any active waiting list queue token for this patient
  const patientQueue = dataStore.queue.find((q) => q.patientId === patientId);

  res.json({
    success: true,
    documents: docs,
    waitingListEntry: patientQueue || null,
  });
});

// --- MESSAGES / ADMIN INBOX ---
app.get('/api/messages', (req, res) => {
  res.json({ success: true, messages: dataStore.messages || [] });
});

app.post('/api/messages', (req, res) => {
  const { name, contact, category, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ success: false, message: 'Name and message are required' });
  }

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
  if (!msg) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }
  msg.status = status || 'Read';
  res.json({ success: true, data: msg });
});

app.delete('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const index = (dataStore.messages || []).findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }
  const deleted = dataStore.messages.splice(index, 1);
  res.json({ success: true, deleted: deleted[0] });
});


// =====================================================
// ADMIN API ROUTES
// =====================================================

// --- ADMIN AUTH ---
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  const admin = dataStore.admins[email];
  if (admin && admin.password === password) {
    const { password: _, ...adminWithoutPass } = admin;
    return res.json({ success: true, admin: { ...adminWithoutPass, isAdmin: true } });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});

// --- ADMIN DASHBOARD STATS ---
app.get('/api/admin/stats', (req, res) => {
  const totalUsers = Object.keys(dataStore.users).length;
  const totalFinancialCases = dataStore.financialCases.length;
  const totalRaised = dataStore.financialCases.reduce((sum, c) => sum + c.raisedAmount, 0);
  const totalTarget = dataStore.financialCases.reduce((sum, c) => sum + c.targetAmount, 0);
  const totalDonors = dataStore.financialCases.reduce((sum, c) => sum + c.donorsCount, 0);
  const totalQueueEntries = dataStore.queue.length;
  const totalHospitals = dataStore.hospitals.length;
  const totalAppointments = dataStore.appointments.length;
  const totalDocuments = dataStore.patientDocuments.length;
  const pendingDocuments = dataStore.patientDocuments.filter((d) => d.status === 'Pending Verification').length;
  const verifiedDocuments = dataStore.patientDocuments.filter((d) => d.status === 'Verified').length;
  const rejectedDocuments = dataStore.patientDocuments.filter((d) => d.status === 'Rejected').length;

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalFinancialCases,
      totalRaised,
      totalTarget,
      totalDonors,
      totalQueueEntries,
      totalHospitals,
      totalAppointments,
      totalDocuments,
      pendingDocuments,
      verifiedDocuments,
      rejectedDocuments,
    },
  });
});

// --- ADMIN: ALL USERS ---
app.get('/api/admin/users', (req, res) => {
  const users = Object.values(dataStore.users).map(({ password: _, ...u }) => u);
  res.json({ success: true, users });
});

app.delete('/api/admin/users/:email', (req, res) => {
  const { email } = req.params;
  if (!dataStore.users[email]) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  delete dataStore.users[email];
  dataStore.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    action: 'User Deleted',
    detail: `User account ${email} removed`,
    actor: 'Admin',
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, message: 'User deleted' });
});

// --- ADMIN: ALL FINANCIAL CASES ---
app.get('/api/admin/financial-cases', (req, res) => {
  res.json({ success: true, cases: dataStore.financialCases });
});

app.post('/api/admin/financial-cases', (req, res) => {
  const { patientName, patientId, diagnosis, targetAmount, description, verifyingHospital, verifiedByDoctor } = req.body;
  if (!patientName || !diagnosis || !targetAmount) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  const newCase = {
    id: `CASE-${new Date().getFullYear()}-${8800 + dataStore.financialCases.length + 1}`,
    patientId: patientId || 'HF-XXXX',
    patientName,
    age: 0,
    location: 'Addis Ababa',
    diagnosis,
    verifyingHospital: verifyingHospital || 'HealFund Admin',
    verifiedByDoctor: verifiedByDoctor || 'Admin',
    verificationStage1: 'Admin Created',
    verificationStage2: 'Pending Hospital Verification',
    targetAmount: parseFloat(targetAmount),
    raisedAmount: 0,
    currency: 'ETB',
    description: description || '',
    status: 'Active',
    donorsCount: 0,
    createdAt: new Date().toISOString(),
  };
  dataStore.financialCases.unshift(newCase);
  dataStore.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    action: 'Financial Case Created',
    detail: `${newCase.id} opened for ${patientName}`,
    actor: 'Admin',
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, case: newCase });
});

app.put('/api/admin/financial-cases/:id/status', (req, res) => {
  const { status } = req.body;
  const c = dataStore.financialCases.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Not found' });
  c.status = status;
  res.json({ success: true, case: c });
});

app.delete('/api/admin/financial-cases/:id', (req, res) => {
  const idx = dataStore.financialCases.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  dataStore.financialCases.splice(idx, 1);
  res.json({ success: true });
});

// --- ADMIN: HOSPITALS ---
app.get('/api/admin/hospitals', (req, res) => {
  res.json({ success: true, hospitals: dataStore.hospitals });
});

app.post('/api/admin/hospitals', (req, res) => {
  const { name, location, level, phone, departments } = req.body;
  if (!name || !location) {
    return res.status(400).json({ success: false, message: 'Name and location are required' });
  }
  const newHosp = {
    id: `HOSP-${String(dataStore.hospitals.length + 1).padStart(3, '0')}`,
    name,
    location,
    level: level || 'General Hospital',
    verified: false,
    departments: departments || [],
    phone: phone || '',
  };
  dataStore.hospitals.push(newHosp);
  res.json({ success: true, hospital: newHosp });
});

app.put('/api/admin/hospitals/:id/verify', (req, res) => {
  const h = dataStore.hospitals.find((x) => x.id === req.params.id);
  if (!h) return res.status(404).json({ success: false, message: 'Not found' });
  h.verified = !h.verified;
  res.json({ success: true, hospital: h });
});

app.delete('/api/admin/hospitals/:id', (req, res) => {
  const idx = dataStore.hospitals.findIndex((h) => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  dataStore.hospitals.splice(idx, 1);
  res.json({ success: true });
});

// --- ADMIN: QUEUE MANAGEMENT ---
app.get('/api/admin/queue', (req, res) => {
  res.json({ success: true, queue: dataStore.queue });
});

app.put('/api/admin/queue/:token/status', (req, res) => {
  const { status } = req.body;
  const entry = dataStore.queue.find((q) => q.token === req.params.token);
  if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
  entry.status = status;
  res.json({ success: true, entry });
});

app.delete('/api/admin/queue/:token', (req, res) => {
  const idx = dataStore.queue.findIndex((q) => q.token === req.params.token);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  dataStore.queue.splice(idx, 1);
  res.json({ success: true });
});

// --- ADMIN: ACTIVITY LOG ---
app.get('/api/admin/activity-log', (req, res) => {
  res.json({ success: true, log: dataStore.activityLog });
});

// --- ADMIN: PATIENT DOCUMENTS (admin-only full access) ---

// Get all documents — with optional filter by status or patientId
app.get('/api/admin/documents', (req, res) => {
  const { status, patientId } = req.query;
  let docs = dataStore.patientDocuments;
  if (status && status !== 'All') docs = docs.filter((d) => d.status === status);
  if (patientId) docs = docs.filter((d) => d.patientId === patientId);
  res.json({ success: true, documents: docs });
});

// Admin verifies or rejects a document & manages waiting list placement
app.put('/api/admin/documents/:id/verify', (req, res) => {
  const { status, adminNote, addToWaitingList, department, urgency, assignedDoctor } = req.body;
  const doc = dataStore.patientDocuments.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  const prevStatus = doc.status;
  doc.status = status;
  doc.adminNote = adminNote || (status === 'Verified' ? 'Document verified and approved by Admin.' : status === 'Rejected' ? 'Document rejected. Please review feedback.' : '');
  doc.reviewedAt = new Date().toISOString();

  let generatedToken = doc.queueToken || null;

  // Handle Waiting List (Queue) Placement when Verified
  if (status === 'Verified' && addToWaitingList !== false) {
    // Check if patient is already in the queue
    let queueEntry = dataStore.queue.find((q) => q.patientId === doc.patientId);

    if (!queueEntry) {
      const tokenNum = String(dataStore.queue.length + 25).padStart(3, '0');
      generatedToken = `C-${tokenNum}`;
      const targetDept = department || 'General Medical Clinic (Room 102)';
      const targetDoc = assignedDoctor || 'Dr. M. Worku';
      const targetUrgency = urgency || 'Medium';

      queueEntry = {
        token: generatedToken,
        patientId: doc.patientId,
        patientName: doc.patientName,
        department: targetDept.includes('Clinic') ? targetDept : `${targetDept} Clinic`,
        assignedDoctor: targetDoc,
        estimatedTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        status: 'Waiting', // Active on waiting list
        urgency: targetUrgency,
        requiredDocuments: [doc.originalName, 'ID / QR Card'],
      };

      dataStore.queue.unshift(queueEntry);
    } else {
      generatedToken = queueEntry.token;
      queueEntry.status = 'Waiting';
      if (department) queueEntry.department = department.includes('Clinic') ? department : `${department} Clinic`;
      if (urgency) queueEntry.urgency = urgency;
      if (assignedDoctor) queueEntry.assignedDoctor = assignedDoctor;
    }

    doc.queueToken = generatedToken;
  }

  // Handle Rejection Workflow
  if (status === 'Rejected') {
    if (doc.queueToken) {
      const existingQueueIndex = dataStore.queue.findIndex((q) => q.token === doc.queueToken);
      if (existingQueueIndex !== -1) {
        dataStore.queue[existingQueueIndex].status = 'Cancelled';
      }
    }
  }

  dataStore.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    action: `Document ${status}`,
    detail: `${doc.originalName} (${doc.patientName} · ${doc.patientId}) — ${status}${generatedToken ? ' · Placed on Waiting List (' + generatedToken + ')' : ''}${adminNote ? ': ' + adminNote : ''}`,
    actor: 'Admin',
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, document: doc, queueToken: generatedToken });
});

// Admin download / serve a document file (protected — admin only)
app.get('/api/admin/documents/:id/file', (req, res) => {
  const doc = dataStore.patientDocuments.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  const filePath = path.join(uploadDir, doc.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found on server' });
  }
  res.download(filePath, doc.originalName);
});

// Admin delete a document
app.delete('/api/admin/documents/:id', (req, res) => {
  const idx = dataStore.patientDocuments.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  const [removed] = dataStore.patientDocuments.splice(idx, 1);

  // Also remove file from disk
  const filePath = path.join(uploadDir, removed.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  dataStore.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    action: 'Document Deleted',
    detail: `${removed.originalName} deleted for ${removed.patientName}`,
    actor: 'Admin',
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true });
});

// =====================================================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
