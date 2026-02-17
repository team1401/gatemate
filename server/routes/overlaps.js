const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get overlaps for current user
router.get('/', authenticate, (req, res) => {
  try {
    const overlaps = db.prepare(`
      SELECT o.*, 
        ua.name as user_a_name, ua.email as user_a_email,
        ub.name as user_b_name, ub.email as user_b_email
      FROM overlaps o
      JOIN users ua ON o.user_a_id = ua.id
      JOIN users ub ON o.user_b_id = ub.id
      WHERE (o.user_a_id = ? OR o.user_b_id = ?)
        AND o.overlap_end > datetime('now')
      ORDER BY o.overlap_start ASC
    `).all(req.user.id, req.user.id);

    // Format: always show "the other person"
    const formatted = overlaps.map(o => ({
      id: o.id,
      other_user: o.user_a_id === req.user.id
        ? { id: o.user_b_id, name: o.user_b_name, email: o.user_b_email }
        : { id: o.user_a_id, name: o.user_a_name, email: o.user_a_email },
      airport: o.airport,
      airport_name: o.airport_name,
      overlap_start: o.overlap_start,
      overlap_end: o.overlap_end,
      overlap_minutes: o.overlap_minutes
    }));

    res.json({ overlaps: formatted });
  } catch (err) {
    console.error('Get overlaps error:', err);
    res.status(500).json({ error: 'Failed to fetch overlaps' });
  }
});

module.exports = router;
