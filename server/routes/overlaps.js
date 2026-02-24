const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

/**
 * Dynamically compute layover window for a user at a given airport on a given date.
 * A "layover" means: user arrives at this airport (on an inbound flight) and later
 * departs from this airport (on an outbound flight). The window is arrival_time → departure_time.
 * 
 * If no connecting flight pair is found, fall back to:
 * - If they arrive here (inbound): arrival_time → arrival_time + 4 hours (assumed ground time)
 * - If they depart from here (outbound): departure_time - 2 hours → departure_time (assumed check-in)
 */
function computeLayoverWindow(userId, airport, overlapDate) {
  // Get all flights for this user around this date
  // Look at flights within 2 days of the overlap date to catch connections
  const flights = db.prepare(`
    SELECT f.* FROM flights f
    JOIN trips t ON f.trip_id = t.id
    WHERE t.user_id = ?
      AND f.flight_date BETWEEN date(?, '-2 days') AND date(?, '+2 days')
    ORDER BY f.departure_time ASC
  `).all(userId, overlapDate, overlapDate);

  if (flights.length === 0) return null;

  // Find the arriving flight (lands at this airport)
  const arriving = flights.filter(f => f.arrival_airport === airport);
  // Find the departing flight (leaves from this airport)  
  const departing = flights.filter(f => f.departure_airport === airport);

  let layoverStart = null;
  let layoverEnd = null;

  if (arriving.length > 0 && departing.length > 0) {
    // True layover: arrived here, then departing from here
    // Find the best pair: arriving flight whose arrival is before a departing flight
    for (const arr of arriving) {
      for (const dep of departing) {
        const arrTime = new Date(arr.arrival_time);
        const depTime = new Date(dep.departure_time);
        if (depTime > arrTime) {
          // Valid connection pair
          if (!layoverStart || arrTime > new Date(layoverStart)) {
            layoverStart = arr.arrival_time;
          }
          if (!layoverEnd || depTime < new Date(layoverEnd)) {
            layoverEnd = dep.departure_time;
          }
        }
      }
    }
  }
  
  if (!layoverStart && !layoverEnd) {
    // No connection pair found — use single-leg heuristics
    if (arriving.length > 0) {
      // They arrive here — use arrival time + 4 hour assumed ground time
      const latest = arriving.reduce((a, b) => 
        new Date(a.arrival_time) > new Date(b.arrival_time) ? a : b
      );
      layoverStart = latest.arrival_time;
      const endTime = new Date(latest.arrival_time);
      endTime.setHours(endTime.getHours() + 4);
      layoverEnd = endTime.toISOString();
    } else if (departing.length > 0) {
      // They depart from here — use departure time - 2 hours
      const earliest = departing.reduce((a, b) => 
        new Date(a.departure_time) < new Date(b.departure_time) ? a : b
      );
      layoverEnd = earliest.departure_time;
      const startTime = new Date(earliest.departure_time);
      startTime.setHours(startTime.getHours() - 2);
      layoverStart = startTime.toISOString();
    }
  }

  return layoverStart && layoverEnd ? { start: layoverStart, end: layoverEnd } : null;
}

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
    const normalizeTs = (ts) => {
      if (!ts) return ts;
      return ts.replace(/\.000Z$/, '').replace(/Z$/, '') + 'Z';
    };

    // Format overlaps with dynamically computed layover windows
    const formatted = overlaps.map(o => {
      const iAmA = o.user_a_id === req.user.id;
      const overlapDate = o.overlap_start ? o.overlap_start.split('T')[0] : null;

      // Dynamically compute layover windows from flight data
      const userALayover = computeLayoverWindow(o.user_a_id, o.airport, overlapDate);
      const userBLayover = computeLayoverWindow(o.user_b_id, o.airport, overlapDate);

      const myLayover = iAmA ? userALayover : userBLayover;
      const otherLayover = iAmA ? userBLayover : userALayover;

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
        // Dynamically computed layover windows
        my_layover_start: myLayover ? normalizeTs(myLayover.start) : null,
        my_layover_end: myLayover ? normalizeTs(myLayover.end) : null,
        other_layover_start: otherLayover ? normalizeTs(otherLayover.start) : null,
        other_layover_end: otherLayover ? normalizeTs(otherLayover.end) : null,
      };
    });

    res.json({ overlaps: formatted });
  } catch (err) {
    console.error('Get overlaps error:', err);
    res.status(500).json({ error: 'Failed to fetch overlaps' });
  }
});

module.exports = router;
