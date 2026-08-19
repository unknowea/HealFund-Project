import express from 'express';
import Message from '../models/Message.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/messages — admin / hospital officer only
router.get('/', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/messages — public (contact form / patient help request)
router.post('/', async (req, res) => {
  try {
    const { name, contact, category, message } = req.body;
    if (!name || !message)
      return res.status(400).json({ success: false, message: 'Name and message are required' });

    const newMessage = await Message.create({ name, contact, category, message });
    res.status(201).json({
      success: true,
      message: 'Message received successfully',
      data: newMessage,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/messages/:id/status — admin / hospital officer
router.put('/:id/status', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { status } = req.body;
    const msg = await Message.findOneAndUpdate(
      { messageId: req.params.id },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!msg)
      return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/messages/:id/reply — admin replies (stores reply text in message)
router.post('/:id/reply', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText) return res.status(400).json({ success: false, message: 'Reply text required' });

    const msg = await Message.findOneAndUpdate(
      { messageId: req.params.id },
      { $set: { status: 'Replied', reply: replyText, repliedAt: new Date() } },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg, info: `Reply saved. In production this would email ${msg.contact}` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/messages/:id — admin / hospital officer
router.delete('/:id', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const msg = await Message.findOneAndDelete({ messageId: req.params.id });
    if (!msg)
      return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, deleted: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
