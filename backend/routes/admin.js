import express from 'express';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { protect, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import FinancialCase, { getConfirmedAccounting } from '../models/FinancialCase.js';
import Hospital from '../models/Hospital.js';
import Message from '../models/Message.js';
import PatientDocument from '../models/PatientDocument.js';
import Queue from '../models/Queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');
const uploadRoot = path.resolve(uploadDir);
const getUploadPath = (filename) => {
  if (typeof filename !== 'string') return null;
  const filePath = path.resolve(uploadRoot, filename);
  const relativePath = path.relative(uploadRoot, filePath);
  return relativePath && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath)
    ? filePath
    : null;
};

const router = express.Router();
const ownerEmail = (process.env.OWNER_EMAIL || 'healfund2006@gmail.com').trim().toLowerCase();

const requireOwner = async (req, res, next) => {
  try {
    const owner = await User.findById(req.user.id).select('email role');
    if (
      !owner ||
      owner.role !== 'admin' ||
      owner.email.toLowerCase() !== ownerEmail ||
      req.user.email?.toLowerCase() !== ownerEmail
    ) {
      return res.status(403).json({ success: false, message: 'Only the HealFund owner can manage profiles and admin accounts' });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const serializeDocument = (doc) => ({
  id: doc.documentId,
  patientId: doc.patientId,
  patientName: doc.patientName,
  originalName: doc.originalName,
  filename: doc.filename,
  size: doc.size,
  type: doc.type,
  category: doc.category,
  uploadDate: doc.uploadDate || doc.createdAt,
  status: doc.status,
  adminNote: doc.adminNote || '',
  queueToken: doc.queueToken || null,
  reviewedAt: doc.reviewedAt || null,
});

const allocateQueueToken = async () => {
  let sequence = (await Queue.countDocuments()) + 25;
  let token = `C-${String(sequence).padStart(3, '0')}`;
  while (await Queue.exists({ token })) {
    sequence += 1;
    token = `C-${String(sequence).padStart(3, '0')}`;
  }
  return token;
};

// GET /api/admin/stats
router.get('/stats', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const [
      totalUsers, totalAppointments, pendingAppointments, totalHospitals,
      financialCases, totalDocuments, pendingDocuments,
      verifiedDocuments, rejectedDocuments,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient', deletedAt: null }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'Pending Review' }),
      Hospital.countDocuments({ hospitalId: 'HOSP-001' }),
      FinancialCase.find(),
      PatientDocument.countDocuments(),
      PatientDocument.countDocuments({ status: 'Pending Verification' }),
      PatientDocument.countDocuments({ status: 'Verified' }),
      PatientDocument.countDocuments({ status: 'Rejected' }),
    ]);

    const totalRaised = financialCases.reduce((sum, financialCase) => sum + getConfirmedAccounting(financialCase).raisedAmount, 0);
    const totalTarget = financialCases.reduce((sum, financialCase) => sum + (financialCase.targetAmount || 0), 0);
    const totalDonors = financialCases.reduce((sum, financialCase) => sum + getConfirmedAccounting(financialCase).donorsCount, 0);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDocuments,
        pendingDocuments,
        verifiedDocuments,
        rejectedDocuments,
        totalFinancialCases: financialCases.length,
        totalRaised,
        totalTarget,
        totalDonors,
        totalAppointments,
        pendingAppointments,
        totalHospitals,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/documents
router.get('/documents', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { status, patientId } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (patientId) filter.patientId = patientId;

    const docs = await PatientDocument.find(filter).sort({ uploadDate: -1 });
    res.json({ success: true, documents: docs.map(serializeDocument) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/documents/:id/verify
router.put('/documents/:id/verify', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { status, adminNote, addToWaitingList, department, urgency, assignedDoctor } = req.body;
    if (!['Verified', 'Rejected', 'Pending Verification'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Verified, Rejected, or Pending Verification' });
    }
    if (typeof adminNote !== 'undefined' && typeof adminNote !== 'string') {
      return res.status(400).json({ success: false, message: 'Admin note must be text' });
    }
    if (adminNote && adminNote.length > 2000) {
      return res.status(400).json({ success: false, message: 'Admin note must be 2,000 characters or fewer' });
    }
    if (typeof department !== 'undefined' && (typeof department !== 'string' || !department.trim() || department.trim().length > 120)) {
      return res.status(400).json({ success: false, message: 'Department must be 1 to 120 characters' });
    }
    if (typeof assignedDoctor !== 'undefined' && (typeof assignedDoctor !== 'string' || !assignedDoctor.trim() || assignedDoctor.trim().length > 120)) {
      return res.status(400).json({ success: false, message: 'Assigned doctor must be 1 to 120 characters' });
    }
    if (typeof addToWaitingList !== 'undefined' && typeof addToWaitingList !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Waiting-list option must be true or false' });
    }
    if (status === 'Rejected' && !adminNote?.trim()) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }
    if (urgency && !['Emergency', 'High', 'Medium', 'Low', 'Routine'].includes(urgency)) {
      return res.status(400).json({ success: false, message: 'Invalid urgency level' });
    }
    const doc = await PatientDocument.findOne({ documentId: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.status = status;
    doc.adminNote = adminNote || (
      status === 'Verified'
        ? 'Document verified and approved by Admin.'
        : status === 'Rejected'
          ? 'Document rejected. Please review feedback.'
          : ''
    );
    doc.reviewedAt = new Date();

    let generatedToken = doc.queueToken || null;

    if (status === 'Verified' && addToWaitingList !== false) {
      let queueEntry = await Queue.findOne({ patientId: doc.patientId });

      if (!queueEntry) {
        generatedToken = await allocateQueueToken();
        const targetDept = department?.trim() || 'General Medical Clinic (Room 102)';
        const targetDoc = assignedDoctor?.trim() || 'Dr. M. Worku';
        const targetUrgency = urgency || 'Medium';

        queueEntry = await Queue.create({
          token: generatedToken,
          patientId: doc.patientId,
          patientName: doc.patientName,
          department: targetDept.includes('Clinic') ? targetDept : `${targetDept} Clinic`,
          assignedDoctor: targetDoc,
          estimatedTime: new Date(Date.now() + 86400000 * 2),
          status: 'Waiting',
          urgency: targetUrgency,
          requiredDocuments: [doc.originalName, 'Patient ID Card'],
        });
      } else {
        generatedToken = queueEntry.token;
        queueEntry.status = 'Waiting';
        if (department) {
          const targetDept = department.trim();
          queueEntry.department = targetDept.includes('Clinic') ? targetDept : `${targetDept} Clinic`;
        }
        if (urgency) queueEntry.urgency = urgency;
        if (assignedDoctor) queueEntry.assignedDoctor = assignedDoctor.trim();
        await queueEntry.save();
      }

      doc.queueToken = generatedToken;
    }

    if (status === 'Rejected' && doc.queueToken) {
      await Queue.findOneAndUpdate({ token: doc.queueToken }, { status: 'Cancelled' });
    }

    await doc.save();
    res.json({ success: true, document: serializeDocument(doc), queueToken: generatedToken });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/documents/:id/file
router.get('/documents/:id/file', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    let doc = await PatientDocument.findOne({
      $or: [{ documentId: req.params.id }, { filename: req.params.id }],
    });
    if (!doc && mongoose.Types.ObjectId.isValid(req.params.id)) {
      doc = await PatientDocument.findById(req.params.id);
    }
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found in database' });

    const filePath = getUploadPath(doc.filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server. Please re-upload.' });
    }
    res.set('X-Content-Type-Options', 'nosniff');
    if (req.query.action === 'view') {
      res.sendFile(filePath, { headers: { 'Content-Disposition': `inline; filename="${doc.originalName || doc.filename}"` } });
    } else {
      res.download(filePath, doc.originalName || doc.filename);
    }
  } catch (err) {
    console.error('Admin document file request failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/documents/:id
router.delete('/documents/:id', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    let doc = await PatientDocument.findOne({
      $or: [{ documentId: req.params.id }, { filename: req.params.id }],
    });
    if (!doc && mongoose.Types.ObjectId.isValid(req.params.id)) {
      doc = await PatientDocument.findById(req.params.id);
    }
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const filePath = getUploadPath(doc.filename);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Could not delete patient document file:', e);
        return res.status(500).json({ success: false, message: 'Could not delete the uploaded file. The document record was retained.' });
      }
    }

    await PatientDocument.deleteOne({ _id: doc._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/activity-log
router.get('/activity-log', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const [recentMessages, recentDocs, recentAppointments] = await Promise.all([
      Message.find().sort({ createdAt: -1 }).limit(5).lean(),
      PatientDocument.find().sort({ uploadDate: -1 }).limit(5).lean(),
      Appointment.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const entries = [
      ...recentMessages.map((m) => ({
        id: m._id.toString(),
        action: 'Message',
        detail: `${m.message ? m.message.substring(0, 60) : ''}…`,
        actor: m.name || 'Unknown',
        timestamp: m.createdAt,
      })),
      ...recentDocs.map((d) => ({
        id: d._id.toString(),
        action: 'Document Upload',
        detail: `${d.originalName || d.filename} — ${d.status}`,
        actor: d.patientName || 'Patient',
        timestamp: d.uploadDate || d.createdAt,
      })),
      ...recentAppointments.map((a) => ({
        id: a._id.toString(),
        action: 'Appointment',
        detail: `${a.assignedDepartment || a.preferredDepartment || 'General'} — ${a.status || 'Scheduled'}`,
        actor: a.patientName || 'Patient',
        timestamp: a.createdAt,
      })),
    ];

    // Sort by most recent first and cap at 15 entries
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const log = entries.slice(0, 15);

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/profile — get own profile
router.get('/profile', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/profile — update own profile
router.put('/profile', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { name, location, profilePhoto } = req.body;
    const update = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
        return res.status(400).json({ success: false, message: 'Name is required and must be 120 characters or fewer' });
      }
      update.name = name.trim();
    }
    if (location !== undefined) {
      if (typeof location !== 'string' || !location.trim() || location.trim().length > 200) {
        return res.status(400).json({ success: false, message: 'Location is required and must be 200 characters or fewer' });
      }
      update.location = location.trim();
    }
    if (profilePhoto !== undefined) {
      if (typeof profilePhoto !== 'string' || profilePhoto.length > 2_000_000) {
        return res.status(400).json({ success: false, message: 'Profile photo must be text no larger than 2 MB' });
      }
      update.profilePhoto = profilePhoto;
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ success: false, message: 'Provide at least one profile field to update' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── FINANCIAL CASES ───────────────────────────────────────────────────────────

// GET /api/admin/financial-cases
router.get('/financial-cases', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const cases = await FinancialCase.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      cases: cases.map((financialCase) => {
        const data = financialCase.toObject();
        Object.assign(data, getConfirmedAccounting(data));
        data.donations = (data.donations || [])
          .filter((donation) => donation.status === 'Paid' || donation.paymentStatus === 'success')
          .map((donation) => ({
            donorName: donation.donorName,
            amount: donation.amount,
            paymentMethod: donation.paymentMethod || 'Chapa',
            status: 'Paid',
            donatedAt: donation.paidAt || donation.donatedAt,
          }));
        return data;
      }),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/financial-cases
router.post('/financial-cases', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { patientName, patientId, age, location, diagnosis, verifyingHospital, verifiedByDoctor, targetAmount, description } = req.body;
    if (typeof patientName !== 'string' || !patientName.trim() || patientName.trim().length > 120) {
      return res.status(400).json({ success: false, message: 'Patient name is required and must be 120 characters or fewer' });
    }
    if (typeof diagnosis !== 'string' || !diagnosis.trim() || diagnosis.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Diagnosis is required and must be 500 characters or fewer' });
    }
    const parsedTarget = Number(targetAmount);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({ success: false, message: 'Target amount must be a positive number' });
    }
    const optionalText = { patientId, location, verifyingHospital, verifiedByDoctor, description };
    for (const [field, value] of Object.entries(optionalText)) {
      const maxLength = field === 'description' ? 5000 : 200;
      if (value !== undefined && (typeof value !== 'string' || value.length > maxLength)) {
        return res.status(400).json({ success: false, message: `${field} must be text and ${maxLength} characters or fewer` });
      }
    }
    const parsedAge = age === undefined || age === '' ? undefined : Number(age);
    if (parsedAge !== undefined && (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
      return res.status(400).json({ success: false, message: 'Age must be a whole number between 1 and 120' });
    }
    const financialCase = await FinancialCase.create({
      patientName: patientName.trim(),
      patientId: patientId?.trim() || undefined,
      age: parsedAge,
      location: location?.trim() || undefined,
      diagnosis: diagnosis.trim(),
      verifyingHospital: verifyingHospital?.trim() || undefined,
      verifiedByDoctor: verifiedByDoctor?.trim() || undefined,
      targetAmount: parsedTarget,
      description: description?.trim() || undefined,
    });
    res.status(201).json({ success: true, case: financialCase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/financial-cases/:id/status
router.put('/financial-cases/:id/status', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Closed'].includes(status))
      return res.status(400).json({ success: false, message: 'Status must be Active or Closed' });
    const financialCase = await FinancialCase.findOne({ caseId: req.params.id });
    if (!financialCase) return res.status(404).json({ success: false, message: 'Case not found' });
    const accounting = getConfirmedAccounting(financialCase);
    if (status === 'Active' && accounting.raisedAmount + accounting.pendingAmount >= financialCase.targetAmount)
      return res.status(409).json({ success: false, message: 'A fully funded case cannot be reopened' });
    financialCase.status = status;
    await financialCase.save();
    res.json({ success: true, case: financialCase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/financial-cases/:id
router.delete('/financial-cases/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const financialCase = await FinancialCase.findOne({ caseId: req.params.id });
    if (!financialCase) return res.status(404).json({ success: false, message: 'Case not found' });
    if (financialCase.donations?.length) {
      return res.status(409).json({ success: false, message: 'Cases with donation history cannot be deleted. Close the case instead.' });
    }
    await financialCase.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── USERS ─────────────────────────────────────────────────────────────────────

// POST /api/admin/users/patients — create a patient account for an assisted registration
router.post('/users/patients', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { name, email, password, age, gender, location } = req.body;
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password ||
      age === undefined || !gender ||
      typeof location !== 'string' || !location.trim()
    ) {
      return res.status(400).json({ success: false, message: 'Name, email, password, age, gender, and location are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Initial password must be at least 8 characters long' });
    }
    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      return res.status(400).json({ success: false, message: 'Age must be a whole number between 1 and 120' });
    }
    if (!['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Select a valid gender' });
    }
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const patient = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      age: parsedAge,
      gender,
      location: location.trim(),
      role: 'patient',
      createdByUserId: req.user.id,
    });
    res.status(201).json({
      success: true,
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email,
        role: patient.role,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const users = await User.find({ deletedAt: null }).select('-password').sort({ createdAt: -1 });
    await Promise.all(users.map((user) => {
      if (user.role !== 'admin') return null;
      const owner = user.email.toLowerCase() === ownerEmail;
      const expectedPrefix = owner ? 'HFO' : 'HFA';
      if (new RegExp(`^${expectedPrefix}-\\d{4}$`).test(user.adminId || '')) return null;
      return user.save();
    }));
    const serialized = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      patientId: u.patientId || null,
      adminId: u.adminId || null,
      hospitalId: u.hospitalId || null,
      hospitalName: u.hospitalName || null,
      gender: u.gender || null,
      location: u.location || null,
      status: u.status || null,
      role: u.role,
      createdByCurrentUser: u.createdByUserId?.toString() === req.user.id,
      registered: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    }));
    res.json({ success: true, users: serialized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/users/:email — owner or creator staff can update patient profiles
router.put('/users/:email', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.user.role === 'hospital_officer') {
      if (user.role !== 'patient' || user.createdByUserId?.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Staff can only edit patient accounts they created' });
      }
    } else {
      const owner = await User.findById(req.user.id).select('email role');
      if (
        !owner ||
        owner.role !== 'admin' ||
        owner.email.toLowerCase() !== ownerEmail ||
        req.user.email?.toLowerCase() !== ownerEmail
      ) {
        return res.status(403).json({ success: false, message: 'Only the HealFund owner can manage profiles and admin accounts' });
      }
    }

    const { name, location, gender, status } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Name is required' });
      }
      user.name = name.trim();
    }
    if (location !== undefined) {
      if (typeof location !== 'string' || !location.trim()) {
        return res.status(400).json({ success: false, message: 'Location is required' });
      }
      user.location = location.trim();
    }
    if (gender !== undefined) {
      if (!['Male', 'Female'].includes(gender)) {
        return res.status(400).json({ success: false, message: 'Invalid gender' });
      }
      user.gender = gender;
    }
    if (status !== undefined) {
      if (!['Verified', 'Pending', 'Suspended'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid account status' });
      }
      user.status = status;
    }

    await user.save();
    const { password: _, ...safeUser } = user.toObject();
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/admin/users/admins — create an admin account (owner only)
router.post('/users/admins', protect, requireRole('admin'), requireOwner, async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !gender) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and gender are required' });
    }
    if (!['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Select Male or Female for gender' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      gender,
      role: 'admin',
    });
    res.status(201).json({ success: true, user: { id: user._id, adminId: user.adminId, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/users/admins/:email — remove an admin account (owner only)
router.delete('/users/admins/:email', protect, requireRole('admin'), requireOwner, async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();
    if (email === ownerEmail) {
      return res.status(409).json({ success: false, message: 'The owner account cannot be deleted' });
    }
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) return res.status(404).json({ success: false, message: 'Admin account not found' });
    await user.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/users/:email
router.delete('/users/:email', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user.id) {
      return res.status(409).json({ success: false, message: 'You cannot delete the account currently in use' });
    }
    if (user.role === 'hospital_officer') {
      const requester = req.user.role === 'admin'
        ? await User.findById(req.user.id).select('email role')
        : null;
      const isOwner = requester?.role === 'admin' &&
        requester.email.toLowerCase() === ownerEmail &&
        req.user.email?.toLowerCase() === ownerEmail;
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Only the HealFund owner can delete staff accounts' });
      }
      await user.deleteOne();
      return res.json({ success: true });
    }
    if (user.role !== 'patient') {
      return res.status(409).json({ success: false, message: 'Admin accounts must be removed from admin account management' });
    }
    if (req.user.role === 'hospital_officer' && user.createdByUserId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Staff can only delete patient accounts they created' });
    }
    await user.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── HOSPITALS ─────────────────────────────────────────────────────────────────

// GET /api/admin/hospitals
router.get('/hospitals', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const hospitals = await Hospital.find({ hospitalId: 'HOSP-001' });
    const serialized = hospitals.map((h) => ({
      id: h.hospitalId,
      name: h.name,
      location: h.location,
      level: h.level,
      verified: h.verified,
      departments: h.departments || [],
      phone: h.phone || '',
    }));
    res.json({ success: true, hospitals: serialized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/hospitals
router.post('/hospitals', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    return res.status(403).json({ success: false, message: 'HealFund supports Zewditu Memorial Hospital only' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/hospitals/:id/verify  (toggle verified)
router.put('/hospitals/:id/verify', protect, requireRole('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ hospitalId: req.params.id });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    hospital.verified = !hospital.verified;
    await hospital.save();
    res.json({ success: true, hospital });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/hospitals/:id
router.delete('/hospitals/:id', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    if (req.params.id === 'HOSP-001') {
      return res.status(403).json({ success: false, message: 'Zewditu Memorial Hospital is the sole HealFund hospital and cannot be deleted' });
    }
    const hospital = await Hospital.findOneAndDelete({ hospitalId: req.params.id });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── QUEUE ─────────────────────────────────────────────────────────────────────

// GET /api/admin/queue
router.get('/queue', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const queue = await Queue.find().sort({ estimatedTime: 1 });
    res.json({ success: true, queue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/queue/reorder  — must be defined BEFORE /:token routes
router.put('/queue/reorder', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { action, token, direction } = req.body;
    if (!['move', 'prioritize_urgency'].includes(action))
      return res.status(400).json({ success: false, message: 'Unknown action' });
    if (action === 'move' && !['up', 'down'].includes(direction))
      return res.status(400).json({ success: false, message: 'Direction must be up or down' });

    // Fetch ALL active queue entries. Sort by estimatedTime first, then by _id
    // as a stable tiebreaker so entries with identical times have a consistent order.
    const queue = await Queue.find({ status: { $nin: ['Completed', 'Cancelled', 'No Show'] } })
      .sort({ estimatedTime: 1, _id: 1 });

    const moveIndex = action === 'move' ? queue.findIndex((entry) => entry.token === token) : -1;
    if (action === 'move' && moveIndex === -1)
      return res.status(404).json({ success: false, message: 'Token not found in queue' });
    if (action === 'move' && (moveIndex + (direction === 'up' ? -1 : 1) < 0 || moveIndex + (direction === 'up' ? -1 : 1) >= queue.length))
      return res.status(400).json({ success: false, message: 'Cannot move in that direction' });

    // Ensure every entry has a unique estimatedTime (10-min apart) so swaps are
    // meaningful even when entries were created with the same timestamp.
    const baseTime = queue[0]?.estimatedTime
      ? new Date(queue[0].estimatedTime)
      : new Date();

    for (let i = 0; i < queue.length; i++) {
      const expectedTime = new Date(baseTime.getTime() + i * 10 * 60 * 1000);
      // Only write if the time needs to change (avoids unnecessary DB writes)
      if (!queue[i].estimatedTime || queue[i].estimatedTime.getTime() !== expectedTime.getTime()) {
        await Queue.findByIdAndUpdate(queue[i]._id, { estimatedTime: expectedTime });
        queue[i].estimatedTime = expectedTime; // keep local copy in sync
      }
    }

    if (action === 'move') {
      const idx = moveIndex;
      const swapIdx = idx + (direction === 'up' ? -1 : 1);

      // Swap the now-distinct estimatedTime values
      const timeA = queue[idx].estimatedTime;
      const timeB = queue[swapIdx].estimatedTime;

      await Queue.findByIdAndUpdate(queue[idx]._id, { estimatedTime: timeB });
      await Queue.findByIdAndUpdate(queue[swapIdx]._id, { estimatedTime: timeA });

    } else if (action === 'prioritize_urgency') {
      const URGENCY_ORDER = { Emergency: 0, High: 1, Medium: 2, Low: 3, Routine: 4 };

      // Sort by urgency priority, preserving relative order within same urgency
      const sorted = [...queue].sort((a, b) => {
        const ua = URGENCY_ORDER[a.urgency] ?? 5;
        const ub = URGENCY_ORDER[b.urgency] ?? 5;
        return ua - ub;
      });

      for (let i = 0; i < sorted.length; i++) {
        const newTime = new Date(baseTime.getTime() + i * 10 * 60 * 1000);
        await Queue.findByIdAndUpdate(sorted[i]._id, { estimatedTime: newTime });
      }
    }

    const updatedQueue = await Queue.find().sort({ estimatedTime: 1 });
    const appointmentUpdates = updatedQueue.filter((entry) => entry.appointmentId).map((entry) => ({
      updateOne: {
        filter: { appointmentId: entry.appointmentId },
        update: { $set: { estimatedTime: entry.estimatedTime } },
      },
    }));
    if (appointmentUpdates.length > 0) {
      await Appointment.bulkWrite(appointmentUpdates);
    }
    res.json({ success: true, queue: updatedQueue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/queue/:token/status
router.put('/queue/:token/status', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Scheduled', 'Waiting', 'In Progress', 'Completed', 'No Show', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Select a valid queue status' });
    }
    const item = await Queue.findOneAndUpdate(
      { token: req.params.token },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Queue token not found' });
    if (status === 'Completed' || status === 'Cancelled') {
      await Appointment.findOneAndUpdate(
        { queueToken: item.token },
        { status, reviewedAt: new Date() }
      );
    }
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/queue/:token
router.delete('/queue/:token', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const item = await Queue.findOneAndDelete({ token: req.params.token });
    if (!item) return res.status(404).json({ success: false, message: 'Queue token not found' });

    // Sync appointment cancellation
    const appointmentFilter = item.appointmentId
      ? { $or: [{ queueToken: item.token }, { appointmentId: item.appointmentId }] }
      : { queueToken: item.token };
    if (item.token) {
      await Appointment.findOneAndUpdate(
        appointmentFilter,
        { status: 'Cancelled', queueToken: '', adminNote: 'Removed from queue by admin.' }
      );
    }

    const remainingQueue = await Queue.find().sort({ estimatedTime: 1 });
    res.json({ success: true, queue: remainingQueue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
