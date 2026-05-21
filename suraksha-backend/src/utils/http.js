function sendError(res, status, message, details) {
  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {})
  });
}

function sendSuccess(res, data, status = 200) {
  res.status(status).json({
    success: true,
    data
  });
}

module.exports = {
  sendError,
  sendSuccess
};
