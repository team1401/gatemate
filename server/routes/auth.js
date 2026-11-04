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
    db.prepare('UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?').run(hash, user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin reset error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Self-service: forgot password - sends temp password via email
router.post('/reset-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    // Always return success to avoid leaking user existence
    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email.toLowerCase());
    if (user) {
      const tempPassword = crypto.randomBytes(4).toString('hex'); // 8-char hex
      const hash = bcrypt.hashSync(tempPassword, 10);
      db.prepare('UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?').run(hash, user.id);
      const firstName = user.name.split(' ')[0];
      const appUrl = process.env.APP_URL || 'https://gatemate.app';
      sendEmail(user.email, 'GateMate Password Reset', `
        <h2>Password Reset</h2>
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>Your temporary password is:</p>
        <div class="highlight"><p style="font-size:24px;font-weight:bold;margin:0;">${tempPassword}</p></div>
        <p>Please <a href="${escapeHtml(appUrl)}">log in</a> and change your password.</p>
      `).catch(err => console.error('Reset email failed:', err.message));
    }
    res.json({ success: true, message: 'If that email exists, a temporary password has been sent.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;
