import webPush from 'web-push';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';
import { sendNotificationEmail } from '../config/mailer.js';

const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export const notifyPatient = async ({ userId, patientId, type, title, message, url = '/?notification=1' }) => {
  if (!userId && !patientId) return null;
  const patient = userId
    ? await User.findOne({ _id: userId, role: 'patient', deletedAt: null }).select('_id name email').lean()
    : await User.findOne({ patientId, role: 'patient', deletedAt: null }).select('_id name email').lean();

  if (!patient) {
    console.warn('Skipping patient notification because its recipient could not be found.', { userId, patientId, type });
    return null;
  }

  const notification = await Notification.create({
    userId: patient._id,
    type,
    title,
    message,
    url,
  });
  const subscriptions = await PushSubscription.find({ userId: patient._id }).lean();
  let pushDelivered = false;

  let canSendPush = subscriptions.length > 0 && pushConfigured();
  if (canSendPush) {
    try {
      webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:HealFundET@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    } catch (error) {
      canSendPush = false;
      console.error('Browser push is configured with invalid VAPID credentials:', error.message);
    }
  }

  if (canSendPush) {
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          JSON.stringify({ title, body: message, url }),
          { TTL: 86400 }
        );
        pushDelivered = true;
      } catch (error) {
        console.error('Patient push notification delivery failed:', {
          userId: String(patient._id),
          statusCode: error.statusCode,
          message: error.message,
        });
        if (error.statusCode === 404 || error.statusCode === 410) {
          try {
            await PushSubscription.deleteOne({ _id: subscription._id });
          } catch (cleanupError) {
            console.error('Could not remove expired patient push subscription:', cleanupError.message);
          }
        }
      }
    }));
  }

  if (!pushDelivered) {
    if (!patient.email) {
      console.error('Notification email fallback skipped because the patient has no email address.', {
        userId: String(patient._id),
        notificationId: String(notification._id),
      });
    } else {
      try {
        await sendNotificationEmail({
          toEmail: patient.email,
          recipientName: patient.name,
          title,
          message,
          url,
        });
      } catch (error) {
        console.error('Patient notification email fallback failed:', {
          userId: String(patient._id),
          notificationId: String(notification._id),
          message: error.message,
        });
      }
    }
  }

  return notification;
};

export const notifyPatientSafely = async (details) => {
  setImmediate(() => {
    notifyPatient(details).catch((error) => {
      console.error('Could not create or deliver patient notification:', {
        type: details.type,
        userId: details.userId,
        patientId: details.patientId,
        message: error.message,
      });
    });
  });
  return null;
};
