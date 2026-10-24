import express from 'express';
import Hospital from '../models/Hospital.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/hospitals — public
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find({ hospitalId: 'HOSP-001' });
    res.json({ success: true, hospitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/hospitals/:id — public
router.get('/:id', async (req, res) => {
  try {
    if (req.params.id !== 'HOSP-001') {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    const hospital = await Hospital.findOne({ hospitalId: 'HOSP-001' });
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
    return res.status(403).json({ success: false, message: 'HealFund supports Zewditu Memorial Hospital only' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
