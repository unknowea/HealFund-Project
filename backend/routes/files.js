import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/auth.js';
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

// POST /api/files/upload — protected
router.post('/upload', protect, upload.single('medicalFile'), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    // Look up the uploading user to get their name and patientId
    const user = await User.findById(req.user.id).select('name patientId');
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    // Save a PatientDocument record so the admin can see and download this file
    await PatientDocument.create({
      patientId: user?.patientId || req.user.id,
      patientName: user?.name || req.user.email,
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
    // Clean up the uploaded file if DB save failed
    fs.unlink(path.join(uploadDir, req.file.filename), () => {});
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
