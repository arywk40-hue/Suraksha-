const bcrypt = require('bcryptjs');

const { signOfficer } = require('./token-service');

function withoutPassword(officer) {
  return {
    username: officer.username,
    name: officer.name || officer.username,
    role: officer.role,
    expiresIn: officer.expiresIn
  };
}

function authenticate(config, username, password) {
  const officer = config.officers.find((item) => item.username === username && passwordMatches(item, password));
  if (!officer) return null;

  const user = withoutPassword({
    ...officer,
    expiresIn: config.auth.tokenExpiry
  });

  return {
    token: signOfficer(officer, config),
    user
  };
}

function passwordMatches(officer, candidate) {
  const stored = officer.passwordHash || officer.password;
  if (!stored) return false;

  if (/^\$2[aby]\$/.test(stored)) {
    return bcrypt.compareSync(candidate, stored);
  }

  return stored === candidate;
}

module.exports = {
  authenticate
};
