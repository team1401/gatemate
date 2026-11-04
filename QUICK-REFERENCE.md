# GateMate Email Notifications - Quick Reference Card

## 🚀 Status: DEPLOYED & RUNNING

**Production:** http://100.97.65.28:3111  
**Container:** gatemate (helix@plex)  
**Deployed:** 2026-02-16 13:20 MST

---

## 📧 Three Email Features Active

| Feature | Trigger | Recipients |
|---------|---------|------------|
| **Welcome Email** ✉️ | User registration | New user |
| **Weekly Reminder** 📅 | Every Monday 9 AM | All users |
| **Layover Match** 🎉 | Overlapping layovers detected | Both users |

---

## ⚡ Quick Commands

### Monitor Logs
```bash
ssh helix@plex "docker logs gatemate -f"
```

### Check Status
```bash
ssh helix@plex "docker ps | grep gatemate"
```

### Test Welcome Email
```bash
curl -X POST http://100.97.65.28:3111/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@company.com","password":"test123","name":"Test User"}'
```

### Manual Weekly Reminder
```bash
ssh helix@plex "docker exec gatemate node -e \"
require('dotenv').config();
const { sendWeeklyReminders } = require('./services/weeklyReminder');
sendWeeklyReminders();
\""
```

### Restart Container
```bash
ssh helix@plex "cd /home/helix/gatebump && docker compose restart"
```

---

## 📊 What to Look For in Logs

**✅ Good:**
- `GateMate running on port 3111`
- `[EmailPoller] Starting email polling`
- `[WEEKLY REMINDER] Scheduler started`
- `SMTP configured: hello@gatemate.app`
- `[EMAIL] Sent: Welcome to GateMate!`
- `[EMAIL] Sent: 🎉 Layover Match!`

**⚠️ Warning (but not critical):**
- `SMTP not configured - emails will be disabled`

**❌ Error:**
- `[EMAIL] Failed to send:`
- SMTP connection errors

---

## 🎨 Email Branding

- **Colors:** Navy (#1e3a5f), Amber (#f59e0b), Cream (#f5f5f0)
- **Logo:** "GATE Mate" (white + amber)
- **Template:** Professional HTML, mobile-responsive
- **Footer:** Unsubscribe note included

---

## 📝 Files Changed

**New:**
- `server/services/emailSender.js`
- `server/services/weeklyReminder.js`
- `server/test-email.js`

**Modified:**
- `server/routes/auth.js`
- `server/services/overlaps.js`
- `server/index.js`

---

## 🧪 Testing Checklist

- [ ] Register new user → check for welcome email
- [ ] Create overlapping trips → check for layover match emails
- [ ] Wait for Monday 9 AM (or manually trigger) → check weekly reminder
- [ ] Verify emails arrive in inbox (check spam folder)

---

## 📚 Full Documentation

1. **TASK-COMPLETE.md** - Executive summary
2. **EMAIL-FEATURES.md** - Technical documentation
3. **DEPLOYMENT-SUMMARY.md** - Testing guide
4. **IMPLEMENTATION-CHECKLIST.md** - Implementation details

---

## 🔧 SMTP Configuration

```
Host: smtp.porkbun.com:465
User: hello@gatemate.app
From: GateMate <hello@gatemate.app>
Password: Configured in .env (properly escaped)
```

**Backup:** If `hello@` fails, try `flights@gatemate.app` (same password)

---

## ✅ Success Indicators

- [x] Container running
- [x] SMTP configured
- [x] Email poller active
- [x] Weekly scheduler active
- [x] API responding
- [ ] **Test email received** ← Next step!

---

**Next Action:** Test welcome email by registering a user

**Support:** Check logs first, then documentation files
