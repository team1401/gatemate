const { ImapFlow } = require('imapflow');
const db = require('../db');
const { extractFlights } = require('./flightExtractor');

const POLL_INTERVAL = 60000; // 60 seconds
let isPolling = false;

function getConfig() {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: process.env.IMAP_TLS !== 'false',
    auth: { user, pass },
    logger: false
  };
}

function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getEmailBody(parsed) {
  // Prefer text/plain
  if (parsed.text) return parsed.text;
  // Fall back to HTML stripped
  if (parsed.html) return stripHtml(parsed.html);
  // Check text content from parts
  if (parsed.textAsHtml) return stripHtml(parsed.textAsHtml);
  return '';
}

function getSenderEmail(parsed) {
  if (parsed.from?.value?.[0]?.address) return parsed.from.value[0].address.toLowerCase();
  if (parsed.from?.text) {
    const match = parsed.from.text.match(/<([^>]+)>/);
    if (match) return match[1].toLowerCase();
    return parsed.from.text.toLowerCase();
  }
  return null;
}

async function processEmail(parsed) {
  const senderEmail = getSenderEmail(parsed);
  if (!senderEmail) {
    console.log('[EmailPoller] Could not extract sender email, skipping');
    return;
  }

  // Check if already processed (deduplication by Message-ID)
  const messageId = parsed.messageId;
  if (messageId) {
    const existing = db.prepare('SELECT message_id FROM processed_emails WHERE message_id = ?').get(messageId);
    if (existing) {
      console.log(`[EmailPoller] Message ${messageId} already processed, skipping`);
      return;
    }
  }

  // Find user by email — check both users table and user_emails table
  let user = db.prepare('SELECT id, email FROM users WHERE LOWER(email) = ?').get(senderEmail);
  if (!user) {
    const emailEntry = db.prepare('SELECT user_id FROM user_emails WHERE LOWER(email) = ?').get(senderEmail);
    if (emailEntry) {
      user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(emailEntry.user_id);
    }
  }
  if (!user) {
    console.log(`[EmailPoller] No user found for ${senderEmail}, skipping`);
    return;
  }

  const body = getEmailBody(parsed);
  if (!body || body.length < 20) {
    console.log(`[EmailPoller] Email body too short from ${senderEmail}, skipping`);
    return;
  }

  console.log(`[EmailPoller] Processing email from ${senderEmail} (user ${user.id})`);

  try {
    const flights = await extractFlights(body);
    if (flights.length === 0) {
      console.log(`[EmailPoller] No flights extracted from email by ${senderEmail}`);
      return;
    }

    // Generate trip name from first flight
    const first = flights[0];
    const tripName = `${first.departure_airport || '???'} → ${flights[flights.length - 1].arrival_airport || '???'} (${first.date || 'unknown date'})`;

    db.prepare(`
      INSERT INTO pending_trips (user_id, source_email, raw_email_text, extracted_flights, trip_name, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(user.id, senderEmail, body.slice(0, 10000), JSON.stringify(flights), tripName);

    // Mark as processed
    if (messageId) {
      db.prepare('INSERT OR IGNORE INTO processed_emails (message_id) VALUES (?)').run(messageId);
    }

    console.log(`[EmailPoller] Created pending trip for user ${user.id}: ${tripName} (${flights.length} flights)`);
  } catch (err) {
    console.error(`[EmailPoller] Error processing email from ${senderEmail}:`, err.message);
  }
}

async function pollMailbox() {
  if (isPolling) { console.log('[EmailPoller] Already polling, skipping'); return; }
  isPolling = true;
  const config = getConfig();
  if (!config) { isPolling = false; return; }

  let client;
  try {
    client = new ImapFlow(config);
    await client.connect();
    
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Search for unseen messages
      const messages = client.fetch({ seen: false }, { 
        source: true, 
        envelope: true,
        bodyStructure: true 
      });

      for await (const msg of messages) {
        try {
          const { simpleParser } = require('mailparser');
          const parsed = await simpleParser(msg.source);
          await processEmail(parsed);
          
          // Mark as seen AFTER successful processing
          await client.messageFlagsAdd(msg.seq, ['\\Seen'], { uid: false });
        } catch (err) {
          console.error('[EmailPoller] Error processing message:', err.message);
          // Email remains unseen, will be retried next poll
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error('[EmailPoller] Poll error:', err.message);
    if (client) {
      try { await client.logout(); } catch (e) {}
    }
  } finally {
    isPolling = false;
  }
}

function startPolling() {
  const config = getConfig();
  if (!config) {
    console.log('[EmailPoller] IMAP not configured — email ingestion disabled');
    return;
  }

  console.log(`[EmailPoller] Starting email polling (every ${POLL_INTERVAL / 1000}s) for ${config.auth.user}`);
  
  // Initial poll after 5 second delay
  setTimeout(() => {
    pollMailbox();
    setInterval(pollMailbox, POLL_INTERVAL);
  }, 5000);
}

module.exports = { startPolling };
