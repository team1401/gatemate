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

    // Normalize timestamp: ensure all have consistent UTC 'Z' suffix
    // Some timestamps were stored with .000Z and some without — this causes
    // JS Date parsing to treat them as different timezones (local vs UTC)
    const normalizeTs = (ts) => {
      if (!ts) return ts;
      // Strip any existing Z or timezone info, then add Z for consistent UTC
      return ts.replace(/\.000Z$/, '').replace(/Z$/, '') + 'Z';
    };

    // Format: always show "the other person"; map layover windows to my/other perspective
    const formatted = overlaps.map(o => {
      const iAmA = o.user_a_id === req.user.id;
      return {
        id: o.id,
        other_user: iAmA
          ? { id: o.user_b_id, name: o.user_b_name, email: o.user_b_email }
          : { id: o.user_a_id, name: o.user_a_name, email: o.user_a_email },
        airport: o.airport,
        airport_name: o.airport_name,
        overlap_start: normalizeTs(o.overlap_start),
        overlap_end: normalizeTs(o.overlap_end),
        overlap_minutes: o.overlap_minutes,
        // Layover presence windows for timeline visualization
        my_layover_start: normalizeTs(iAmA ? o.user_a_layover_start : o.user_b_layover_start),
        my_layover_end: normalizeTs(iAmA ? o.user_a_layover_end : o.user_b_layover_end),
        other_layover_start: normalizeTs(iAmA ? o.user_b_layover_start : o.user_a_layover_start),
        other_layover_end: normalizeTs(iAmA ? o.user_b_layover_end : o.user_a_layover_end)
      };
    });

    res.json({ overlaps: formatted });
  } catch (err) {
    console.error('Get overlaps error:', err);
    res.status(500).json({ error: 'Failed to fetch overlaps' });
  }
});

module.exports = router;
