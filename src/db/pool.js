// One shared pool of PostgreSQL connections for the whole app.
const { Pool } = require('pg');
const { attachDatabasePool } = require('@vercel/functions');
const config = require('../config/env');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

// On Vercel, keeps the function alive just long enough to close idle connections
// before it is paused, so the database is not left with stale ones. Does nothing locally.
attachDatabasePool(pool);

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error on an idle connection:', err.message);
});

// Always pass values as params ($1, $2, ...) so user input can never change the SQL.
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
