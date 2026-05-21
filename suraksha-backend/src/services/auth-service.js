const { createToken } = require('../utils/hash');

function withoutPassword(officer) {
  return {
    name: officer.name || officer.username,
    role: officer.role
  };
}

function authenticate(config, username, password) {
  const officer = config.officers.find((item) => item.username === username && item.password === password);
  if (!officer) return null;
  return {
    token: createToken(config.auth.tokenPrefix),
    user: withoutPassword(officer)
  };
}

module.exports = {
  authenticate
};
