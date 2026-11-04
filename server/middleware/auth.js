const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Auth] JWT_SECRET must be set in production. Refusing to start.');
  }
  console.warn('[Auth] WARNING: JWT_SECRET is not set; using an ephemeral generated secret. Tokens will be invalidated on restart.');
  return crypto.randomBytes(64).toString('hex');
}

const SECRET = resolveSecret();

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, SECRET);
    
    // Check token version for revocation support
    const db = require('../db');
    const user = db.prepare('SELECT token_version FROM users WHERE id = ?').get(payload.id);
    if (!user || (payload.token_version !== undefined && user.token_version !== payload.token_version)) {
      return res.status(401).json({ error: 'Token revoked' });
    }
    
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  const db = require('../db');
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, SECRET };
