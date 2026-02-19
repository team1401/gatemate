const db = require('../db');
const { sendLayoverMatchEmail } = require('./emailSender');

/**
 * Detect overlaps between a user's flights and all other users' flights.
 * An overlap = two users present at the same airport with overlapping time windows.
 * 
 * Airport presence window:
 * - Arrival at airport X (arrival_time of incoming flight) to departure from X (departure_time of outgoing flight)
 * - Final destination counts too (arrival_time to arrival_time + 4 hours assumed stay)
 */
function detectOverlapsForUser(userId) {
  // Remove old overlaps involving this user
  db.prepare('DELETE FROM overlaps WHERE user_a_id = ? OR user_b_id = ?').run(userId, userId);

  // Get all flights for this user grouped by trip
  const userTrips = db.prepare(`
    SELECT t.id as trip_id, f.* FROM flights f
    JOIN trips t ON f.trip_id = t.id
    WHERE t.user_id = ?
    ORDER BY t.id, f.departure_time
  `).all(userId);

  // Get all flights for other users
  const otherFlights = db.prepare(`
    SELECT t.user_id, t.id as trip_id, f.* FROM flights f
    JOIN trips t ON f.trip_id = t.id
    WHERE t.user_id != ?
    ORDER BY t.user_id, t.id, f.departure_time
  `).all(userId);

  // Build airport presence windows for user
  const userWindows = buildPresenceWindows(userTrips);
  
  // Group other flights by user+trip
  const otherByUserTrip = {};
  for (const f of otherFlights) {
    const key = `${f.user_id}-${f.trip_id}`;
    if (!otherByUserTrip[key]) otherByUserTrip[key] = { user_id: f.user_id, flights: [] };
    otherByUserTrip[key].flights.push(f);
  }

  const insertOverlap = db.prepare(`
    INSERT INTO overlaps (user_a_id, user_b_id, flight_a_id, flight_b_id, airport, airport_name, overlap_start, overlap_end, overlap_minutes, user_a_layover_start, user_a_layover_end, user_b_layover_start, user_b_layover_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((overlaps) => {
    for (const o of overlaps) {
      insertOverlap.run(o.user_a_id, o.user_b_id, o.flight_a_id, o.flight_b_id, o.airport, o.airport_name, o.overlap_start, o.overlap_end, o.overlap_minutes, o.user_a_layover_start, o.user_a_layover_end, o.user_b_layover_start, o.user_b_layover_end);
    }
  });

  const newOverlaps = [];

  for (const key of Object.keys(otherByUserTrip)) {
    const other = otherByUserTrip[key];
    const otherWindows = buildPresenceWindows(other.flights);

    for (const uw of userWindows) {
      for (const ow of otherWindows) {
        if (uw.airport !== ow.airport) continue;
        
        const overlapStart = new Date(Math.max(new Date(uw.start), new Date(ow.start)));
        const overlapEnd = new Date(Math.min(new Date(uw.end), new Date(ow.end)));
        const overlapMs = overlapEnd - overlapStart;
        const overlapMinutes = Math.floor(overlapMs / 60000);

        if (overlapMinutes >= 30) {
          newOverlaps.push({
            user_a_id: userId,
            user_b_id: other.user_id,
            flight_a_id: uw.flight_id,
            flight_b_id: ow.flight_id,
            airport: uw.airport,
            airport_name: uw.airport_name || ow.airport_name || uw.airport,
            overlap_start: overlapStart.toISOString(),
            overlap_end: overlapEnd.toISOString(),
            overlap_minutes: overlapMinutes,
            user_a_layover_start: uw.start,
            user_a_layover_end: uw.end,
            user_b_layover_start: ow.start,
            user_b_layover_end: ow.end
          });
        }
      }
    }
  }

  if (newOverlaps.length > 0) {
    insertMany(newOverlaps);
    
    // Send email notifications for new overlaps (async, non-blocking)
    (async () => {
      try {
        const appUrl = process.env.APP_URL || 'http://100.97.65.28:3111';
        
        for (const overlap of newOverlaps) {
          const userA = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(overlap.user_a_id);
          const userB = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(overlap.user_b_id);
          
          if (userA && userB) {
            await sendLayoverMatchEmail(userA, userB, overlap, appUrl);
          }
        }
      } catch (err) {
        console.error('Failed to send layover match emails:', err.message);
      }
    })();
  }

  return newOverlaps;
}

/**
 * Build presence windows from an ordered list of flights (within a trip).
 * A presence window = time spent at an airport between flights.
 */
function buildPresenceWindows(flights) {
  const windows = [];
  
  // Group flights by trip_id
  const byTrip = {};
  for (const f of flights) {
    const tid = f.trip_id;
    if (!byTrip[tid]) byTrip[tid] = [];
    byTrip[tid].push(f);
  }

  for (const tripFlights of Object.values(byTrip)) {
    // Sort by departure time
    tripFlights.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));

    for (let i = 0; i < tripFlights.length; i++) {
      const f = tripFlights[i];

      // Layover: arrival of this flight to departure of next flight (same airport)
      if (i < tripFlights.length - 1) {
        const next = tripFlights[i + 1];
        if (f.arrival_airport === next.departure_airport) {
          windows.push({
            airport: f.arrival_airport,
            airport_name: f.arrival_airport_name,
            start: f.arrival_time,
            end: next.departure_time,
            flight_id: f.id
          });
        }
      }

      // Final destination: arrival + 4 hour assumed window
      if (i === tripFlights.length - 1) {
        const arrivalTime = new Date(f.arrival_time);
        const endTime = new Date(arrivalTime.getTime() + 4 * 60 * 60 * 1000);
        windows.push({
          airport: f.arrival_airport,
          airport_name: f.arrival_airport_name,
          start: f.arrival_time,
          end: endTime.toISOString(),
          flight_id: f.id
        });
      }

      // Origin: departure airport, 2 hours before departure
      if (i === 0) {
        const depTime = new Date(f.departure_time);
        const startTime = new Date(depTime.getTime() - 2 * 60 * 60 * 1000);
        windows.push({
          airport: f.departure_airport,
          airport_name: f.departure_airport_name,
          start: startTime.toISOString(),
          end: f.departure_time,
          flight_id: f.id
        });
      }
    }
  }

  return windows;
}

module.exports = { detectOverlapsForUser };
