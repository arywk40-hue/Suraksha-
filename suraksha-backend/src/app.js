const fs = require('fs');

const cors = require('cors');
const express = require('express');

const { loadConfig } = require('./config');
const { registerAuthRoutes } = require('./routes/auth-routes');
const { registerEmergencyRoutes } = require('./routes/emergency-routes');
const { registerSystemRoutes } = require('./routes/system-routes');
const { registerTouristRoutes } = require('./routes/tourist-routes');
const { registerTrackingRoutes } = require('./routes/tracking-routes');
const { createInitialData, ensureDataShape, syncSystem } = require('./services/data-service');
const { JsonStore } = require('./store/json-store');
const { sendError } = require('./utils/http');

function createApp(options = {}) {
  const config = loadConfig(options);
  const store = new JsonStore(config.paths.dataFile, createInitialData, ensureDataShape);
  const app = express();

  const context = {
    config,
    store,
    saveData(data) {
      syncSystem(data, config);
      store.write(data);
    }
  };

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  if (fs.existsSync(config.paths.frontendDir)) {
    app.use('/', express.static(config.paths.frontendDir));
  }

  registerSystemRoutes(app, context);
  registerAuthRoutes(app, context);
  registerTouristRoutes(app, context);
  registerTrackingRoutes(app, context);
  registerEmergencyRoutes(app, context);

  app.use('/api', (req, res) => {
    sendError(res, 404, 'API route not found.');
  });

  return app;
}

module.exports = {
  createApp
};
