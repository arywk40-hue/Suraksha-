const { validationResult } = require('express-validator');

const { sendError } = require('../utils/http');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return sendError(
      res,
      400,
      'Request validation failed.',
      result.array().map((error) => ({
        field: error.path || error.param || 'request',
        message: error.msg
      }))
    );
  }

  next();
}

module.exports = {
  validate
};
