const fs = require('fs');

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');

const { loadConfig } = require('./config');
const { requireAuth } = require('./middleware/auth');
const { registerAuthRoutes } = require('./routes/auth-routes');
const { registerEmergencyRoutes } = require('./routes/emergency-routes');
const { registerProtectedSystemRoutes, registerPublicSystemRoutes } = require('./routes/system-routes');
const { registerTouristRoutes } = require('./routes/tourist-routes');
const { registerTrackingRoutes } = require('./routes/tracking-routes');
const { createInitialData, ensureDataShape, syncSystem } = require('./services/data-service');
const { JsonStore } = require('./store/json-store');
const { MongoStore } = require('./store/mongo-store');
const { invalidate } = require('./utils/cache');
const { sendError } = require('./utils/http');
const { logger } = require('./utils/logger');

function createApp(options = {}) {
  const config = loadConfig(options);
  const store = options.store || createStore(config);
  const app = express();

  const context = {
    config,
    store,
    async saveData(data) {
      syncSystem(data, config);
      await store.write(data);
      await invalidate(['suraksha:stats']);
    }
  };

  app.set('surakshaContext', context);
  app.set('trust proxy', 1);
  app.use(helmet(createHelmetOptions(config)));
  app.use(cors(createCorsOptions(config)));
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/login', createLimiter(config, config.rateLimit.loginMax, 'Too many login attempts. Try again shortly.'));
  app.use('/api', createLimiter(config, config.rateLimit.apiMax, 'Too many API requests. Try again shortly.'));

  if (fs.existsSync(config.paths.frontendDir)) {
    app.use('/', express.static(config.paths.frontendDir));
  }

  registerPublicSystemRoutes(app, context);
  registerAuthRoutes(app, context);

  app.use('/api', requireAuth);

  registerProtectedSystemRoutes(app, context);
  registerTouristRoutes(app, context);
  registerTrackingRoutes(app, context);
  registerEmergencyRoutes(app, context);

  app.use('/api', (req, res) => {
    sendError(res, 404, 'API route not found.');
  });

  app.use((error, req, res, next) => {
    req.log?.error({ error }, 'Request failed');
    if (res.headersSent) return next(error);
    const status = error.status || error.statusCode || 500;
    const message = config.env.isProduction && status >= 500 ? 'Unexpected server error.' : error.message;
    return sendError(res, status, message);
  });

  return app;
}

function createStore(config) {
  if (config.env.mongoUri) return new MongoStore();
  return new JsonStore(config.paths.dataFile, createInitialData, ensureDataShape);
}

function createLimiter(config, max, message) {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      sendError(res, 429, message);
    }
  });
}

function createCorsOptions(config) {
  if (!config.env.isProduction) {
    return { origin: true };
  }

  const allowedOrigins = [config.env.frontendUrl].filter(Boolean);
  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    }
  };
}

function createHelmetOptions(config) {
  const connectSources = ["'self'", 'ws:', 'wss:'];
  if (config.env.frontendUrl) connectSources.push(config.env.frontendUrl);

  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: connectSources,
        fontSrc: ["'self'", 'https:', 'data:'],
        imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com']
      }
    }
  };
}

module.exports = {
  createApp
};
