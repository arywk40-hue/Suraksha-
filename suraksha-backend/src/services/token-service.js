const crypto = require('crypto');

const jwt = require('jsonwebtoken');

let runtimeSecret;

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!runtimeSecret) runtimeSecret = crypto.randomBytes(32).toString('hex');
  return runtimeSecret;
}

function signOfficer(officer, config) {
  return jwt.sign(
    {
      sub: officer.username,
      name: officer.name || officer.username,
      role: officer.role || config.auth.defaultRole
    },
    getJwtSecret(),
    {
      expiresIn: config.auth.tokenExpiry,
      issuer: config.appName
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signOfficer,
  verifyToken
};
