#!/usr/bin/env node
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const [,, email, newPassword] = process.argv;
if (!email || !newPassword) {
  console.error('Usage: node reset-password.js <email> <newpassword>');
  process.exit(1);
}

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'gatemate.db');
const db = new Database(dbPath);
const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email.toLowerCase());
if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

const hash = bcrypt.hashSync(newPassword, 10);
db.prepare('UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?').run(hash, user.id);
try {
  db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(user.id);
} catch (e) {
  // password_resets table not created yet
}
console.log(`Password reset for ${user.name} (${user.email}). Token version incremented.`);
db.close();
