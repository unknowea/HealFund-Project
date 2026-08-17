import express from 'express';
import Hospital from '../models/Hospital.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/hospitals — public
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ name: 1 });
    res.json({ success: true, hospitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/hospitals/:id — public
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ hospitalId: req.params.id });
    if (!hospital)
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, hospital });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/hospitals — admin only
router.post('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json({ success: true, hospital });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
