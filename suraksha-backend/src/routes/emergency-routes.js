const { publicEmergency, sortNewest } = require('../services/data-service');
const { addBlock } = require('../services/ledger-service');
const { generateId } = require('../utils/hash');
const { sendError, sendSuccess } = require('../utils/http');
const { nowIso } = require('../utils/time');
const { parseLocation, stringValue } = require('../utils/validation');

function registerEmergencyRoutes(app, context) {
  app.post('/api/recordEmergency', (req, res) => {
    const emergencyType = stringValue(req.body.emergencyType || req.body.type).toUpperCase();
    const description = stringValue(req.body.description);
    const touristHash = stringValue(req.body.touristHash || req.body.hash);
    const requestedTouristId = stringValue(req.body.touristId);
    const location = parseLocation(req.body);
    const errors = [];

    if (!context.config.ui.emergencyTypes.includes(emergencyType)) errors.push('Emergency type is not supported.');
    if (description.length < context.config.validation.minimumEmergencyDescriptionLength) errors.push('Emergency description is too short.');
    if (!location) errors.push('Emergency location is required.');
    if (errors.length) return sendError(res, 400, 'Emergency validation failed.', errors);

    const data = context.store.read();
    const tourist =
      (requestedTouristId && data.tourists[requestedTouristId]) ||
      (touristHash && Object.values(data.tourists).find((item) => item.blockchainHash === touristHash));

    if ((requestedTouristId || touristHash) && !tourist) {
      return sendError(res, 404, 'The supplied tourist identifier could not be verified.');
    }

    const emergency = createEmergency(data, context, {
      tourist,
      touristHash,
      type: emergencyType,
      description,
      location
    });
    const block = addBlock(data, context.config, 'EMERGENCY_RECORDED', emergency);
    emergency.transactionHash = block.hash;
    data.emergencies[emergency.id] = emergency;
    context.saveData(data);

    sendSuccess(res, {
      emergencyId: emergency.id,
      transactionHash: block.hash,
      blockHeight: block.height,
      emergency: publicEmergency(emergency, context.config),
      safetyAlert: 'Emergency recorded and available for dispatch review.'
    }, 201);
  });

  app.post('/api/sendSOS/:id', (req, res) => {
    const data = context.store.read();
    const tourist = data.tourists[req.params.id];
    if (!tourist) return sendError(res, 404, 'Tourist not found.');

    const location = parseLocation(req.body) || tourist.lastLocation;
    if (!location) return sendError(res, 400, 'SOS location is required. Send browser location or update live tracking first.');

    const emergency = createEmergency(data, context, {
      tourist,
      type: 'SOS',
      description: 'SOS alert triggered from live tracking.',
      location
    });
    const block = addBlock(data, context.config, 'SOS_TRIGGERED', emergency);
    emergency.transactionHash = block.hash;
    data.emergencies[emergency.id] = emergency;
    context.saveData(data);

    sendSuccess(res, {
      emergencyId: emergency.id,
      transactionHash: block.hash,
      emergency: publicEmergency(emergency, context.config)
    }, 201);
  });

  app.get('/api/emergencies', (req, res) => {
    const data = context.store.read();
    sendSuccess(res, sortNewest(Object.values(data.emergencies)).map((item) => publicEmergency(item, context.config)));
  });

  app.patch('/api/emergencies/:id', (req, res) => {
    const status = stringValue(req.body.status).toUpperCase();
    if (!context.config.ui.emergencyStatuses.includes(status)) return sendError(res, 400, 'Unsupported emergency status.');

    const data = context.store.read();
    const emergency = data.emergencies[req.params.id];
    if (!emergency) return sendError(res, 404, 'Emergency not found.');

    emergency.status = status;
    emergency.lastUpdated = nowIso();
    const block = addBlock(data, context.config, 'EMERGENCY_STATUS_UPDATED', { emergencyId: emergency.id, status });
    emergency.transactionHash = block.hash;
    context.saveData(data);

    sendSuccess(res, publicEmergency(emergency, context.config));
  });
}

function createEmergency(data, context, input) {
  const id = generateId(context.config.ids.emergencyPrefix, data.emergencies);
  return {
    id,
    touristId: input.tourist ? input.tourist.id : null,
    touristHash: input.tourist ? input.tourist.blockchainHash : input.touristHash || null,
    touristName: input.tourist ? input.tourist.name : context.config.defaults.unknownTouristName,
    type: input.type,
    description: input.description,
    location: input.location,
    status: context.config.ui.emergencyStatuses[0],
    timestamp: nowIso()
  };
}

module.exports = {
  registerEmergencyRoutes
};
