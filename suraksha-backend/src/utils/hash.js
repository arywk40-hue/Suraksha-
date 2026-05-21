const crypto = require('crypto');

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function createToken(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function generateId(prefix, collection) {
  let id = '';
  do {
    id = `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  } while (collection && collection[id]);
  return id;
}

module.exports = {
  createToken,
  generateId,
  hashPayload
};
