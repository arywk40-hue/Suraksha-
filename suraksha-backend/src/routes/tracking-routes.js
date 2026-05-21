const { publicTourist } = require('../services/data-service');
const { addBlock } = require('../services/ledger-service');
const { computeRisk } = require('../services/risk-service');
const { sendError, sendSuccess } = require('../utils/http');
const { nowIso } = require('../utils/time');
const { parseLocation } = require('../utils/validation');

function registerTrackingRoutes(app, context) {
  app.post('/api/liveLocation/:id', (req, res) => {
    const location = parseLocation(req.body);
    if (!location) return sendError(res, 400, 'A valid latitude and longitude are required.');

    const data = context.store.read();
    const tourist = data.tourists[req.params.id];
    if (!tourist) return sendError(res, 404, 'Tourist not found.');

    const assessment = computeRisk(location, context.config, context.config.riskZones);
    const timestamp = nowIso();
    tourist.lastLocation = location;
    tourist.currentRisk = assessment.riskScore;
    tourist.riskLevel = assessment.riskLevel;
    tourist.lastUpdated = timestamp;
    tourist.locationHistory = Array.isArray(tourist.locationHistory) ? tourist.locationHistory : [];
    tourist.locationHistory.push({ ...location, timestamp, riskScore: assessment.riskScore, riskLevel: assessment.riskLevel });
    tourist.locationHistory = tourist.locationHistory.slice(-context.config.defaults.locationHistoryLimit);

    const block = addBlock(data, context.config, 'LOCATION_UPDATED', {
      touristId: tourist.id,
      location,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel
    });
    context.saveData(data);

    sendSuccess(res, {
      ...assessment,
      location,
      tourist: publicTourist(tourist, context.config),
      transactionHash: block.hash,
      blockHeight: block.height
    });
  });
}

module.exports = {
  registerTrackingRoutes
};
