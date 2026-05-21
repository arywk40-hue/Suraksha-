const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  touristId: String,
  touristHash: String,
  touristName: String,
  type: { type: String, required: true },
  description: { type: String, required: true },
  location: {
    lat: Number,
    lng: Number
  },
  status: String,
  timestamp: String,
  transactionHash: String,
  lastUpdated: String
}, { timestamps: false });

module.exports = mongoose.model('Emergency', emergencySchema);
