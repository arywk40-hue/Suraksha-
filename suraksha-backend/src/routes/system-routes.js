const { syncSystem } = require('../services/data-service');
const { asyncHandler } = require('../middleware/async-handler');
const { cached } = require('../utils/cache');
const { sendSuccess } = require('../utils/http');
const { nowIso } = require('../utils/time');

function registerPublicSystemRoutes(app, context) {
  app.get('/api/health', asyncHandler(async (req, res) => {
    const data = await context.store.read();
    sendSuccess(res, {
      status: 'ok',
      timestamp: nowIso(),
      storage: context.config.env.mongoUri ? 'mongodb' : 'json',
      stats: syncSystem(data, context.config)
    });
  }));

  app.get('/api/config', (req, res) => {
    sendSuccess(res, {
      appName: context.config.appName,
      environment: context.config.env.isProduction ? 'production' : 'development',
      authConfigured: context.config.officers.length > 0,
      defaults: context.config.defaults,
      risk: context.config.risk,
      ui: context.config.ui,
      riskZones: context.config.riskZones
    });
  });
}

function registerProtectedSystemRoutes(app, context) {
  app.get('/api/stats', asyncHandler(async (req, res) => {
    const stats = await cached('suraksha:stats', 15, async () => {
      const data = await context.store.read();
      const system = syncSystem(data, context.config);
      const resolvedStatus = context.config.ui.terminalEmergencyStatus;

      return {
        ...system,
        openEmergencies: Object.values(data.emergencies).filter((item) => item.status !== resolvedStatus).length,
        latestBlock: data.auditLog[data.auditLog.length - 1] || null
      };
    });

    sendSuccess(res, stats);
  }));

  app.get('/api/audit', asyncHandler(async (req, res) => {
    const data = await context.store.read();
    const limit = Math.min(Number(req.query.limit) || context.config.defaults.auditDefaultLimit, context.config.defaults.auditMaxLimit);
    sendSuccess(res, data.auditLog.slice(-limit).reverse());
  }));

  app.get('/api/risk-zones', (req, res) => {
    sendSuccess(res, context.config.riskZones);
  });
}

module.exports = {
  registerProtectedSystemRoutes,
  registerPublicSystemRoutes
};
