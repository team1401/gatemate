const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'gatemate.db');
const fs = require('fs');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    flight_number TEXT NOT NULL,
    flight_date TEXT NOT NULL,
    airline_name TEXT,
    departure_airport TEXT NOT NULL,
    departure_airport_name TEXT,
    departure_time TEXT NOT NULL,
    arrival_airport TEXT NOT NULL,
    arrival_airport_name TEXT,
    arrival_time TEXT NOT NULL,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS overlaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flight_a_id INTEGER REFERENCES flights(id) ON DELETE CASCADE,
    flight_b_id INTEGER REFERENCES flights(id) ON DELETE CASCADE,
    airport TEXT NOT NULL,
    airport_name TEXT,
    overlap_start TEXT NOT NULL,
    overlap_end TEXT NOT NULL,
    overlap_minutes INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flight_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_number TEXT NOT NULL,
    flight_date TEXT NOT NULL,
    response_json TEXT NOT NULL,
    cached_at TEXT DEFAULT (datetime('now')),
    UNIQUE(flight_number, flight_date)
  );

  CREATE TABLE IF NOT EXISTS pending_trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source_email TEXT,
    raw_email_text TEXT,
    extracted_flights TEXT,
    trip_name TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_pending_trips_user ON pending_trips(user_id);
  CREATE INDEX IF NOT EXISTS idx_pending_trips_status ON pending_trips(status);
  CREATE INDEX IF NOT EXISTS idx_flights_trip ON flights(trip_id);
  CREATE INDEX IF NOT EXISTS idx_overlaps_users ON overlaps(user_a_id, user_b_id);
  CREATE INDEX IF NOT EXISTS idx_cache_lookup ON flight_cache(flight_number, flight_date);

  CREATE TABLE IF NOT EXISTS user_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL UNIQUE,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_emails_user ON user_emails(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_emails_email ON user_emails(email);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migrations: add is_admin column if missing
try {
  db.prepare("SELECT is_admin FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
}

// Migration: add onboarding_seen column if missing
try {
  db.prepare("SELECT onboarding_seen FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN onboarding_seen INTEGER DEFAULT 0");
}

// Migration: add token_version column if missing (for token revocation)
try {
  db.prepare("SELECT token_version FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0");
}

// Migration: add processed_emails table (for email deduplication)
db.exec(`
  CREATE TABLE IF NOT EXISTS processed_emails (
    message_id TEXT PRIMARY KEY,
    processed_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: populate user_emails for existing users who don't have entries
const usersWithoutEmails = db.prepare(`
  SELECT id, email FROM users WHERE id NOT IN (SELECT user_id FROM user_emails)
`).all();
for (const u of usersWithoutEmails) {
  db.prepare('INSERT OR IGNORE INTO user_emails (user_id, email, verified) VALUES (?, ?, 1)').run(u.id, u.email.toLowerCase());
}

// Migration: add layover window columns to overlaps table (for timeline visualization)
try {
  db.prepare("SELECT user_a_layover_start FROM overlaps LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE overlaps ADD COLUMN user_a_layover_start TEXT");
  db.exec("ALTER TABLE overlaps ADD COLUMN user_a_layover_end TEXT");
  db.exec("ALTER TABLE overlaps ADD COLUMN user_b_layover_start TEXT");
  db.exec("ALTER TABLE overlaps ADD COLUMN user_b_layover_end TEXT");
}

// Migration: add imap_message_id column to pending_trips if missing
try {
  db.prepare("SELECT imap_message_id FROM pending_trips LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE pending_trips ADD COLUMN imap_message_id TEXT");
}

// Migration: password reset tokens (stored as SHA-256 hashes, single-use, short-lived)
db.exec(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
`);

// Ensure first user is admin
db.prepare("UPDATE users SET is_admin = 1 WHERE id = 1").run();

// Seed default allowed_domains if not present
const existing = db.prepare("SELECT key FROM settings WHERE key = 'allowed_domains'").get();
if (!existing) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('allowed_domains', ?)").run(JSON.stringify(["company.com"]));
}

module.exports = db;
