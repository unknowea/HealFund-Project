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
      totalUsers, totalAppointments, pendingAppointments, totalHospitals,
      financialCases, totalDocuments, pendingDocuments,
      verifiedDocuments, rejectedDocuments,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
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
          requiredDocuments: [doc.originalName, 'Patient ID Card'],
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
    console.log('🔍 Document file request:', req.params.id);
    
    let doc = await PatientDocument.findOne({
      $or: [{ documentId: req.params.id }, { filename: req.params.id }],
    });
    console.log('📋 Document found:', doc ? doc.documentId : 'NOT FOUND');
    
    if (!doc && mongoose.Types.ObjectId.isValid(req.params.id)) {
      doc = await PatientDocument.findById(req.params.id);
      console.log('📋 Document found by ID:', doc ? doc.documentId : 'NOT FOUND');
    }
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found in database' });

    const filePath = getUploadPath(doc.filename);
    console.log('📁 Checking file path:', filePath);
    console.log('✅ File exists:', fs.existsSync(filePath));
    
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server. Please re-upload.' });
    }
    if (req.query.action === 'view') {
      res.sendFile(filePath, { headers: { 'Content-Disposition': `inline; filename="${doc.originalName || doc.filename}"` } });
    } else {
      res.download(filePath, doc.originalName || doc.filename);
    }
  } catch (err) {
    console.error('❌ Error in document file route:', err);
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
        console.warn('Could not delete file:', e.message);
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
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user.id) {
      return res.status(409).json({ success: false, message: 'You cannot delete the account currently in use' });
    }
    if (user.role !== 'patient') {
      return res.status(409).json({ success: false, message: 'Staff accounts cannot be deleted from the patient management screen' });
    }
    const [appointmentCount, documentCount, queueCount, caseCount] = await Promise.all([
      Appointment.countDocuments({ $or: [{ bookedByUserId: user._id.toString() }, { patientId: user.patientId }] }),
      PatientDocument.countDocuments({ patientId: user.patientId }),
      Queue.countDocuments({ patientId: user.patientId }),
      FinancialCase.countDocuments({ patientId: user.patientId }),
    ]);
    if (appointmentCount || documentCount || queueCount || caseCount) {
      return res.status(409).json({ success: false, message: 'This patient has linked medical or financial records and cannot be deleted' });
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
    await Appointment.bulkWrite(updatedQueue.filter((entry) => entry.appointmentId).map((entry) => ({
      updateOne: {
        filter: { appointmentId: entry.appointmentId },
        update: { $set: { estimatedTime: entry.estimatedTime } },
      },
    })));
    res.json({ success: true, queue: updatedQueue });
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
    if (item.appointmentId || item.token) {
      await Appointment.findOneAndUpdate(
        { $or: [{ queueToken: item.token }, { appointmentId: item.appointmentId }] },
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
