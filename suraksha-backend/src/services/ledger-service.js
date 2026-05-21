const { hashPayload } = require('../utils/hash');
const { nowIso } = require('../utils/time');

function addBlock(data, config, type, payload) {
  const previousBlock = data.auditLog[data.auditLog.length - 1];
  const block = {
    height: data.auditLog.length + 1,
    type,
    timestamp: nowIso(),
    previousHash: previousBlock ? previousBlock.hash : config.ledger.genesisHash,
    payloadHash: hashPayload(payload)
  };
  block.hash = hashPayload(block);
  data.auditLog.push(block);
  data.system.blockHeight = block.height;
  data.system.lastUpdated = block.timestamp;
  return block;
}

module.exports = {
  addBlock
};
