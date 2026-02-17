const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { lookupFlight } = require('../services/flightapi');
const { detectOverlapsForUser } = require('../services/overlaps');
const router = express.Router();

// Lookup a flight (preview before adding)
router.post('/lookup', authenticate, async (req, res) => {
  try {
    const { flight_number, flight_date, dep_airport, arr_airport } = req.body;
    if (!flight_number || !flight_date) {
      return res.status(400).json({ error: 'Flight number and date are required' });
    }
    const data = await lookupFlight(flight_number, flight_date, dep_airport || null, arr_airport || null);
    
    // If multiple legs found, return them for user to pick
    if (data.multiple) {
      return res.json({ multiple: true, options: data.options });
    }
    
    res.json({ flight: data.flight });
  } catch (err) {
    console.error('Lookup error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Create trip with flights
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, flights } = req.body;
    if (!flights || !Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({ error: 'At least one flight is required' });
    }
    
    // Input length limits
    if (name && name.length > 200) {
      return res.status(400).json({ error: 'Trip name must be at most 200 characters' });
    }
    if (flights.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 flights per trip' });
    }

    const tripResult = db.prepare('INSERT INTO trips (user_id, name) VALUES (?, ?)').run(req.user.id, name || 'Untitled Trip');
    const tripId = tripResult.lastInsertRowid;

    const insertFlight = db.prepare(`
      INSERT INTO flights (trip_id, flight_number, flight_date, airline_name, departure_airport, departure_airport_name, departure_time, arrival_airport, arrival_airport_name, arrival_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction((flights) => {
      for (const f of flights) {
        insertFlight.run(tripId, f.flight_number, f.flight_date, f.airline_name || '',
          f.departure_airport, f.departure_airport_name || '', f.departure_time,
          f.arrival_airport, f.arrival_airport_name || '', f.arrival_time, f.status || 'scheduled');
      }
    });

    insertAll(flights);

    // Detect overlaps
    const overlaps = detectOverlapsForUser(req.user.id);

    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
    const tripFlights = db.prepare('SELECT * FROM flights WHERE trip_id = ?').all(tripId);

    res.json({ trip: { ...trip, flights: tripFlights }, new_overlaps: overlaps.length });
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Get all trips for current user
router.get('/', authenticate, (req, res) => {
  try {
    const trips = db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    
    const result = trips.map(t => ({
      ...t,
      flights: db.prepare('SELECT * FROM flights WHERE trip_id = ? ORDER BY departure_time').all(t.id)
    }));

    res.json({ trips: result });
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Get pending trips for current user
router.get('/pending', authenticate, (req, res) => {
  try {
    const pending = db.prepare(
      "SELECT * FROM pending_trips WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC"
    ).all(req.user.id);
    const result = pending.map(p => ({
      ...p,
      extracted_flights: JSON.parse(p.extracted_flights || '[]')
    }));
    res.json({ pending_trips: result });
  } catch (err) {
    console.error('Get pending trips error:', err);
    res.status(500).json({ error: 'Failed to fetch pending trips' });
  }
});

// Accept a pending trip
router.post('/pending/:id/accept', authenticate, async (req, res) => {
  try {
    const pending = db.prepare(
      'SELECT * FROM pending_trips WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);
    if (!pending) return res.status(404).json({ error: 'Pending trip not found' });
    if (pending.status !== 'pending') return res.status(400).json({ error: 'Trip already processed' });

    const flights = JSON.parse(pending.extracted_flights || '[]');
    if (flights.length === 0) return res.status(400).json({ error: 'No flights to add' });

    // Create the trip
    const tripResult = db.prepare('INSERT INTO trips (user_id, name) VALUES (?, ?)').run(req.user.id, pending.trip_name || 'Email Trip');
    const tripId = tripResult.lastInsertRowid;

    const insertFlight = db.prepare(`
      INSERT INTO flights (trip_id, flight_number, flight_date, airline_name, departure_airport, departure_airport_name, departure_time, arrival_airport, arrival_airport_name, arrival_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Try to enrich each flight via AirLabs, fall back to raw data
    for (const f of flights) {
      let enriched = null;
      try {
        const result = await lookupFlight(f.flight_number, f.date, f.departure_airport, f.arrival_airport);
        if (result.flight) enriched = result.flight;
      } catch (e) {
        console.log(`Could not enrich ${f.flight_number}: ${e.message}`);
      }

      if (enriched) {
        insertFlight.run(tripId, enriched.flight_number, enriched.flight_date, enriched.airline_name || '',
          enriched.departure_airport, enriched.departure_airport_name || '', enriched.departure_time,
          enriched.arrival_airport, enriched.arrival_airport_name || '', enriched.arrival_time, enriched.status || 'scheduled');
      } else {
        // Use raw extracted data
        insertFlight.run(tripId, f.flight_number, f.date, '',
          f.departure_airport || '', '', f.departure_time ? `${f.date} ${f.departure_time}` : '',
          f.arrival_airport || '', '', f.arrival_time ? `${f.date} ${f.arrival_time}` : '', 'scheduled');
      }
    }

    // Mark pending as accepted
    db.prepare("UPDATE pending_trips SET status = 'accepted' WHERE id = ?").run(pending.id);

    // Detect overlaps
    const { detectOverlapsForUser } = require('../services/overlaps');
    detectOverlapsForUser(req.user.id);

    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
    const tripFlights = db.prepare('SELECT * FROM flights WHERE trip_id = ?').all(tripId);

    res.json({ trip: { ...trip, flights: tripFlights } });
  } catch (err) {
    console.error('Accept pending trip error:', err);
    res.status(500).json({ error: 'Failed to accept pending trip' });
  }
});

// Reject a pending trip
router.post('/pending/:id/reject', authenticate, (req, res) => {
  try {
    const pending = db.prepare(
      'SELECT * FROM pending_trips WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);
    if (!pending) return res.status(404).json({ error: 'Pending trip not found' });

    db.prepare("UPDATE pending_trips SET status = 'rejected' WHERE id = ?").run(pending.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Reject pending trip error:', err);
    res.status(500).json({ error: 'Failed to reject pending trip' });
  }
});

// Delete trip
router.delete('/:id', authenticate, (req, res) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
    detectOverlapsForUser(req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

module.exports = router;
