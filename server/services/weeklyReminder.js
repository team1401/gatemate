const db = require('../db');
const { sendWeeklyReminder } = require('./emailSender');

/**
 * Check if it's Monday 9 AM (within a 1-minute window)
 */
function isMondayNineAM() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  return day === 1 && hour === 9 && minute === 0;
}

/**
 * Send weekly reminders to all users
 */
async function sendWeeklyReminders() {
  console.log('[WEEKLY REMINDER] Starting weekly email blast...');
  
  const users = db.prepare('SELECT id, email, name FROM users').all();
  const appUrl = process.env.APP_URL || 'http://100.97.65.28:3111';
  
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // Get domain for coworker count
      const domain = user.email.split('@')[1];
      const coworkerCount = db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE email LIKE ? AND id != ?"
      ).get(`%@${domain}`, user.id).count;

      // Get upcoming trips (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const upcomingTrips = db.prepare(`
        SELECT t.id, t.name, COUNT(f.id) as flightCount
        FROM trips t
        JOIN flights f ON f.trip_id = t.id
        WHERE t.user_id = ? AND f.departure_time >= datetime('now') AND f.departure_time <= ?
        GROUP BY t.id
        ORDER BY MIN(f.departure_time)
      `).all(user.id, thirtyDaysFromNow.toISOString());

      // Count recent overlaps found across platform (last 7 days)
      const recentBumps = db.prepare(
        "SELECT COUNT(*) as count FROM overlaps WHERE created_at >= datetime('now', '-7 days')"
      ).get().count;

      const stats = {
        coworkerCount,
        upcomingTrips,
        recentBumps
      };

      await sendWeeklyReminder(user, stats, appUrl);
      sent++;
    } catch (err) {
      console.error(`[WEEKLY REMINDER] Failed to send to ${user.email}:`, err.message);
      failed++;
    }
  }

  console.log(`[WEEKLY REMINDER] Complete: ${sent} sent, ${failed} failed`);
}

/**
 * Start the weekly reminder scheduler
 */
function startWeeklyReminder() {
  console.log('[WEEKLY REMINDER] Scheduler started (runs Monday 9 AM)');

  // Check every minute
  setInterval(async () => {
    if (isMondayNineAM()) {
      await sendWeeklyReminders();
    }
  }, 60 * 1000); // 1 minute
}

module.exports = { startWeeklyReminder, sendWeeklyReminders };
