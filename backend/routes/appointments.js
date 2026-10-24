import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import Appointment from '../models/Appointment.js';
import Queue from '../models/Queue.js';
import PatientDocument from '../models/PatientDocument.js';
import User from '../models/User.js';
import { protect, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// File upload configuration
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const uploadRoot = path.resolve(uploadDir);
const getUploadPath = (filename) => {
  if (typeof filename !== 'string') return null;
  const filePath = path.resolve(uploadRoot, filename);
  const relativePath = path.relative(uploadRoot, filePath);
  return relativePath && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath)
    ? filePath
    : null;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const allowedExtensions = [
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
  '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff', '.heic',
  '.dcm', '.dicom',
  '.xls', '.xlsx', '.csv',
  '.zip', '.rar', '.7z',
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File format "${ext}" is not supported. Allowed formats: PDF, DOCX, JPG, PNG, WEBP, DICOM, XLSX, ZIP, etc.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file limit
});

// Helper to format appointment object for frontend consumption
const serializeAppt = (appt) => {
  const doc = appt.toObject ? appt.toObject() : appt;
  return {
    ...doc,
    id: doc.appointmentId || (doc._id ? doc._id.toString() : null),
  };
};

// Helper to find appointment by appointmentId OR ObjectId
const findApptById = async (id) => {
  if (!id) return null;
  let appt = await Appointment.findOne({ appointmentId: id });
  if (!appt && mongoose.Types.ObjectId.isValid(id)) {
    appt = await Appointment.findById(id);
  }
  return appt;
};

const canAccessAppointment = async (user, appointment) => {
  if (user.role === 'admin' || user.role === 'hospital_officer') return true;
  if (appointment.bookedByUserId === user.id) return true;

  const patient = await User.findById(user.id).select('patientId').lean();
  return Boolean(patient?.patientId && appointment.patientId === patient.patientId && appointment.bookedByUserId === patient.patientId);
};

