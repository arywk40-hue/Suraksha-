const path = require('path');
const http = require('http');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Server } = require('socket.io');

const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { connectDb } = require('./db/mongoose');
const { verifyToken } = require('./services/token-service');
const { logger } = require('./utils/logger');

async function start() {
  const config = loadConfig();

  if (config.env.mongoUri) {
    await connectDb(config.env.mongoUri);
    logger.info('MongoDB connected');
  }

  if (config.env.isProduction && !process.env.JWT_SECRET) {
    logger.warn('JWT_SECRET is not set. Sessions will reset whenever the process restarts.');
  }

  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.env.isProduction ? [config.env.frontendUrl].filter(Boolean) : true
    }
  });

  app.set('io', io);

  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token || '');
      next();
    } catch (error) {
      next(new Error('Officer socket session is invalid or expired.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:officer', () => socket.join('officers'));
    socket.on('join:tourist', (touristId) => {
      if (touristId) socket.join(`tourist:${touristId}`);
    });
  });

  const port = Number(process.env.PORT || config.server.port);
  server.listen(port, () => {
    logger.info({ port }, `${config.appName} server running`);
  });
}

start().catch((error) => {
  logger.error({ error }, 'Unable to start Suraksha backend');
  process.exit(1);
});
