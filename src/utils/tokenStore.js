const crypto = require('crypto');

class TokenStore {
  constructor() {
    this.tokens = new Map(); // token -> { email, expiresAt }
    this.rateLimit = new Map(); // email -> lastSentTimestamp
    this.RATE_LIMIT_INTERVAL = 60 * 1000; // 1 minute rate limit per email
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  storeToken(email, expiresInMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();

    // Rate limiting: check last sent time for this email
    const lastSent = this.rateLimit.get(email);
    if (lastSent && now - lastSent < this.RATE_LIMIT_INTERVAL) {
      throw new Error('Too many requests. Please wait before requesting another verification email.');
    }

    const token = this.generateToken();
    const expiresAt = now + expiresInMs;
    this.tokens.set(token, { email, expiresAt });
    this.rateLimit.set(email, now);

    return token;
  }

  validateToken(token) {
    const record = this.tokens.get(token);
    if (!record) {
      return { valid: false, reason: 'Invalid token' };
    }
    if (Date.now() > record.expiresAt) {
      this.tokens.delete(token);
      return { valid: false, reason: 'Token expired' };
    }
    return { valid: true, email: record.email };
  }

  invalidateToken(token) {
    this.tokens.delete(token);
  }
}

module.exports = new TokenStore();
