// Shared setup for every test file. Require it before anything from src/.
// Tests run against TEST_DATABASE_URL so they never touch development data.
require('dotenv').config({ quiet: true });

process.env.NODE_ENV = 'test';
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

// Password of the seeded staff accounts during tests.
const PASSWORD = 'test-password-2026';
const ADMIN = 'admin@cleankigali.rw';
const OFFICER = 'officer.gasabo@cleankigali.rw';

// Empties the tables and loads the seed again, so each test file starts from the
// same data: 6 categories, 3 staff (admin is id 1) and 15 reports. Run
// npm run migrate:test once first. Test files run one at a time (npm test).
async function resetDatabase() {
  await pool.query('TRUNCATE report_updates, reports, users, categories RESTART IDENTITY CASCADE');
  process.env.SEED_PASSWORD = PASSWORD;
  const { seed } = require('../scripts/seed');
  await seed({ log: () => {} });
}

// { Authorization: 'Bearer ...' } for a staff account.
async function authAs(email, password = PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login as ${email} failed: ${res.status}`);
  return { Authorization: `Bearer ${res.body.token}` };
}

module.exports = {
  api: () => request(app), pool, resetDatabase, authAs, PASSWORD, ADMIN, OFFICER,
};
