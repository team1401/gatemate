const crypto = require('crypto');
const db = require('../db');
const { sendEmail } = require('./emailSender');

const TOKEN_TTL_HOURS = 24;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAppUrl() {
  return process.env.APP_URL || 'http://100.97.65.28:3111';
}

function smtpConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

/**
 * Issue a new verification token for a user_emails row, replacing any previous one.
 * Returns the raw token; only its hash is stored.
 */
const createVerificationToken = db.transaction((userEmailId) => {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM email_verification_tokens WHERE user_email_id = ?').run(userEmailId);
  db.prepare(`
    INSERT INTO email_verification_tokens (user_email_id, token_hash, expires_at)
    VALUES (?, ?, datetime('now', ?))
  `).run(userEmailId, hashToken(token), `+${TOKEN_TTL_HOURS} hours`);
  return token;
});

function hasActiveTokenForEmail(email) {
  return !!db.prepare(`
    SELECT 1 FROM email_verification_tokens t
    JOIN user_emails ue ON ue.id = t.user_email_id
    WHERE ue.email = ? AND t.expires_at > datetime('now')
  `).get(email);
}

/**
 * Redeem a verification token. Tokens are single-use: on success every token for
 * that address is deleted. Returns { userId, email, isPrimary } or null.
 */
const redeemVerificationToken = db.transaction((token) => {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = db.prepare(`
    SELECT t.user_email_id, ue.user_id, ue.email, u.email AS primary_email
    FROM email_verification_tokens t
    JOIN user_emails ue ON ue.id = t.user_email_id
    JOIN users u ON u.id = ue.user_id
    WHERE t.token_hash = ? AND t.expires_at > datetime('now')
  `).get(hashToken(token));
  if (!row) return null;

  db.prepare('DELETE FROM email_verification_tokens WHERE user_email_id = ?').run(row.user_email_id);
  db.prepare('UPDATE user_emails SET verified = 1 WHERE id = ?').run(row.user_email_id);
  const isPrimary = row.email === row.primary_email;
  if (isPrimary) {
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(row.user_id);
  }
  return { userId: row.user_id, email: row.email, isPrimary };
});

/**
 * Make an address available to be claimed. Unverified claims whose verification
 * link has expired are released so they cannot squat an address forever; verified
 * claims and claims with a live link are kept. Returns true if the address is free.
 */
const releaseStaleClaim = db.transaction((email) => {
  const owner = db.prepare('SELECT id, email_verified FROM users WHERE email = ?').get(email);
  if (owner) {
    if (owner.email_verified || hasActiveTokenForEmail(email)) return false;
    db.prepare('DELETE FROM pending_trips WHERE user_id = ?').run(owner.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(owner.id);
  }
  const claim = db.prepare('SELECT id, verified FROM user_emails WHERE email = ?').get(email);
  if (claim) {
    if (claim.verified || hasActiveTokenForEmail(email)) return false;
    db.prepare('DELETE FROM user_emails WHERE id = ?').run(claim.id);
  }
  return true;
});

/**
 * Email a verification link to `to`. `account` is the GateMate account the address
 * will be attached to; for secondary addresses it is named so the recipient knows
 * whose account they would be linking.
 */
async function sendVerificationEmail(to, token, account, isPrimary) {
  const link = `${getAppUrl()}/verify-email?token=${token}`;
  if (!smtpConfigured()) {
    console.warn(`[EmailVerification] SMTP not configured. Verification link for ${to}: ${link}`);
    return false;
  }
  const firstName = escapeHtml((account.name || '').split(' ')[0] || 'there');
  const content = isPrimary
    ? `
      <h2>Confirm your email</h2>
      <p>Hi ${firstName},</p>
      <p>Please confirm that this is your email address to activate your GateMate account.</p>
      <a href="${link}" class="cta">Verify Email →</a>
      <p>This link expires in ${TOKEN_TTL_HOURS} hours and can only be used once.</p>
      <p>If you didn't create a GateMate account, you can ignore this email.</p>
    `
    : `
      <h2>Confirm your email</h2>
      <p><strong>${escapeHtml(account.name)}</strong> (${escapeHtml(account.email)}) asked to add this address to their GateMate account.
      Once confirmed, flight confirmations forwarded from this address will be added to that account.</p>
      <a href="${link}" class="cta">Verify Email →</a>
      <p>This link expires in ${TOKEN_TTL_HOURS} hours and can only be used once.</p>
      <p>If this wasn't you, ignore this email and the address will not be linked.</p>
    `;
  return sendEmail(to, 'Verify your GateMate email address', content);
}

module.exports = {
  createVerificationToken,
  redeemVerificationToken,
  releaseStaleClaim,
  sendVerificationEmail,
};
