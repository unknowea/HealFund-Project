import express from 'express';
import Conversation from '../models/Conversation.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/conversations — admin gets all, patient gets their own
router.get('/', protect, async (req, res) => {
  try {
    let convs;
    if (req.user.role === 'admin' || req.user.role === 'hospital_officer') {
      convs = await Conversation.find().sort({ lastMessageTime: -1 });
    } else {
      const patientId = req.user.id;
      convs = await Conversation.find({ patientId }).sort({ lastMessageTime: -1 });
    }
    res.json({ success: true, conversations: convs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/conversations/messages — send a message (patient or admin)
router.post('/messages', protect, async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    if (!content)
      return res.status(400).json({ success: false, message: 'Message content required' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'hospital_officer';
    const patientId = isAdmin
      ? conversationId?.replace('CONV-', '')?.replace('-ADMIN', '') || req.body.patientId
      : req.user.id;

    let conv = await Conversation.findOne({
      conversationId: conversationId || `CONV-${patientId}-ADMIN`,
    });

    if (!conv) {
      conv = new Conversation({
        conversationId: `CONV-${patientId}-ADMIN`,
        patientId,
        patientName: req.body.patientName || req.user.name || 'Patient',
        messages: [],
      });
    }

    const newMessage = {
      sender: isAdmin ? 'admin' : 'patient',
      senderName: isAdmin ? 'HealFund Support' : (req.user.name || 'Patient'),
      content,
      timestamp: new Date(),
    };

    conv.messages.push(newMessage);
    conv.lastMessage = content;
    conv.lastMessageTime = new Date();

    if (isAdmin) {
      conv.unreadByPatient += 1;
    } else {
      conv.unreadByAdmin += 1;
    }

    await conv.save();
    res.status(201).json({ success: true, conversation: conv, message: newMessage });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/conversations/:id/read — mark as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'hospital_officer';
    const update = isAdmin ? { unreadByAdmin: 0 } : { unreadByPatient: 0 };
    const conv = await Conversation.findOneAndUpdate(
      { conversationId: req.params.id },
      { $set: update },
      { new: true }
    );
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
