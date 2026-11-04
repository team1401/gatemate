const nodemailer = require('nodemailer');

// Create transporter with SMTP config from env
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('SMTP not configured - emails will be disabled');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 465,
      secure: true, // Use SSL
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    console.log(`SMTP configured: ${SMTP_USER} via ${SMTP_HOST}:${SMTP_PORT}`);
  }

  return transporter;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/**
 * Generate HTML email template with GateMate branding
 */
function generateEmailTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1e3a5f; color: #ffffff; padding: 30px 20px; text-align: center; }
    .logo { font-size: 32px; font-weight: bold; letter-spacing: 2px; margin: 0; }
    .logo .gate { color: #ffffff; }
    .logo .mate { color: #f59e0b; }
    .body { padding: 40px 30px; color: #333333; line-height: 1.6; }
    .body h2 { color: #1e3a5f; margin-top: 0; }
    .cta { display: inline-block; background: #f59e0b; color: #1e3a5f; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .cta:hover { background: #d97706; }
    .highlight { background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
    .footer { background: #f5f5f0; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
    .footer p { margin: 5px 0; }
    .unsubscribe { color: #9ca3af; font-size: 12px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo"><span class="gate">GATE</span> <span class="mate">Mate</span></h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p><strong>GateMate</strong> — Find your teammates at the airport</p>
      <p class="unsubscribe">You're receiving this email because you have a GateMate account.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send an email (async, non-blocking)
 */
async function sendEmail(to, subject, htmlContent) {
  const transport = getTransporter();
  
  if (!transport) {
    console.log(`[EMAIL] Skipping email (SMTP not configured): ${subject} to ${to}`);
    return false;
  }

  try {
    // Generate plain text from HTML content (strip tags for multipart/alternative)
    const plainText = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const fromAddr = process.env.SMTP_FROM || `GateMate <${process.env.SMTP_USER}>`;
    const mailOptions = {
      from: fromAddr,
      replyTo: fromAddr,
      to,
      subject,
      html: generateEmailTemplate(htmlContent),
      text: plainText,
      headers: {
        'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Mailer': 'GateMate',
        'Precedence': 'bulk'
      }
    };

    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL] Sent: ${subject} to ${to} (${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Failed to send: ${subject} to ${to}`, err.message);
    return false;
  }
}

/**
 * Send welcome email to new user
 */
async function sendWelcomeEmail(user, coworkerCount, appUrl) {
  const firstName = escapeHtml(user.name.split(' ')[0]);
  const domain = escapeHtml(user.email.split('@')[1]);
  const safeAppUrl = escapeHtml(appUrl);

  let coworkerText = '';
  if (coworkerCount > 0) {
    coworkerText = `<p><strong>You're joining ${escapeHtml(coworkerCount)} other teammate${coworkerCount > 1 ? 's' : ''} from @${domain} already on GateMate!</strong> 🎉</p>`;
  } else {
    coworkerText = `<p><strong>You're the first from @${domain} — invite your teammates!</strong></p>`;
  }

  const content = `
    <h2>Welcome to GateMate, ${firstName}! ✈️</h2>
    <p>We're excited to have you on board. GateMate helps you discover when you and your coworkers are at the same airport — perfect for grabbing a coffee during layovers or meeting up before a flight.</p>
    
    ${coworkerText}
    
    <div class="highlight">
      <p style="margin-top: 0;"><strong>Getting started is easy:</strong></p>
      <p>Simply forward your flight confirmation emails to <strong>flights@gatemate.app</strong> and we'll automatically track your trips and notify you when there's a layover match!</p>
    </div>
    
    <p>You can also manually add flights anytime:</p>
    <a href="${safeAppUrl}" class="cta">Go to GateMate →</a>
    
    <p>Safe travels!</p>
  `;

  await sendEmail(user.email, 'Welcome to GateMate! ✈️', content);
}

/**
 * Send weekly reminder email
 */
async function sendWeeklyReminder(user, stats, appUrl) {
  const firstName = escapeHtml(user.name.split(' ')[0]);
  const domain = escapeHtml(user.email.split('@')[1]);
  const safeAppUrl = escapeHtml(appUrl);

  let upcomingTripsHtml = '';
  if (stats.upcomingTrips && stats.upcomingTrips.length > 0) {
    upcomingTripsHtml = `
      <div class="highlight">
        <p style="margin-top: 0;"><strong>Your upcoming trips:</strong></p>
        <ul style="margin: 10px 0;">
          ${stats.upcomingTrips.map(t => `<li>${escapeHtml(t.name || 'Untitled Trip')} — ${escapeHtml(t.flightCount)} flight${t.flightCount > 1 ? 's' : ''}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  let recentBumpsHtml = '';
  if (stats.recentBumps > 0) {
    recentBumpsHtml = `<p>🎉 <strong>${escapeHtml(stats.recentBumps)} new layover match${stats.recentBumps > 1 ? 'es' : ''}</strong> found this week across the platform!</p>`;
  }

  const content = `
    <h2>Hey ${firstName}! 👋</h2>
    <p>Your weekly GateMate reminder:</p>
    
    <div class="highlight">
      <p style="margin-top: 0;"><strong>📧 Forward your upcoming flight confirmations to:</strong></p>
      <p style="font-size: 18px; margin: 10px 0;"><strong>flights@gatemate.app</strong></p>
      <p style="margin-bottom: 0;">We'll automatically track your trips and notify you of layover matches!</p>
    </div>
    
    ${upcomingTripsHtml}
    
    <p>${escapeHtml(stats.coworkerCount)} teammate${stats.coworkerCount !== 1 ? 's' : ''} from @${domain} ${stats.coworkerCount === 1 ? 'is' : 'are'} using GateMate.</p>
    
    ${recentBumpsHtml}
    
    <a href="${safeAppUrl}" class="cta">View Your Trips →</a>
    
    <p>Happy travels!</p>
  `;

  await sendEmail(user.email, 'GateMate Weekly: Forward Your Upcoming Flights ✈️', content);
}

/**
 * Send layover match notification to both users
 */
async function sendLayoverMatchEmail(userA, userB, overlap, appUrl) {
  const firstNameA = escapeHtml(userA.name.split(' ')[0]);
  const firstNameB = escapeHtml(userB.name.split(' ')[0]);
  const nameA = escapeHtml(userA.name);
  const nameB = escapeHtml(userB.name);
  const emailA = escapeHtml(userA.email);
  const emailB = escapeHtml(userB.email);
  const airportLabel = escapeHtml(overlap.airport_name || overlap.airport);
  const safeAppUrl = escapeHtml(appUrl);

  const overlapDate = new Date(overlap.overlap_start);
  const dateStr = overlapDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  const startTime = new Date(overlap.overlap_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endTime = new Date(overlap.overlap_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  const hours = Math.floor(overlap.overlap_minutes / 60);
  const minutes = overlap.overlap_minutes % 60;
  let durationStr = '';
  if (hours > 0) {
    durationStr = `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) durationStr += ` ${minutes} minutes`;
  } else {
    durationStr = `${minutes} minutes`;
  }

  // Email to User A
  const contentA = `
    <h2>🎉 Layover Match!</h2>
    <p>Great news, ${firstNameA}! You and <strong>${nameB}</strong> will both be at <strong>${airportLabel}</strong> at the same time.</p>
    
    <div class="highlight">
      <p style="margin-top: 0;"><strong>📅 ${dateStr}</strong></p>
      <p><strong>🕐 ${startTime} – ${endTime}</strong></p>
      <p style="margin-bottom: 0;">That's <strong>${durationStr}</strong> of overlap!</p>
    </div>
    
    <p>Perfect timing to grab a drink at the terminal 🍺 or catch up before your next flight!</p>
    
    <a href="${safeAppUrl}" class="cta">View Details →</a>
    
    <p>Their contact: <strong>${emailB}</strong></p>
  `;

  // Email to User B
  const contentB = `
    <h2>🎉 Layover Match!</h2>
    <p>Great news, ${firstNameB}! You and <strong>${nameA}</strong> will both be at <strong>${airportLabel}</strong> at the same time.</p>
    
    <div class="highlight">
      <p style="margin-top: 0;"><strong>📅 ${dateStr}</strong></p>
      <p><strong>🕐 ${startTime} – ${endTime}</strong></p>
      <p style="margin-bottom: 0;">That's <strong>${durationStr}</strong> of overlap!</p>
    </div>
    
    <p>Perfect timing to grab a drink at the terminal 🍺 or catch up before your next flight!</p>
    
    <a href="${safeAppUrl}" class="cta">View Details →</a>
    
    <p>Their contact: <strong>${emailA}</strong></p>
  `;

  const subject = `🎉 Layover Match! You and ${userB.name.split(' ')[0]} will both be at ${overlap.airport}`;
  const subjectB = `🎉 Layover Match! You and ${userA.name.split(' ')[0]} will both be at ${overlap.airport}`;

  await Promise.all([
    sendEmail(userA.email, subject, contentA),
    sendEmail(userB.email, subjectB, contentB)
  ]);
}

module.exports = {
  escapeHtml,
  sendEmail,
  sendWelcomeEmail,
  sendWeeklyReminder,
  sendLayoverMatchEmail
};