// GET /api/appointments — patients see ONLY their own; admins can filter by patientId
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'hospital_officer';
    const { patientId, status, search } = req.query;

    let filter = {};

    if (isAdmin) {
      // Admins can optionally filter by any patientId
      if (patientId) {
        filter.$or = [{ patientId }, { bookedByUserId: patientId }];
      }
    } else {
      // PATIENTS: always filter by their own identity — ignore any patientId query param
      const userId = req.user.id;
      const user = await User.findById(userId).select('patientId').lean();
      const pid = user?.patientId;

      // Match appointments booked by this user OR with their patientId
      const conditions = [{ bookedByUserId: userId }];
      if (pid) {
        conditions.push({ patientId: pid });
        conditions.push({ bookedByUserId: pid });
      }
      filter.$or = conditions;
    }

    if (status && status !== 'All') {
      if (status === 'Pending Review') {
        filter.status = { $in: ['Pending Review', 'Additional Documents Required'] };
      } else if (status === 'Approved') {
        filter.status = { $in: ['Approved', 'Confirmed'] };
      } else {
        filter.status = status;
      }
    }

    let list = await Appointment.find(filter).sort({ createdAt: -1 }).lean();

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.patientName && a.patientName.toLowerCase().includes(q)) ||
          (a.patientId && a.patientId.toLowerCase().includes(q)) ||
          (a.disease && a.disease.toLowerCase().includes(q)) ||
          (a.appointmentId && a.appointmentId.toLowerCase().includes(q))
      );
    }

    const appointments = list.map(serializeAppt);
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/files/:fileId', protect, async (req, res) => {
  try {
    const appointment = await findApptById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (!await canAccessAppointment(req.user, appointment))
      return res.status(403).json({ success: false, message: 'Access denied' });

    const file = appointment.supportingFiles.find((item) => item.id === req.params.fileId);
    if (!file || path.basename(file.filename) !== file.filename)
      return res.status(404).json({ success: false, message: 'File not found' });

    const filePath = getUploadPath(file.filename);
    if (!filePath || !fs.existsSync(filePath))
      return res.status(404).json({ success: false, message: 'File not found on server' });

    res.set('X-Content-Type-Options', 'nosniff');
    if (req.query.download === 'true') {
      return res.download(filePath, path.basename(file.originalName));
    }
    return res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments/:id — fetch single appointment
router.get('/:id', protect, async (req, res) => {
  try {
    const appointment = await findApptById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (!await canAccessAppointment(req.user, appointment))
      return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, appointment: serializeAppt(appointment) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments — create new appointment (supports multiple supporting files & diverse formats)
router.post('/', protect, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      for (const file of req.files || []) fs.unlink(path.join(uploadDir, file.filename), () => {});
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    // Explicitly strip any stringified supportingFiles from req.body — files always come from req.files (multer)
    delete req.body.supportingFiles;

    const {
      isForSelf,
      patientName,
      patientAge,
      patientGender,
      relationship,
      urgency,
      disease,
      preferredDepartment,
      patientPhone,
    } = req.body;

    // Always use the authenticated user's ID as bookedByUserId — prevents spoofing
    const bookedByUserId = req.user.id;
    const bookingUser = await User.findById(bookedByUserId).select('name age gender patientId').lean();
    if (!bookingUser?.patientId)
      return res.status(401).json({ success: false, message: 'Patient account is not available' });

    const isSelf = isForSelf === true || isForSelf === 'true';
    const effectivePatientId = bookingUser.patientId;
    const effectivePatientName = isSelf ? bookingUser.name : patientName || 'Dependent Patient';

    const supportingFiles = [];
    const filesList = req.files || (req.file ? [req.file] : []);

    for (const f of filesList) {
      const ext = f.originalname.split('.').pop().toLowerCase();
      const docId = `DOC-${String(Date.now()).slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const fileObj = {
        id: docId,
        originalName: f.originalname,
        filename: f.filename,
        size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: ext,
        uploadDate: new Date(),
      };
      supportingFiles.push(fileObj);

      await PatientDocument.create({
        documentId: docId,
        patientId: effectivePatientId,
        patientName: effectivePatientName,
        originalName: f.originalname,
        filename: f.filename,
        size: fileObj.size,
        type: ext,
        category: 'Appointment Supporting Document',
        status: 'Pending Verification',
      });
    }

    const appointment = await Appointment.create({
      patientId: effectivePatientId,
      bookedByUserId: bookedByUserId || effectivePatientId,
      isForSelf: isSelf,
      patientName: effectivePatientName,
      patientAge: isSelf ? bookingUser.age : patientAge ? parseInt(patientAge, 10) : undefined,
      patientGender: isSelf ? bookingUser.gender : patientGender || 'Unspecified',
      relationship: isSelf ? 'Self' : relationship || 'Other',
      urgency: urgency || 'Medium',
      disease: disease || 'General health consultation',
      preferredDepartment: preferredDepartment || 'General Medicine',
      patientPhone: patientPhone || '',
      hospitalName: 'Zewditu Memorial Hospital',
      status: 'Pending Review',
      supportingFiles,
      requestedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully. Waiting for admin review.',
      appointment: serializeAppt(appointment),
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/approve — admin approves appointment & allocates queue token
router.put('/:id/approve', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { department, roomNumber, assignedDoctor, urgency } = req.body;
    const appt = await findApptById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const targetDept = department || appt.preferredDepartment || 'General Medicine Clinic';
    const targetRoom = roomNumber || 'Room 101';
    const targetDoctor = assignedDoctor || 'Dr. M. Worku';
    const targetUrgency = urgency || appt.urgency || 'Medium';

    let queueToken = appt.queueToken;
    if (!queueToken) {
      const queueCount = await Queue.countDocuments();
      queueToken = `C-${String(queueCount + 25).padStart(3, '0')}`;
    }

    let queueEntry = await Queue.findOne({
      $or: [{ token: queueToken }, { appointmentId: appt.appointmentId }],
    });

    const deptStr = targetDept.includes('Clinic') ? targetDept : `${targetDept} Clinic`;

    if (!queueEntry) {
      queueEntry = await Queue.create({
        token: queueToken,
        appointmentId: appt.appointmentId,
        patientId: appt.patientId,
        patientName: appt.patientName,
        department: deptStr,
        roomNumber: targetRoom,
        assignedDoctor: targetDoctor,
        urgency: targetUrgency,
        durationMinutes: 10,
        status: 'Scheduled',
        estimatedTime: new Date(Date.now() + 86400000),
        requiredDocuments: (appt.supportingFiles || []).map((f) => f.originalName).concat(['Patient ID / QR Card']),
      });
    } else {
      queueEntry.token = queueToken;
      queueEntry.department = deptStr;
      queueEntry.roomNumber = targetRoom;
      queueEntry.assignedDoctor = targetDoctor;
      queueEntry.urgency = targetUrgency;
      queueEntry.status = 'Scheduled';
      await queueEntry.save();
    }

    appt.status = 'Approved';
    appt.assignedDepartment = deptStr;
    appt.assignedRoom = targetRoom;
    appt.assignedDoctor = targetDoctor;
    appt.estimatedTime = queueEntry.estimatedTime;
    appt.urgency = targetUrgency;
    appt.queueToken = queueToken;
    appt.reviewedAt = new Date();
    appt.adminNote = `Approved for ${deptStr}, ${targetRoom}.`;

    await appt.save();

    res.json({
      success: true,
      appointment: serializeAppt(appt),
      queueToken,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/reject — admin rejects appointment with reason
router.put('/:id/reject', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { rejectionReason, adminNote } = req.body;
    const appt = await findApptById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    appt.status = 'Rejected';
    appt.rejectionReason = rejectionReason || 'Appointment criteria not met or hospital capacity exceeded.';
    appt.adminNote = adminNote || appt.rejectionReason;
    appt.reviewedAt = new Date();

    if (appt.queueToken) {
      await Queue.findOneAndUpdate({ token: appt.queueToken }, { status: 'Cancelled' });
    }

    await appt.save();

    res.json({
      success: true,
      appointment: serializeAppt(appt),
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/request-docs — admin requests additional documents
router.put('/:id/request-docs', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { requestedDocuments, adminNote } = req.body;
    const appt = await findApptById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const docList = Array.isArray(requestedDocuments)
      ? requestedDocuments
      : typeof requestedDocuments === 'string'
      ? requestedDocuments.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Additional Supporting Medical Documents'];

    appt.status = 'Additional Documents Required';
    appt.requestedDocuments = docList;
    appt.adminNote = adminNote || 'Please upload the requested supporting documents to proceed with approval.';
    appt.reviewedAt = new Date();

    await appt.save();

    res.json({
      success: true,
      appointment: serializeAppt(appt),
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/appointments/:id/upload-additional-docs — patient uploads requested additional document(s)
router.post('/:id/upload-additional-docs', protect, async (req, res, next) => {
  try {
    const appointment = await findApptById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (!await canAccessAppointment(req.user, appointment))
      return res.status(403).json({ success: false, message: 'Access denied' });
    next();
  } catch (err) {
    next(err);
  }
}, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      for (const file of req.files || []) fs.unlink(path.join(uploadDir, file.filename), () => {});
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const appt = await findApptById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const filesList = req.files || (req.file ? [req.file] : []);
    if (filesList.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });

    if (!appt.supportingFiles) appt.supportingFiles = [];

    for (const f of filesList) {
      const ext = f.originalname.split('.').pop().toLowerCase();
      const docId = `DOC-${String(Date.now()).slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const fileObj = {
        id: docId,
        originalName: f.originalname,
        filename: f.filename,
        size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: ext,
        uploadDate: new Date(),
      };
      appt.supportingFiles.push(fileObj);

      await PatientDocument.create({
        documentId: docId,
        patientId: appt.patientId,
        patientName: appt.patientName,
        originalName: f.originalname,
        filename: f.filename,
        size: fileObj.size,
        type: ext,
        category: 'Requested Additional Medical Document',
        status: 'Pending Verification',
      });
    }

    appt.status = 'Pending Review';
    await appt.save();

    res.json({
      success: true,
      message: 'Additional document(s) uploaded successfully! Admin will review your updated request.',
      appointment: serializeAppt(appt),
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id — general update
router.put('/:id', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const appt = await findApptById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Protect supportingFiles from being overwritten by a stringified body value
    const { supportingFiles: _ignored, ...safeBody } = req.body;
    Object.assign(appt, safeBody);
    await appt.save();

    res.json({ success: true, appointment: serializeAppt(appt) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/appointments/:id — delete appointment
router.delete('/:id', protect, async (req, res) => {
  try {
    const appt = await findApptById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (!await canAccessAppointment(req.user, appt))
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (appt.queueToken) {
      await Queue.findOneAndDelete({ token: appt.queueToken });
    }
    await appt.deleteOne();

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
