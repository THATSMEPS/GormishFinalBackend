const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseHandler');
const config = require('../config/environment');

const tokenBlacklist = new Set();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(res, 'No authorization token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return errorResponse(res, 'Token has been invalidated', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401, error);
  }
};

module.exports = {
  authenticateToken,
  tokenBlacklist
};