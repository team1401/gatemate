const { ImapFlow } = require('imapflow');

/**
 * Delete an email from the IMAP inbox by matching the source_email sender
 * and the pending_trip's raw_email_text (first 100 chars as fingerprint).
 * 
 * We match by finding the processed_emails message_id associated with this
 * pending trip's creation time, then delete that IMAP message.
 */
async function deleteEmailFromInbox(messageIdToFind) {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;
  if (!host || !user || !pass || !messageIdToFind) return false;

  let client;
  try {
    client = new ImapFlow({
      host,
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: process.env.IMAP_TLS !== 'false',
      auth: { user, pass },
      logger: false,
      socketTimeout: 15000,
      greetingTimeout: 10000
    });

    client.on('error', (err) => {
      console.error('[EmailDeleter] IMAP error:', err.code || err.message);
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Find the message by Message-ID header
      for await (const msg of client.fetch('1:*', { envelope: true, uid: true })) {
        if (msg.envelope?.messageId === messageIdToFind) {
          await client.messageDelete([msg.uid], { uid: true });
          console.log(`[EmailDeleter] Deleted email ${messageIdToFind} from inbox`);
          lock.release();
          await client.logout();
          return true;
        }
      }
      console.log(`[EmailDeleter] Email ${messageIdToFind} not found in inbox (may already be deleted)`);
    } finally {
      try { lock.release(); } catch (e) {}
    }

    await client.logout();
  } catch (err) {
    console.error('[EmailDeleter] Error:', err.code || err.message);
    if (client) {
      try { await client.logout(); } catch (e) {}
    }
  }
  return false;
}

module.exports = { deleteEmailFromInbox };
