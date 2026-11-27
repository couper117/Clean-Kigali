// The one place where every error becomes a JSON response.
// Express 5 sends errors thrown in async route handlers here automatically.
const config = require('../config/env');

// PostgreSQL error codes that are the client's fault, not the server's.
const PG_ERRORS = {
  23505: { status: 409, message: 'A record with this value already exists' },
  23503: { status: 409, message: 'This record is linked to another record that does not exist or still uses it' },
  23514: { status: 400, message: 'A value is outside the allowed range' },
  '22P02': { status: 400, message: 'A value has the wrong format' },
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (PG_ERRORS[err.code]) {
    ({ status, message } = PG_ERRORS[err.code]);
  }

  if (status >= 500) {
    console.error(err);
    // Never leak internal details to clients in production.
    if (config.isProduction) message = 'Something went wrong on our side';
  }

  const body = { error: { status, message } };
  if (err.details) body.error.details = err.details;
  if (!config.isProduction && status >= 500) body.error.stack = err.stack;

  res.status(status).json(body);
}

module.exports = errorHandler;
