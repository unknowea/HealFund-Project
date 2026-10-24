import express from 'express';
import { randomInt } from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendOtpEmail } from '../config/mailer.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ─── OTP ROUTES ────────────────────────────────────────────────────────────────

// POST /api/auth/send-otp
router.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const { email, purpose = 'signup' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format' });
    }

    // If signup, check if email is already registered
    if (purpose === 'signup') {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already registered. Please log in.' });
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
router.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const { email, otp, purpose = 'signup' } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

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
router.post('/reset-password', otpLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      otp: cleanOtp,
      purpose: 'reset-password',
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
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !await user.matchPassword(password))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (user.status === 'Suspended')
      return res.status(403).json({ success: false, message: 'This account has been suspended. Contact support.' });

    const { password: _, ...userWithoutPass } = user.toObject();
    return res.json({ success: true, token: generateToken(user), user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/signup
router.post('/signup', otpLimiter, async (req, res) => {
  try {
    const { name, email, password, age, gender, location, otp } = req.body;
    if (!name || !email || !password || !age || !gender || !location)
      return res.status(400).json({ success: false, message: 'Please fill in all fields' });

    const normalizedEmail = String(email).trim().toLowerCase();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

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

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      age: parseInt(age),
      gender,
      location,
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
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, age, gender, location, profilePhoto } = req.body;
    if (typeof profilePhoto === 'string' && profilePhoto.length > 0) {
      const isAllowedImage = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(profilePhoto);
      if (!isAllowedImage || profilePhoto.length > 3 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Profile photo must be a PNG, JPEG, or WebP image under 2 MB' });
      }
    }

    const update = {};
    if (name) update.name = name;
    if (age) update.age = parseInt(age);
    if (gender) update.gender = gender;
    if (location) update.location = location;
    if (profilePhoto !== undefined) update.profilePhoto = profilePhoto;

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
