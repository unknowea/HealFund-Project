import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import Appointment from '../models/Appointment.js';
import FinancialCase from '../models/FinancialCase.js';
import Hospital from '../models/Hospital.js';
import Message from '../models/Message.js';

const router = express.Router();

// GET /api/admin/stats — admin/hospital_officer only
router.get('/stats', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const [
      totalUsers, totalReferrals, pendingReferrals,
      totalAppointments, totalHospitals, financialCases,
      totalMessages, unreadMessages,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      Referral.countDocuments(),
      Referral.countDocuments({ status: 'Pending Review' }),
      Appointment.countDocuments(),
      Hospital.countDocuments(),
      FinancialCase.find(),
      Message.countDocuments(),
      Message.countDocuments({ status: 'Unread' }),
    ]);

    const totalRaised = financialCases.reduce((s, c) => s + (c.raisedAmount || 0), 0);
    const totalTarget = financialCases.reduce((s, c) => s + (c.targetAmount || 0), 0);
    const totalDonors = financialCases.reduce((s, c) => s + (c.donorsCount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalReferrals,
        pendingReferrals,
        totalDocuments: totalMessages,
        pendingDocuments: unreadMessages,
        verifiedDocuments: await Message.countDocuments({ status: 'Replied' }),
        rejectedDocuments: 0,
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

// GET /api/admin/activity-log
router.get('/activity-log', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const [recentReferrals, recentMessages] = await Promise.all([
      Referral.find().sort({ createdAt: -1 }).limit(5).lean(),
      Message.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const log = [
      ...recentReferrals.map((r) => ({
        type: 'referral', icon: 'fas fa-hospital-user', color: '#078930',
        text: `Referral ${r.referralId} — ${r.patientName} (${r.status})`,
        time: r.createdAt,
      })),
      ...recentMessages.map((m) => ({
        type: 'message', icon: 'fas fa-envelope', color: '#0f3b5e',
        text: `Message from ${m.name}: ${m.message.substring(0, 60)}…`,
        time: m.createdAt,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

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
