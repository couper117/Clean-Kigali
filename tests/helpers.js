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

module.exports = { api: () => request(app), pool };
