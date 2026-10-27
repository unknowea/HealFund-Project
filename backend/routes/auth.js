import express from 'express';
import { randomInt } from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendOtpEmail } from '../config/mailer.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.js';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';

const router = express.Router();
const ownerEmail = (process.env.OWNER_EMAIL || 'healfund2006@gmail.com').trim().toLowerCase();
const isValidEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isStrongPassword = (value) =>
  typeof value === 'string' &&
  value.length >= 8 &&
  value.length <= 128 &&
  /[a-zA-Z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
const requireObjectBody = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'A valid request body is required' });
  }
  next();
};

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ─── OTP ROUTES ────────────────────────────────────────────────────────────────

// POST /api/auth/send-otp
router.post('/send-otp', otpLimiter, requireObjectBody, async (req, res) => {
  try {
    const { email, purpose = 'signup' } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    if (!['signup', 'reset-password'].includes(purpose)) {
      return res.status(400).json({ success: false, message: 'Select a valid verification purpose' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // If signup, check if email is already registered
    if (purpose === 'signup') {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser && !existingUser.deletedAt) {
        return res.status(400).json({
          success: false,
          message: 'Another user already has an account with this email address. Please sign in or use a different email.',
        });
      }
    }

    // If password reset, check if user exists
    if (purpose === 'reset-password') {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'No account found with this email address.' });
      }
    }

    // Generate random 6-digit numeric OTP
    const otp = randomInt(100000, 1000000).toString();

    // Delete existing OTPs for this email and purpose to keep clean state
    await Otp.deleteMany({ email: normalizedEmail, purpose });

    // Save new OTP with 10-minute expiry
    await Otp.create({
      email: normalizedEmail,
      otp,
      purpose,
      verified: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send email
    await sendOtpEmail(normalizedEmail, otp, purpose);

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
    });
  } catch (err) {
    console.error('Send OTP Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send OTP email' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', otpLimiter, requireObjectBody, async (req, res) => {
  try {
    const { email, otp, purpose = 'signup' } = req.body;
    if (!isValidEmail(email) || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    if (!['signup', 'reset-password'].includes(purpose)) {
      return res.status(400).json({ success: false, message: 'Select a valid verification purpose' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      otp: cleanOtp,
      purpose,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new code.',
      });
    }

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'Email successfully verified.',
    });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Verification failed' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', otpLimiter, requireObjectBody, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!isValidEmail(email) || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim()) || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be 8 to 128 characters and include a letter, number, and symbol' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      otp: cleanOtp,
      purpose: 'reset-password',
      verified: true,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    // Clean up OTP record
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'reset-password' });

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Password reset failed' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, requireObjectBody, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || typeof password !== 'string' || !password || password.length > 128)
      return res.status(400).json({ success: false, message: 'A valid email and password are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user)
      return res.status(401).json({ success: false, message: 'Email and password are incorrect' });
    if (!await user.matchPassword(password))
      return res.status(401).json({ success: false, message: 'Password is incorrect' });
    if (user.deletedAt)
      return res.status(403).json({ success: false, message: 'This account has been removed. Contact support.' });
    if (user.status === 'Suspended')
      return res.status(403).json({ success: false, message: 'This account has been suspended. Contact support.' });
    if (user.role !== 'patient')
      return res.status(403).json({ success: false, message: 'Use the staff sign-in portal for this account' });

    const { password: _, ...userWithoutPass } = user.toObject();
    return res.json({ success: true, token: generateToken(user), user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/admin-login
router.post('/admin-login', authLimiter, requireObjectBody, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || typeof password !== 'string' || !password || password.length > 128) {
      return res.status(400).json({ success: false, message: 'A valid email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email and password are incorrect' });
    }
    if (!await user.matchPassword(password)) {
      return res.status(401).json({ success: false, message: 'Password is incorrect' });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'This account has been suspended. Contact support.' });
    }
    if (!['admin', 'hospital_officer'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Staff credentials required.' });
    }

    const { password: _, ...userWithoutPass } = user.toObject();
    return res.json({
      success: true,
      token: generateToken(user),
      user: {
        ...userWithoutPass,
        isOwner: user.role === 'admin' && user.email.toLowerCase() === ownerEmail,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/change-password — change the signed-in user's password
router.put('/change-password', protect, authLimiter, requireObjectBody, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'New password must be between 8 and 128 characters long' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'Choose a new password different from your current password' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
    if (!await user.matchPassword(currentPassword)) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Could not change password' });
  }
});

// DELETE /api/auth/account — permanently remove the signed-in patient's login account
router.delete('/account', protect, authLimiter, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ success: false, message: 'Only patient accounts can be deleted here' });
    }

    const user = await User.findOneAndDelete({ _id: req.user.id, role: 'patient' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Patient account not found' });
    }
    await Promise.all([
      Notification.deleteMany({ userId: user._id }),
      PushSubscription.deleteMany({ userId: user._id }),
    ]);

    return res.json({
      success: true,
      message: 'Your account was deleted. Existing healthcare records have been retained.',
    });
  } catch (err) {
    console.error('Delete patient account error:', err);
    return res.status(500).json({ success: false, message: 'Could not delete your account. Please try again.' });
  }
});

