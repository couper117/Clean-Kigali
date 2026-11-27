const db = require('../db/pool');
const config = require('../config/env');

// GET /api/health: tells you the API is up and whether it can reach the database.
async function getHealth(req, res) {
  let database = 'up';
  try {
    await db.query('SELECT 1');
  } catch {
    database = 'down';
  }

  const healthy = database === 'up';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    environment: config.env,
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
