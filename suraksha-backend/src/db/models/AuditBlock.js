const mongoose = require('mongoose');

const auditBlockSchema = new mongoose.Schema({
  height: { type: Number, required: true, unique: true, index: true },
  type: String,
  timestamp: String,
  previousHash: String,
  payloadHash: String,
  hash: { type: String, required: true, unique: true },
  anchor: {
    anchored: Boolean,
    provider: String,
    ipfsHash: String,
    gatewayUrl: String,
    cid: String,
    url: String,
    error: String
  }
}, { timestamps: false });

module.exports = mongoose.model('AuditBlock', auditBlockSchema);
