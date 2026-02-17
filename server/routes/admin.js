const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate, requireAdmin);

// Users
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, email, name, is_admin, created_at FROM users ORDER BY id').all();
  res.json({ users });
});

router.put('/users/:id', (req, res) => {
  const { name, email, is_admin } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Whitelist allowed fields to prevent SQL injection
  const ALLOWED_FIELDS = { name: 'name', email: 'email', is_admin: 'is_admin' };
  const updates = [];
  const params = [];
  
  if (name !== undefined && ALLOWED_FIELDS.name) {
    updates.push(`${ALLOWED_FIELDS.name} = ?`);
    params.push(name);
  }
  if (email !== undefined && ALLOWED_FIELDS.email) {
    updates.push(`${ALLOWED_FIELDS.email} = ?`);
    params.push(email.toLowerCase());
  }
  if (is_admin !== undefined && ALLOWED_FIELDS.is_admin) {
    updates.push(`${ALLOWED_FIELDS.is_admin} = ?`);
    params.push(is_admin ? 1 : 0);
  }
  
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const updated = db.prepare('SELECT id, email, name, is_admin, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json({ user: updated });
});

router.delete('/users/:id', (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Trips
router.get('/trips', (req, res) => {
  const trips = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email 
    FROM trips t JOIN users u ON t.user_id = u.id 
    ORDER BY t.created_at DESC
  `).all();
  const result = trips.map(t => ({
    ...t,
    flights: db.prepare('SELECT * FROM flights WHERE trip_id = ? ORDER BY departure_time').all(t.id)
  }));
  res.json({ trips: result });
});

router.put('/trips/:id', (req, res) => {
  const { name, user_id } = req.body;
  const trip = db.prepare('SELECT id FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  
  // Whitelist allowed fields to prevent SQL injection
  const ALLOWED_FIELDS = { name: 'name', user_id: 'user_id' };
  const updates = [];
  const params = [];
  
  if (name !== undefined && ALLOWED_FIELDS.name) {
    updates.push(`${ALLOWED_FIELDS.name} = ?`);
    params.push(name);
  }
  if (user_id !== undefined && ALLOWED_FIELDS.user_id) {
    updates.push(`${ALLOWED_FIELDS.user_id} = ?`);
    params.push(user_id);
  }
  
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE trips SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

router.delete('/trips/:id', (req, res) => {
  db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Flights
router.get('/flights', (req, res) => {
  const flights = db.prepare(`
    SELECT f.*, t.name as trip_name, t.user_id, u.name as user_name
    FROM flights f 
    JOIN trips t ON f.trip_id = t.id 
    JOIN users u ON t.user_id = u.id
    ORDER BY f.departure_time DESC
  `).all();
  res.json({ flights });
});

router.put('/flights/:id', (req, res) => {
  const { flight_number, departure_airport, arrival_airport, departure_time, arrival_time, flight_date } = req.body;
  const flight = db.prepare('SELECT id FROM flights WHERE id = ?').get(req.params.id);
  if (!flight) return res.status(404).json({ error: 'Flight not found' });
  
  // Whitelist allowed fields to prevent SQL injection
  const ALLOWED_FIELDS = {
    flight_number: 'flight_number',
    departure_airport: 'departure_airport',
    arrival_airport: 'arrival_airport',
    departure_time: 'departure_time',
    arrival_time: 'arrival_time',
    flight_date: 'flight_date'
  };
  const updates = [];
  const params = [];
  
  if (flight_number !== undefined && ALLOWED_FIELDS.flight_number) {
    updates.push(`${ALLOWED_FIELDS.flight_number} = ?`);
    params.push(flight_number);
  }
  if (departure_airport !== undefined && ALLOWED_FIELDS.departure_airport) {
    updates.push(`${ALLOWED_FIELDS.departure_airport} = ?`);
    params.push(departure_airport);
  }
  if (arrival_airport !== undefined && ALLOWED_FIELDS.arrival_airport) {
    updates.push(`${ALLOWED_FIELDS.arrival_airport} = ?`);
    params.push(arrival_airport);
  }
  if (departure_time !== undefined && ALLOWED_FIELDS.departure_time) {
    updates.push(`${ALLOWED_FIELDS.departure_time} = ?`);
    params.push(departure_time);
  }
  if (arrival_time !== undefined && ALLOWED_FIELDS.arrival_time) {
    updates.push(`${ALLOWED_FIELDS.arrival_time} = ?`);
    params.push(arrival_time);
  }
  if (flight_date !== undefined && ALLOWED_FIELDS.flight_date) {
    updates.push(`${ALLOWED_FIELDS.flight_date} = ?`);
    params.push(flight_date);
  }
  
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE flights SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

router.delete('/flights/:id', (req, res) => {
  db.prepare('DELETE FROM flights WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/flights', (req, res) => {
  const { trip_id, flight_number, flight_date, departure_airport, departure_time, arrival_airport, arrival_time, airline_name, status } = req.body;
  if (!trip_id || !flight_number || !flight_date || !departure_airport || !departure_time || !arrival_airport || !arrival_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const result = db.prepare(`
    INSERT INTO flights (trip_id, flight_number, flight_date, airline_name, departure_airport, departure_time, arrival_airport, arrival_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(trip_id, flight_number, flight_date, airline_name || '', departure_airport, departure_time, arrival_airport, arrival_time, status || 'scheduled');
  res.json({ id: result.lastInsertRowid });
});

// Pending Trips (admin view)
router.get('/pending', (req, res) => {
  const pending = db.prepare(`
    SELECT pt.*, u.name as user_name, u.email as user_email
    FROM pending_trips pt JOIN users u ON pt.user_id = u.id
    ORDER BY pt.created_at DESC
  `).all();
  const result = pending.map(p => ({
    ...p,
    extracted_flights: JSON.parse(p.extracted_flights || '[]')
  }));
  res.json({ pending_trips: result });
});

// Settings
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = JSON.parse(r.value); });
  res.json({ settings });
});

router.put('/settings', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key required' });
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  res.json({ success: true });
});

module.exports = router;
