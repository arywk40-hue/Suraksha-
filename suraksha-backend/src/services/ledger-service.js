const { hashPayload } = require('../utils/hash');
const { nowIso } = require('../utils/time');
const { anchorAuditBlock } = require('./blockchain');

async function addBlock(data, config, type, payload) {
  const previousBlock = data.auditLog[data.auditLog.length - 1];
  const block = {
    height: data.auditLog.length + 1,
    type,
    timestamp: nowIso(),
    previousHash: previousBlock ? previousBlock.hash : config.ledger.genesisHash,
    payloadHash: hashPayload(payload)
  };
  block.hash = hashPayload(block);
  block.anchor = await anchorAuditBlock(block, config);
  data.auditLog.push(block);
  data.system.blockHeight = block.height;
  data.system.lastUpdated = block.timestamp;
  return block;
}

module.exports = {
  addBlock
};