// POST /api/auth/signup
router.post('/signup', otpLimiter, requireObjectBody, async (req, res) => {
  try {
    const { name, email, password, age, gender, location, otp } = req.body;
    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
      !isValidEmail(email) ||
      !isStrongPassword(password) ||
      age === undefined || age === '' ||
      typeof location !== 'string' || !location.trim() || location.trim().length > 200 ||
      typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())
    ) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields' });
    }
    if (!['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Select Male or Female for gender' });
    }
    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      return res.status(400).json({ success: false, message: 'Age must be a whole number between 1 and 120' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists && !exists.deletedAt)
      return res.status(400).json({
        success: false,
        message: 'Another user already has an account with this email address. Please sign in or use a different email.',
      });

    // Account creation requires a code verified through /verify-otp.
    const verifiedOtp = await Otp.findOne({
      email: normalizedEmail,
      purpose: 'signup',
      verified: true,
      expiresAt: { $gt: new Date() },
    });

    if (!verifiedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email with the 6-digit code first.',
      });
    }

    if (exists?.deletedAt) {
      await exists.deleteOne();
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      age: parsedAge,
      gender,
      location: location.trim(),
      role: 'patient',
    });

    // Clean up OTP records for this email
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'signup' });

    const { password: _, ...userWithoutPass } = user.toObject();
    res.status(201).json({ success: true, token: generateToken(user), user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/profile — get own profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/profile — update own profile
router.put('/profile', protect, requireObjectBody, async (req, res) => {
  try {
    const { name, age, gender, location, profilePhoto } = req.body;
    const update = {};
    const unset = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
        return res.status(400).json({ success: false, message: 'Name is required and must be 120 characters or fewer' });
      }
      update.name = name.trim();
    }
    if (age !== undefined) {
      if (age === '') {
        unset.age = 1;
      } else {
        const parsedAge = Number(age);
        if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
          return res.status(400).json({ success: false, message: 'Age must be a whole number between 1 and 120' });
        }
        update.age = parsedAge;
      }
    }
    if (gender !== undefined) {
      if (!['Male', 'Female'].includes(gender)) {
        return res.status(400).json({ success: false, message: 'Select Male or Female for gender' });
      }
      update.gender = gender;
    }
    if (location !== undefined) {
      if (typeof location !== 'string' || location.trim().length > 200) {
        return res.status(400).json({ success: false, message: 'Location must be 200 characters or fewer' });
      }
      update.location = location.trim();
    }
    if (profilePhoto !== undefined) {
      if (typeof profilePhoto !== 'string') {
        return res.status(400).json({ success: false, message: 'Profile photo must be an image string' });
      }
      if (profilePhoto) {
        const imageMatch = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(profilePhoto);
        if (!imageMatch || Buffer.byteLength(imageMatch[1], 'base64') > 2 * 1024 * 1024) {
          return res.status(400).json({ success: false, message: 'Profile photo must be a PNG, JPEG, or WebP image under 2 MB' });
        }
      }
      update.profilePhoto = profilePhoto;
    }
    if (!Object.keys(update).length && !Object.keys(unset).length) {
      return res.status(400).json({ success: false, message: 'Provide at least one profile field to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...(Object.keys(update).length ? { $set: update } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
