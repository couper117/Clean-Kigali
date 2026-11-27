// Migration runner: brings the database schema up to date.
//
//   npm run migrate          migrates DATABASE_URL
//   npm run migrate:test     migrates TEST_DATABASE_URL
//
// Each file in db/migrations runs once, in name order (001_, 002_, ...), inside
// a transaction. The table schema_migrations remembers which files have run.
require('dotenv').config({ quiet: true });
// Neon's normal URL goes through a connection pooler that cannot hold the lock used
// below, so migrations use the direct URL when there is one (Vercel sets it with Neon).
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
if (process.argv.includes('--test')) {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pool } = require('../src/db/pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

// Any fixed number. Holding this lock stops two deploys from migrating at once.
const LOCK_ID = 2026113001;

// True when the file has real SQL, not just blank lines or -- comments.
function hasSql(text) {
  return text.replace(/--.*$/gm, '').trim().length > 0;
}

function checksum(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function migrate({ dir = MIGRATIONS_DIR, table = 'schema_migrations', log = console.log } = {}) {
  // The table name is put straight into SQL, so only allow simple names.
  if (!/^[a-z_]+$/.test(table)) throw new Error(`Invalid migrations table name: ${table}`);

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const applied = [];
  let waiting = false;
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        filename   TEXT PRIMARY KEY,
        checksum   TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query(`SELECT filename, checksum FROM ${table}`);
    const done = new Map(rows.map((r) => [r.filename, r.checksum]));

    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');

      if (done.has(file)) {
        // A file that already ran must never be edited; add a new file instead.
        if (done.get(file) !== checksum(sql)) {
          log(`warning ${file} changed after it ran; put changes in a new migration`);
        }
        continue;
      }

      // An empty file is a task not done yet. Stop here so files always run in order.
      if (!hasSql(sql)) {
        log(`waiting ${file} is still empty; it and later files will run once it has SQL`);
        waiting = true;
        break;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO ${table} (filename, checksum) VALUES ($1, $2)`, [file, checksum(sql)]);
        await client.query('COMMIT');
      } catch (err) {
        // Undo the whole file, so a half-finished migration never stays behind.
        await client.query('ROLLBACK');
        err.message = `${file} failed and was rolled back: ${err.message}`;
        throw err;
      }

      applied.push(file);
      log(`applied ${file}`);
    }

    if (applied.length === 0 && !waiting) log('Database is up to date');
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

// Run from the command line (npm run migrate), not when a test requires this file.
if (require.main === module) {
  migrate()
    .catch((err) => {
      // A refused connection has an empty message but a code such as ECONNREFUSED.
      console.error(`Migration failed: ${err.message || err.code || err}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { migrate, hasSql };
