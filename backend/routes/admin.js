import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import FinancialCase from '../models/FinancialCase.js';
import Hospital from '../models/Hospital.js';
import Message from '../models/Message.js';
import PatientDocument from '../models/PatientDocument.js';
import Queue from '../models/Queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

const router = express.Router();

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

// GET /api/admin/stats
router.get('/stats', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const [
      totalUsers, totalAppointments, totalHospitals,
      financialCases, totalDocuments, pendingDocuments,
      verifiedDocuments, rejectedDocuments,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      Appointment.countDocuments(),
      Hospital.countDocuments(),
      FinancialCase.find(),
      PatientDocument.countDocuments(),
      PatientDocument.countDocuments({ status: 'Pending Verification' }),
      PatientDocument.countDocuments({ status: 'Verified' }),
      PatientDocument.countDocuments({ status: 'Rejected' }),
    ]);

    const totalRaised = financialCases.reduce((s, c) => s + (c.raisedAmount || 0), 0);
    const totalTarget = financialCases.reduce((s, c) => s + (c.targetAmount || 0), 0);
    const totalDonors = financialCases.reduce((s, c) => s + (c.donorsCount || 0), 0);

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
        const queueCount = await Queue.countDocuments();
        generatedToken = `C-${String(queueCount + 25).padStart(3, '0')}`;
        const targetDept = department || 'General Medical Clinic (Room 102)';
        const targetDoc = assignedDoctor || 'Dr. M. Worku';
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
          requiredDocuments: [doc.originalName, 'ID / QR Card'],
        });
      } else {
        generatedToken = queueEntry.token;
        queueEntry.status = 'Waiting';
        if (department) {
          queueEntry.department = department.includes('Clinic') ? department : `${department} Clinic`;
        }
        if (urgency) queueEntry.urgency = urgency;
        if (assignedDoctor) queueEntry.assignedDoctor = assignedDoctor;
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
    const doc = await PatientDocument.findOne({ documentId: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const filePath = path.join(uploadDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }
    res.download(filePath, doc.originalName);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/documents/:id
router.delete('/documents/:id', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const doc = await PatientDocument.findOneAndDelete({ documentId: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const filePath = path.join(uploadDir, doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

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
        detail: `${a.department || 'General'} — ${a.status || 'Scheduled'}`,
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
    if (name) update.name = name;
    if (location) update.location = location;
    if (profilePhoto) update.profilePhoto = profilePhoto;

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true }).select('-password');
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
    res.json({ success: true, cases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/financial-cases
router.post('/financial-cases', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const financialCase = await FinancialCase.create(req.body);
    res.status(201).json({ success: true, case: financialCase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/financial-cases/:id/status
router.put('/financial-cases/:id/status', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { status } = req.body;
    const financialCase = await FinancialCase.findOneAndUpdate(
      { caseId: req.params.id },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!financialCase) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, case: financialCase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/financial-cases/:id
router.delete('/financial-cases/:id', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const financialCase = await FinancialCase.findOneAndDelete({ caseId: req.params.id });
    if (!financialCase) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── USERS ─────────────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const serialized = users.map((u) => ({
      name: u.name,
      email: u.email,
      patientId: u.patientId || null,
      hospitalId: u.hospitalId || null,
      hospitalName: u.hospitalName || null,
      gender: u.gender || null,
      location: u.location || null,
      status: u.status || null,
      role: u.role,
      registered: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    }));
    res.json({ success: true, users: serialized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/users/:email
router.delete('/users/:email', protect, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ email: decodeURIComponent(req.params.email) });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── HOSPITALS ─────────────────────────────────────────────────────────────────

// GET /api/admin/hospitals
router.get('/hospitals', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ name: 1 });
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
    const count = await Hospital.countDocuments();
    const hospitalId = `HOSP-${String(count + 1).padStart(3, '0')}`;
    const hospital = await Hospital.create({ ...req.body, hospitalId });
    res.status(201).json({ success: true, hospital });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/hospitals/:id/verify  (toggle verified)
router.put('/hospitals/:id/verify', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
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

// PUT /api/admin/queue/:token/status
router.put('/queue/:token/status', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { status } = req.body;
    const item = await Queue.findOneAndUpdate(
      { token: req.params.token },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Queue token not found' });
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
