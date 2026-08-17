import express from 'express';
import Referral from '../models/Referral.js';
import Appointment from '../models/Appointment.js';
import Queue from '../models/Queue.js';
import Hospital from '../models/Hospital.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/referrals — protected
router.get('/', protect, async (req, res) => {
  try {
    const { sendingHospitalId, receivingHospitalId, patientId } = req.query;
    const filter = {};
    if (sendingHospitalId) filter.sendingHospitalId = sendingHospitalId;
    if (receivingHospitalId) filter.receivingHospitalId = receivingHospitalId;
    if (patientId) filter.patientId = patientId;

    const referrals = await Referral.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, referrals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/referrals/:id — protected
router.get('/:id', protect, async (req, res) => {
  try {
    const referral = await Referral.findOne({ referralId: req.params.id });
    if (!referral)
      return res.status(404).json({ success: false, message: 'Referral not found' });
    res.json({ success: true, referral });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/referrals — protected
router.post('/', protect, async (req, res) => {
  try {
    const {
      patientName, patientId, patientAge, patientGender, patientLocation,
      sendingHospitalId, receivingHospitalId, department, urgency,
      reasonForReferral, clinicalSummary, contactPhone, documents, sendingDoctor,
    } = req.body;

    if (!patientName || !sendingHospitalId || !receivingHospitalId || !department || !reasonForReferral)
      return res.status(400).json({ success: false, message: 'Missing required referral fields' });

    const sendingHosp = await Hospital.findOne({ hospitalId: sendingHospitalId });
    const receivingHosp = await Hospital.findOne({ hospitalId: receivingHospitalId });

    const referral = await Referral.create({
      patientName,
      patientId: patientId || `HF-${Math.floor(1000 + Math.random() * 9000)}`,
      patientAge: parseInt(patientAge) || 30,
      patientGender: patientGender || 'Other',
      patientLocation: patientLocation || 'Addis Ababa',
      sendingHospitalId,
      sendingHospitalName: sendingHosp ? sendingHosp.name : 'Referring Health Center',
      sendingDoctor: sendingDoctor || (req.user ? req.user.name : 'Authorized Officer'),
      receivingHospitalId,
      receivingHospitalName: receivingHosp ? receivingHosp.name : 'Zewditu Memorial Hospital',
      department,
      urgency: urgency || 'Medium',
      reasonForReferral,
      clinicalSummary: clinicalSummary || 'Referred for specialized tertiary evaluation.',
      documents: documents || [],
      contactPhone: contactPhone || '+251900000000',
    });

    res.status(201).json({ success: true, referral });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/referrals/:id/status — protected (hospital officer / admin)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, assignedDoctor, appointmentTime } = req.body;
    const referral = await Referral.findOne({ referralId: req.params.id });

    if (!referral)
      return res.status(404).json({ success: false, message: 'Referral not found' });

    referral.status = status;

    if (status === 'Accepted') {
      referral.acceptedAt = new Date();
      referral.assignedDoctor = assignedDoctor || 'Dr. M. Worku';

      // Generate unique queue token
      const queueCount = await Queue.countDocuments();
      const queueToken = `C-${String(queueCount + 24).padStart(3, '0')}`;
      referral.queueToken = queueToken;
      referral.appointmentTime = appointmentTime ? new Date(appointmentTime) : new Date('2026-08-25T10:00:00Z');

      // Create appointment
      await Appointment.create({
        patientId: referral.patientId,
        patientName: referral.patientName,
        hospitalName: referral.receivingHospitalName,
        doctorName: referral.assignedDoctor,
        department: referral.department,
        datetime: referral.appointmentTime,
        status: 'Confirmed',
        queueToken,
        referralId: referral.referralId,
      });

      // Add to queue
      await Queue.create({
        token: queueToken,
        patientId: referral.patientId,
        patientName: referral.patientName,
        department: `${referral.department} Clinic`,
        assignedDoctor: referral.assignedDoctor,
        estimatedTime: referral.appointmentTime,
        status: 'Scheduled',
        urgency: referral.urgency,
        requiredDocuments: [
          `Referral Letter ${referral.referralId}`,
          'ID / QR Card',
          'Lab Reports',
        ],
      });
    }

    await referral.save();
    res.json({ success: true, referral });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
