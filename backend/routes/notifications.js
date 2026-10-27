import express from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();
const patientOnly = [protect, requireRole('patient')];
const allowedPushHosts = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
]);

router.get('/public-key', (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

router.get('/', ...patientOnly, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('Could not load patient notifications:', error);
    return res.status(500).json({ success: false, message: 'Could not load notifications' });
  }
});

router.post('/subscriptions', ...patientOnly, async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};
    let endpointUrl;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      endpointUrl = null;
    }
    if (
      typeof endpoint !== 'string' ||
      endpoint.length > 2048 ||
      !endpointUrl ||
      endpointUrl.protocol !== 'https:' ||
      endpointUrl.username ||
      endpointUrl.password ||
      !allowedPushHosts.has(endpointUrl.hostname.toLowerCase()) ||
      !keys ||
      typeof keys.p256dh !== 'string' ||
      keys.p256dh.length > 256 ||
      typeof keys.auth !== 'string' ||
      keys.auth.length > 256
    ) {
      return res.status(400).json({ success: false, message: 'A valid browser push subscription is required' });
    }
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(503).json({ success: false, message: 'Push notifications are not configured on the backend yet' });
    }

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: { userId: req.user.id, keys } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, subscriptionId: subscription.id });
  } catch (error) {
    console.error('Could not save browser push subscription:', error);
    return res.status(500).json({ success: false, message: 'Could not enable push notifications' });
  }
});

router.delete('/subscriptions', ...patientOnly, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (endpoint !== undefined && (typeof endpoint !== 'string' || endpoint.length > 2048)) {
      return res.status(400).json({ success: false, message: 'Invalid push subscription endpoint' });
    }
    if (endpoint) {
      await PushSubscription.deleteOne({ userId: req.user.id, endpoint });
    } else {
      await PushSubscription.deleteMany({ userId: req.user.id });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Could not remove browser push subscription:', error);
    return res.status(500).json({ success: false, message: 'Could not disable push notifications' });
  }
});

router.put('/:id/read', ...patientOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    return res.json({ success: true, notification });
  } catch (error) {
    console.error('Could not mark notification as read:', error);
    return res.status(500).json({ success: false, message: 'Could not update notification' });
  }
});

export default router;
