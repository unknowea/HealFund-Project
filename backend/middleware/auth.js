import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorised, no token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
  if (!decoded || typeof decoded !== 'object' || !decoded.id) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }

  try {
    const user = await User.findById(decoded.id).select('email role status deletedAt');
    if (!user || user.deletedAt) {
      return res.status(401).json({ success: false, message: 'This account is no longer available. Please sign in again.' });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'This account has been suspended. Contact support.' });
    }
    req.user = { id: user._id.toString(), email: user.email, role: user.role };
    return next();
  } catch (err) {
    console.error('Authentication check failed:', err);
    return res.status(500).json({ success: false, message: 'Could not verify the account session' });
  }
};

// Restrict to specific roles
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied: insufficient role' });
  }
  next();
};
