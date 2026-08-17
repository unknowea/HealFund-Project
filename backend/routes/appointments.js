import express from 'express';
import Appointment from '../models/Appointment.js';
import Queue from '../models/Queue.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/appointments — protected
router.get('/', protect, async (req, res) => {
  try {
    const { patientId } = req.query;
    const filter = patientId ? { patientId } : {};
    const appointments = await Appointment.find(filter).sort({ datetime: 1 });
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments/:id — protected
router.get('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ appointmentId: req.params.id });
    if (!appointment)
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments — protected
router.post('/', protect, async (req, res) => {
  try {
    const { patientId, patientName, department, datetime } = req.body;
    if (!patientId || !datetime)
      return res.status(400).json({ success: false, message: 'patientId and datetime are required' });

    // Generate queue token
    const queueCount = await Queue.countDocuments();
    const queueToken = `C-${String(queueCount + 25).padStart(3, '0')}`;

    const appointment = await Appointment.create({
      patientId,
      patientName: patientName || 'Patient',
      hospitalName: 'Zewditu Memorial Hospital',
      doctorName: 'Dr. M. Worku',
      department: department || 'General Medicine',
      datetime: new Date(datetime),
      status: 'Confirmed',
      queueToken,
    });

    await Queue.create({
      token: queueToken,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      department: `${appointment.department} Clinic`,
      assignedDoctor: appointment.doctorName,
      estimatedTime: appointment.datetime,
      status: 'Scheduled',
      urgency: 'Routine',
      requiredDocuments: ['Patient ID / QR Card'],
    });

    res.status(201).json({ success: true, appointment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id — protected (update status)
router.put('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { appointmentId: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!appointment)
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/appointments/:id — protected
router.delete('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({ appointmentId: req.params.id });
    if (!appointment)
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
