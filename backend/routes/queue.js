import express from 'express';
import Queue from '../models/Queue.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/queue — patients see their own queue entries; staff can filter all entries
router.get('/', protect, async (req, res) => {
  try {
    const { patientId, token } = req.query;
    const filter = {};
    const isStaff = req.user.role === 'admin' || req.user.role === 'hospital_officer';
    if (isStaff) {
      if (patientId) filter.patientId = patientId;
    } else {
      const user = await User.findById(req.user.id).select('patientId').lean();
      if (!user?.patientId) return res.json({ success: true, queue: [] });
      filter.patientId = user.patientId;
    }
    if (token) filter.token = token;

    const queue = await Queue.find(filter).sort({ estimatedTime: 1 });
    res.json({ success: true, queue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/queue/:token — patients can only access their own token
router.get('/:token', protect, async (req, res) => {
  try {
    const isStaff = req.user.role === 'admin' || req.user.role === 'hospital_officer';
    const filter = { token: req.params.token };
    if (!isStaff) {
      const user = await User.findById(req.user.id).select('patientId').lean();
      if (!user?.patientId) return res.status(404).json({ success: false, message: 'Queue token not found' });
      filter.patientId = user.patientId;
    }
    const item = await Queue.findOne(filter);
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

export default router;
