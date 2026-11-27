// Reads every setting from environment variables, so nothing secret is in the code.
// In development the values come from the .env file; in production the host (Render) sets them.
// Every value is checked here, once, so a wrong setting stops the app at start-up
// instead of failing later in the middle of a request.
require('dotenv').config({ quiet: true });

const ENVIRONMENTS = ['development', 'test', 'production'];

const env = process.env.NODE_ENV || 'development';
if (!ENVIRONMENTS.includes(env)) {
  throw new Error(`NODE_ENV must be one of ${ENVIRONMENTS.join(', ')}; got "${env}".`);
}
const isProduction = env === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

// "true" or "false"; empty means use the fallback.
function boolean(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be "true" or "false"; got "${value}".`);
}

function port(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 65535) {
    throw new Error(`${name} must be a whole number from 1 to 65535; got "${value}".`);
  }
  return number;
}

const config = {
  env,
  isProduction,
  isTest: env === 'test',
  port: port('PORT', 3000),
  databaseUrl: required('DATABASE_URL'),
  // Hosted databases need an encrypted (TLS) connection; a local one does not.
  databaseSsl: boolean('DATABASE_SSL', isProduction),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Short coloured logs while developing, full Apache-style logs in production.
  logFormat: isProduction ? 'combined' : 'dev',
};

module.exports = config;
