import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import hospitalRoutes from './routes/hospitals.js';
import referralRoutes from './routes/referrals.js';
import appointmentRoutes from './routes/appointments.js';
import queueRoutes from './routes/queue.js';
import financialRoutes from './routes/financial.js';
import fileRoutes from './routes/files.js';
import messageRoutes from './routes/messages.js';
import conversationRoutes from './routes/conversations.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ──────────────────────────────────────────────────────────────────────
// Allow all localhost origins in development + configured production URLs
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman/curl (no origin) or any localhost port during development
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      // Allow configured production frontend URLs
      const allowed = [process.env.USER_FRONTEND_URL, process.env.ADMIN_FRONTEND_URL].filter(Boolean);
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ─── BODY PARSER ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'HealFund Backend API running', version: '2.0.0' });
});

// ─── STATIC UPLOADS ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/financial-cases', financialRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'HealFund API is running', timestamp: new Date() });
});

// ─── 404 HANDLER ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`HealFund backend running on http://localhost:${PORT}`);
});
