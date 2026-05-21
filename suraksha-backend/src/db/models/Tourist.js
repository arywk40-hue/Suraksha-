const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  timestamp: String,
  riskScore: Number,
  riskLevel: String
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  relationship: String
}, { _id: false });

const touristSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  nationality: String,
  identityNumber: { type: String, required: true, unique: true, index: true },
  emergencyContacts: [emergencyContactSchema],
  blockchainHash: { type: String, required: true, unique: true, index: true },
  isActive: { type: Boolean, default: true },
  currentRisk: { type: Number, default: 0 },
  riskLevel: String,
  lastLocation: locationSchema,
  locationHistory: [locationSchema],
  registeredAt: { type: String, required: true },
  lastUpdated: String
}, { timestamps: false });

module.exports = mongoose.model('Tourist', touristSchema);
