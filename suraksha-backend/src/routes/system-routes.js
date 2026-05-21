const { syncSystem } = require('../services/data-service');
const { sendSuccess } = require('../utils/http');
const { nowIso } = require('../utils/time');

function registerSystemRoutes(app, context) {
  app.get('/api/health', (req, res) => {
    const data = context.store.read();
    sendSuccess(res, {
      status: 'ok',
      timestamp: nowIso(),
      stats: syncSystem(data, context.config)
    });
  });

  app.get('/api/config', (req, res) => {
    sendSuccess(res, {
      appName: context.config.appName,
      authConfigured: context.config.officers.length > 0,
      defaults: context.config.defaults,
      ui: context.config.ui,
      riskZones: context.config.riskZones
    });
  });

  app.get('/api/stats', (req, res) => {
    const data = context.store.read();
    const system = syncSystem(data, context.config);
    sendSuccess(res, {
      ...system,
      openEmergencies: Object.values(data.emergencies).filter((item) => item.status !== 'RESOLVED').length,
      latestBlock: data.auditLog[data.auditLog.length - 1] || null
    });
  });

  app.get('/api/audit', (req, res) => {
    const data = context.store.read();
    const limit = Math.min(Number(req.query.limit) || context.config.defaults.auditDefaultLimit, context.config.defaults.auditMaxLimit);
    sendSuccess(res, data.auditLog.slice(-limit).reverse());
  });

  app.get('/api/risk-zones', (req, res) => {
    sendSuccess(res, context.config.riskZones);
  });
}

module.exports = {
  registerSystemRoutes
};
