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
    const recentMessages = await Message.find().sort({ createdAt: -1 }).limit(8).lean();

    const log = recentMessages.map((m) => ({
      type: 'message', icon: 'fas fa-envelope', color: '#0f3b5e',
      text: `Message from ${m.name}: ${m.message.substring(0, 60)}…`,
      time: m.createdAt,
    }));

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

export default router;
