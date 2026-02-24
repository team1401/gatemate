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
    logger: false,
    socketTimeout: 30000,   // 30s socket timeout (prevent infinite hangs)
    greetingTimeout: 15000, // 15s greeting timeout
    emitLogs: false
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
  if (parsed.text) return parsed.text;
  if (parsed.html) return stripHtml(parsed.html);
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

function isAlreadyProcessed(messageId) {
  if (!messageId) return false;
  const existing = db.prepare('SELECT message_id FROM processed_emails WHERE message_id = ?').get(messageId);
  return !!existing;
}

function markProcessed(messageId) {
  if (messageId) {
    db.prepare('INSERT OR IGNORE INTO processed_emails (message_id) VALUES (?)').run(messageId);
  }
}

async function processEmail(parsed) {
  const senderEmail = getSenderEmail(parsed);
  if (!senderEmail) {
    console.log('[EmailPoller] Could not extract sender email, skipping');
    return;
  }

  const messageId = parsed.messageId;
  if (isAlreadyProcessed(messageId)) {
    console.log(`[EmailPoller] Message ${messageId} already processed, skipping`);
    return;
  }

  // Skip bounce/daemon emails
  if (senderEmail.includes('mailer-daemon') || senderEmail.includes('postmaster')) {
    console.log(`[EmailPoller] Skipping bounce email from ${senderEmail}`);
    markProcessed(messageId);
    return;
  }

  // Find user by email
  let user = db.prepare('SELECT id, email FROM users WHERE LOWER(email) = ?').get(senderEmail);
  if (!user) {
    const emailEntry = db.prepare('SELECT user_id FROM user_emails WHERE LOWER(email) = ?').get(senderEmail);
    if (emailEntry) {
      user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(emailEntry.user_id);
    }
  }
  if (!user) {
    console.log(`[EmailPoller] No user found for ${senderEmail}, skipping`);
    markProcessed(messageId); // Don't re-process emails from unknown senders
    return;
  }

  const body = getEmailBody(parsed);
  if (!body || body.length < 20) {
    console.log(`[EmailPoller] Email body too short from ${senderEmail}, skipping`);
    markProcessed(messageId);
    return;
  }

  console.log(`[EmailPoller] Processing email from ${senderEmail} (user ${user.id})`);

  try {
    const flights = await extractFlights(body);
    if (flights.length === 0) {
      console.log(`[EmailPoller] No flights extracted from email by ${senderEmail}`);
      markProcessed(messageId);
      return;
    }

    const first = flights[0];
    const tripName = `${first.departure_airport || '???'} → ${flights[flights.length - 1].arrival_airport || '???'} (${first.date || 'unknown date'})`;

    db.prepare(`
      INSERT INTO pending_trips (user_id, source_email, raw_email_text, extracted_flights, trip_name, status, imap_message_id)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(user.id, senderEmail, body.slice(0, 10000), JSON.stringify(flights), tripName, messageId || null);

    markProcessed(messageId);
    console.log(`[EmailPoller] Created pending trip for user ${user.id}: ${tripName} (${flights.length} flights)`);
  } catch (err) {
    console.error(`[EmailPoller] Error processing email from ${senderEmail}:`, err.message);
    // Don't mark as processed on error — retry next poll
  }
}

async function pollMailbox() {
  if (isPolling) { return; } // Silent skip — no log spam
  isPolling = true;
  const config = getConfig();
  if (!config) { isPolling = false; return; }

  let client;
  try {
    client = new ImapFlow(config);
    
    // Catch connection-level errors to prevent process crash
    client.on('error', (err) => {
      console.error('[EmailPoller] IMAP connection error:', err.code || err.message);
    });

    await client.connect();
    
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Fetch ALL messages (not just unseen) — we use processed_emails table for dedup
      // Fetch newest first by using reverse sequence
      const status = await client.status('INBOX', { messages: true });
      const total = status.messages;
      
      if (total === 0) {
        console.log('[EmailPoller] Inbox empty');
        lock.release();
        await client.logout();
        isPolling = false;
        return;
      }

      // Process newest 10 messages first (most likely to be new)
      const startSeq = Math.max(1, total - 9);
      const range = `${startSeq}:${total}`;
      
      const messages = client.fetch(range, { 
        source: true, 
        envelope: true 
      });

      let processedCount = 0;
      let skippedCount = 0;
      
      for await (const msg of messages) {
        const msgId = msg.envelope?.messageId;
        
        // Quick skip if already processed (before downloading full body)
        if (isAlreadyProcessed(msgId)) {
          skippedCount++;
          continue;
        }

        try {
          const { simpleParser } = require('mailparser');
          const parsed = await simpleParser(msg.source);
          await processEmail(parsed);
          processedCount++;
          
          // Mark as seen in IMAP
          try {
            await client.messageFlagsAdd(msg.seq, ['\\Seen'], { uid: false });
          } catch (e) {
            // Non-critical — just means it stays unseen
          }
        } catch (err) {
          console.error('[EmailPoller] Error processing message:', err.message);
        }
      }
      
      if (processedCount > 0 || skippedCount < total) {
        console.log(`[EmailPoller] Poll complete: ${processedCount} new, ${skippedCount} skipped`);
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error('[EmailPoller] Poll error:', err.code || err.message);
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

  // Catch unhandled IMAP errors to prevent process crash
  process.on('uncaughtException', (err) => {
    if (err.code === 'ETIMEOUT' || err.message?.includes('IMAP')) {
      console.error('[EmailPoller] Recovered from IMAP crash:', err.code || err.message);
      isPolling = false;
    } else {
      console.error('[FATAL]', err);
      process.exit(1);
    }
  });

  console.log(`[EmailPoller] Starting email polling (every ${POLL_INTERVAL / 1000}s) for ${config.auth.user}`);
  
  // Initial poll after 5 second delay
  setTimeout(() => {
    pollMailbox();
    setInterval(pollMailbox, POLL_INTERVAL);
  }, 5000);
}

module.exports = { startPolling };
