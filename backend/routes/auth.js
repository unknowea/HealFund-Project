import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const { password: _, ...userWithoutPass } = user.toObject();
    res.json({ success: true, token: generateToken(user), user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, age, gender, location } = req.body;
    if (!name || !email || !password || !age || !gender || !location)
      return res.status(400).json({ success: false, message: 'Please fill in all fields' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      password,
      age: parseInt(age),
      gender,
      location,
      role: 'patient',
    });

    const { password: _, ...userWithoutPass } = user.toObject();
    res.status(201).json({ success: true, token: generateToken(user), user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
