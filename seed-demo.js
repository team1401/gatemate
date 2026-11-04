#!/usr/bin/env node
/**
 * GateMate Demo Data Seeder
 * Creates realistic Company employee accounts with upcoming flights and overlaps
 * Run: node seed-demo.js (from the gatebump directory)
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'gatemate.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Demo password for all accounts
const DEMO_PASSWORD = bcrypt.hashSync('company2026', 10);

// ============================================================
// Company Demo Users
// ============================================================
const users = [
  { email: 'bsmith@company.com', name: 'Brian Smith', is_admin: 1 },
  { email: 'sbollar@company.com', name: 'Scott Bollar', is_admin: 0 },
  { email: 'jpeterson@company.com', name: 'Jordan Peterson', is_admin: 0 },
  { email: 'tphibbs@company.com', name: 'Tanner Phibbs', is_admin: 0 },
  { email: 'mwilson@company.com', name: 'Mike Wilson', is_admin: 0 },
  { email: 'kchen@company.com', name: 'Karen Chen', is_admin: 0 },
  { email: 'rjones@company.com', name: 'Ryan Jones', is_admin: 0 },
  { email: 'agarcia@company.com', name: 'Ana Garcia', is_admin: 0 },
];

// ============================================================
// Upcoming trips with realistic Nutanix deployment travel
// Dates: March-April 2026
// ============================================================
const trips = [
  // Brian — LaPlace, LA deployment (March 1-4)
  {
    userEmail: 'bsmith@company.com',
    tripName: 'LaPlace LA - Nutanix Deploy',
    flights: [
      { flight_number: 'AA2847', flight_date: '2026-03-01', airline_name: 'American Airlines',
        departure_airport: 'PHX', departure_airport_name: 'Phoenix Sky Harbor',
        departure_time: '2026-03-01T13:20:00', arrival_airport: 'MSY',
        arrival_airport_name: 'Louis Armstrong New Orleans', arrival_time: '2026-03-01T17:17:00' },
      { flight_number: 'AA1432', flight_date: '2026-03-04', airline_name: 'American Airlines',
        departure_airport: 'MSY', departure_airport_name: 'Louis Armstrong New Orleans',
        departure_time: '2026-03-04T14:30:00', arrival_airport: 'DFW',
        arrival_airport_name: 'Dallas/Fort Worth', arrival_time: '2026-03-04T16:25:00' },
      { flight_number: 'AA1876', flight_date: '2026-03-04', airline_name: 'American Airlines',
        departure_airport: 'DFW', departure_airport_name: 'Dallas/Fort Worth',
        departure_time: '2026-03-04T18:10:00', arrival_airport: 'PHX',
        arrival_airport_name: 'Phoenix Sky Harbor', arrival_time: '2026-03-04T19:05:00' },
    ]
  },
  // Jordan — Atlanta client site (March 3-7)
  {
    userEmail: 'jpeterson@company.com',
    tripName: 'Atlanta - Delta Health Systems',
    flights: [
      { flight_number: 'DL1822', flight_date: '2026-03-03', airline_name: 'Delta Air Lines',
        departure_airport: 'IAD', departure_airport_name: 'Washington Dulles',
        departure_time: '2026-03-03T07:15:00', arrival_airport: 'ATL',
        arrival_airport_name: 'Hartsfield-Jackson Atlanta', arrival_time: '2026-03-03T09:30:00' },
      { flight_number: 'DL2291', flight_date: '2026-03-07', airline_name: 'Delta Air Lines',
        departure_airport: 'ATL', departure_airport_name: 'Hartsfield-Jackson Atlanta',
        departure_time: '2026-03-07T16:45:00', arrival_airport: 'DFW',
        arrival_airport_name: 'Dallas/Fort Worth', arrival_time: '2026-03-07T18:30:00' },
      { flight_number: 'AA980', flight_date: '2026-03-07', airline_name: 'American Airlines',
        departure_airport: 'DFW', departure_airport_name: 'Dallas/Fort Worth',
        departure_time: '2026-03-07T20:15:00', arrival_airport: 'IAD',
        arrival_airport_name: 'Washington Dulles', arrival_time: '2026-03-08T00:10:00' },
    ]
  },
  // Tanner — Chicago deployment (March 10-14)
  {
    userEmail: 'tphibbs@company.com',
    tripName: 'Chicago - Midwest Financial',
    flights: [
      { flight_number: 'UA456', flight_date: '2026-03-10', airline_name: 'United Airlines',
        departure_airport: 'IAD', departure_airport_name: 'Washington Dulles',
        departure_time: '2026-03-10T06:00:00', arrival_airport: 'ORD',
        arrival_airport_name: "O'Hare International", arrival_time: '2026-03-10T07:30:00' },
      { flight_number: 'UA891', flight_date: '2026-03-14', airline_name: 'United Airlines',
        departure_airport: 'ORD', departure_airport_name: "O'Hare International",
        departure_time: '2026-03-14T17:00:00', arrival_airport: 'IAD',
        arrival_airport_name: 'Washington Dulles', arrival_time: '2026-03-14T20:15:00' },
    ]
  },
  // Scott — SLC Conference + Denver client (March 3-7) ← OVERLAP with Jordan at DFW!
  {
    userEmail: 'sbollar@company.com',
    tripName: 'SLC Conference + Denver',
    flights: [
      { flight_number: 'DL1550', flight_date: '2026-03-03', airline_name: 'Delta Air Lines',
        departure_airport: 'IAD', departure_airport_name: 'Washington Dulles',
        departure_time: '2026-03-03T08:30:00', arrival_airport: 'SLC',
        arrival_airport_name: 'Salt Lake City', arrival_time: '2026-03-03T11:00:00' },
      { flight_number: 'UA372', flight_date: '2026-03-05', airline_name: 'United Airlines',
        departure_airport: 'SLC', departure_airport_name: 'Salt Lake City',
        departure_time: '2026-03-05T10:00:00', arrival_airport: 'DEN',
        arrival_airport_name: 'Denver International', arrival_time: '2026-03-05T12:45:00' },
      { flight_number: 'AA2105', flight_date: '2026-03-07', airline_name: 'American Airlines',
        departure_airport: 'DEN', departure_airport_name: 'Denver International',
        departure_time: '2026-03-07T15:30:00', arrival_airport: 'DFW',
        arrival_airport_name: 'Dallas/Fort Worth', arrival_time: '2026-03-07T18:45:00' },
      { flight_number: 'AA1620', flight_date: '2026-03-07', airline_name: 'American Airlines',
        departure_airport: 'DFW', departure_airport_name: 'Dallas/Fort Worth',
        departure_time: '2026-03-07T20:30:00', arrival_airport: 'IAD',
        arrival_airport_name: 'Washington Dulles', arrival_time: '2026-03-08T00:25:00' },
    ]
  },
  // Mike — Phoenix training (March 17-21) ← OVERLAP with Brian at PHX!
  {
    userEmail: 'mwilson@company.com',
    tripName: 'Phoenix - Nutanix NCI Training',
    flights: [
      { flight_number: 'AA1234', flight_date: '2026-03-17', airline_name: 'American Airlines',
        departure_airport: 'IAD', departure_airport_name: 'Washington Dulles',
        departure_time: '2026-03-17T06:45:00', arrival_airport: 'PHX',
        arrival_airport_name: 'Phoenix Sky Harbor', arrival_time: '2026-03-17T09:15:00' },
      { flight_number: 'AA765', flight_date: '2026-03-21', airline_name: 'American Airlines',
        departure_airport: 'PHX', departure_airport_name: 'Phoenix Sky Harbor',
        departure_time: '2026-03-21T16:00:00', arrival_airport: 'DFW',
        arrival_airport_name: 'Dallas/Fort Worth', arrival_time: '2026-03-21T20:10:00' },
      { flight_number: 'AA982', flight_date: '2026-03-21', airline_name: 'American Airlines',
        departure_airport: 'DFW', departure_airport_name: 'Dallas/Fort Worth',
        departure_time: '2026-03-21T21:30:00', arrival_airport: 'IAD',
        arrival_airport_name: 'Washington Dulles', arrival_time: '2026-03-22T01:15:00' },
    ]
  },
  // Karen — San Jose Nutanix HQ (March 24-28)
  {
    userEmail: 'kchen@company.com',
    tripName: 'San Jose - Nutanix HQ Meeting',
    flights: [
      { flight_number: 'UA890', flight_date: '2026-03-24', airline_name: 'United Airlines',
        departure_airport: 'IAD', departure_airport_name: 'Washington Dulles',
        departure_time: '2026-03-24T07:00:00', arrival_airport: 'SFO',
        arrival_airport_name: 'San Francisco International', arrival_time: '2026-03-24T10:00:00' },
      { flight_number: 'UA567', flight_date: '2026-03-28', airline_name: 'United Airlines',
        departure_airport: 'SFO', departure_airport_name: 'San Francisco International',
        departure_time: '2026-03-28T18:00:00', arrival_airport: 'DEN',
        arrival_airport_name: 'Denver International', arrival_time: '2026-03-28T21:30:00' },
      { flight_number: 'UA1122', flight_date: '2026-03-29', airline_name: 'United Airlines',
        departure_airport: 'DEN', departure_airport_name: 'Denver International',
        departure_time: '2026-03-29T08:00:00', arrival_airport: 'IAD',
        arrival_airport_name: 'Washington Dulles', arrival_time: '2026-03-29T13:30:00' },
    ]
  },
  // Ryan — Dallas deployment (March 31 - April 4) 
  {
    userEmail: 'rjones@company.com',
    tripName: 'Dallas - TechStar Industries',
    flights: [
      { flight_number: 'AA2200', flight_date: '2026-03-31', airline_name: 'American Airlines',
        departure_airport: 'IAD', departure_airport_name: 'Washington Dulles',
        departure_time: '2026-03-31T06:30:00', arrival_airport: 'DFW',
        arrival_airport_name: 'Dallas/Fort Worth', arrival_time: '2026-03-31T08:45:00' },
      { flight_number: 'AA1875', flight_date: '2026-04-04', airline_name: 'American Airlines',
        departure_airport: 'DFW', departure_airport_name: 'Dallas/Fort Worth',
        departure_time: '2026-04-04T17:30:00', arrival_airport: 'IAD',
        arrival_airport_name: 'Washington Dulles', arrival_time: '2026-04-04T21:15:00' },
    ]
  },
  // Ana — Boston client (April 7-11) + DEN layover ← OVERLAP with Karen returning through DEN
  {
    userEmail: 'agarcia@company.com',
    tripName: 'Boston - Northeast Hospital Group',
    flights: [
      { flight_number: 'JB416', flight_date: '2026-04-07', airline_name: 'JetBlue',
        departure_airport: 'IAD', departure_airport_name: 'Washington Dulles',
        departure_time: '2026-04-07T09:00:00', arrival_airport: 'BOS',
        arrival_airport_name: 'Boston Logan', arrival_time: '2026-04-07T11:15:00' },
      { flight_number: 'JB821', flight_date: '2026-04-11', airline_name: 'JetBlue',
        departure_airport: 'BOS', departure_airport_name: 'Boston Logan',
        departure_time: '2026-04-11T14:00:00', arrival_airport: 'IAD',
        arrival_airport_name: 'Washington Dulles', arrival_time: '2026-04-11T16:30:00' },
    ]
  },
  // Brian — second trip: Denver NC2 residency (March 24-28) ← OVERLAP with Karen at DEN!
  {
    userEmail: 'bsmith@company.com',
    tripName: 'Denver - NC2 Residency Week',
    flights: [
      { flight_number: 'UA445', flight_date: '2026-03-24', airline_name: 'United Airlines',
        departure_airport: 'PHX', departure_airport_name: 'Phoenix Sky Harbor',
        departure_time: '2026-03-24T08:00:00', arrival_airport: 'DEN',
        arrival_airport_name: 'Denver International', arrival_time: '2026-03-24T11:30:00' },
      { flight_number: 'UA778', flight_date: '2026-03-28', airline_name: 'United Airlines',
        departure_airport: 'DEN', departure_airport_name: 'Denver International',
        departure_time: '2026-03-28T17:00:00', arrival_airport: 'PHX',
        arrival_airport_name: 'Phoenix Sky Harbor', arrival_time: '2026-03-28T18:00:00' },
    ]
  },
  // Jordan — second trip: San Jose Nutanix (March 24-28) ← OVERLAP with Karen at SFO!
  {
    userEmail: 'jpeterson@company.com',
    tripName: 'San Jose - Nutanix Partner Summit',
    flights: [
      { flight_number: 'UA892', flight_date: '2026-03-24', airline_name: 'United Airlines',
        departure_airport: 'IAD', departure_airport_name: 'Washington Dulles',
        departure_time: '2026-03-24T06:30:00', arrival_airport: 'SFO',
        arrival_airport_name: 'San Francisco International', arrival_time: '2026-03-24T09:45:00' },
      { flight_number: 'UA569', flight_date: '2026-03-28', airline_name: 'United Airlines',
        departure_airport: 'SFO', departure_airport_name: 'San Francisco International',
        departure_time: '2026-03-28T17:30:00', arrival_airport: 'IAD',
        arrival_airport_name: 'Washington Dulles', arrival_time: '2026-03-29T01:00:00' },
    ]
  },
];

// ============================================================
// Overlaps to pre-compute
// ============================================================
const overlaps = [
  {
    user_a: 'sbollar@company.com', user_b: 'jpeterson@company.com',
    airport: 'DFW', airport_name: 'Dallas/Fort Worth',
    overlap_start: '2026-03-07T18:30:00', overlap_end: '2026-03-07T20:30:00',
    overlap_minutes: 120,
    desc: 'Scott arriving from DEN, Jordan arriving from ATL — both connecting through DFW same evening!'
  },
  {
    user_a: 'kchen@company.com', user_b: 'jpeterson@company.com',
    airport: 'SFO', airport_name: 'San Francisco International',
    overlap_start: '2026-03-24T09:45:00', overlap_end: '2026-03-24T10:00:00',
    overlap_minutes: 15,
    desc: 'Karen and Jordan both arriving SFO same morning for Nutanix meetings'
  },
  {
    user_a: 'bsmith@company.com', user_b: 'kchen@company.com',
    airport: 'DEN', airport_name: 'Denver International',
    overlap_start: '2026-03-28T17:00:00', overlap_end: '2026-03-28T18:00:00',
    overlap_minutes: 60,
    desc: 'Brian and Karen both departing DEN same evening — grab dinner at the airport!'
  },
];

// ============================================================
// SEED!
// ============================================================

console.log('🌱 Seeding GateMate demo data...\n');

// Insert users
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (email, password, name, is_admin, email_verified) VALUES (?, ?, ?, ?, 1)
`);
const insertUserEmail = db.prepare(`
  INSERT OR IGNORE INTO user_emails (user_id, email, verified) VALUES (?, ?, 1)
`);

const userIds = {};
for (const u of users) {
  insertUser.run(u.email.toLowerCase(), DEMO_PASSWORD, u.name, u.is_admin);
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email.toLowerCase());
  userIds[u.email] = row.id;
  insertUserEmail.run(row.id, u.email.toLowerCase());
  console.log(`  👤 ${u.name} (${u.email}) → ID ${row.id}${u.is_admin ? ' [ADMIN]' : ''}`);
}

// Insert trips and flights
const insertTrip = db.prepare(`INSERT INTO trips (user_id, name) VALUES (?, ?)`);
const insertFlight = db.prepare(`
  INSERT INTO flights (trip_id, flight_number, flight_date, airline_name, 
    departure_airport, departure_airport_name, departure_time,
    arrival_airport, arrival_airport_name, arrival_time, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
`);

console.log('');
for (const trip of trips) {
  const userId = userIds[trip.userEmail];
  const result = insertTrip.run(userId, trip.tripName);
  const tripId = result.lastInsertRowid;
  console.log(`  ✈️  ${trip.tripName} (${trip.userEmail})`);
  
  for (const f of trip.flights) {
    insertFlight.run(tripId, f.flight_number, f.flight_date, f.airline_name,
      f.departure_airport, f.departure_airport_name, f.departure_time,
      f.arrival_airport, f.arrival_airport_name, f.arrival_time);
    console.log(`     ${f.flight_number}: ${f.departure_airport} → ${f.arrival_airport} (${f.flight_date})`);
  }
}

// Insert overlaps
const insertOverlap = db.prepare(`
  INSERT INTO overlaps (user_a_id, user_b_id, airport, airport_name, 
    overlap_start, overlap_end, overlap_minutes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

console.log('\n  🤝 Overlaps:');
for (const o of overlaps) {
  const aId = userIds[o.user_a];
  const bId = userIds[o.user_b];
  insertOverlap.run(aId, bId, o.airport, o.airport_name, 
    o.overlap_start, o.overlap_end, o.overlap_minutes);
  const aName = users.find(u => u.email === o.user_a).name;
  const bName = users.find(u => u.email === o.user_b).name;
  console.log(`     ${aName} ↔ ${bName} @ ${o.airport} (${o.overlap_minutes} min)`);
  console.log(`     💡 ${o.desc}`);
}

console.log(`
✅ Demo data seeded!

  Users:    ${users.length}
  Trips:    ${trips.length}  
  Flights:  ${trips.reduce((sum, t) => sum + t.flights.length, 0)}
  Overlaps: ${overlaps.length}

  Login: any @company.com email / password: company2026
  Admin: bsmith@company.com
`);

db.close();
