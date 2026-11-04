require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const overlapRoutes = require('./routes/overlaps');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3111;

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes per IP
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const flightLookupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 lookups per hour (AirLabs API cost)
  message: { error: 'Flight lookup quota exceeded, please wait' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Restrict CORS to specific origins
const corsOptions = {
  origin: function(origin, callback) {
    // Allow same-origin requests (no origin header) and configured origins
    if (!origin) return callback(null, true);
    const allowed = (process.env.CORS_ORIGIN || 'http://100.97.65.28:3111').split(',');
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error('CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; style-src 'self' 'unsafe-inline'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Apply global rate limit to all routes
app.use(globalLimiter);

// API routes with specific rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/trips/lookup', flightLookupLimiter);
app.use('/api/trips', tripRoutes);
app.use('/api/overlaps', overlapRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Public config
app.get('/api/config', (req, res) => {
  res.json({
    gatemate_email: process.env.GATEMATE_EMAIL || '',
    email_enabled: !!(process.env.IMAP_HOST && process.env.IMAP_USER)
  });
});

// Serve frontend
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GateMate running on port ${PORT}`);
  
  // Start email poller (optional — gracefully handles missing config)
  const { startPolling } = require('./services/emailPoller');
  startPolling();
  
  // Start weekly reminder scheduler
  const { startWeeklyReminder } = require('./services/weeklyReminder');
  startWeeklyReminder();
});
