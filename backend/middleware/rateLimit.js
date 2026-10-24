import { rateLimit } from 'express-rate-limit';

const createLimiter = (limit, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message },
});

export const authLimiter = createLimiter(20, 'Too many authentication attempts. Try again later.');
export const otpLimiter = createLimiter(10, 'Too many verification attempts. Try again later.');
export const messageLimiter = createLimiter(5, 'Too many messages sent. Try again later.');