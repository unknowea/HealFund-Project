import express from 'express';
import Message from '../models/Message.js';
import { protect, requireRole } from '../middleware/auth.js';
import { messageLimiter } from '../middleware/rateLimit.js';
import { sendCustomerReplyEmail } from '../config/mailer.js';

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

// POST /api/messages — public (contact form / patient help request / admin-messages)
router.post('/', messageLimiter, async (req, res) => {
  try {
    const { name, contact, category, message, content, userName, userEmail, patientName, patientEmail } = req.body;
    const authorName = name ?? userName ?? patientName ?? 'Patient';
    const authorMsg = message ?? content;
    const authorContact = contact ?? userEmail ?? patientEmail ?? '';

    if (
      typeof authorName !== 'string' || !authorName.trim() || authorName.trim().length > 120 ||
      typeof authorMsg !== 'string' || !authorMsg.trim() || authorMsg.trim().length > 5000 ||
      typeof authorContact !== 'string' || authorContact.length > 254
    ) {
      return res.status(400).json({ success: false, message: 'Name and message are required' });
    }
    const allowedCategories = ['General Inquiry', 'Medical File Verification', 'Financial Assistance', 'Community Agent'];
    if (category !== undefined && !allowedCategories.includes(category)) {
      return res.status(400).json({ success: false, message: 'Select a valid message category' });
    }

    const newMessage = await Message.create({
      name: authorName.trim(),
      contact: authorContact.trim(),
      category: category || 'General Inquiry',
      message: authorMsg.trim(),
    });
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
    const replyText = String(req.body.replyText || '').trim();
    if (!replyText) return res.status(400).json({ success: false, message: 'Reply text required' });
    if (replyText.length > 10000)
      return res.status(400).json({ success: false, message: 'Reply must be 10,000 characters or fewer' });

    const msg = await Message.findOne({ messageId: req.params.id });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    const recipientEmail = String(msg.contact || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return res.status(422).json({
        success: false,
        message: 'This customer message has no valid email address. Contact them by phone instead.',
      });
    }

    const email = await sendCustomerReplyEmail({
      toEmail: recipientEmail,
      recipientName: msg.name,
      category: msg.category,
      originalMessage: msg.message,
      replyText,
    });

    msg.reply = replyText;
    msg.status = 'Replied';
    msg.repliedAt = new Date();
    await msg.save();
    res.json({
      success: true,
      data: msg,
      info: `Reply email sent to ${recipientEmail}`,
      emailMessageId: email.messageId,
    });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message || 'Could not send reply email' });
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
