const { body } = require('express-validator');

const { asyncHandler } = require('../middleware/async-handler');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../services/auth-service');
const { sendError, sendSuccess } = require('../utils/http');
const { stringValue } = require('../utils/validation');

function registerAuthRoutes(app, context) {
  app.post(
    '/api/login',
    [
      body('username').trim().notEmpty().withMessage('Officer ID is required.'),
      body('password').isString().notEmpty().withMessage('Password is required.')
    ],
    validate,
    asyncHandler(async (req, res) => {
      if (!context.config.officers.length) {
        return sendError(res, 503, 'No officers are configured. Set SURAKSHA_OFFICER_ID and SURAKSHA_OFFICER_PASSWORD, or provide SURAKSHA_OFFICERS_FILE.');
      }

      const username = stringValue(req.body.username);
      const password = stringValue(req.body.password);
      const session = authenticate(context.config, username, password);

      if (!session) return sendError(res, 401, 'Invalid officer credentials.');
      return sendSuccess(res, session);
    })
  );

  app.post('/api/logout', (req, res) => {
    sendSuccess(res, { loggedOut: true });
  });
}

module.exports = {
  registerAuthRoutes
};
