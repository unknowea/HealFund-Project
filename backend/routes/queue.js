import express from 'express';
import Queue from '../models/Queue.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/queue — public (patients check their token)
router.get('/', async (req, res) => {
  try {
    const { patientId, token } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (token) filter.token = token;

    const queue = await Queue.find(filter).sort({ estimatedTime: 1 });
    res.json({ success: true, queue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/queue/:token — public
router.get('/:token', async (req, res) => {
  try {
    const item = await Queue.findOne({ token: req.params.token });
    if (!item)
      return res.status(404).json({ success: false, message: 'Queue token not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/queue/:token/status — protected (hospital staff)
router.put('/:token/status', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { status } = req.body;
    const item = await Queue.findOneAndUpdate(
      { token: req.params.token },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!item)
      return res.status(404).json({ success: false, message: 'Queue token not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
