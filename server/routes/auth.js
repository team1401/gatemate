const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const crypto = require('crypto');
const { SECRET, authenticate, requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail, sendEmail, escapeHtml } = require('../services/emailSender');
const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Input length limits
    if (email.length > 254) {
      return res.status(400).json({ error: 'Email must be at most 254 characters' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be at most 100 characters' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: 'Password must be at most 128 characters' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      // Don't reveal that email exists - use generic message
      return res.status(400).json({ error: 'Registration failed. Please contact support if you believe this is an error.' });
    }

    // Check domain whitelist
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'allowed_domains'").get();
    if (setting) {
      const domains = JSON.parse(setting.value);
      if (domains.length > 0) {
        const emailDomain = email.toLowerCase().split('@')[1];
        if (!domains.includes(emailDomain)) {
          // Generic message - don't leak domain policy
          return res.status(400).json({ error: 'Registration failed. Please contact support if you believe this is an error.' });
        }
      }
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run(email.toLowerCase(), hash, name.trim());
    // Auto-add registration email to user_emails
    db.prepare('INSERT OR IGNORE INTO user_emails (user_id, email, verified) VALUES (?, ?, 1)').run(result.lastInsertRowid, email.toLowerCase());
    const newUser = db.prepare('SELECT id, email, name, is_admin, onboarding_seen, token_version FROM users WHERE id = ?').get(result.lastInsertRowid);
    
    // Send welcome email (async, non-blocking)
    (async () => {
      try {
        const domain = email.toLowerCase().split('@')[1];
        const coworkerCount = db.prepare(
          "SELECT COUNT(*) as count FROM users WHERE email LIKE ? AND id != ?"
        ).get(`%@${domain}`, newUser.id).count;
        const appUrl = process.env.APP_URL || 'http://100.97.65.28:3111';
        await sendWelcomeEmail(newUser, coworkerCount, appUrl);
      } catch (err) {
        console.error('Failed to send welcome email:', err.message);
      }
    })();
    
    const token = jwt.sign({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      token_version: newUser.token_version || 0
    }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      token_version: user.token_version || 0
    }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin, onboarding_seen: user.onboarding_seen } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, name, is_admin, onboarding_seen FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

router.post('/logout', authenticate, (req, res) => {
  try {
    // Increment token_version to invalidate all existing tokens
    db.prepare('UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = ?').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Admin: reset any user's password
router.post('/admin-reset', authenticate, requireAdmin, (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'Email and newPassword required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hash = bcrypt.hashSync(newPassword, 10);
    db.transaction(() => {
      db.prepare('UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?').run(hash, user.id);
      db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(user.id);
    })();
    res.json({ success: true });
  } catch (err) {
    console.error('Admin reset error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Self-service: forgot password - emails a single-use reset link.
// The password is NOT changed here; it only changes when the link is redeemed.
router.post('/reset-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required' });
    // Always return success to avoid leaking user existence
    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email.toLowerCase());
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      db.transaction(() => {
        db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL AND expires_at <= ?').run(user.id, now);
        db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
          .run(user.id, hashResetToken(token), now + RESET_TOKEN_TTL_MS);
      })();
      const firstName = user.name.split(' ')[0];
      const appUrl = (process.env.APP_URL || 'https://gatemate.app').replace(/\/+$/, '');
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      sendEmail(user.email, 'GateMate Password Reset', `
        <h2>Password Reset</h2>
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>We received a request to reset your GateMate password. Click the link below to choose a new one:</p>
        <p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>
        <p>This link expires in 30 minutes and can only be used once. If you didn't request this, you can ignore this email &mdash; your password has not been changed.</p>
      `).catch(err => console.error('Reset email failed:', err.message));
    }
    res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Redeem a reset token and set a new password
router.post('/reset-password/confirm', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Token and newPassword are required' });
    }
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (newPassword.length > 128) return res.status(400).json({ error: 'Password must be at most 128 characters' });

    const tokenHash = hashResetToken(token);
    const hash = bcrypt.hashSync(newPassword, 10);
    const redeemed = db.transaction(() => {
      const now = Date.now();
      const reset = db.prepare('SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?').get(tokenHash, now);
      if (!reset) return false;
      const claim = db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ? AND used_at IS NULL').run(now, reset.id);
      if (claim.changes !== 1) return false;
      db.prepare('UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?').run(hash, reset.user_id);
      db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(reset.user_id);
      return true;
    })();
    if (!redeemed) return res.status(400).json({ error: 'Invalid or expired reset link' });
    res.json({ success: true });
  } catch (err) {
    console.error('Reset password confirm error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;
