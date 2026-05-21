const { nowIso, todayKey } = require('../utils/time');

function createInitialData() {
  return {
    tourists: {},
    emergencies: {},
    auditLog: [],
    system: {
      totalTourists: 0,
      activeTourists: 0,
      totalEmergencies: 0,
      emergenciesToday: 0,
      verifiedToday: 0,
      highRiskTourists: 0,
      blockHeight: 0,
      lastUpdated: nowIso()
    }
  };
}

function ensureDataShape(data) {
  const shaped = data && typeof data === 'object' ? data : createInitialData();
  shaped.tourists = shaped.tourists && typeof shaped.tourists === 'object' ? shaped.tourists : {};
  shaped.emergencies = shaped.emergencies && typeof shaped.emergencies === 'object' ? shaped.emergencies : {};
  shaped.auditLog = Array.isArray(shaped.auditLog) ? shaped.auditLog : [];
  shaped.system = shaped.system && typeof shaped.system === 'object' ? shaped.system : {};
  return shaped;
}

function syncSystem(data, config) {
  const tourists = Object.values(data.tourists);
  const emergencies = Object.values(data.emergencies);
  const currentDay = todayKey();
  const highThreshold = config.risk.highThreshold;

  data.system.totalTourists = tourists.length;
  data.system.activeTourists = tourists.filter((tourist) => tourist.isActive).length;
  data.system.totalEmergencies = emergencies.length;
  data.system.emergenciesToday = emergencies.filter((item) => todayKey(new Date(item.timestamp)) === currentDay).length;
  data.system.verifiedToday = tourists.filter((tourist) => todayKey(new Date(tourist.registeredAt)) === currentDay).length;
  data.system.highRiskTourists = tourists.filter((tourist) => (tourist.currentRisk || 0) >= highThreshold).length;
  data.system.blockHeight = data.auditLog.length;
  data.system.totalBlocks = data.auditLog.length;
  data.system.lastUpdated = data.system.lastUpdated || nowIso();
  return data.system;
}

function sortNewest(items, field = 'timestamp') {
  return [...items].sort((a, b) => new Date(b[field] || 0) - new Date(a[field] || 0));
}

function publicTourist(tourist, config) {
  if (!tourist) return null;
  return {
    id: tourist.id,
    name: tourist.name,
    phone: tourist.phone,
    nationality: tourist.nationality,
    identityNumber: tourist.identityNumber,
    emergencyContacts: tourist.emergencyContacts || [],
    blockchainHash: tourist.blockchainHash,
    isActive: tourist.isActive,
    registeredAt: tourist.registeredAt,
    registrationTime: tourist.registeredAt,
    lastLocation: tourist.lastLocation || null,
    currentRisk: tourist.currentRisk || 0,
    riskLevel: tourist.riskLevel || 'LOW',
    lastUpdated: tourist.lastUpdated || tourist.registeredAt,
    source: config.ledger.sourceLabel
  };
}

function publicEmergency(emergency, config) {
  return {
    id: emergency.id,
    touristId: emergency.touristId || null,
    touristHash: emergency.touristHash || null,
    touristName: emergency.touristName || config.defaults.unknownTouristName,
    type: emergency.type,
    description: emergency.description,
    location: emergency.location,
    status: emergency.status,
    timestamp: emergency.timestamp,
    transactionHash: emergency.transactionHash
  };
}

module.exports = {
  createInitialData,
  ensureDataShape,
  publicEmergency,
  publicTourist,
  sortNewest,
  syncSystem
};
