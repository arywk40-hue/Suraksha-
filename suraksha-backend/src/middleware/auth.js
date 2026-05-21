const { verifyToken } = require('../services/token-service');
const { sendError } = require('../utils/http');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return sendError(res, 401, 'A valid officer session is required.');
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return sendError(res, 401, 'Officer session is invalid or expired.');
  }
}

module.exports = {
  requireAuth
};
