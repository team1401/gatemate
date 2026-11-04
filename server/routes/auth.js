const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const crypto = require('crypto');
const { SECRET, authenticate, requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail, sendEmail } = require('../services/emailSender');
const {
  createVerificationToken,
  redeemVerificationToken,
  releaseStaleClaim,
  sendVerificationEmail,
} = require('../services/emailVerification');
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
    const normalized = email.toLowerCase().trim();
    const genericError = { error: 'Registration failed. Please contact support if you believe this is an error.' };

    // Check domain whitelist
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'allowed_domains'").get();
    if (setting) {
      const domains = JSON.parse(setting.value);
      if (domains.length > 0) {
        const emailDomain = normalized.split('@')[1];
        if (!domains.includes(emailDomain)) {
          // Generic message - don't leak domain policy
          return res.status(400).json(genericError);
        }
      }
    }

    // Reject addresses already owned (verified or with a live verification link).
    // Generic message - don't reveal that the email exists
    if (!releaseStaleClaim(normalized)) {
      return res.status(400).json(genericError);
    }

    const hash = bcrypt.hashSync(password, 10);
    const { userId, userEmailId } = db.transaction(() => {
      const result = db.prepare('INSERT INTO users (email, password, name, email_verified) VALUES (?, ?, ?, 0)').run(normalized, hash, name.trim());
      const ue = db.prepare('INSERT INTO user_emails (user_id, email, verified) VALUES (?, ?, 0)').run(result.lastInsertRowid, normalized);
      return { userId: result.lastInsertRowid, userEmailId: ue.lastInsertRowid };
    })();
    const newUser = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);

    const token = createVerificationToken(userEmailId);
    sendVerificationEmail(newUser.email, token, newUser, true)
      .catch(err => console.error('Failed to send verification email:', err.message));

    // No session is issued until the address is verified
    res.json({
      success: true,
      verification_required: true,
      message: 'Check your email for a link to verify your address and activate your account.'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/verify-email', (req, res) => {
  try {
    const result = redeemVerificationToken(req.body?.token);
    if (!result) {
      return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    }

    if (result.isPrimary) {
      // Send welcome email (async, non-blocking)
      (async () => {
        try {
          const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(result.userId);
          const domain = user.email.split('@')[1];
          const coworkerCount = db.prepare(
            "SELECT COUNT(*) as count FROM users WHERE email LIKE ? AND id != ? AND email_verified = 1"
          ).get(`%@${domain}`, user.id).count;
          const appUrl = process.env.APP_URL || 'http://100.97.65.28:3111';
          await sendWelcomeEmail(user, coworkerCount, appUrl);
        } catch (err) {
          console.error('Failed to send welcome email:', err.message);
        }
      })();
    }

    res.json({ success: true, email: result.email, is_primary: result.isPrimary });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/resend-verification', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required' });
    // Always return success to avoid leaking user existence
    const user = db.prepare('SELECT id, email, name, email_verified FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (user && !user.email_verified) {
      const entry = db.prepare('SELECT id FROM user_emails WHERE user_id = ? AND email = ?').get(user.id, user.email);
      if (entry) {
        const token = createVerificationToken(entry.id);
        sendVerificationEmail(user.email, token, user, true)
          .catch(err => console.error('Failed to send verification email:', err.message));
      }
    }
    res.json({ success: true, message: 'If that account is awaiting verification, a new link has been sent.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification' });
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
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        verification_required: true
      });
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
        <p>Hi ${firstName},</p>
        <p>Your temporary password is:</p>
        <div class="highlight"><p style="font-size:24px;font-weight:bold;margin:0;">${tempPassword}</p></div>
        <p>Please <a href="${appUrl}">log in</a> and change your password.</p>
      `).catch(err => console.error('Reset email failed:', err.message));
    }
    res.json({ success: true, message: 'If that email exists, a temporary password has been sent.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;
