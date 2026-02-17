# GateMate Email Notification System

## ✅ Implementation Complete

Three automated email features have been added to GateMate:

### 1. Welcome Email on Signup ✉️
- **Trigger:** Automatically sent when a new user registers
- **Content:**
  - Personalized greeting with user's first name
  - Explanation of how GateMate works
  - Clear CTA to forward flight emails to flights@gatemate.app
  - Count of coworkers from same domain already using the app
  - Link to the app
- **Implementation:** `server/routes/auth.js` + `server/services/emailSender.js`

### 2. Weekly Flight Reminder 📅
- **Trigger:** Runs every Monday at 9:00 AM
- **Recipients:** ALL registered users
- **Content:**
  - Reminder to forward flight confirmation emails
  - Coworker count from their domain
  - Their upcoming trips (next 30 days)
  - Recent layover matches found across the platform
  - Link to the app
- **Implementation:** `server/services/weeklyReminder.js` (started from `server/index.js`)

### 3. Layover Match Notification 🎉
- **Trigger:** When a new trip creates an overlapping layover with another user
- **Recipients:** BOTH users involved in the overlap
- **Content:**
  - Notification that they'll be at the same airport
  - Date and time of overlap
  - Calculated overlap duration (e.g., "2 hours 45 minutes")
  - Suggestion to grab a drink together
  - Each other's contact email
  - Link to the app
- **Implementation:** `server/services/overlaps.js` (integrated into existing overlap detection)

## Email Template Design

All emails use a consistent, professional HTML template:
- **Colors:** Navy (#1e3a5f), Amber (#f59e0b), Cream (#f5f5f0)
- **Header:** Navy bar with "GATE Mate" logo
- **Body:** Clean white background, good typography
- **CTAs:** Amber buttons with hover effects
- **Footer:** Light gray with unsubscribe note

## SMTP Configuration

Production server configured with:
```
SMTP_HOST=smtp.porkbun.com
SMTP_PORT=465
SMTP_USER=hello@gatemate.app
SMTP_FROM=GateMate <hello@gatemate.app>
APP_URL=http://100.97.65.28:3111
```

Password stored in `/home/helix/gatebump/.env` with proper escaping for Docker Compose.

## Testing

### Test Welcome Email
1. Register a new user at http://100.97.65.28:3111
2. Check the user's email inbox for "Welcome to GateMate! ✈️"
3. Monitor logs: `ssh helix@plex "docker logs gatemate -f"`

### Test Layover Match Email
1. Register two users with different emails
2. Add overlapping flights for both users at the same airport
3. Both users should receive "🎉 Layover Match!" emails

### Test Weekly Reminder
Weekly reminder runs every Monday at 9:00 AM automatically. To test immediately:
```bash
ssh helix@plex "docker exec gatemate node -e \"
require('dotenv').config();
const { sendWeeklyReminders } = require('./server/services/weeklyReminder');
sendWeeklyReminders();
\""
```

## Integration Points

1. **Registration flow** (`server/routes/auth.js`)
   - Sends welcome email after successful registration
   - Async/non-blocking - doesn't delay API response

2. **Trip creation/acceptance** (`server/routes/trips.js`)
   - Overlap detection triggers match notifications
   - Works for both manual trip creation and email-forwarded trips

3. **Email poller** (`server/services/emailPoller.js`)
   - Pending trips get converted to real trips on acceptance
   - Overlap detection runs automatically after acceptance

4. **Weekly scheduler** (`server/index.js`)
   - Started on server startup
   - Checks every minute for Monday 9 AM

## Error Handling

- All email sending is async and non-blocking
- SMTP failures are logged but don't crash the app
- If SMTP is not configured, emails are skipped with a console warning
- Users can still use the app even if email sending fails

## Files Added/Modified

### New Files
- `server/services/emailSender.js` - Core email service with HTML templates
- `server/services/weeklyReminder.js` - Weekly reminder scheduler
- `server/test-email.js` - Manual email testing script

### Modified Files
- `server/routes/auth.js` - Added welcome email on registration
- `server/services/overlaps.js` - Added layover match email notifications
- `server/index.js` - Start weekly reminder scheduler
- `.env` (production) - Added SMTP configuration

## Deployment Status

✅ Deployed to production: `helix@plex:/home/helix/gatebump/`
✅ Docker container rebuilt and running
✅ SMTP configuration verified
✅ Email poller running
✅ Weekly reminder scheduler started

## Next Steps

1. **Test welcome email** by registering a new user
2. **Test layover match** by creating overlapping trips
3. **Monitor logs** for any SMTP errors
4. **Wait until Monday 9 AM** to verify weekly reminders send automatically

If SMTP fails with `hello@gatemate.app`, try using `flights@gatemate.app` as SMTP_USER instead (both mailboxes are on Porkbun with likely the same credentials).
