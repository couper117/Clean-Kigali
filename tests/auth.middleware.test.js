// Checks login protection that runs before any database query, so these tests work
// before the users table exists. Login against real accounts is tested in auth.test.js.
const { api, pool } = require('./helpers');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');
const { requireRole } = require('../src/middleware/auth');

after(() => pool.end());

test('GET /api/auth/me without a token returns 401', async () => {
  const res = await api().get('/api/auth/me');
  assert.equal(res.status, 401);
  assert.match(res.body.error.message, /Authorization: Bearer/);
});

test('a token signed with another secret returns 401', async () => {
  const token = jwt.sign({ role: 'admin' }, 'not-the-real-secret', { subject: '1' });
  const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 401);
  assert.equal(res.body.error.message, 'The login token is not valid');
});

test('an expired token returns 401 asking to log in again', async () => {
  const token = jwt.sign({ role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 }, config.jwtSecret, { subject: '1' });
  const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 401);
  assert.match(res.body.error.message, /expired/);
});

test('a token without a numeric user id returns 401', async () => {
  const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { subject: 'admin' });
  const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 401);
});

test('POST /api/auth/login with a bad body returns 400 with one entry per field', async () => {
  const res = await api().post('/api/auth/login').send({ email: 'not-an-email' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details.map((d) => d.field), ['email', 'password']);
});

// Runs requireRole on a fake request and returns what it passed to next().
function checkRole(user, ...roles) {
  let result;
  requireRole(...roles)({ user }, {}, (err) => { result = err; });
  return result;
}

test('requireRole lets the right role through and refuses others with 403', () => {
  assert.equal(checkRole({ role: 'admin' }, 'admin'), undefined);
  assert.equal(checkRole({ role: 'officer' }, 'admin', 'officer'), undefined);
  assert.equal(checkRole({ role: 'officer' }, 'admin').statusCode, 403);
  assert.equal(checkRole(undefined, 'admin').statusCode, 401);
});
