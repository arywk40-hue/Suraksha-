const { body, param } = require('express-validator');

const { asyncHandler } = require('../middleware/async-handler');
const { validate } = require('../middleware/validate');
const { publicEmergency, sortNewest } = require('../services/data-service');
const { addBlock } = require('../services/ledger-service');
const { dispatchSosAlerts } = require('../services/alerts');
const { generateId } = require('../utils/hash');
const { sendError, sendSuccess } = require('../utils/http');
const { nowIso } = require('../utils/time');
const { parseLocation, stringValue } = require('../utils/validation');

function registerEmergencyRoutes(app, context) {
  app.post(
    '/api/recordEmergency',
    [
      body().custom((value) => {
        const emergencyType = stringValue(value.emergencyType || value.type).toUpperCase();
        if (!context.config.ui.emergencyTypes.includes(emergencyType)) throw new Error('Emergency type is not supported.');
        return true;
      }),
      body('description').trim().isLength({ min: context.config.validation.minimumEmergencyDescriptionLength }).withMessage('Emergency description is too short.'),
      body().custom((value) => {
        if (!parseLocation(value)) throw new Error('Emergency location is required.');
        return true;
      })
    ],
    validate,
    asyncHandler(async (req, res) => {
      const emergencyType = stringValue(req.body.emergencyType || req.body.type).toUpperCase();
      const description = stringValue(req.body.description);
      const touristHash = stringValue(req.body.touristHash || req.body.hash);
      const requestedTouristId = stringValue(req.body.touristId);
      const location = parseLocation(req.body);

      const data = await context.store.read();
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
      const block = await addBlock(data, context.config, 'EMERGENCY_RECORDED', emergency);
      emergency.transactionHash = block.hash;
      data.emergencies[emergency.id] = emergency;
      await context.saveData(data);

      const response = {
        emergencyId: emergency.id,
        transactionHash: block.hash,
        blockHeight: block.height,
        emergency: publicEmergency(emergency, context.config),
        safetyAlert: context.config.ui.emergencyRecordedMessage
      };

      req.app.get('io')?.to('officers').emit('emergency:update', response);

      return sendSuccess(res, response, 201);
    })
  );

  app.post(
    '/api/sendSOS/:id',
    [
      param('id').trim().notEmpty().withMessage('Tourist ID is required.')
    ],
    validate,
    asyncHandler(async (req, res) => {
      const data = await context.store.read();
      const tourist = data.tourists[req.params.id];
      if (!tourist) return sendError(res, 404, 'Tourist not found.');

      const location = parseLocation(req.body) || tourist.lastLocation;
      if (!location) return sendError(res, 400, 'SOS location is required. Send browser location or update live tracking first.');

      const emergency = createEmergency(data, context, {
        tourist,
        type: context.config.ui.sosType,
        description: context.config.ui.sosDescription,
        location
      });
      const block = await addBlock(data, context.config, 'SOS_TRIGGERED', emergency);
      emergency.transactionHash = block.hash;
      data.emergencies[emergency.id] = emergency;
      await context.saveData(data);

      const alertResult = await dispatchSosAlerts(tourist, emergency);
      const response = {
        emergencyId: emergency.id,
        transactionHash: block.hash,
        blockHeight: block.height,
        emergency: publicEmergency(emergency, context.config),
        alerts: alertResult
      };

      const io = req.app.get('io');
      io?.to('officers').emit('sos:alert', response);
      io?.to(`tourist:${tourist.id}`).emit('sos:alert', response);

      return sendSuccess(res, response, 201);
    })
  );

  app.get('/api/emergencies', asyncHandler(async (req, res) => {
    const data = await context.store.read();
    sendSuccess(res, sortNewest(Object.values(data.emergencies)).map((item) => publicEmergency(item, context.config)));
  }));

  app.patch(
    '/api/emergencies/:id',
    [
      param('id').trim().notEmpty().withMessage('Emergency ID is required.'),
      body('status').trim().notEmpty().withMessage('Emergency status is required.')
    ],
    validate,
    asyncHandler(async (req, res) => {
      const status = stringValue(req.body.status).toUpperCase();
      if (!context.config.ui.emergencyStatuses.includes(status)) return sendError(res, 400, 'Unsupported emergency status.');

      const data = await context.store.read();
      const emergency = data.emergencies[req.params.id];
      if (!emergency) return sendError(res, 404, 'Emergency not found.');

      emergency.status = status;
      emergency.lastUpdated = nowIso();
      const block = await addBlock(data, context.config, 'EMERGENCY_STATUS_UPDATED', { emergencyId: emergency.id, status });
      emergency.transactionHash = block.hash;
      await context.saveData(data);

      const response = publicEmergency(emergency, context.config);
      req.app.get('io')?.to('officers').emit('emergency:update', response);

      return sendSuccess(res, response);
    })
  );
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
