// Loads sample data: categories, staff accounts and reports. Locations come from
// the migrations. Safe to run twice: anything already there is kept as it is.
//
//   npm run seed                       seeds DATABASE_URL
//   SEED_PASSWORD='...' npm run seed   password for the seeded staff accounts
//
// Each file in db/seeds runs in name order inside one transaction: .sql files as
// they are, .js files as a function given the database client.
require('dotenv').config({ quiet: true });
// Like migrations, use Neon's direct connection when there is one.
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../src/db/pool');

const SEEDS_DIR = path.join(__dirname, '..', 'db', 'seeds');
// Only for a laptop. Anywhere online, the password must be chosen and kept private.
const DEV_PASSWORD = 'CleanKigali-dev-2026';

function seedPassword() {
  const password = process.env.SEED_PASSWORD;
  const online = process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true';
  if (!password && online) {
    throw new Error('Set SEED_PASSWORD (12 or more characters) to seed an online database');
  }
  if (password && password.length < 12) throw new Error('SEED_PASSWORD must be 12 or more characters');
  return password || DEV_PASSWORD;
}

async function seed({ dir = SEEDS_DIR, log = console.log } = {}) {
  const password = seedPassword();
  const files = fs.readdirSync(dir).filter((f) => /\.(sql|js)$/.test(f)).sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const file of files) {
      const full = path.join(dir, file);
      log(`-- ${file}`);
      if (file.endsWith('.sql')) await client.query(fs.readFileSync(full, 'utf8'));
      else await require(full)(client, { password, log });
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  if (!process.env.SEED_PASSWORD) log(`Staff accounts use the development password ${DEV_PASSWORD}`);
}

if (require.main === module) {
  seed()
    .catch((err) => {
      console.error(`Seed failed: ${err.message || err.code || err}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { seed };
