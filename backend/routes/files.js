import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { protect, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import PatientDocument from '../models/PatientDocument.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PDF, JPG, PNG, DOCX, and TXT files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const handleUpload = (req, res, next) => {
  upload.single('medicalFile')(req, res, async (err) => {
    if (!err) return next();
    if (req.file) {
      try {
        await fs.promises.unlink(path.join(uploadDir, req.file.filename));
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          console.error('Could not clean up rejected patient upload:', cleanupError);
        }
      }
    }
    return res.status(400).json({ success: false, message: err.message });
  });
};

// GET /api/files — patients can see only their own uploaded documents
router.get('/', protect, requireRole('patient'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('patientId').lean();
    if (!user?.patientId) {
      return res.status(401).json({ success: false, message: 'Patient account is not available' });
    }

    const documents = await PatientDocument.find({ patientId: user.patientId })
      .select('documentId originalName size type category uploadDate status adminNote reviewedAt updatedAt createdAt')
      .sort({ uploadDate: -1 })
      .limit(10)
      .lean();
    return res.json({ success: true, documents });
  } catch (err) {
    console.error('Could not load patient documents:', err);
    return res.status(500).json({ success: false, message: 'Could not load patient documents' });
  }
});

// POST /api/files/upload — patient-only document upload
router.post('/upload', protect, requireRole('patient'), handleUpload, async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const user = await User.findById(req.user.id).select('name patientId');
    if (!user?.patientId) {
      await fs.promises.unlink(path.join(uploadDir, req.file.filename));
      return res.status(401).json({ success: false, message: 'Patient account is not available' });
    }
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    const document = await PatientDocument.create({
      patientId: user.patientId,
      patientName: user.name,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: ext,
      category: 'General Medical Document',
      status: 'Pending Verification',
    });

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
  } catch (err) {
    try {
      await fs.promises.unlink(path.join(uploadDir, req.file.filename));
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        console.error('Could not clean up failed patient upload:', cleanupError);
      }
    }
    console.error('Could not save patient document:', err);
    res.status(500).json({ success: false, message: 'Could not save the uploaded document' });
  }
});

export default router;
