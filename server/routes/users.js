const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// List all users (id, name, email — no passwords)
router.get('/', authenticate, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email FROM users ORDER BY name').all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get all flights for current user
router.get('/flights/mine', authenticate, (req, res) => {
  try {
    const flights = db.prepare(`
      SELECT f.*, t.name as trip_name
      FROM flights f
      JOIN trips t ON f.trip_id = t.id
      WHERE t.user_id = ?
      ORDER BY f.departure_time DESC
    `).all(req.user.id);
    res.json({ flights });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get flights' });
  }
});

// List current user's email addresses
router.get('/emails', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
    const emails = db.prepare('SELECT id, email, verified, created_at FROM user_emails WHERE user_id = ? ORDER BY created_at').all(req.user.id);
    res.json({ emails: emails.map(e => ({ ...e, is_primary: e.email === user.email })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get emails' });
  }
});

// Add a secondary email
router.post('/emails', authenticate, (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    const normalized = email.toLowerCase().trim();
    
    // Check domain whitelist (same logic as registration)
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'allowed_domains'").get();
    if (setting) {
      const domains = JSON.parse(setting.value);
      if (domains.length > 0) {
        const emailDomain = normalized.split('@')[1];
        if (!domains.includes(emailDomain)) {
          return res.status(403).json({
            error: 'Secondary emails must be from approved domains'
          });
        }
      }
    }
    
    const existing = db.prepare('SELECT id FROM user_emails WHERE email = ?').get(normalized);
    if (existing) {
      // Generic message - don't reveal email exists
      return res.status(400).json({ error: 'Failed to add email. Please contact support if you believe this is an error.' });
    }
    
    // Changed verified from 1 to 0 - require verification
    const result = db.prepare('INSERT INTO user_emails (user_id, email, verified) VALUES (?, ?, 0)').run(req.user.id, normalized);
    res.json({ id: result.lastInsertRowid, email: normalized, verified: 0, is_primary: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add email' });
  }
});

// Remove a secondary email
router.delete('/emails/:id', authenticate, (req, res) => {
  try {
    const entry = db.prepare('SELECT ue.*, u.email as primary_email FROM user_emails ue JOIN users u ON u.id = ue.user_id WHERE ue.id = ? AND ue.user_id = ?').get(req.params.id, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Email not found' });
    if (entry.email === entry.primary_email) return res.status(400).json({ error: 'Cannot remove primary email' });
    db.prepare('DELETE FROM user_emails WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove email' });
  }
});

// Mark onboarding as seen
router.put('/onboarding', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE users SET onboarding_seen = 1 WHERE id = ?').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update onboarding' });
  }
});

router.get('/stats', authenticate, (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const tripCount = db.prepare('SELECT COUNT(*) as count FROM trips WHERE user_id = ?').get(req.user.id).count;
    const flightCount = db.prepare('SELECT COUNT(*) as count FROM flights f JOIN trips t ON f.trip_id = t.id WHERE t.user_id = ?').get(req.user.id).count;
    const overlapCount = db.prepare('SELECT COUNT(*) as count FROM overlaps WHERE (user_a_id = ? OR user_b_id = ?) AND overlap_end > datetime(\'now\')').get(req.user.id, req.user.id).count;
    res.json({ userCount, tripCount, flightCount, overlapCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
