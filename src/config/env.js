// Reads every setting from environment variables, so nothing secret is in the code.
// In development the values come from the .env file; in production the host (Render) sets them.
require('dotenv').config({ quiet: true });

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

const config = {
  env,
  isProduction,
  isTest: env === 'test',
  port: Number(process.env.PORT) || 3000,
  databaseUrl: required('DATABASE_URL'),
  // Hosted databases need an encrypted (TLS) connection; a local one does not.
  databaseSsl: process.env.DATABASE_SSL ? process.env.DATABASE_SSL === 'true' : isProduction,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Short coloured logs while developing, full Apache-style logs in production.
  logFormat: isProduction ? 'combined' : 'dev',
};

module.exports = config;
